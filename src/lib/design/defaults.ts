import {
  newLayerId,
  type DesignDocument,
  type GraphicLayer,
  type PatternLayer,
  type ShapeLayer,
  type ShapePreset,
  type Side,
  type TextLayer,
} from './types'

export function nowIso() {
  return new Date().toISOString()
}

export function createDefaultDocument(projectType: DesignDocument['projectType'], title: string): DesignDocument {
  const ts = nowIso()
  return {
    id: `doc_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
    projectType,
    version: 1,
    metadata: { title, createdAt: ts, updatedAt: ts },
    garment: { color: '#141416', material: 'cotton' },
    layers: [],
    scene: { background: 'studio', customBackground: '#0D0D0E', floor: true },
    lighting: { preset: 'studio', intensity: 1, shadow: true },
  }
}

export function createTextLayer(side: Side, overrides: Partial<TextLayer> = {}): TextLayer {
  return {
    id: newLayerId(),
    type: 'text',
    name: 'Text',
    side,
    visible: true,
    locked: false,
    opacity: 1,
    x: 0.5,
    y: 0.42,
    rotation: 0,
    scale: 1,
    text: 'AFRA',
    fontId: 'bebas',
    fontSize: 140,
    weight: 400,
    italic: false,
    uppercase: false,
    letterSpacing: 0.04,
    color: '#F7F5EF',
    outline: { enabled: false, color: '#0D0D0E', width: 10 },
    align: 'center',
    ...overrides,
  }
}

export function createNumberLayer(side: Side, value: string, overrides: Partial<TextLayer> = {}): TextLayer {
  return createTextLayer(side, {
    name: `Number ${value}`,
    text: value,
    fontId: 'saira-condensed',
    fontSize: 340,
    weight: 900,
    italic: true,
    letterSpacing: 0,
    y: 0.5,
    ...overrides,
  })
}

export function createShapeLayer(side: Side, preset: ShapePreset, overrides: Partial<ShapeLayer> = {}): ShapeLayer {
  return {
    id: newLayerId(),
    type: 'shape',
    name: SHAPE_LABELS[preset],
    side,
    visible: true,
    locked: false,
    opacity: 1,
    x: 0.5,
    y: 0.5,
    rotation: 0,
    scale: 1,
    preset,
    color: '#F7F5EF',
    secondaryColor: '#FF5A1F',
    ...overrides,
  }
}

export const SHAPE_LABELS: Record<ShapePreset, string> = {
  'stripe-h': 'Horizontal stripe',
  'stripe-v': 'Vertical stripe',
  'double-stripe': 'Double stripe',
  chevron: 'Chevron',
  ring: 'Ring',
  circle: 'Circle',
  'round-rect': 'Rounded panel',
  triangle: 'Triangle',
  star: 'Star',
  bolt: 'Bolt',
}

export function createPatternLayer(side: Side, preset: PatternLayer['preset'], overrides: Partial<PatternLayer> = {}): PatternLayer {
  return {
    id: newLayerId(),
    type: 'pattern',
    name: `${preset[0].toUpperCase()}${preset.slice(1)} pattern`,
    side,
    visible: true,
    locked: false,
    opacity: 1,
    x: 0.5,
    y: 0.5,
    rotation: 0,
    scale: 1,
    preset,
    colorA: '#FF5A1F',
    colorB: '#0D0D0E',
    density: 8,
    angle: 0,
    coverage: 1,
    ...overrides,
  }
}

export function createGraphicLayer(
  side: Side,
  asset: { id: string; src: string; aspect: number },
  overrides: Partial<GraphicLayer> = {},
): GraphicLayer {
  return {
    id: newLayerId(),
    type: 'graphic',
    name: 'Graphic',
    side,
    visible: true,
    locked: false,
    opacity: 1,
    x: 0.5,
    y: 0.45,
    rotation: 0,
    scale: 1,
    assetId: asset.id,
    src: asset.src,
    aspect: asset.aspect,
    baseSize: 420,
    ...overrides,
  }
}
