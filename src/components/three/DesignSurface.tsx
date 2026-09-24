'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import type { ThreeEvent } from '@react-three/fiber'
import { renderSideToCanvas, resolveImage, pickLayerAt } from '@/lib/design/render'
import { ensureFontsReady } from '@/lib/design/fonts'
import type { Side } from '@/lib/design/types'
import { useEditorStore } from '@/stores/editor-store'

const TEXTURE_SIZE = 1024

/**
 * A flat design plane floating just above the garment face, textured by a
 * live canvas of the document layers for its side. Handles click-pick and
 * drag-to-move for the selected layer.
 */
export function DesignSurface({ side, position, rotation }: { side: Side; position: [number, number, number]; rotation?: [number, number, number] }) {
  const doc = useEditorStore((s) => s.doc)
  const selectedLayerId = useEditorStore((s) => s.selectedLayerId)
  const select = useEditorStore((s) => s.select)
  const updateLayer = useEditorStore((s) => s.updateLayer)
  const pushHistory = useEditorStore((s) => s.pushHistory)

  const { texture, ctx } = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = TEXTURE_SIZE
    const ctx2d = canvas.getContext('2d')!
    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    texture.anisotropy = 8
    return { texture, ctx: ctx2d }
  }, [])

  const imagesRef = useRef<Record<string, HTMLImageElement>>({})
  const [imagesVersion, setImagesVersion] = useState(0)
  const dragRef = useRef<{ layerId: string; dx: number; dy: number } | null>(null)

  // Load fonts + any graphic assets referenced by the document, then redraw.
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
      if (!cancelled) redraw()
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc.layers, doc])

  function redraw() {
    renderSideToCanvas(ctx, useEditorStore.getState().doc, side, TEXTURE_SIZE, imagesRef.current, {
      selectedLayerId: useEditorStore.getState().selectedLayerId,
    })
    texture.needsUpdate = true
  }

  // Redraw on any document/selection change
  useEffect(() => {
    redraw()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc, selectedLayerId, imagesVersion])

  useEffect(() => () => texture.dispose(), [texture])

  function toDesign(e: ThreeEvent<PointerEvent>): { x: number; y: number } | null {
    if (!e.uv) return null
    return { x: e.uv.x, y: 1 - e.uv.y }
  }

  function onPointerDown(e: ThreeEvent<PointerEvent>) {
    e.stopPropagation()
    const state = useEditorStore.getState()
    const pos = toDesign(e)
    if (!pos) return

    const sel = state.doc.layers.find((l) => l.id === state.selectedLayerId)
    if (sel && sel.visible && !sel.locked && sel.type !== 'pattern' && sel.side === side) {
      pushHistory()
      dragRef.current = { layerId: sel.id, dx: sel.x - pos.x, dy: sel.y - pos.y }
      ;(e.target as Element).setPointerCapture(e.pointerId)
      return
    }

    // pick
    const hit = pickLayerAt(state.doc, side, pos.x, pos.y)
    select(hit?.id ?? null)
  }

  function onPointerMove(e: ThreeEvent<PointerEvent>) {
    const drag = dragRef.current
    if (!drag) return
    const pos = toDesign(e)
    if (!pos) return
    updateLayer(drag.layerId, { x: clamp01(pos.x + drag.dx), y: clamp01(pos.y + drag.dy) }, 'none')
  }

  function endDrag() {
    dragRef.current = null
  }

  return (
    <mesh position={position} rotation={rotation} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={endDrag} onPointerCancel={endDrag}>
      <planeGeometry args={[0.62, 0.62]} />
      <meshStandardMaterial
        map={texture}
        transparent
        roughness={0.72}
        metalness={0}
        polygonOffset
        polygonOffsetFactor={-2}
      />
    </mesh>
  )
}

function clamp01(v: number) {
  return Math.min(0.98, Math.max(0.02, v))
}
