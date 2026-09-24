import type { AIProvider, DesignGenerationInput } from './index'
import { createNumberLayer, createShapeLayer, createTextLayer } from '@/lib/design/defaults'
import type { GeneratedDesign, ShapeLayer, TextLayer } from '@/lib/design/types'

/**
 * Deterministic, offline design generator.
 *
 * Parses the prompt into a structured, fully editable design: colors,
 * racing stripes/graphics, names and numbers. It never produces fake
 * output — everything it returns becomes a normal layer in the editor.
 */

const NAMED_COLORS: Record<string, string> = {
  black: '#101012',
  white: '#F7F5EF',
  orange: '#FF5A1F',
  red: '#D8432B',
  crimson: '#B3242B',
  yellow: '#FFD43B',
  gold: '#D9A441',
  blue: '#2E63E7',
  navy: '#16223D',
  'royal blue': '#2A46C9',
  'sky blue': '#7FB2E5',
  green: '#2E9E5B',
  mint: '#7FD8B0',
  teal: '#1F8A8A',
  purple: '#6A3FD1',
  violet: '#7A4FE0',
  pink: '#E77FB3',
  magenta: '#C33FA0',
  grey: '#8A8A8E',
  gray: '#8A8A8E',
  silver: '#C7CBD1',
  charcoal: '#2A2A2E',
  cream: '#EFE6D2',
  beige: '#D9C9A8',
  brown: '#6B4A32',
  lime: '#9BE04A',
  turquoise: '#33C3C3',
}

const STYLE_KEYWORDS = ['racing', 'motorsport', 'street', 'minimal', 'retro', 'sport', 'esports', 'tokyo', 'vintage', 'technical']

function isLight(hex: string): boolean {
  const c = hex.replace('#', '')
  const r = parseInt(c.slice(0, 2), 16)
  const g = parseInt(c.slice(2, 4), 16)
  const b = parseInt(c.slice(4, 6), 16)
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6
}

function allColors(lower: string): string[] {
  const names = Object.keys(NAMED_COLORS).sort((a, b) => b.length - a.length)
  const found: { name: string; index: number }[] = []
  for (const name of names) {
    const idx = lower.indexOf(name)
    if (idx !== -1) found.push({ name, index: idx })
  }
  return found.sort((a, b) => a.index - b.index).map((f) => NAMED_COLORS[f.name])
}

function extractNumbers(lower: string): string[] {
  return Array.from(lower.matchAll(/\bnumber\s*[:#]?\s*(\d{1,3})\b|\b(\d{1,3})\b/g))
    .map((m) => m[1] ?? m[2])
    .filter((n) => n.length <= 3 && n !== '3d')
}

function extractName(lower: string): string | null {
  const named = lower.match(/\b(?:name|player)[\s"]*([a-z0-9 .'\-]{2,20})/)
  if (named) return named[1].trim().toUpperCase()
  const quoted = lower.match(/"([^"]{2,18})"/) ?? lower.match(/'([^']{2,18})'/)
  if (quoted) return quoted[1].trim().toUpperCase()
  return null
}

export class LocalDesignProvider implements AIProvider {
  readonly id = 'local'
  readonly supportsImageGeneration = false

  async generateDesign(input: DesignGenerationInput): Promise<GeneratedDesign> {
    const lower = input.prompt.toLowerCase()
    const colors = allColors(lower)
    // First-mentioned color is the base; the next distinct one is the accent.
    const base = colors[0] ?? '#141416'
    const accent = colors.find((c) => c.toLowerCase() !== base.toLowerCase()) ?? (isLight(base) ? '#101012' : '#FF5A1F')
    const content = colors[1] && colors[1].toLowerCase() !== base.toLowerCase() ? colors[1] : isLight(base) ? '#101012' : '#F7F5EF'

    const layers: (TextLayer | ShapeLayer)[] = []
    const isRacing = /rac|motorsport|f1|gp|circuit|track|grid|apex|pit|tokyo|jdm|drift|car|speed|aero|turbo/.test(lower)
    const isStreet = /street|urban|skate|hip.?hop|graffiti|tokyo/.test(lower)
    const isMinimal = /minimal|clean|simple|mono/.test(lower)

    // Base graphic language
    if (isRacing && !isMinimal) {
      layers.push(
        createShapeLayer('front', 'double-stripe', {
          name: 'Chest stripes',
          y: 0.18,
          scale: 0.62,
          rotation: 0,
          color: accent,
          secondaryColor: content,
        }),
      )
      layers.push(
        createShapeLayer('front', 'chevron', {
          name: 'Aero chevron',
          y: 0.62,
          x: 0.28,
          scale: 0.4,
          rotation: 90,
          color: accent,
        }),
      )
      layers.push(
        createShapeLayer('front', 'bolt', {
          name: 'Speed bolt',
          x: 0.72,
          y: 0.6,
          scale: 0.5,
          color: content,
        }),
      )
    } else if (isStreet) {
      layers.push(
        createShapeLayer('front', 'round-rect', {
          name: 'Street panel',
          y: 0.34,
          scale: 0.9,
          color: accent,
          opacity: 0.9,
        }),
      )
      layers.push(
        createShapeLayer('front', 'stripe-v', {
          name: 'Side stripe',
          x: 0.18,
          y: 0.6,
          scale: 0.7,
          color: content,
        }),
      )
    } else if (!isMinimal) {
      layers.push(
        createShapeLayer('front', 'ring', {
          name: 'Emblem ring',
          y: 0.34,
          scale: 0.7,
          color: accent,
        }),
      )
      layers.push(
        createShapeLayer('front', 'star', {
          name: 'Emblem star',
          y: 0.34,
          scale: 0.34,
          color: content,
        }),
      )
    }

    // Numbers
    const numbers = extractNumbers(lower)
    if (numbers.length > 0) {
      layers.push(createNumberLayer('back', numbers[0], { color: content, outline: { enabled: true, color: accent, width: 8 } }))
      if (numbers[1]) {
        layers.push(createNumberLayer('front', numbers[1], { name: `Chest number ${numbers[1]}`, fontSize: 190, y: 0.62, color: content }))
      }
    }

    // Names
    const name = extractName(lower)
    if (name) {
      layers.push(
        createTextLayer('back', {
          name: `Name ${name}`,
          text: name,
          y: 0.24,
          fontSize: 120,
          fontId: 'saira-condensed',
          weight: 700,
          uppercase: true,
          letterSpacing: 0.12,
          color: content,
        }),
      )
    }

    // Wordmark from prompt keywords
    const words = input.prompt
      .replace(/[^\w\s-]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STYLE_KEYWORDS.includes(w.toLowerCase()) && !/^\d+$/.test(w))
      .slice(0, 2)
      .map((w) => w[0].toUpperCase() + w.slice(1).toLowerCase())
    if (words.length > 0 && numbers.length === 0) {
      layers.push(
        createTextLayer('front', {
          name: `Wordmark ${words.join(' ')}`,
          text: words.join(' '),
          y: 0.47,
          fontSize: 150,
          fontId: isRacing ? 'bebas' : 'archivo-black',
          weight: 400,
          uppercase: true,
          letterSpacing: 0.06,
          color: content,
          outline: isRacing ? { enabled: true, color: accent, width: 6 } : { enabled: false, color: '#0D0D0E', width: 0 },
        }),
      )
      layers.push(
        createTextLayer('front', {
          name: 'AFRA mark',
          text: 'AFRA',
          y: 0.24,
          fontSize: 44,
          fontId: 'inter',
          weight: 900,
          uppercase: true,
          letterSpacing: 0.4,
          color: accent,
        }),
      )
    }

    // Back neck detail
    layers.push(
      createTextLayer('back', {
        name: 'Neck label',
        text: 'AFRA RACING DIVISION',
        y: 0.13,
        fontSize: 30,
        fontId: 'inter',
        weight: 700,
        uppercase: true,
        letterSpacing: 0.3,
        color: accent,
      }),
    )

    const title = input.prompt.length <= 42 ? titleCase(input.prompt) : `${titleCase(words.join(' ') || 'Custom')} Design`

    return {
      title,
      garment: { color: base },
      layers,
      summary: `Applied ${layers.length} editable layers — base ${base}, accent ${accent}. Adjust anything in the editor.`,
    }
  }

  async generateImage(): Promise<{ dataUrl: string }> {
    throw new Error('Image generation is not available in the local provider. Configure AI_PROVIDER and AI_API_KEY.')
  }
}

function titleCase(s: string): string {
  return s.replace(/\w\S*/g, (w) => w[0].toUpperCase() + w.slice(1).toLowerCase())
}
