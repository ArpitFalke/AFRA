'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import type { ThreeEvent } from '@react-three/fiber'
import { buildSneaker, SNEAKER_DEFAULT_COLORS, SNEAKER_PARTS } from '@/lib/garment/sneaker'
import { getMaterialPreset, getWeaveTextures } from '@/lib/garment/materials'
import { renderZoneToCanvas, resolveImage, pickLayerAt } from '@/lib/design/render'
import { ensureFontsReady } from '@/lib/design/fonts'
import { SNEAKER_ZONE_IDS, ZONES, zonesForSneakerPart, type Zone } from '@/lib/garment/zones'
import { useEditorStore } from '@/stores/editor-store'

const BAKE_SIZE = 1024

const PART_GEOMETRY: Record<string, keyof ReturnType<typeof buildSneaker>> = {
  outsole: 'outsole',
  midsole: 'midsole',
  upper: 'upper',
  tongue: 'tongue',
  laces: 'laces',
  ankleCollar: 'ankleCollar',
}

function darken(hex: string, f: number): string {
  const n = hex.replace('#', '')
  const r = Math.round(parseInt(n.slice(0, 2), 16) * f)
  const g = Math.round(parseInt(n.slice(2, 4), 16) * f)
  const b = Math.round(parseInt(n.slice(4, 6), 16) * f)
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`
}

function partColor(doc: ReturnType<typeof useEditorStore.getState>['doc'], part: string): string {
  return doc.sneaker?.parts?.[part]?.color ?? SNEAKER_DEFAULT_COLORS[part as keyof typeof SNEAKER_DEFAULT_COLORS] ?? '#cccccc'
}

function partMaterial(doc: ReturnType<typeof useEditorStore.getState>['doc'], part: string): string {
  return doc.sneaker?.parts?.[part]?.material ?? (part === 'outsole' ? 'rubber' : part === 'midsole' ? 'rubber' : 'leather')
}

/** Sneaker studio model — region-colored parts + zone artwork on the upper. */
export function SneakerModel() {
  const doc = useEditorStore((s) => s.doc)
  const selectedLayerId = useEditorStore((s) => s.selectedLayerId)
  const select = useEditorStore((s) => s.select)
  const updateLayer = useEditorStore((s) => s.updateLayer)
  const pushHistory = useEditorStore((s) => s.pushHistory)

  const build = useMemo(() => buildSneaker('sneaker-low'), [])

  const upperTex = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = BAKE_SIZE
    const map = new THREE.CanvasTexture(canvas)
    map.colorSpace = THREE.SRGBColorSpace
    map.anisotropy = 8
    const roughCanvas = document.createElement('canvas')
    roughCanvas.width = roughCanvas.height = BAKE_SIZE
    const roughMap = new THREE.CanvasTexture(roughCanvas)
    roughMap.colorSpace = THREE.NoColorSpace
    return { map, roughMap, colorCtx: canvas.getContext('2d')!, roughCtx: roughCanvas.getContext('2d')! }
  }, [])

  const imagesRef = useRef<Record<string, HTMLImageElement>>({})
  const [imagesVersion, setImagesVersion] = useState(0)
  const dragRef = useRef<{ layerId: string; dx: number; dy: number; zone: Zone } | null>(null)

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
    // upper base = its part color, then zone artwork on top
    upperTex.colorCtx.clearRect(0, 0, BAKE_SIZE, BAKE_SIZE)
    upperTex.colorCtx.fillStyle = partColor(state.doc, 'upper')
    upperTex.colorCtx.fillRect(0, 0, BAKE_SIZE, BAKE_SIZE)
    upperTex.roughCtx.fillStyle = '#9a9a9a'
    upperTex.roughCtx.fillRect(0, 0, BAKE_SIZE, BAKE_SIZE)
    const zoneCanvas = document.createElement('canvas')
    zoneCanvas.width = zoneCanvas.height = 768
    const zctx = zoneCanvas.getContext('2d')!
    for (const zoneId of zonesForSneakerPart('sneaker-upper')) {
      const def = ZONES[zoneId]
      const hasLayers = state.doc.layers.some((l) => l.zone === zoneId && l.visible)
      const isSelectedHere = state.doc.layers.some((l) => l.id === state.selectedLayerId && l.zone === zoneId && l.visible)
      if (!hasLayers && !isSelectedHere) continue
      renderZoneToCanvas(zctx, state.doc, zoneId, 768, imagesRef.current, {
        selectedLayerId: state.selectedLayerId,
      })
      const sw = (def.u1 - def.u0) * BAKE_SIZE
      const sh = (def.v1 - def.v0) * BAKE_SIZE
      const dx = def.u0 * BAKE_SIZE
      const dy = (1 - def.v1) * BAKE_SIZE
      upperTex.colorCtx.drawImage(zoneCanvas, 0, 0, 768, 768, dx, dy, sw, sh)
      // ink roughness
      const ink = document.createElement('canvas')
      ink.width = ink.height = 768
      const ictx = ink.getContext('2d')!
      ictx.fillStyle = '#7d7d7d'
      ictx.fillRect(0, 0, 768, 768)
      ictx.globalCompositeOperation = 'destination-in'
      ictx.drawImage(zoneCanvas, 0, 0)
      upperTex.roughCtx.drawImage(ink, 0, 0, 768, 768, dx, dy, sw, sh)
    }
    upperTex.map.needsUpdate = true
    upperTex.roughMap.needsUpdate = true
  }

  useEffect(() => {
    rebake()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc, selectedLayerId, imagesVersion])

  useEffect(
    () => () => {
      upperTex.map.dispose()
      upperTex.roughMap.dispose()
    },
    [upperTex],
  )

  const upperPreset = getMaterialPreset(partMaterial(doc, 'upper'))
  const upperFabric = getWeaveTextures(upperPreset.weave, upperPreset.weaveScale)

  const partMaterialProps = (part: string) => {
    const preset = getMaterialPreset(partMaterial(doc, part))
    const fabric = getWeaveTextures(preset.weave, preset.weaveScale)
    return {
      color: partColor(doc, part),
      roughness: preset.roughness,
      metalness: 0,
      sheen: preset.sheen,
      sheenRoughness: preset.sheenRoughness,
      sheenColor: new THREE.Color('#ffffff'),
      normalMap: fabric.normalMap,
      normalScale: new THREE.Vector2(preset.normalScale, preset.normalScale),
      envMapIntensity: 0.7,
      side: THREE.DoubleSide,
    }
  }

  function uvToZone(uv: THREE.Vector2): { zone: Zone; x: number; y: number } | null {
    for (const zoneId of SNEAKER_ZONE_IDS) {
      const def = ZONES[zoneId]
      if (uv.y < def.v0 || uv.y > def.v1) continue
      if (uv.x < def.u0 || uv.x > def.u1) continue
      return { zone: zoneId, x: (uv.x - def.u0) / (def.u1 - def.u0), y: (def.v1 - uv.y) / (def.v1 - def.v0) }
    }
    return null
  }

  function onPointerDown(e: ThreeEvent<PointerEvent>) {
    e.stopPropagation()
    if (!e.uv) return
    const hit = uvToZone(e.uv)
    if (!hit) return
    const state = useEditorStore.getState()
    const sel = state.doc.layers.find((l) => l.id === state.selectedLayerId)
    if (sel && sel.visible && !sel.locked && sel.zone === hit.zone) {
      pushHistory()
      dragRef.current = { layerId: sel.id, dx: sel.x - hit.x, dy: sel.y - hit.y, zone: hit.zone }
      ;(e.target as Element).setPointerCapture(e.pointerId)
      return
    }
    select(pickLayerAt(state.doc, hit.zone, hit.x, hit.y)?.id ?? null)
  }

  function onPointerMove(e: ThreeEvent<PointerEvent>) {
    const drag = dragRef.current
    if (!drag || !e.uv) return
    const hit = uvToZone(e.uv)
    if (!hit || hit.zone !== drag.zone) return
    updateLayer(
      drag.layerId,
      { x: Math.min(0.98, Math.max(0.02, hit.x + drag.dx)), y: Math.min(0.98, Math.max(0.02, hit.y + drag.dy)) },
      'none',
    )
  }

  return (
    <group position={[0, -0.1, 0]} rotation={[0, 0.5, 0]}>
      <mesh geometry={build.outsole} castShadow receiveShadow>
        <meshPhysicalMaterial {...partMaterialProps('outsole')} />
      </mesh>
      <mesh geometry={build.midsole} castShadow receiveShadow>
        <meshPhysicalMaterial {...partMaterialProps('midsole')} />
      </mesh>
      <mesh geometry={build.soleCap} receiveShadow>
        <meshPhysicalMaterial {...partMaterialProps('midsole')} />
      </mesh>
      <mesh
        geometry={build.upper}
        castShadow
        receiveShadow
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={() => (dragRef.current = null)}
        onPointerCancel={() => (dragRef.current = null)}
      >
        <meshPhysicalMaterial
          {...partMaterialProps('upper')}
          map={upperTex.map}
          roughnessMap={upperTex.roughMap}
          normalMap={upperFabric.normalMap}
        />
      </mesh>
      <mesh geometry={build.tongue} castShadow>
        <meshPhysicalMaterial {...partMaterialProps('tongue')} />
      </mesh>
      <mesh geometry={build.laces} castShadow>
        <meshPhysicalMaterial {...partMaterialProps('laces')} roughness={0.7} />
      </mesh>
      <mesh geometry={build.ankleCollar} castShadow>
        <meshPhysicalMaterial color={darken(partColor(doc, 'ankleCollar'), 0.9)} roughness={0.9} metalness={0} envMapIntensity={0.6} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}
