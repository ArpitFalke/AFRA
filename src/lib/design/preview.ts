import { DESIGN_SPACE, type DesignDocument } from './types'
import { renderSideToCanvas } from './render'

/**
 * Draws a flat shirt silhouette filled with the garment color and the front
 * design composited on top. Used for project thumbnails and template cards —
 * a real preview generated from the document, no placeholder images.
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
  const k = size / DESIGN_SPACE

  // subtle backdrop
  const bg = ctx.createLinearGradient(0, 0, 0, size)
  bg.addColorStop(0, '#161619')
  bg.addColorStop(1, '#0D0D0E')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, size, size)

  ctx.save()
  drawShirtSilhouette(ctx, size)
  ctx.fillStyle = doc.garment.color
  ctx.fill()
  ctx.clip()

  // design area: chest placement — narrower than the sleeve span, upper torso
  const designSize = size * 0.46
  const ox = (size - designSize) / 2
  const oy = size * 0.17

  const design = document.createElement('canvas')
  design.width = design.height = 1024
  const dctx = design.getContext('2d')!
  renderSideToCanvas(dctx, doc, 'front', 1024, images)

  ctx.save()
  ctx.translate(ox, oy)
  ctx.drawImage(design, 0, 0, designSize, designSize)
  ctx.restore()
  ctx.restore()

  // outline — visible even on near-black garments
  drawShirtSilhouette(ctx, size)
  ctx.strokeStyle = 'rgba(247, 245, 239, 0.28)'
  ctx.lineWidth = 1.5 * k
  ctx.stroke()
  void doc
  return canvas
}

/**
 * T-shirt front silhouette path in a size×size box (centered, ~66% height).
 * Callers can fill, clip or stroke the current path.
 */
export function drawShirtSilhouette(ctx: CanvasRenderingContext2D, size: number) {
  const w = size * 0.66
  const x0 = (size - w) / 2
  const y0 = size * 0.14
  const u = (v: number) => x0 + (v / 1000) * w // 1000-unit silhouette space
  const t = (v: number) => y0 + (v / 1000) * w

  ctx.beginPath()
  ctx.moveTo(u(340), t(20)) // left shoulder top
  ctx.lineTo(u(430), t(0)) // neck left
  ctx.quadraticCurveTo(u(500), t(60), u(570), t(0)) // neck curve
  ctx.lineTo(u(660), t(20)) // right shoulder
  ctx.lineTo(u(830), t(130)) // sleeve out
  ctx.lineTo(u(890), t(280)) // sleeve cuff outer
  ctx.lineTo(u(700), t(360)) // armpit
  ctx.lineTo(u(705), t(560)) // waist right
  ctx.quadraticCurveTo(u(706), t(600), u(680), t(610))
  ctx.lineTo(u(320), t(610)) // hem
  ctx.quadraticCurveTo(u(294), t(600), u(295), t(560))
  ctx.lineTo(u(300), t(360)) // armpit left
  ctx.lineTo(u(110), t(280)) // sleeve cuff outer
  ctx.lineTo(u(170), t(130)) // sleeve top
  ctx.closePath()
}
