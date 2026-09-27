'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import type { ThreeEvent } from '@react-three/fiber'
import { buildGarment } from '@/lib/garment/geometry'
import { getDims, parseVariantKey, variantKey } from '@/lib/garment/params'
import { ZONES, zonesForPart, type GarmentPart, type Zone } from '@/lib/garment/zones'
import { getMaterialPreset, getWeaveTextures } from '@/lib/garment/materials'
import { bakePart } from '@/lib/garment/bake'
import { ensureFontsReady } from '@/lib/design/fonts'
import { pickLayerAt, resolveImage } from '@/lib/design/render'
import { useEditorStore } from '@/stores/editor-store'

const BAKE_SIZE = 1024

function darken(hex: string, f: number): string {
  const n = hex.replace('#', '')
  const r = Math.round(parseInt(n.slice(0, 2), 16) * f)
  const g = Math.round(parseInt(n.slice(2, 4), 16) * f)
  const b = Math.round(parseInt(n.slice(4, 6), 16) * f)
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`
}

interface PartTextures {
  map: THREE.CanvasTexture
  roughMap: THREE.CanvasTexture
  colorCtx: CanvasRenderingContext2D
  roughCtx: CanvasRenderingContext2D
}

function makePartTextures(): PartTextures {
  const colorCanvas = document.createElement('canvas')
  colorCanvas.width = colorCanvas.height = BAKE_SIZE
  const roughCanvas = document.createElement('canvas')
  roughCanvas.width = roughCanvas.height = BAKE_SIZE
  const map = new THREE.CanvasTexture(colorCanvas)
  map.colorSpace = THREE.SRGBColorSpace
  map.anisotropy = 8
  const roughMap = new THREE.CanvasTexture(roughCanvas)
  roughMap.colorSpace = THREE.NoColorSpace
  return { map, roughMap, colorCtx: colorCanvas.getContext('2d')!, roughCtx: roughCanvas.getContext('2d')! }
}

/**
 * The garment: panel-based parametric mesh per variant with baked fabric +
 * print textures. Prints are composited into the surface so they follow
 * folds and lighting like real ink. Handles click-pick and drag-to-move of
 * the selected layer directly on the garment.
 */
export function TShirtModel() {
  const doc = useEditorStore((s) => s.doc)
  const selectedLayerId = useEditorStore((s) => s.selectedLayerId)
  const select = useEditorStore((s) => s.select)
  const updateLayer = useEditorStore((s) => s.updateLayer)
  const pushHistory = useEditorStore((s) => s.pushHistory)

  const variant = useMemo(() => parseVariantKey(doc.garment.variant), [doc.garment.variant])
  const build = useMemo(() => buildGarment(getDims(variant), variantKey(variant)), [variant])

  const parts = useMemo(
    () => ({
      'body-front': makePartTextures(),
      'body-back': makePartTextures(),
      'sleeve-l': makePartTextures(),
      'sleeve-r': makePartTextures(),
    }),
    [],
  )

  const imagesRef = useRef<Record<string, HTMLImageElement>>({})
  const [imagesVersion, setImagesVersion] = useState(0)
  const dragRef = useRef<{ layerId: string; dx: number; dy: number; zone: Zone } | null>(null)

  useEffect(() => {
    ;(window as unknown as { __afraGeom?: unknown }).__afraGeom = build
  }, [build])

  // Load fonts + graphic assets, then bake.
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
      if (!cancelled) rebake()
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc.layers])

  function rebake() {
    const state = useEditorStore.getState()
    for (const part of ['body-front', 'body-back', 'sleeve-l', 'sleeve-r'] as GarmentPart[]) {
      const pt = parts[part]
      const bake = bakePart(state.doc, part, BAKE_SIZE, imagesRef.current, {
        selectedLayerId: state.selectedLayerId,
      })
      pt.colorCtx.clearRect(0, 0, BAKE_SIZE, BAKE_SIZE)
      pt.colorCtx.drawImage(bake.color, 0, 0)
      pt.roughCtx.clearRect(0, 0, BAKE_SIZE, BAKE_SIZE)
      pt.roughCtx.drawImage(bake.rough, 0, 0)
      pt.map.needsUpdate = true
      pt.roughMap.needsUpdate = true
    }
  }

  useEffect(() => {
    rebake()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc, selectedLayerId, imagesVersion])

  useEffect(
    () => () => {
      for (const pt of Object.values(parts)) {
        pt.map.dispose()
        pt.roughMap.dispose()
      }
    },
    [parts],
  )

  const preset = getMaterialPreset(doc.garment.material)
  const fabric = getWeaveTextures(preset.weave, preset.weaveScale)
  const override = doc.garment.fabricOverride
  const normalStrength = override?.normalStrength ?? preset.normalScale
  const roughness = override?.roughness ?? preset.roughness
  const sheen = override?.sheen ?? preset.sheen
  const opacity = doc.garment.opacity ?? 1

  // fabric thickness: the inside of the garment reads darker, so hems,
  // neck and sleeve openings look like real cloth instead of a shell
  const thickness = useMemo(
    () => ({
      onBeforeCompile: (shader: THREE.WebGLProgramParametersWithUniforms) => {
        shader.fragmentShader = shader.fragmentShader.replace(
          '#include <color_fragment>',
          '#include <color_fragment>\n  if (!gl_FrontFacing) { diffuseColor.rgb *= 0.6; }',
        )
      },
    }),
    [],
  )

  const commonProps = {
    roughness,
    metalness: 0,
    sheen,
    sheenRoughness: preset.sheenRoughness,
    sheenColor: new THREE.Color('#ffffff'),
    normalMap: fabric.normalMap,
    normalScale: new THREE.Vector2(normalStrength, normalStrength),
    envMapIntensity: 0.9,
    specularIntensity: 0.55,
    transparent: opacity < 1,
    opacity,
    side: THREE.DoubleSide,
    ...thickness,
  }

  function uvToZoneDesign(part: GarmentPart, uv: THREE.Vector2): { zone: Zone; x: number; y: number } | null {
    for (const zoneId of zonesForPart(part)) {
      const def = ZONES[zoneId]
      const inV = uv.y >= def.v0 && uv.y <= def.v1
      if (!inV) continue
      const rel = ((uv.x - def.u0) % 1 + 1) % 1
      const span = def.u1 - def.u0
      if (rel <= span) {
        return { zone: zoneId, x: rel / span, y: (def.v1 - uv.y) / (def.v1 - def.v0) }
      }
    }
    return null
  }

  function onPointerDown(part: GarmentPart) {
    return (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation()
      if (!e.uv) return
      const hit = uvToZoneDesign(part, e.uv)
      if (!hit) return
      const state = useEditorStore.getState()
      const sel = state.doc.layers.find((l) => l.id === state.selectedLayerId)
      if (sel && sel.visible && !sel.locked && sel.type !== 'pattern' && sel.zone === hit.zone) {
        pushHistory()
        dragRef.current = { layerId: sel.id, dx: sel.x - hit.x, dy: sel.y - hit.y, zone: hit.zone }
        ;(e.target as Element).setPointerCapture(e.pointerId)
        return
      }
      const found = pickLayerAt(state.doc, hit.zone, hit.x, hit.y)
      select(found?.id ?? null)
    }
  }

  function onPointerMove(e: ThreeEvent<PointerEvent>) {
    const drag = dragRef.current
    if (!drag) return
    if (!e.uv) return
    const part = ZONES[drag.zone].part
    const hit = uvToZoneDesign(part, e.uv)
    if (!hit || hit.zone !== drag.zone) return
    updateLayer(
      drag.layerId,
      { x: Math.min(0.98, Math.max(0.02, hit.x + drag.dx)), y: Math.min(0.98, Math.max(0.02, hit.y + drag.dy)) },
      'none',
    )
  }

  function endDrag() {
    dragRef.current = null
  }

  const handlers = (part: GarmentPart) => ({
    onPointerDown: onPointerDown(part),
    onPointerMove,
    onPointerUp: endDrag,
    onPointerCancel: endDrag,
  })

  return (
    <group position={[0, 0.06, 0]}>
      <mesh geometry={build.bodyFront} castShadow receiveShadow {...handlers('body-front')}>
        <meshPhysicalMaterial {...commonProps} map={parts['body-front'].map} roughnessMap={parts['body-front'].roughMap} />
      </mesh>

      <mesh geometry={build.bodyBack} castShadow receiveShadow {...handlers('body-back')}>
        <meshPhysicalMaterial {...commonProps} map={parts['body-back'].map} roughnessMap={parts['body-back'].roughMap} />
      </mesh>

      <mesh geometry={build.sleeveL.geometry} castShadow receiveShadow {...handlers('sleeve-l')}>
        <meshPhysicalMaterial {...commonProps} map={parts['sleeve-l'].map} roughnessMap={parts['sleeve-l'].roughMap} />
      </mesh>

      <mesh geometry={build.sleeveR.geometry} castShadow receiveShadow {...handlers('sleeve-r')}>
        <meshPhysicalMaterial {...commonProps} map={parts['sleeve-r'].map} roughnessMap={parts['sleeve-r'].roughMap} />
      </mesh>

      <mesh geometry={build.collar} castShadow>
        <meshPhysicalMaterial
          color={darken(doc.garment.color, 0.82)}
          roughness={Math.min(1, roughness + 0.04)}
          metalness={0}
          sheen={sheen * 0.8}
          sheenRoughness={preset.sheenRoughness}
          sheenColor={new THREE.Color('#ffffff')}
          normalMap={fabric.normalMap}
          normalScale={new THREE.Vector2(normalStrength * 1.5, normalStrength * 0.4)}
          envMapIntensity={0.85}
          specularIntensity={0.55}
          transparent={opacity < 1}
          opacity={opacity}
          side={THREE.DoubleSide}
          {...thickness}
        />
      </mesh>
    </group>
  )
}
