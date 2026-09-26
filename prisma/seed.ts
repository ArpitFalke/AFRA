/**
 * AFRA seed data — original, fictional, racing-inspired templates.
 * No third-party or brand assets are used (PRD §74/§87).
 *
 * Run: npm run db:seed
 */
import { PrismaClient } from '@prisma/client'
import {
  createDefaultDocument,
  createNumberLayer,
  createShapeLayer,
  createTextLayer,
} from '../src/lib/design/defaults'

const prisma = new PrismaClient()

interface TemplateSeed {
  slug: string
  name: string
  description: string
  tags: string[]
  sortOrder: number
  build: () => ReturnType<typeof createDefaultDocument>
}

const TEMPLATES: TemplateSeed[] = [
  {
    slug: 'apex',
    name: 'Apex',
    description: 'Racing yellow chevrons on heavyweight black.',
    tags: ['racing', 'dark', 'yellow'],
    sortOrder: 1,
    build: () => {
      const doc = createDefaultDocument('tshirt', 'Apex')
      doc.garment.color = '#101014'
      doc.garment.material = 'heavy-cotton'
      doc.garment.variant = 'mens-oversized-half'
      doc.layers = [
        createShapeLayer('front', 'chevron', { name: 'Apex chevron', y: 0.36, scale: 0.72, color: '#FFD43B' }),
        createShapeLayer('front', 'chevron', { name: 'Apex chevron lower', y: 0.52, scale: 0.5, color: '#2A2A2E' }),
        createTextLayer('front', { name: 'AFRA', text: 'AFRA', y: 0.16, fontSize: 40, fontId: 'inter', weight: 900, uppercase: true, letterSpacing: 0.4, color: '#F7F5EF' }),
        createNumberLayer('back', '10', { color: '#FFD43B', outline: { enabled: true, color: '#101014', width: 8 } }),
        createTextLayer('back', { name: 'Apex label', text: 'APEX DIVISION', y: 0.16, fontSize: 34, fontId: 'saira-condensed', weight: 700, uppercase: true, letterSpacing: 0.22, color: '#F7F5EF' }),
      ]
      return doc
    },
  },
  {
    slug: 'tokyo-grid',
    name: 'Tokyo Grid',
    description: 'Night-street type with magenta accents.',
    tags: ['tokyo', 'street', 'grid'],
    sortOrder: 2,
    build: () => {
      const doc = createDefaultDocument('tshirt', 'Tokyo Grid')
      doc.garment.color = '#14141A'
      doc.garment.material = 'cotton'
      doc.garment.variant = 'mens-regular-half'
      doc.layers = [
        createTextLayer('front', { name: 'TOKYO', text: 'TOKYO', y: 0.3, fontSize: 130, fontId: 'archivo-black', color: '#F7F5EF', letterSpacing: 0.02 }),
        createTextLayer('front', { name: 'GRID', text: 'GRID', y: 0.46, fontSize: 130, fontId: 'archivo-black', color: '#C33FA0', letterSpacing: 0.02 }),
        createShapeLayer('front', 'stripe-h', { name: 'Street stripe', y: 0.62, scale: 0.7, color: '#C33FA0' }),
        createNumberLayer('back', '13', { color: '#F7F5EF', outline: { enabled: true, color: '#C33FA0', width: 9 } }),
      ]
      return doc
    },
  },
  {
    slug: 'night-circuit',
    name: 'Night Circuit',
    description: 'Track-night orange with aero stripes.',
    tags: ['racing', 'orange', 'aero'],
    sortOrder: 3,
    build: () => {
      const doc = createDefaultDocument('tshirt', 'Night Circuit')
      doc.garment.color = '#101012'
      doc.garment.material = 'jersey-knit'
      doc.garment.variant = 'mens-regular-half'
      doc.layers = [
        createShapeLayer('front', 'double-stripe', { name: 'Aero stripes', y: 0.18, scale: 0.66, color: '#FF5A1F', secondaryColor: '#F7F5EF' }),
        createTextLayer('front', { name: 'NIGHT', text: 'NIGHT', y: 0.36, fontSize: 120, fontId: 'bebas', color: '#F7F5EF', letterSpacing: 0.1, outline: { enabled: true, color: '#FF5A1F', width: 6 } }),
        createTextLayer('front', { name: 'CIRCUIT', text: 'CIRCUIT', y: 0.5, fontSize: 120, fontId: 'bebas', color: '#FF5A1F', letterSpacing: 0.1 }),
        createShapeLayer('front', 'bolt', { name: 'Circuit bolt', x: 0.76, y: 0.62, scale: 0.42, color: '#F7F5EF' }),
        createNumberLayer('back', '27', { color: '#FF5A1F', outline: { enabled: true, color: '#F7F5EF', width: 7 } }),
        createTextLayer('back', { name: 'Circuit label', text: 'NIGHT CIRCUIT CREW', y: 0.16, fontSize: 30, fontId: 'inter', weight: 700, uppercase: true, letterSpacing: 0.26, color: '#858585' }),
        createTextLayer('left-sleeve', { name: 'Sleeve mark', text: 'NC·27', y: 0.5, fontSize: 110, fontId: 'saira-condensed', weight: 700, uppercase: true, letterSpacing: 0.08, color: '#FF5A1F' }),
      ]
      return doc
    },
  },
  {
    slug: 'carbon',
    name: 'Carbon',
    description: 'Tonal carbon panels with a green pulse.',
    tags: ['minimal', 'carbon', 'green'],
    sortOrder: 4,
    build: () => {
      const doc = createDefaultDocument('tshirt', 'Carbon')
      doc.garment.color = '#0B0B0C'
      doc.garment.material = 'heavy-cotton'
      doc.garment.variant = 'womens-regular-half'
      doc.layers = [
        createShapeLayer('front', 'round-rect', { name: 'Carbon panel', y: 0.36, scale: 0.9, color: '#161618' }),
        createShapeLayer('front', 'ring', { name: 'Pulse ring', y: 0.36, scale: 0.42, color: '#64C466' }),
        createTextLayer('front', { name: 'CARBON', text: 'CARBON', y: 0.36, fontSize: 34, fontId: 'saira-condensed', weight: 700, uppercase: true, letterSpacing: 0.32, color: '#F7F5EF' }),
        createShapeLayer('back', 'stripe-v', { name: 'Spine stripe', x: 0.5, y: 0.45, scale: 0.72, color: '#1C1C1F' }),
      ]
      return doc
    },
  },
  {
    slug: 'velocity',
    name: 'Velocity',
    description: 'Crimson speed lines on a women\u2019s slim fit.',
    tags: ['racing', 'red', 'speed'],
    sortOrder: 5,
    build: () => {
      const doc = createDefaultDocument('tshirt', 'Velocity')
      doc.garment.color = '#F0EDE4'
      doc.garment.material = 'performance'
      doc.garment.variant = 'womens-slim-half'
      doc.layers = [
        createShapeLayer('front', 'double-stripe', { name: 'Speed stripes', y: 0.3, scale: 0.7, rotation: 8, color: '#D8432B', secondaryColor: '#101012' }),
        createTextLayer('front', { name: 'VELOCITY', text: 'VELOCITY', y: 0.5, fontSize: 110, fontId: 'saira-condensed', weight: 900, italic: true, uppercase: true, letterSpacing: 0.04, color: '#101012' }),
        createShapeLayer('front', 'circle', { name: 'Race dot', x: 0.78, y: 0.34, scale: 0.16, color: '#D8432B' }),
        createNumberLayer('back', '9', { color: '#D8432B', outline: { enabled: true, color: '#101012', width: 8 } }),
      ]
      return doc
    },
  },
  {
    slug: 'trackline',
    name: 'Trackline',
    description: 'Minimal monochrome with a single racing line.',
    tags: ['minimal', 'mono'],
    sortOrder: 6,
    build: () => {
      const doc = createDefaultDocument('tshirt', 'Trackline')
      doc.garment.color = '#1A1A1E'
      doc.garment.material = 'soft-cotton'
      doc.garment.variant = 'mens-slim-half'
      doc.layers = [
        createShapeLayer('front', 'stripe-h', { name: 'Track line', y: 0.56, scale: 0.5, color: '#F7F5EF' }),
        createTextLayer('front', { name: 'TRACKLINE', text: 'TRACKLINE', y: 0.46, fontSize: 56, fontId: 'inter', weight: 700, uppercase: true, letterSpacing: 0.3, color: '#F7F5EF' }),
        createTextLayer('right-chest', { name: 'Chest mark', text: 'TRK', y: 0.5, fontSize: 150, fontId: 'saira-condensed', weight: 900, uppercase: true, letterSpacing: 0.06, color: '#F7F5EF' }),
      ]
      return doc
    },
  },
  {
    slug: 'midnight',
    name: 'Midnight',
    description: 'Navy squad tee with silver detailing.',
    tags: ['sport', 'navy'],
    sortOrder: 7,
    build: () => {
      const doc = createDefaultDocument('tshirt', 'Midnight')
      doc.garment.color = '#16223D'
      doc.garment.material = 'cotton'
      doc.garment.variant = 'mens-regular-full'
      doc.layers = [
        createShapeLayer('front', 'star', { name: 'Squad star', y: 0.32, scale: 0.4, color: '#C7CBD1' }),
        createTextLayer('front', { name: 'MIDNIGHT', text: 'MIDNIGHT', y: 0.5, fontSize: 96, fontId: 'saira-condensed', weight: 900, uppercase: true, letterSpacing: 0.08, color: '#F7F5EF' }),
        createNumberLayer('back', '88', { color: '#C7CBD1' }),
      ]
      return doc
    },
  },
  {
    slug: 'monochrome',
    name: 'Monochrome',
    description: 'Big type, no color, maximum attitude.',
    tags: ['mono', 'street'],
    sortOrder: 8,
    build: () => {
      const doc = createDefaultDocument('tshirt', 'Monochrome')
      doc.garment.color = '#F7F5EF'
      doc.garment.material = 'washed'
      doc.garment.variant = 'womens-oversized-half'
      doc.layers = [
        createTextLayer('front', { name: 'AFRA STACK', text: 'AFRA\nSTUDIO', y: 0.42, fontSize: 140, fontId: 'archivo-black', color: '#0D0D0E', letterSpacing: 0 }),
        createShapeLayer('back', 'stripe-v', { name: 'Back stripe', x: 0.5, y: 0.45, scale: 0.6, color: '#0D0D0E' }),
      ]
      return doc
    },
  },
]

async function main() {
  console.log('Seeding AFRA templates…')
  for (const t of TEMPLATES) {
    const doc = t.build()
    doc.metadata.title = t.name
    await prisma.template.upsert({
      where: { slug: t.slug },
      update: {
        name: t.name,
        description: t.description,
        tags: JSON.stringify(t.tags),
        designDocument: JSON.stringify(doc),
        sortOrder: t.sortOrder,
        published: true,
      },
      create: {
        slug: t.slug,
        name: t.name,
        projectType: 'tshirt',
        description: t.description,
        tags: JSON.stringify(t.tags),
        designDocument: JSON.stringify(doc),
        sortOrder: t.sortOrder,
        published: true,
      },
    })
    console.log(`  ✓ ${t.name}`)
  }
  console.log('Seed complete.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
