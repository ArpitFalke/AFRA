import type { DesignDocument } from '@/lib/design/types'
import { renderZoneToCanvas, zoneRects } from '@/lib/design/render'
import { ZONES, zonesForPart, zoneWraps, type GarmentPart } from '@/lib/garment/zones'
import { getMaterialPreset, getWeaveTextures } from '@/lib/garment/materials'

/**
 * Bakes each garment part's surface texture: base fabric color, woven
 * shading, stitched seams, and every zone's artwork — composited into the
 * same canvas so prints live IN the cloth (folds and lighting read through
 * them). Also produces a matching roughness canvas where print ink is
 * slightly smoother than the fabric, like a real screen print.
 */

const ZONE_BAKE_SIZE = 768

interface Scratch {
  zone: HTMLCanvasElement
  zoneCtx: CanvasRenderingContext2D
  ink: HTMLCanvasElement
  inkCtx: CanvasRenderingContext2D
}

let scratch: Scratch | null = null

function getScratch(): Scratch {
  if (!scratch) {
    const zone = document.createElement('canvas')
    zone.width = zone.height = ZONE_BAKE_SIZE
    const ink = document.createElement('canvas')
    ink.width = ink.height = ZONE_BAKE_SIZE
    scratch = { zone, zoneCtx: zone.getContext('2d')!, ink, inkCtx: ink.getContext('2d')! }
  }
  return scratch
}

function darken(hex: string, factor: number): string {
  const n = hex.replace('#', '')
  const r = Math.round(parseInt(n.slice(0, 2), 16) * factor)
  const g = Math.round(parseInt(n.slice(2, 4), 16) * factor)
  const b = Math.round(parseInt(n.slice(4, 6), 16) * factor)
  return `rgb(${r}, ${g}, ${b})`
}

function stitchLine(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: string,
  width = 2,
) {
  ctx.save()
  ctx.strokeStyle = color
  ctx.lineWidth = width
  ctx.setLineDash([7, 5])
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(x1, y1)
  ctx.lineTo(x2, y2)
  ctx.stroke()
  ctx.restore()
}

export interface PartBake {
  color: HTMLCanvasElement
  rough: HTMLCanvasElement
}

export function bakePart(
  doc: DesignDocument,
  part: GarmentPart,
  size: number,
  images: Record<string, HTMLImageElement>,
  options: { selectedLayerId?: string | null } = {},
): PartBake {
  const color = document.createElement('canvas')
  color.width = color.height = size
  const ctx = color.getContext('2d')!
  const rough = document.createElement('canvas')
  rough.width = rough.height = size
  const rctx = rough.getContext('2d')!

  const preset = getMaterialPreset(doc.garment.material)
  const base = doc.garment.color

  // base fabric
  ctx.fillStyle = base
  ctx.fillRect(0, 0, size, size)

  // slight vertical shading so the cylindrical map reads as volume even
  // before lighting — brighter at front/back centers, darker at side seams
  const grad = ctx.createLinearGradient(0, 0, size, 0)
  grad.addColorStop(0, 'rgba(0,0,0,0.10)')
  grad.addColorStop(0.25, 'rgba(255,255,255,0.015)')
  grad.addColorStop(0.5, 'rgba(255,255,255,0.05)')
  grad.addColorStop(0.75, 'rgba(255,255,255,0.015)')
  grad.addColorStop(1, 'rgba(0,0,0,0.10)')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, size, size)

  // seams — stitched hem, shoulder and side seams
  const seam = darken(base, 0.62)
  const seamSoft = darken(base, 0.78)
  if (part === 'body-front' || part === 'body-back') {
    // hem double stitch
    stitchLine(ctx, 0, size * 0.985, size, size * 0.985, seamSoft, 2.5)
    stitchLine(ctx, 0, size * 0.965, size, size * 0.965, seam, 1.8)
    stitchLine(ctx, 0, size * 0.945, size, size * 0.945, seamSoft, 1.2)
    // side seams at the panel edges
    stitchLine(ctx, size * 0.012, size * 0.08, size * 0.012, size * 0.93, seamSoft, 1.6)
    stitchLine(ctx, size * 0.988, size * 0.08, size * 0.988, size * 0.93, seamSoft, 1.6)
    // armhole curves near the top corners
    ctx.save()
    ctx.strokeStyle = seam
    ctx.lineWidth = 1.8
    ctx.beginPath()
    ctx.moveTo(size * 0.02, size * 0.1)
    ctx.quadraticCurveTo(size * 0.1, size * 0.015, size * 0.24, size * 0.005)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(size * 0.98, size * 0.1)
    ctx.quadraticCurveTo(size * 0.9, size * 0.015, size * 0.76, size * 0.005)
    ctx.stroke()
    ctx.restore()
  } else {
    stitchLine(ctx, 0, size * 0.955, size, size * 0.955, seamSoft, 2.2)
    stitchLine(ctx, 0, size * 0.935, size, size * 0.935, seam, 1.6)
  }

  // roughness base from the weave map
  const weave = getWeaveTextures(preset.weave, preset.weaveScale)
  const roughGray = Math.round(preset.roughness * 255)
  rctx.fillStyle = `rgb(${roughGray},${roughGray},${roughGray})`
  rctx.fillRect(0, 0, size, size)
  const rpat = rctx.createPattern(weave.rough, 'repeat')!
  if (rpat) {
    rctx.globalAlpha = 0.5
    rctx.fillStyle = rpat
    rctx.fillRect(0, 0, size, size)
    rctx.globalAlpha = 1
  }

  // zones — artwork composited into the fabric
  const { zone: zoneCanvas, zoneCtx, ink, inkCtx } = getScratch()
  for (const zoneId of zonesForPart(part)) {
    const def = ZONES[zoneId]
    const hasLayers = doc.layers.some((l) => l.zone === zoneId && l.visible)
    const isSelectedHere = doc.layers.some(
      (l) => l.id === options.selectedLayerId && l.zone === zoneId && l.visible,
    )
    if (!hasLayers && !isSelectedHere) continue

    renderZoneToCanvas(zoneCtx, doc, zoneId, ZONE_BAKE_SIZE, images, {
      selectedLayerId: options.selectedLayerId,
    })

    const rects = zoneRects(def, size, size)
    const span = def.u1 - def.u0
    const segs = zoneWraps(def)
      ? [
          { u0: def.u0, u1: 1 },
          { u0: 0, u1: def.u1 - 1 },
        ]
      : [{ u0: def.u0, u1: def.u1 }]

    rects.forEach((rect, idx) => {
      const seg = segs[idx]
      const f0 = (seg.u0 - def.u0) / span
      const f1 = (seg.u1 - def.u0) / span
      const sx = f0 * ZONE_BAKE_SIZE
      const sw = (f1 - f0) * ZONE_BAKE_SIZE
      // color: print over fabric
      ctx.drawImage(zoneCanvas, sx, 0, sw, ZONE_BAKE_SIZE, rect.x, rect.y, rect.w, rect.h)
      // roughness: flat ink where artwork alpha > 0
      inkCtx.save()
      inkCtx.globalCompositeOperation = 'source-over'
      inkCtx.clearRect(0, 0, ZONE_BAKE_SIZE, ZONE_BAKE_SIZE)
      const inkGray = Math.max(70, Math.min(roughGray - 26, 150))
      inkCtx.fillStyle = `rgb(${inkGray},${inkGray},${inkGray})`
      inkCtx.fillRect(0, 0, ZONE_BAKE_SIZE, ZONE_BAKE_SIZE)
      inkCtx.globalCompositeOperation = 'destination-in'
      inkCtx.drawImage(zoneCanvas, 0, 0)
      inkCtx.restore()
      rctx.drawImage(ink, sx, 0, sw, ZONE_BAKE_SIZE, rect.x, rect.y, rect.w, rect.h)
    })
  }

  // woven shading pass over everything (fabric + ink) — integrates prints
  ctx.globalAlpha = 0.17
  const pat = ctx.createPattern(weave.shade, 'repeat')!
  if (pat) {
    ctx.globalCompositeOperation = 'multiply'
    ctx.fillStyle = pat
    ctx.fillRect(0, 0, size, size)
  }
  ctx.globalAlpha = 1
  ctx.globalCompositeOperation = 'source-over'

  return { color, rough }
}
