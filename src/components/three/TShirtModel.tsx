'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { useGLTF } from '@react-three/drei'
import type { ThreeEvent } from '@react-three/fiber'
import { DecalGeometry } from 'three/examples/jsm/geometries/DecalGeometry.js'
import { getMaterialPreset, getWeaveTextures } from '@/lib/garment/materials'
import { renderZoneToCanvas, resolveImage, pickLayerAt } from '@/lib/design/render'
import { ensureFontsReady } from '@/lib/design/fonts'
import { ZONES, zonesForPart, type Zone } from '@/lib/garment/zones'
import { useEditorStore } from '@/stores/editor-store'
import { parseVariantKey } from '@/lib/garment/params'

const CANVAS = 1024

/** Per-zone decal projectors, sized from the model bounds once loaded. */
interface Projector {
  zone: Zone
  position: [number, number, number]
  direction: [number, number, number]
  size: [number, number]
}

function projectorsFromBounds(box: THREE.Box3): Projector[] {
  const size = new THREE.Vector3()
  box.getSize(size)
  const center = new THREE.Vector3()
  box.getCenter(center)
  const w = size.x
  const h = size.y
  const d = size.z
  const chestY = center.y + h * 0.13
  return [
    { zone: 'front', position: [center.x, chestY, box.max.z + 0.001], direction: [0, 0, 1], size: [w * 0.62, w * 0.62] },
    { zone: 'back', position: [center.x, chestY + h * 0.02, box.min.z - 0.001], direction: [0, 0, -1], size: [w * 0.62, w * 0.62] },
    { zone: 'left-chest', position: [center.x + w * 0.14, chestY + h * 0.06, box.max.z + 0.001], direction: [0, 0, 1], size: [w * 0.2, w * 0.2] },
    { zone: 'right-chest', position: [center.x - w * 0.14, chestY + h * 0.06, box.max.z + 0.001], direction: [0, 0, 1], size: [w * 0.2, w * 0.2] },
    { zone: 'left-sleeve', position: [center.x + w * 0.48, chestY + h * 0.04, center.z], direction: [1, 0.1, 0], size: [w * 0.26, w * 0.26] },
    { zone: 'right-sleeve', position: [center.x - w * 0.48, chestY + h * 0.04, center.z], direction: [-1, 0.1, 0], size: [w * 0.26, w * 0.26] },
  ]
}

/**
 * T-Shirt Studio model — the free FBX-derived GLB garment, tintable via
 * material color, with design zones rendered as decal projections that
 * conform to the cloth. Editable layers work exactly like the procedural
 * models (same store, same zone canvases).
 */
export function TShirtModel() {
  const doc = useEditorStore((s) => s.doc)
  const selectedLayerId = useEditorStore((s) => s.selectedLayerId)
  const select = useEditorStore((s) => s.select)
  const updateLayer = useEditorStore((s) => s.updateLayer)
  const pushHistory = useEditorStore((s) => s.pushHistory)
  const garment = doc.garment

  const gltf = useGLTF('/models/tshirt/tshirt.gltf')
  const sceneRef = useRef<THREE.Group | null>(null)
  const [projectors, setProjectors] = useState<Projector[] | null>(null)
  const [variantKeyState, setVariantKeyState] = useState(0)

  const variant = useMemo(() => parseVariantKey(garment.variant), [garment.variant])
  const preset = getMaterialPreset(garment.material)
  const fabric = getWeaveTextures(preset.weave, preset.weaveScale)
  const override = garment.fabricOverride
  const normalStrength = override?.normalStrength ?? preset.normalScale
  const roughness = override?.roughness ?? preset.roughness
  const sheen = override?.sheen ?? preset.sheen
  const opacity = garment.opacity ?? 1

  // model scale per fit variant — oversized wider/longer, slim narrower
  const fitScale = useMemo(() => {
    const f = variant.fit
    if (f === 'oversized') return [1.1, 1.06, 1.1] as const
    if (f === 'slim') return [0.93, 0.97, 0.93] as const
    return [1, 1, 1] as const
  }, [variant.fit])

  const genderScale = variant.gender === 'womens' ? 0.94 : 1
  const sleeveScale = variant.sleeve === 'full' ? 1 : 1
  const uniform = [fitScale[0] * genderScale, fitScale[1], fitScale[2] * genderScale * sleeveScale] as const

  // prepare the loaded model: bake all transforms flat, normalize
  // orientation/scale, capture bounds — so decals share one coordinate space
  const flatScene = useMemo(() => {
    const scene = gltf.scene
    scene.updateMatrixWorld(true)
    const group = new THREE.Group()
    const keep: THREE.Mesh[] = []
    scene.traverse((o) => {
      const mesh = o as THREE.Mesh
      if (mesh.isMesh && mesh.geometry) keep.push(mesh)
    })
    for (const mesh of keep) {
      const baked = mesh.geometry.clone().applyMatrix4(mesh.matrixWorld)
      const m = new THREE.Mesh(baked, mesh.material)
      m.name = mesh.name
      group.add(m)
    }
    return group
  }, [gltf])

  useEffect(() => {
    const scene = flatScene
    sceneRef.current = scene
    const box = new THREE.Box3().setFromObject(scene)
    const size = new THREE.Vector3()
    box.getSize(size)
    const maxDim = Math.max(size.x, size.y, size.z)
    const k = 1.55 / maxDim
    scene.scale.setScalar(k)
    const box2 = new THREE.Box3().setFromObject(scene)
    const center = new THREE.Vector3()
    box2.getCenter(center)
    scene.position.set(-center.x, -0.73 - box2.min.y, -center.z)
    scene.updateMatrixWorld(true)
    queueMicrotask(() => setProjectors(projectorsFromBounds(new THREE.Box3().setFromObject(scene))))
  }, [flatScene])
  useEffect(() => {
    // tint the ORIGINAL materials in place — they are already wired to the
    // meshes with the correct diffuse/normal textures
    const seen = new Set<THREE.Material>()
    sceneRef.current?.traverse((o) => {
      const mesh = o as THREE.Mesh
      if (!mesh.isMesh) return
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
      for (const m of mats) {
        if (!m || seen.has(m)) continue
        seen.add(m)
        const std = m as THREE.MeshStandardMaterial
        std.color = new THREE.Color(garment.color)
        std.roughness = roughness
        std.metalness = 0
        std.transparent = opacity < 1
        std.opacity = opacity
        std.needsUpdate = true
      }
    })
  }, [gltf, garment.color, roughness, sheen, normalStrength, opacity, flatScene])



  // ── zone canvases (one per zone with content) ──
  const imagesRef = useRef<Record<string, HTMLImageElement>>({})
  const [imagesVersion, setImagesVersion] = useState(0)

  useEffect(() => {
    let cancelled = false
    const fontIds = doc.layers.filter((l) => l.type === 'text').map((l) => l.fontId as string)
    const srcs = doc.layers.filter((l) => l.type === 'graphic').map((l) => (l as { src: string }).src)
    Promise.all([
      ensureFontsReady(['inter', 'bebas', 'saira-condensed', 'archivo-black', ...fontIds]),
      ...srcs.map(async (src) => {
        if (imagesRef.current[src]) return
        const img = await resolveImage(src)
        if (img) {
          imagesRef.current[src] = img
          setImagesVersion((v) => v + 1)
        }
      }),
    ]).then(() => {
      if (!cancelled) setVariantKeyState((v) => v + 1)
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc.layers])

  const [sceneReady, setSceneReady] = useState<THREE.Group | null>(null)
  const [canvasTick, setCanvasTick] = useState(0)
  const [imagesSnapshot, setImagesSnapshot] = useState<Record<string, HTMLImageElement>>({})
  useEffect(() => {
    queueMicrotask(() => {
      setImagesSnapshot({ ...imagesRef.current })
      setSceneReady(sceneRef.current)
      setCanvasTick((v) => v + 1)
    })
  }, [doc, selectedLayerId, imagesVersion, flatScene])

  const zoneCanvases = useMemo(() => {
    const state = useEditorStore.getState()
    const map = new Map<Zone, { canvas: HTMLCanvasElement; texture: THREE.CanvasTexture }>()
    for (const zoneId of Object.keys(ZONES) as Zone[]) {
      const hasContent = state.doc.layers.some((l) => l.zone === zoneId && l.visible)
      const isSelectedHere = state.selectedLayerId && state.doc.layers.some((l) => l.id === state.selectedLayerId && l.zone === zoneId && l.visible)
      if (!hasContent && !isSelectedHere) continue
      const canvas = document.createElement('canvas')
      canvas.width = canvas.height = CANVAS
      const ctx = canvas.getContext('2d')!
      renderZoneToCanvas(ctx, state.doc, zoneId, CANVAS, imagesSnapshot, {
        selectedLayerId: state.selectedLayerId,
      })
      const texture = new THREE.CanvasTexture(canvas)
      texture.colorSpace = THREE.SRGBColorSpace
      texture.anisotropy = 8
      map.set(zoneId, { canvas, texture })
    }
    return map
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasTick, variantKeyState, doc.layers, imagesSnapshot])

  // dispose zone textures on change
  useEffect(() => {
    return () => {
      for (const { texture } of zoneCanvases.values()) texture.dispose()
    }
  }, [zoneCanvases])

  // ── decals ──
  const decals = useMemo(() => {
    if (!projectors || !sceneReady) return []
    const out: { zone: Zone; geometry: THREE.BufferGeometry }[] = []
    const target = sceneReady
    target.updateMatrixWorld(true)
    // DecalGeometry needs a Mesh — use the largest (the main body panels)
    let decalTarget: THREE.Mesh | null = null
    let bestArea = 0
    target.traverse((o) => {
      const mesh = o as THREE.Mesh
      if (!mesh.isMesh || !mesh.geometry?.boundingBox) return
      mesh.geometry.computeBoundingBox()
      const size = new THREE.Vector3()
      mesh.geometry.boundingBox.getSize(size)
      const area = size.x * size.y + size.y * size.z + size.x * size.z
      if (area > bestArea) {
        bestArea = area
        decalTarget = mesh
      }
    })
    if (!decalTarget) return []
    for (const proj of projectors) {
      if (!zoneCanvases.has(proj.zone)) continue
      try {
        const dirVec = new THREE.Vector3(...proj.direction).normalize()
        const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), dirVec)
        const orientation = new THREE.Euler().setFromQuaternion(q)
        const geometry = new DecalGeometry(decalTarget, new THREE.Vector3(...proj.position), orientation, new THREE.Vector3(proj.size[0], proj.size[1], 1))
        out.push({ zone: proj.zone, geometry })
      } catch {
        // projector missed the mesh — skip
      }
    }
    return out
  }, [projectors, zoneCanvases, sceneReady])

  useEffect(() => {
    return () => {
      for (const d of decals) d.geometry.dispose()
    }
  }, [decals])

  // ── picking: decal uv → design coords ──
  const dragRef = useRef<{ layerId: string; dx: number; dy: number; zone: Zone } | null>(null)

  function onPointerDown(zone: Zone) {
    return (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation()
      if (!e.uv) return
      const pos = { x: e.uv.x, y: e.uv.y }
      const state = useEditorStore.getState()
      const sel = state.doc.layers.find((l) => l.id === state.selectedLayerId)
      if (sel && sel.visible && !sel.locked && sel.type !== 'pattern' && sel.zone === zone) {
        pushHistory()
        dragRef.current = { layerId: sel.id, dx: sel.x - pos.x, dy: sel.y - pos.y, zone }
        ;(e.target as Element).setPointerCapture(e.pointerId)
        return
      }
      const found = pickLayerAt(state.doc, zone, pos.x, pos.y)
      select(found?.id ?? null)
    }
  }

  function onPointerMove(e: ThreeEvent<PointerEvent>) {
    const drag = dragRef.current
    if (!drag || !e.uv) return
    updateLayer(
      drag.layerId,
      { x: Math.min(0.98, Math.max(0.02, e.uv.x + drag.dx)), y: Math.min(0.98, Math.max(0.02, e.uv.y + drag.dy)) },
      'none',
    )
  }

  function endDrag() {
    dragRef.current = null
  }


  const clothProps = {
    roughness,
    metalness: 0,
    sheen,
    sheenRoughness: preset.sheenRoughness,
    sheenColor: new THREE.Color('#ffffff'),
    envMapIntensity: 0.9,
    specularIntensity: 0.55,
    transparent: opacity < 1,
    opacity,
  }

  return (
    <group position={[0, 0.06, 0]}>
      <primitive object={flatScene} />
      {decals.map(({ zone, geometry }) => {
        const tex = zoneCanvases.get(zone)!.texture
        return (
          <mesh key={`${zone}-${canvasTick}`} geometry={geometry} onPointerDown={onPointerDown(zone)} onPointerMove={onPointerMove} onPointerUp={endDrag} onPointerCancel={endDrag}>
            <meshPhysicalMaterial
              {...clothProps}
              map={tex}
              transparent
              polygonOffset
              polygonOffsetFactor={-4}
              depthWrite={false}
            />
          </mesh>
        )
      })}
    </group>
  )
}

useGLTF.preload('/models/tshirt/tshirt.gltf')
