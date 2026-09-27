import type { Zone } from '@/lib/garment/zones'

/**
 * AFRA Design Document model.
 *
 * A project is a structured, editable design — never just a rendered image.
 * Layers live in a normalized design space (0..1 x 0..1) inside a placement
 * zone ("front", "back", "left-chest", …) of the garment.
 */

export const PROJECT_TYPES = [
  'tshirt',
  'jersey',
  'sneaker',
  'livery',
  'poster',
  'album',
  'wallpaper',
  'custom3d',
] as const

export type ProjectType = (typeof PROJECT_TYPES)[number]

export const PROJECT_TYPE_META: Record<ProjectType, { label: string; status: 'live' | 'soon' }> = {
  tshirt: { label: 'T-Shirt', status: 'live' },
  jersey: { label: 'Jersey', status: 'soon' },
  sneaker: { label: 'Sneaker', status: 'soon' },
  livery: { label: 'Car Livery', status: 'soon' },
  poster: { label: 'Poster', status: 'soon' },
  album: { label: 'Album Cover', status: 'soon' },
  wallpaper: { label: 'Wallpaper', status: 'soon' },
  custom3d: { label: 'Custom 3D', status: 'soon' },
}

/** Kept for backward compatibility with pre-V2 documents. */
export type Side = 'front' | 'back'

export type LayerType = 'text' | 'graphic' | 'shape' | 'pattern'

export interface BaseLayer {
  id: string
  type: LayerType
  name: string
  zone: Zone
  /** Pre-V2 field, maintained in sync for compatibility. */
  side: Side
  visible: boolean
  locked: boolean
  opacity: number // 0..1
  /** Center position in design space (0..1). */
  x: number
  y: number
  /** Degrees, clockwise. */
  rotation: number
  /** Uniform scale multiplier. 1 = natural size. */
  scale: number
}

export interface TextLayer extends BaseLayer {
  type: 'text'
  text: string
  fontId: string
  /** Font size in design units (design space is 1000 units wide). */
  fontSize: number
  weight: 400 | 700 | 900
  italic: boolean
  uppercase: boolean
  letterSpacing: number // em
  color: string
  outline: { enabled: boolean; color: string; width: number } // width in design units
  align: 'center' | 'left' | 'right'
}

export interface GraphicLayer extends BaseLayer {
  type: 'graphic'
  assetId: string
  /** Resolved URL of the asset image. */
  src: string
  /** natural width / height, used to keep aspect. */
  aspect: number
  /** Natural size baseline in design units (larger dimension). */
  baseSize: number
  /** Ink blend against the fabric. */
  blend?: 'normal' | 'multiply' | 'screen'
  /** Mirror the artwork horizontally / vertically. */
  flipX?: boolean
  flipY?: boolean
  /** Vertical stretch multiplier (1 = natural aspect). */
  stretchY?: number
  /** Crop fractions (0..0.45 per edge) — print-ready trimming. */
  crop?: { top: number; right: number; bottom: number; left: number }
}

export type ShapePreset =
  | 'stripe-h'
  | 'stripe-v'
  | 'double-stripe'
  | 'chevron'
  | 'ring'
  | 'circle'
  | 'round-rect'
  | 'triangle'
  | 'star'
  | 'bolt'

export interface ShapeLayer extends BaseLayer {
  type: 'shape'
  preset: ShapePreset
  color: string
  secondaryColor: string
}

export type PatternPreset = 'stripes' | 'checker' | 'dots' | 'grid' | 'zigzag' | 'camo'

export interface PatternLayer extends BaseLayer {
  type: 'pattern'
  preset: PatternPreset
  colorA: string
  colorB: string
  density: number // pattern repeat count across the tile
  angle: number // degrees, independent of layer rotation
  /** Fraction of the zone the pattern covers (1 = full design area). */
  coverage: number
}

export type DesignLayer = TextLayer | GraphicLayer | ShapeLayer | PatternLayer

/** Fabric appearance overrides — advanced controls. */
export interface FabricOverride {
  weaveScale?: number
  roughness?: number
  sheen?: number
  normalStrength?: number
}

export interface GarmentConfig {
  color: string
  /** Material preset id — see MATERIAL_PRESETS. */
  material: string
  /** TShirtVariant key, e.g. "mens-regular-half". */
  variant: string
  /** Garment opacity (fabric thinness). */
  opacity: number
  fabricOverride?: FabricOverride
}

export type LightingPreset = 'studio' | 'dramatic' | 'soft'

export interface SceneConfig {
  background: 'studio' | 'dark' | 'custom'
  customBackground: string
  floor: boolean
}

export interface LightingConfig {
  preset: LightingPreset
  intensity: number // 0.4..1.6
  shadow: boolean
}

export interface DesignDocument {
  id: string
  projectType: ProjectType
  version: number
  metadata: {
    title: string
    description?: string
    createdAt: string
    updatedAt: string
  }
  garment: GarmentConfig
  layers: DesignLayer[]
  scene: SceneConfig
  lighting: LightingConfig
}

/** AI generation output: a patch that becomes editable layers. */
export interface GeneratedDesign {
  title?: string
  garment?: Partial<GarmentConfig>
  layers: DesignLayer[]
  summary?: string
}

export const DESIGN_SPACE = 1000 // design units per zone

export function isMovableLayer(layer: DesignLayer | undefined | null): boolean {
  return !!layer && layer.type !== 'pattern'
}

/** Layers of a zone in draw order (bottom → top). */
export function layersForZone(doc: DesignDocument, zone: Zone): DesignLayer[] {
  return doc.layers.filter((l) => l.zone === zone)
}

let layerCounter = 0
export function newLayerId(): string {
  layerCounter = (layerCounter + 1) % 1_000_000
  return `l_${Date.now().toString(36)}_${layerCounter.toString(36)}${Math.random()
    .toString(36)
    .slice(2, 6)}`
}

export function cloneLayer<T extends DesignLayer>(layer: T, overrides: Partial<T> = {}): T {
  return {
    ...structuredClone(layer),
    id: newLayerId(),
    ...overrides,
  } as T
}

/** Approximate axis-aligned bounds of a layer in final design units (scale applied). */
export function layerBounds(layer: DesignLayer): { w: number; h: number } {
  switch (layer.type) {
    case 'text': {
      const est = layer.fontSize * Math.max(0.55, Math.min(2.4, layer.text.length * 0.32))
      return { w: est * layer.scale, h: layer.fontSize * 1.15 * layer.scale }
    }
    case 'graphic': {
      const size = layer.baseSize * layer.scale
      const w = layer.aspect >= 1 ? size : size * layer.aspect
      const h = layer.aspect >= 1 ? size / layer.aspect : size
      return { w, h }
    }
    case 'shape':
      return shapeBounds(layer.preset, layer.scale)
    case 'pattern':
      return { w: DESIGN_SPACE * layer.coverage * layer.scale, h: DESIGN_SPACE * layer.coverage * layer.scale }
  }
}

export function shapeBounds(preset: ShapePreset, scale: number): { w: number; h: number } {
  const s = 1 * scale
  switch (preset) {
    case 'stripe-h':
      return { w: 900 * s, h: 70 * s }
    case 'stripe-v':
      return { w: 70 * s, h: 900 * s }
    case 'double-stripe':
      return { w: 900 * s, h: 190 * s }
    case 'chevron':
      return { w: 700 * s, h: 340 * s }
    case 'ring':
      return { w: 420 * s, h: 420 * s }
    case 'circle':
      return { w: 380 * s, h: 380 * s }
    case 'round-rect':
      return { w: 620 * s, h: 340 * s }
    case 'triangle':
      return { w: 460 * s, h: 400 * s }
    case 'star':
      return { w: 420 * s, h: 420 * s }
    case 'bolt':
      return { w: 260 * s, h: 480 * s }
  }
}
