import type { GarmentDims } from './params'
import { halfWidthAt } from './geometry'

/**
 * Accurate 2D front-view silhouette drawn from the same dimension model as
 * the 3D geometry — used for model-selector thumbnails and previews.
 * Fills/strokes the current path.
 */
export function drawGarmentSilhouette(ctx: CanvasRenderingContext2D, dims: GarmentDims, size: number) {
  const h = dims.shoulderY - dims.hemY
  const totalH = h * 1.12
  const k = size / totalH
  const cx = size / 2
  const y2p = (y: number) => (dims.shoulderY - y) * k + size * 0.06
  const x2p = (x: number) => cx + x * k

  const sleeveDirX = Math.sin(dims.sleeveAngle)
  const sleeveDirY = -Math.cos(dims.sleeveAngle)
  const shoulderX = dims.shoulderHalfWidth - 0.02
  const shoulderY = dims.shoulderY - dims.shoulderDrop * 0.4

  const cuffX = shoulderX + sleeveDirX * dims.sleeveLength
  const cuffY = shoulderY + sleeveDirY * dims.sleeveLength
  const cuffHalf = dims.sleeveCuffRadius / Math.cos(dims.sleeveAngle * 0.4)

  const bodyTopY = dims.shoulderY + dims.neckRadius * 0.55
  const neckHalfW = halfWidthAt(dims, 1)

  ctx.beginPath()

  // start at hem left
  ctx.moveTo(x2p(-halfWidthAt(dims, 0)), y2p(dims.hemY))
  // up the wearer-right side to the armpit
  const armpitT = 0.8
  for (let t = 0; t <= armpitT; t += 0.05) {
    ctx.lineTo(x2p(-halfWidthAt(dims, t)), y2p(dims.hemY + (dims.shoulderY - dims.hemY) * t))
  }
  // out along the underside of the sleeve to the cuff
  const underX = shoulderX - 0.055 + sleeveDirX * dims.sleeveLength
  const underY = shoulderY - 0.05 + sleeveDirY * dims.sleeveLength
  ctx.lineTo(x2p(underX - cuffHalf * Math.cos(dims.sleeveAngle * 0.5) * 0.4), y2p(underY))
  ctx.lineTo(x2p(-cuffX - cuffHalf), y2p(cuffY))
  // cuff edge
  ctx.lineTo(x2p(-cuffX + cuffHalf * 0.1), y2p(cuffY - dims.sleeveCuffRadius * 0.5))
  // back along the top of the sleeve to the shoulder shelf
  ctx.lineTo(x2p(-shoulderX * 0.78), y2p(bodyTopY - dims.shoulderDrop * 1.05))
  // shoulder to neck
  ctx.lineTo(x2p(-neckHalfW * 0.9), y2p(bodyTopY - dims.shoulderDrop * 0.2))
  // neckline scoop (front)
  ctx.quadraticCurveTo(x2p(0), y2p(bodyTopY + dims.neckScoop * 1.6), x2p(neckHalfW * 0.9), y2p(bodyTopY - dims.shoulderDrop * 0.35))
  // mirror: shoulder → sleeve → cuff → armpit → hem
  ctx.lineTo(x2p(shoulderX * 0.78), y2p(bodyTopY - dims.shoulderDrop * 1.05))
  ctx.lineTo(x2p(cuffX - cuffHalf * 0.1), y2p(cuffY - dims.sleeveCuffRadius * 0.5))
  ctx.lineTo(x2p(cuffX + cuffHalf), y2p(cuffY))
  ctx.lineTo(x2p(underX + cuffHalf * Math.cos(dims.sleeveAngle * 0.5) * 0.4) * 1, y2p(underY))
  const armpitX = halfWidthAt(dims, armpitT)
  ctx.lineTo(x2p(armpitX), y2p(dims.hemY + (dims.shoulderY - dims.hemY) * armpitT))
  for (let t = armpitT; t >= 0; t -= 0.05) {
    ctx.lineTo(x2p(halfWidthAt(dims, t)), y2p(dims.hemY + (dims.shoulderY - dims.hemY) * t))
  }
  ctx.closePath()
}
