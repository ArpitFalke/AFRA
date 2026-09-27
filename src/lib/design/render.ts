import {
  DESIGN_SPACE,
  type DesignDocument,
  type DesignLayer,
  type GraphicLayer,
  type PatternLayer,
  type ShapeLayer,
  type TextLayer,
  layersForZone,
  layerBounds,
} from './types'
import type { Zone, ZoneDef } from '@/lib/garment/zones'
import { ZONES, zoneWraps } from '@/lib/garment/zones'
import { getFont } from './fonts'

export interface RenderOptions {
  /** Selected layer gets a dashed selection frame drawn into the texture. */
  selectedLayerId?: string | null
}

const imageCache = new Map<string, HTMLImageElement>()

export function resolveImage(src: string): Promise<HTMLImageElement | null> {
  const hit = imageCache.get(src)
  if (hit && hit.complete && hit.naturalWidth > 0) return Promise.resolve(hit)
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      imageCache.set(src, img)
      resolve(img)
    }
    img.onerror = () => resolve(null)
    img.src = src
  })
}

function drawTextLayer(ctx: CanvasRenderingContext2D, layer: TextLayer, size: number, k: number) {
  const font = getFont(layer.fontId)
  const text = layer.uppercase ? layer.text.toUpperCase() : layer.text
  const weight = font.weights.includes(layer.weight) ? layer.weight : font.weights[font.weights.length - 1]
  ctx.font = `${layer.italic ? 'italic ' : ''}${weight} ${layer.fontSize * k}px ${font.stack}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.letterSpacing = `${layer.letterSpacing * layer.fontSize * k}px`

  const lines = text.split('\n')
  const lineHeight = layer.fontSize * 1.12 * k
  const startY = -((lines.length - 1) * lineHeight) / 2
  const cx = layer.align === 'center' ? 0 : layer.align === 'left' ? -measureMax(ctx, lines) / 2 : measureMax(ctx, lines) / 2

  lines.forEach((line, i) => {
    const y = startY + i * lineHeight
    if (layer.outline.enabled && layer.outline.width > 0) {
      ctx.lineJoin = 'round'
      ctx.strokeStyle = layer.outline.color
      ctx.lineWidth = layer.outline.width * k * 2
      ctx.strokeText(line, cx, y)
    }
    ctx.fillStyle = layer.color
    ctx.fillText(line, cx, y)
  })
}

function measureMax(ctx: CanvasRenderingContext2D, lines: string[]) {
  return lines.reduce((max, l) => Math.max(max, ctx.measureText(l).width), 0)
}

function drawShapeLayer(ctx: CanvasRenderingContext2D, layer: ShapeLayer, size: number) {
  const w = (u: number) => (u / DESIGN_SPACE) * size
  ctx.fillStyle = layer.color
  ctx.strokeStyle = layer.color

  const rect = (rx: number, ry: number, rw: number, rh: number, r = 0) => {
    ctx.beginPath()
    if (r > 0 && typeof ctx.roundRect === 'function') ctx.roundRect(rx, ry, rw, rh, r)
    else ctx.rect(rx, ry, rw, rh)
    ctx.fill()
  }

  switch (layer.preset) {
    case 'stripe-h':
      rect(-w(450), -w(35), w(900), w(70))
      break
    case 'stripe-v':
      rect(-w(35), -w(450), w(70), w(900))
      break
    case 'double-stripe':
      ctx.fillStyle = layer.color
      rect(-w(450), -w(95), w(900), w(70))
      ctx.fillStyle = layer.secondaryColor
      rect(-w(450), w(25), w(900), w(70))
      break
    case 'chevron': {
      ctx.beginPath()
      ctx.moveTo(-w(350), -w(170))
      ctx.lineTo(0, -w(0))
      ctx.lineTo(w(350), -w(170))
      ctx.lineTo(w(350), -w(60))
      ctx.lineTo(0, w(110))
      ctx.lineTo(-w(350), -w(60))
      ctx.closePath()
      ctx.fill()
      break
    }
    case 'ring':
      ctx.lineWidth = w(56)
      ctx.beginPath()
      ctx.arc(0, 0, w(182), 0, Math.PI * 2)
      ctx.stroke()
      break
    case 'circle':
      ctx.beginPath()
      ctx.arc(0, 0, w(190), 0, Math.PI * 2)
      ctx.fill()
      break
    case 'round-rect':
      rect(-w(310), -w(170), w(620), w(340), w(48))
      break
    case 'triangle':
      ctx.beginPath()
      ctx.moveTo(0, -w(200))
      ctx.lineTo(w(230), w(200))
      ctx.lineTo(-w(230), w(200))
      ctx.closePath()
      ctx.fill()
      break
    case 'star': {
      ctx.beginPath()
      for (let i = 0; i < 10; i++) {
        const r = i % 2 === 0 ? w(210) : w(88)
        const a = -Math.PI / 2 + (i * Math.PI) / 5
        const px = Math.cos(a) * r
        const py = Math.sin(a) * r
        if (i === 0) ctx.moveTo(px, py)
        else ctx.lineTo(px, py)
      }
      ctx.closePath()
      ctx.fill()
      break
    }
    case 'bolt': {
      ctx.beginPath()
      ctx.moveTo(w(30), -w(240))
      ctx.lineTo(-w(130), w(20))
      ctx.lineTo(-w(10), w(20))
      ctx.lineTo(-w(30), w(240))
      ctx.lineTo(w(130), -w(40))
      ctx.lineTo(w(10), -w(40))
      ctx.closePath()
      ctx.fill()
      break
    }
  }
}

function drawPatternLayer(ctx: CanvasRenderingContext2D, layer: PatternLayer, size: number) {
  const coverage = layer.coverage * size
  const half = coverage / 2
  ctx.save()
  ctx.beginPath()
  ctx.rect(-half, -half, coverage, coverage)
  ctx.clip()
  ctx.translate(-half, -half)
  ctx.rotate((layer.angle * Math.PI) / 180)
  ctx.translate(half, half)

  const span = coverage * 2.4
  const n = Math.max(2, Math.round(layer.density))
  const step = span / n

  switch (layer.preset) {
    case 'stripes': {
      ctx.fillStyle = layer.colorA
      ctx.fillRect(-span, -span, span * 2, span * 2)
      ctx.fillStyle = layer.colorB
      for (let i = -n * 2; i < n * 2; i++) {
        if (i % 2 === 0) continue
        ctx.fillRect(i * step, -span, step, span * 2)
      }
      break
    }
    case 'checker': {
      for (let i = -n; i <= n; i++) {
        for (let j = -n; j <= n; j++) {
          ctx.fillStyle = (i + j) % 2 === 0 ? layer.colorA : layer.colorB
          ctx.fillRect(i * step, j * step, step, step)
        }
      }
      break
    }
    case 'dots': {
      ctx.fillStyle = layer.colorA
      ctx.fillRect(-span, -span, span * 2, span * 2)
      ctx.fillStyle = layer.colorB
      const r = step * 0.18
      for (let i = -n; i <= n; i++) {
        for (let j = -n; j <= n; j++) {
          ctx.beginPath()
          ctx.arc(i * step + step / 2, j * step + step / 2, r, 0, Math.PI * 2)
          ctx.fill()
        }
      }
      break
    }
    case 'grid': {
      ctx.fillStyle = layer.colorA
      ctx.fillRect(-span, -span, span * 2, span * 2)
      ctx.strokeStyle = layer.colorB
      ctx.lineWidth = Math.max(1, step * 0.05)
      for (let i = -n; i <= n; i++) {
        ctx.beginPath()
        ctx.moveTo(i * step, -span)
        ctx.lineTo(i * step, span)
        ctx.stroke()
        ctx.beginPath()
        ctx.moveTo(-span, i * step)
        ctx.lineTo(span, i * step)
        ctx.stroke()
      }
      break
    }
    case 'zigzag': {
      ctx.fillStyle = layer.colorA
      ctx.fillRect(-span, -span, span * 2, span * 2)
      ctx.strokeStyle = layer.colorB
      ctx.lineWidth = step * 0.28
      ctx.lineJoin = 'miter'
      const amp = step * 0.6
      for (let row = -n; row <= n; row++) {
        ctx.beginPath()
        const y = row * step
        for (let i = -n; i <= n; i++) {
          const x = i * step
          if (i === -n) ctx.moveTo(x, y + amp)
          else ctx.lineTo(x + step / 2, y - amp)
          ctx.lineTo(x + step, y + amp)
        }
        ctx.stroke()
      }
      break
    }
    case 'camo': {
      ctx.fillStyle = layer.colorA
      ctx.fillRect(-span, -span, span * 2, span * 2)
      ctx.fillStyle = layer.colorB
      const seedRand = mulberry32(Math.round(layer.density * 977 + layer.angle))
      const blobs = n * 6
      for (let i = 0; i < blobs; i++) {
        const x = (seedRand() - 0.5) * span * 2
        const y = (seedRand() - 0.5) * span * 2
        const r = step * (0.35 + seedRand() * 0.5)
        ctx.beginPath()
        for (let a = 0; a < 10; a++) {
          const ang = (a / 10) * Math.PI * 2
          const rr = r * (0.7 + seedRand() * 0.6)
          const px = x + Math.cos(ang) * rr
          const py = y + Math.sin(ang) * rr
          if (a === 0) ctx.moveTo(px, py)
          else ctx.lineTo(px, py)
        }
        ctx.closePath()
        ctx.fill()
      }
      break
    }
  }
  ctx.restore()
}

function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function drawLayer(
  ctx: CanvasRenderingContext2D,
  layer: DesignLayer,
  size: number,
  image: HTMLImageElement | null,
) {
  ctx.save()
  ctx.globalAlpha = layer.opacity
  ctx.translate(layer.x * size, layer.y * size)
  ctx.rotate((layer.rotation * Math.PI) / 180)
  ctx.scale(layer.scale, layer.scale)
  switch (layer.type) {
    case 'text':
      drawTextLayer(ctx, layer, size, size / DESIGN_SPACE / layer.scale)
      break
    case 'shape':
      drawShapeLayer(ctx, layer, size / layer.scale)
      break
    case 'pattern':
      drawPatternLayer(ctx, layer, size / layer.scale)
      break
    case 'graphic': {
      if (image) {
        const g = layer as GraphicLayer
        if (g.blend && g.blend !== 'normal') ctx.globalCompositeOperation = g.blend
        const crop = g.crop ?? { top: 0, right: 0, bottom: 0, left: 0 }
        const iw = image.naturalWidth || 1
        const ih = image.naturalHeight || 1
        const sx = crop.left * iw
        const sy = crop.top * ih
        const sw = Math.max(1, iw * (1 - crop.left - crop.right))
        const sh = Math.max(1, ih * (1 - crop.top - crop.bottom))
        const aspectEff = sw / sh
        const wpx = g.aspect >= 1 ? g.baseSize : g.baseSize * g.aspect
        const hpx = (g.aspect >= 1 ? g.baseSize / g.aspect : g.baseSize) * (g.stretchY ?? 1) * ((g.aspect || 1) / aspectEff)
        ctx.scale(g.flipX ? -1 : 1, g.flipY ? -1 : 1)
        ctx.drawImage(image, sx, sy, sw, sh, -wpx / 2, -hpx / 2, wpx, hpx)
      }
      break
    }
  }
  ctx.restore()
}

function drawSelectionFrame(ctx: CanvasRenderingContext2D, layer: DesignLayer, size: number) {
  const { w, h } = layerBounds(layer)
  ctx.save()
  ctx.translate(layer.x * size, layer.y * size)
  ctx.rotate((layer.rotation * Math.PI) / 180)
  const pad = 14 * (size / DESIGN_SPACE)
  ctx.strokeStyle = 'rgba(255, 90, 31, 0.95)'
  ctx.lineWidth = 3 * (size / DESIGN_SPACE)
  ctx.setLineDash([12 * (size / DESIGN_SPACE), 9 * (size / DESIGN_SPACE)])
  ctx.strokeRect(-w / 2 - pad, -h / 2 - pad, w + pad * 2, h + pad * 2)
  ctx.restore()
}

/**
 * Composite one placement zone into a square canvas (design space).
 * Transparent background — the caller bakes this over the fabric.
 */
export function renderZoneToCanvas(
  ctx: CanvasRenderingContext2D,
  doc: DesignDocument,
  zone: Zone,
  size: number,
  images: Record<string, HTMLImageElement>,
  options: RenderOptions = {},
) {
  ctx.clearRect(0, 0, size, size)
  for (const layer of layersForZone(doc, zone)) {
    if (!layer.visible) continue
    const image = layer.type === 'graphic' ? images[(layer as GraphicLayer).src] ?? null : null
    drawLayer(ctx, layer, size, image)
  }
  if (options.selectedLayerId) {
    const sel = doc.layers.find((l) => l.id === options.selectedLayerId)
    if (sel && sel.zone === zone && sel.visible) drawSelectionFrame(ctx, sel, size)
  }
}

/** Hit-test layers top→bottom at a point in zone design space. */
export function pickLayerAt(
  doc: DesignDocument,
  zone: Zone,
  px: number,
  py: number,
): DesignLayer | null {
  const layers = layersForZone(doc, zone)
  for (let i = layers.length - 1; i >= 0; i--) {
    const layer = layers[i]
    if (!layer.visible || layer.locked || layer.type === 'pattern') continue
    const { w, h } = layerBounds(layer)
    const dx = px - layer.x
    const dy = py - layer.y
    const a = (-layer.rotation * Math.PI) / 180
    const lx = dx * Math.cos(a) - dy * Math.sin(a)
    const ly = dx * Math.sin(a) + dy * Math.cos(a)
    const pad = 20 / DESIGN_SPACE
    if (Math.abs(lx) <= w / 2 + pad && Math.abs(ly) <= h / 2 + pad) return layer
  }
  return null
}

/**
 * Pixel rectangles a zone occupies on its part's texture canvas.
 * Wrapping zones (back) yield two rects.
 */
export function zoneRects(
  zone: ZoneDef,
  canvasW: number,
  canvasH: number,
): { x: number; w: number; y: number; h: number }[] {
  const y = (1 - zone.v1) * canvasH
  const h = (zone.v1 - zone.v0) * canvasH
  const segs: { u0: number; u1: number }[] = []
  if (zoneWraps(zone)) {
    segs.push({ u0: zone.u0, u1: 1 }, { u0: 0, u1: zone.u1 - 1 })
  } else {
    segs.push({ u0: zone.u0, u1: zone.u1 })
  }
  return segs.map((s) => ({ x: s.u0 * canvasW, w: (s.u1 - s.u0) * canvasW, y, h }))
}

/** Get a zone def by id. */
export function getZoneDef(zone: Zone): ZoneDef {
  return ZONES[zone]
}
