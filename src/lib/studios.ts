import type { ProjectType } from '@/lib/design/types'

/**
 * Studio registry — each category is its own focused workspace sharing the
 * same design engine. The category decides which models, materials, zones,
 * presets and templates the editor shows.
 */

export type StudioCategory = 'tshirts' | 'jerseys' | 'sneakers'

export interface StudioDef {
  category: StudioCategory
  projectType: ProjectType
  title: string
  tagline: string
  /** Model variant options offered by this studio's Garment panel. */
  variants: { key: string; label: string; description?: string }[]
  /** Material preset ids offered (in order). */
  materials: string[]
  live: boolean
}

export const STUDIOS: Record<StudioCategory, StudioDef> = {
  tshirts: {
    category: 'tshirts',
    projectType: 'tshirt',
    title: 'T-Shirt Studio',
    tagline: 'Cut, print and present custom tees in real-time 3D.',
    variants: [],
    materials: ['cotton', 'heavy-cotton', 'jersey-knit', 'polyester', 'performance', 'soft-cotton', 'washed'],
    live: true,
  },
  jerseys: {
    category: 'jerseys',
    projectType: 'jersey',
    title: 'Jersey Studio',
    tagline: 'Team kit design — football, basketball, racing and esports.',
    variants: [
      { key: 'jersey-football', label: 'Football', description: 'Short sleeve, crew collar' },
      { key: 'jersey-basketball', label: 'Basketball', description: 'Sleeveless tank' },
      { key: 'jersey-racing', label: 'Racing', description: 'Snap-fit race cut' },
      { key: 'jersey-esports', label: 'Esports', description: 'Long sleeve, high collar' },
    ],
    materials: ['performance', 'mesh', 'athletic-knit', 'lightweight-poly', 'dri-style'],
    live: true,
  },
  sneakers: {
    category: 'sneakers',
    projectType: 'sneaker',
    title: 'Sneaker Studio',
    tagline: 'Design every panel of a low-top, from outsole to laces.',
    variants: [
      { key: 'sneaker-low', label: 'Low-Top', description: 'Classic everyday silhouette' },
    ],
    materials: ['leather', 'suede', 'mesh', 'canvas', 'rubber', 'synthetic', 'patent'],
    live: true,
  },
}

export function studioForProjectType(projectType: string): StudioDef | null {
  return Object.values(STUDIOS).find((s) => s.projectType === projectType) ?? null
}

export function studioRoute(category: StudioCategory, projectId?: string): string {
  return projectId ? `/studio/${category}/project/${projectId}` : `/studio/${category}`
}
