import { getDims, parseVariantKey } from '@/lib/garment/params'
import { drawGarmentSilhouette } from '@/lib/garment/silhouette'
import { type DesignDocument } from './types'
import { ZONES, type Zone } from '@/lib/garment/zones'
import { renderZoneToCanvas } from './render'

/**
 * Flat preview of a design: variant-accurate silhouette filled with the
 * garment color, with the design composited on the chest. Used for project
 * thumbnails, template cards and the hero fallback — a real render from
 * the document, no placeholder images.
 */
export function renderPreviewToCanvas(
  doc: DesignDocument,
  size: number,
  images: Record<string, HTMLImageElement> = {},
): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const dims = getDims(parseVariantKey(doc.garment.variant))

  // backdrop
  const bg = ctx.createLinearGradient(0, 0, 0, size)
  bg.addColorStop(0, '#161619')
  bg.addColorStop(1, '#0D0D0E')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, size, size)

  // zone art (front, or first non-empty zone as fallback)
  const zoneArt = pickPreviewZone(doc)
  let designCanvas: HTMLCanvasElement | null = null
  if (zoneArt) {
    designCanvas = document.createElement('canvas')
    designCanvas.width = designCanvas.height = 1024
    renderZoneToCanvas(designCanvas.getContext('2d')!, doc, zoneArt, 1024, images)
  }

  ctx.save()
  drawGarmentSilhouette(ctx, dims, size)
  ctx.fillStyle = doc.garment.color
  ctx.fill()
  ctx.save()
  ctx.clip()

  if (designCanvas) {
    const rect = previewZoneRect(doc, zoneArt!, size, dims.shoulderY - dims.hemY)
    if (rect) {
      ctx.drawImage(designCanvas, rect.x, rect.y, rect.w, rect.h)
    }
  }
  ctx.restore()
  ctx.restore()

  // outline
  drawGarmentSilhouette(ctx, dims, size)
  ctx.strokeStyle = 'rgba(247, 245, 239, 0.28)'
  ctx.lineWidth = Math.max(1, size * 0.004)
  ctx.stroke()
  return canvas
}

function pickPreviewZone(doc: DesignDocument): Zone | null {
  const order: Zone[] = ['front', 'back', 'left-chest', 'right-chest', 'left-sleeve', 'right-sleeve']
  for (const z of order) {
    if (doc.layers.some((l) => l.zone === z && l.visible)) return z
  }
  return null
}

/**
 * Approximate screen rect for a zone on the flat preview (linear
 * projection of the UV space onto the silhouette box).
 */
function previewZoneRect(doc: DesignDocument, zone: Zone, size: number, bodyH: number) {
  const def = ZONES[zone]
  if (def.part !== 'body-front' && def.part !== 'body-back') return null
  const dims = getDims(parseVariantKey(doc.garment.variant))
  const k = size / (bodyH * 1.12)
  const cx = size / 2
  const chestHalfW = dims.chestHalfWidth * 1.02
  const uMid = (def.u0 + def.u1) / 2
  const xWorld = (uMid - 0.5) * 2 * chestHalfW
  const wWorld = (def.u1 - def.u0) * 2 * chestHalfW
  const yTopWorld = dims.hemY + bodyH * def.v1
  const hWorld = bodyH * (def.v1 - def.v0)
  return {
    x: cx + xWorld * k - (wWorld * k) / 2,
    y: (dims.shoulderY - yTopWorld) * k + size * 0.06,
    w: wWorld * k,
    h: hWorld * k,
  }
}

export function drawShirtSilhouetteForDoc(doc: DesignDocument, ctx: CanvasRenderingContext2D, size: number) {
  drawGarmentSilhouette(ctx, getDims(parseVariantKey(doc.garment.variant)), size)
}
