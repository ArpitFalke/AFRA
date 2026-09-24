import type { MaterialId } from './types'

export interface FontDef {
  id: string
  name: string
  /** CSS font-family stack, also valid for canvas fillText. */
  stack: string
  weights: number[]
  italic: boolean
  /** Whether the package is bundled (guaranteed offline). */
  bundled: boolean
}

export const FONTS: FontDef[] = [
  {
    id: 'inter',
    name: 'Inter',
    stack: '"Inter", system-ui, sans-serif',
    weights: [400, 700, 900],
    italic: true,
    bundled: true,
  },
  {
    id: 'bebas',
    name: 'Bebas Neue',
    stack: '"Bebas Neue", "Arial Narrow", sans-serif',
    weights: [400],
    italic: false,
    bundled: true,
  },
  {
    id: 'saira-condensed',
    name: 'Saira Condensed',
    stack: '"Saira Condensed", "Arial Narrow", sans-serif',
    weights: [400, 700, 900],
    italic: false,
    bundled: true,
  },
  {
    id: 'archivo-black',
    name: 'Archivo Black',
    stack: '"Archivo Black", "Arial Black", sans-serif',
    weights: [400],
    italic: false,
    bundled: true,
  },
  {
    id: 'system',
    name: 'System Sans',
    stack: 'system-ui, sans-serif',
    weights: [400, 700, 900],
    italic: true,
    bundled: true,
  },
]

export function getFont(id: string): FontDef {
  return FONTS.find((f) => f.id === id) ?? FONTS[0]
}

/**
 * Ask the browser to load the fonts required by a document before drawing
 * to canvas. Returns when every requested family is ready (or failed).
 */
export async function ensureFontsReady(fontIds: string[], weights: number[] = [400, 700, 900]) {
  if (typeof document === 'undefined' || !('fonts' in document)) return
  const unique = Array.from(new Set(fontIds))
  await Promise.all(
    unique.flatMap((id) => {
      const font = getFont(id)
      return weights.map((w) =>
        document.fonts.load(`${font.italic ? 'italic ' : ''}${w} 32px ${font.stack}`).catch(() => null),
      )
    }),
  )
}

export interface MaterialDef {
  id: MaterialId
  name: string
  description: string
  roughness: number
  metalness: number
}

export const MATERIALS: MaterialDef[] = [
  {
    id: 'cotton',
    name: 'Cotton Jersey',
    description: 'Classic soft knit with a matte finish.',
    roughness: 0.94,
    metalness: 0.0,
  },
  {
    id: 'sport-poly',
    name: 'Sport Poly',
    description: 'Smooth performance fabric with a slight sheen.',
    roughness: 0.62,
    metalness: 0.04,
  },
  {
    id: 'heavy',
    name: 'Heavyweight',
    description: 'Thick premium jersey, deep matte look.',
    roughness: 0.99,
    metalness: 0.0,
  },
  {
    id: 'vintage',
    name: 'Vintage Wash',
    description: 'Soft washed cotton with muted tone.',
    roughness: 0.88,
    metalness: 0.0,
  },
]

export function getMaterial(id: MaterialId): MaterialDef {
  return MATERIALS.find((m) => m.id === id) ?? MATERIALS[0]
}

export const PALETTES: { name: string; colors: string[] }[] = [
  { name: 'Track Night', colors: ['#0D0D0E', '#FF5A1F', '#F7F5EF'] },
  { name: 'Apex', colors: ['#101014', '#FFD43B', '#18181A'] },
  { name: 'Grid', colors: ['#14141A', '#3E7BFF', '#F7F5EF'] },
  { name: 'Velocity', colors: ['#101012', '#E05252', '#858585'] },
  { name: 'Carbon', colors: ['#0B0B0C', '#2A2A2E', '#64C466'] },
  { name: 'Mono', colors: ['#0D0D0E', '#F7F5EF', '#858585'] },
]
