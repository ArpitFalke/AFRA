'use client'

import { useEffect, useRef } from 'react'
import { renderPreviewToCanvas } from '@/lib/design/preview'
import { createNumberLayer, createShapeLayer, createTextLayer } from '@/lib/design/defaults'
import type { DesignDocument } from '@/lib/design/types'

/** Static, 2D-canvas preview of the hero shirt — used when WebGL is unavailable. */
export function HeroFallback() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current) return
    const doc: DesignDocument = {
      id: 'hero-fallback',
      projectType: 'tshirt',
      version: 1,
      metadata: { title: 'AFRA', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      garment: { color: '#1A1A1E', material: 'heavy' },
      layers: [
        createShapeLayer('front', 'double-stripe', { name: 'Chest stripes', y: 0.2, scale: 0.6, color: '#FF5A1F', secondaryColor: '#F7F5EF' }),
        createTextLayer('front', { name: 'AFRA', text: 'AFRA', y: 0.44, fontSize: 170, fontId: 'bebas', color: '#F7F5EF', letterSpacing: 0.18 }),
        createNumberLayer('back', '01', { color: '#F7F5EF' }),
      ],
      scene: { background: 'dark', customBackground: '#0D0D0E', floor: false },
      lighting: { preset: 'dramatic', intensity: 1, shadow: false },
    }
    const draw = () => {
      if (!ref.current) return
      const canvas = renderPreviewToCanvas(doc, 640)
      canvas.style.width = '100%'
      canvas.style.height = '100%'
      canvas.style.objectFit = 'contain'
      ref.current.replaceChildren(canvas)
    }
    draw()
    document.fonts?.ready.then(draw).catch(() => null)
  }, [])

  return (
    <div className="flex h-full w-full items-center justify-center p-6">
      <div ref={ref} className="max-h-full w-full max-w-md" />
    </div>
  )
}
