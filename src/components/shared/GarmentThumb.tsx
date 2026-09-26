'use client'

import { useEffect, useRef } from 'react'
import { getDims, type TShirtVariant } from '@/lib/garment/params'
import { drawGarmentSilhouette } from '@/lib/garment/silhouette'

/** Variant-accurate thumbnail of a garment shape for the model selector. */
export function GarmentThumb({ variant, color = '#2A2A30', size = 72 }: { variant: TShirtVariant; color?: string; size?: number }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const dpr = Math.min(2, typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1)
    canvas.width = size * dpr
    canvas.height = size * dpr
    const ctx = canvas.getContext('2d')!
    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, size, size)
    const dims = getDims(variant)
    drawGarmentSilhouette(ctx, dims, size)
    const grad = ctx.createLinearGradient(0, 0, 0, size)
    grad.addColorStop(0, color)
    grad.addColorStop(1, color)
    ctx.fillStyle = grad
    ctx.fill()
    ctx.strokeStyle = 'rgba(247,245,239,0.35)'
    ctx.lineWidth = 1.2
    ctx.stroke()
  }, [variant, color, size])

  return <canvas ref={ref} style={{ width: size, height: size }} aria-hidden />
}
