/**
 * Procedural racing-inspired graphic generator.
 *
 * Produces ORIGINAL vector artwork (SVG) from a prompt — helmet, formula
 * car, circuit, tire, speed-line and typography motifs composed with a
 * palette parsed from the description. No brand assets are scraped or
 * reproduced. When an OpenAI-compatible key is configured, the provider
 * uses real image generation instead (see openai-provider.ts).
 */

export interface ParsedGraphicPrompt {
  palette: { primary: string; secondary: string; light: string; dark: string }
  motifs: GraphicMotif[]
  mood: 'night' | 'bright' | 'mono'
}

export type GraphicMotif = 'helmet' | 'car' | 'circuit' | 'tire' | 'steering' | 'speed' | 'checker' | 'burst'

const NAMED_COLORS: Record<string, string> = {
  black: '#101012', white: '#F7F5EF', orange: '#FF5A1F', red: '#D8432B', crimson: '#B3242B',
  yellow: '#FFD43B', gold: '#D9A441', blue: '#2E63E7', navy: '#16223D', 'royal blue': '#2A46C9',
  'sky blue': '#7FB2E5', green: '#2E9E5B', mint: '#7FD8B0', teal: '#1F8A8A', purple: '#6A3FD1',
  violet: '#7A4FE0', pink: '#E77FB3', magenta: '#C33FA0', grey: '#8A8A8E', gray: '#8A8A8E',
  silver: '#C7CBD1', charcoal: '#2A2A2E', cream: '#EFE6D2', lime: '#9BE04A', turquoise: '#33C3C3',
}

const MOTIF_KEYWORDS: [GraphicMotif, RegExp][] = [
  ['helmet', /helmet|visor|driver|rider/],
  ['car', /car|f1|formula|vehicle|chassis|gp|race ?car/],
  ['circuit', /circuit|track|map|asphalt|route/],
  ['tire', /tire|tyre|wheel|rubber|tread/],
  ['steering', /steering|cockpit|wheel/],
  ['checker', /check|flag|grid|finish/],
  ['burst', /burst|star|explosion|impact|explosive/],
  ['speed', /speed|fast|motion|race|racing|turbo|drift|aero|night|tokyo|street/],
]

export function parseGraphicPrompt(prompt: string): ParsedGraphicPrompt {
  const lower = prompt.toLowerCase()
  // first-mentioned color = primary, next distinct = secondary
  const names = Object.keys(NAMED_COLORS).sort((a, b) => b.length - a.length)
  const found: { name: string; idx: number }[] = []
  for (const name of names) {
    const idx = lower.indexOf(name)
    if (idx !== -1) found.push({ name, idx })
  }
  const ordered = found.sort((a, b) => a.idx - b.idx).map((f) => NAMED_COLORS[f.name])
  const primary = ordered[0] ?? '#FF5A1F'
  const secondary = ordered.find((c) => c !== primary) ?? '#F7F5EF'
  const light = ordered[2] ?? (isDark(primary) ? '#F7F5EF' : '#101012')

  const motifs: GraphicMotif[] = []
  for (const [motif, re] of MOTIF_KEYWORDS) {
    if (re.test(lower) && !motifs.includes(motif)) motifs.push(motif)
  }
  if (motifs.length === 0) motifs.push('car', 'speed')

  const mood: ParsedGraphicPrompt['mood'] = /night|dark|midnight|black/.test(lower)
    ? 'night'
    : /mono|minimal|white/.test(lower)
      ? 'mono'
      : 'bright'

  return { palette: { primary, secondary, light, dark: isDark(primary) ? '#0D0D0E' : '#141416' }, motifs, mood }
}

function isDark(hex: string): boolean {
  const n = hex.replace('#', '')
  const r = parseInt(n.slice(0, 2), 16)
  const g = parseInt(n.slice(2, 4), 16)
  const b = parseInt(n.slice(4, 6), 16)
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.45
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

/* ── Motif builders (each returns SVG fragments in a 1024×1024 box) ── */

function svgHelmet(p: typeof NAMED_COLORS[string], s: string, l: string, rand: () => number): string {
  const tilt = (rand() - 0.5) * 10
  return `<g transform="rotate(${tilt.toFixed(1)} 512 512)">
    <path fill="${p}" d="M512 210c-150 0-252 108-252 254v96c0 40 26 66 66 66h200l150-120c30-24 44-52 44-88 0-124-84-208-208-208z"/>
    <path fill="${s}" d="M512 258c-116 0-196 82-204 196l176 0 158-118c-32-50-76-78-130-78z" opacity="0.9"/>
    <path fill="${l}" d="M484 454h236c14 0 20 10 12 22l-74 104c-8 12-22 18-36 18H484c-12 0-20-8-20-20v-104c0-12 8-20 20-20z" opacity="0.95"/>
    <rect x="440" y="600" width="260" height="26" rx="13" fill="${s}"/>
    <path fill="none" stroke="${l}" stroke-width="8" stroke-linecap="round" d="M340 330c40-70 110-108 190-112" opacity="0.5"/>
  </g>`
}

function svgCar(p: typeof NAMED_COLORS[string], s: string, l: string, rand: () => number): string {
  const flip = rand() > 0.5 ? -1 : 1
  return `<g transform="scale(${flip},1) translate(${flip === 1 ? 0 : -1024} 0)">
    <path fill="${p}" d="M120 600c0-44 30-70 78-84l96-118c34-42 78-64 138-64h180c74 0 122 30 156 88l44 74 88 26c48 14 70 40 70 78v40c0 22-14 36-36 36H156c-22 0-36-14-36-36z"/>
    <path fill="${l}" d="M330 508l74-96c26-34 58-50 104-50h64l-24 146z" opacity="0.92"/>
    <path fill="${s}" d="M610 362h84c46 0 78 18 102 54l20 32-206 60z" opacity="0.85"/>
    <circle cx="268" cy="672" r="86" fill="${s}"/><circle cx="268" cy="672" r="40" fill="${l}"/>
    <circle cx="772" cy="672" r="86" fill="${s}"/><circle cx="772" cy="672" r="40" fill="${l}"/>
    <rect x="120" y="712" width="784" height="14" rx="7" fill="${s}" opacity="0.6"/>
  </g>`
}

function svgCircuit(p: string, s: string, rand: () => number): string {
  const r = rand
  const pts: string[] = []
  const cx = 512
  const cy = 512
  const arms = 5 + Math.floor(r() * 3)
  for (let i = 0; i < arms; i++) {
    const a = (i / arms) * Math.PI * 2 + r() * 0.5
    const rad = 220 + r() * 150
    pts.push(`${(cx + Math.cos(a) * rad).toFixed(0)},${(cy + Math.sin(a) * rad).toFixed(0)}`)
  }
  const path = `M${pts.join(' L')} Z`
  return `<g fill="none" stroke-linejoin="round" stroke-linecap="round">
    <path d="${path}" stroke="${p}" stroke-width="64"/>
    <path d="${path}" stroke="${s}" stroke-width="10" stroke-dasharray="30 26"/>
    <circle cx="${pts[0].split(',')[0]}" cy="${pts[0].split(',')[1]}" r="26" fill="${s}" stroke="none"/>
  </g>`
}

function svgTire(p: string, s: string, l: string, rand: () => number): string {
  const rot = rand() * 40
  const spokes = Array.from({ length: 12 }, (_, i) => {
    const a = (i / 12) * Math.PI * 2
    const x1 = 512 + Math.cos(a) * 250
    const y1 = 512 + Math.sin(a) * 250
    const x2 = 512 + Math.cos(a) * 330
    const y2 = 512 + Math.sin(a) * 330
    return `<line x1="${x1.toFixed(0)}" y1="${y1.toFixed(0)}" x2="${x2.toFixed(0)}" y2="${y2.toFixed(0)}" stroke="${s}" stroke-width="26"/>`
  }).join('')
  return `<g transform="rotate(${rot.toFixed(0)} 512 512)">
    <circle cx="512" cy="512" r="360" fill="${p}"/>
    <circle cx="512" cy="512" r="360" fill="none" stroke="${s}" stroke-width="18"/>
    ${spokes}
    <circle cx="512" cy="512" r="180" fill="${l}" opacity="0.14"/>
    <circle cx="512" cy="512" r="120" fill="${s}"/>
    <circle cx="512" cy="512" r="46" fill="${p}"/>
  </g>`
}

function svgSteering(p: string, s: string, l: string): string {
  return `<g>
    <circle cx="512" cy="512" r="340" fill="none" stroke="${p}" stroke-width="72"/>
    <circle cx="512" cy="512" r="130" fill="${s}"/>
    <circle cx="512" cy="512" r="52" fill="${l}"/>
    <rect x="480" y="560" width="64" height="290" rx="30" fill="${p}"/>
    <rect x="140" y="480" width="260" height="62" rx="30" fill="${p}" transform="rotate(18 270 511)"/>
    <rect x="624" y="480" width="260" height="62" rx="30" fill="${p}" transform="rotate(-18 754 511)"/>
  </g>`
}

function svgSpeed(p: string, s: string, l: string, rand: () => number): string {
  const rows = 7 + Math.floor(rand() * 4)
  let out = ''
  for (let i = 0; i < rows; i++) {
    const y = 180 + (i / rows) * 660 + (rand() - 0.5) * 30
    const w = 260 + rand() * 560
    const x = 120 + rand() * 200
    const h = 14 + rand() * 26
    const c = [p, s, l][i % 3]
    out += `<rect x="${x.toFixed(0)}" y="${y.toFixed(0)}" width="${w.toFixed(0)}" height="${h.toFixed(0)}" rx="${(h / 2).toFixed(0)}" fill="${c}"/>`
  }
  return `<g>${out}</g>`
}

function svgChecker(s: string, rand: () => number): string {
  const y = 400 + rand() * 200
  const cell = 52
  let out = ''
  for (let i = 0; i < 16; i++) {
    for (let j = 0; j < 3; j++) {
      if ((i + j) % 2 === 0) {
        out += `<rect x="${140 + i * cell}" y="${y + j * cell}" width="${cell}" height="${cell}" fill="${s}"/>`
      }
    }
  }
  return `<g>${out}</g>`
}

function svgBurst(p: string, s: string, rand: () => number): string {
  const rays = 12
  let out = ''
  for (let i = 0; i < rays; i++) {
    const a = (i / rays) * Math.PI * 2 + rand() * 0.2
    const r1 = 190 + rand() * 40
    const r2 = 380 + rand() * 70
    const w = 10 + rand() * 22
    out += `<line x1="${(512 + Math.cos(a) * r1).toFixed(0)}" y1="${(512 + Math.sin(a) * r1).toFixed(0)}" x2="${(512 + Math.cos(a) * r2).toFixed(0)}" y2="${(512 + Math.sin(a) * r2).toFixed(0)}" stroke="${i % 2 ? p : s}" stroke-width="${w.toFixed(0)}" stroke-linecap="round"/>`
  }
  return `<g>${out}<circle cx="512" cy="512" r="130" fill="${p}"/><circle cx="512" cy="512" r="60" fill="${s}"/></g>`
}

const MOTIF_SVG: Record<GraphicMotif, (p: string, s: string, l: string, rand: () => number) => string> = {
  helmet: (p, s, l, r) => svgHelmet(p, s, l, r),
  car: (p, s, l, r) => svgCar(p, s, l, r),
  circuit: (p, s, _l, r) => svgCircuit(p, s, r),
  tire: (p, s, l, r) => svgTire(p, s, l, r),
  steering: (p, s, l) => svgSteering(p, s, l),
  speed: (p, s, l, r) => svgSpeed(p, s, l, r),
  checker: (_p, s, _l, r) => svgChecker(s, r),
  burst: (p, s, _l, r) => svgBurst(p, s, r),
}

export interface GeneratedGraphicSVG {
  svg: string
  name: string
}

/** Generate `count` original graphic variations for a prompt. */
export function generateGraphicSVGs(prompt: string, count: number, garmentColor?: string): GeneratedGraphicSVG[] {
  const parsed = parseGraphicPrompt(prompt)
  // keep the primary motif readable against the garment it will print on
  if (garmentColor && colorDistance(parsed.palette.primary, garmentColor) < 0.22) {
    const alt = parsed.palette.secondary
    parsed.palette.secondary = parsed.palette.primary
    parsed.palette.primary = alt
  }
  const out: GeneratedGraphicSVG[] = []
  for (let i = 0; i < count; i++) {
    const rand = mulberry32(hashStr(prompt) + i * 7919)
    const primary = parsed.palette.primary
    const secondary = i % 2 === 0 ? parsed.palette.secondary : parsed.palette.light
    const light = i % 2 === 0 ? parsed.palette.light : parsed.palette.secondary

    const primaryMotif = parsed.motifs[i % parsed.motifs.length]
    const accentMotif: GraphicMotif = parsed.motifs.length > 1 ? parsed.motifs[(i + 1) % parsed.motifs.length] : 'speed'

    const main = MOTIF_SVG[primaryMotif](primary, secondary, light, rand)
    const accent = MOTIF_SVG[accentMotif](secondary, primary, light, rand)
    const scaleMain = primaryMotif === 'speed' || primaryMotif === 'checker' ? 1 : 0.72
    const ty = primaryMotif === 'speed' || primaryMotif === 'checker' ? 0 : (rand() * 60 - 20).toFixed(0)
    const rot = (rand() * 8 - 4).toFixed(1)

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
  <g transform="translate(512 512) scale(${scaleMain.toFixed(2)}) rotate(${rot}) translate(-512 -512) translate(0 ${ty})">${main}</g>
  <g transform="translate(0 ${(rand() * 240 + 620).toFixed(0)}) scale(0.9)" opacity="0.9">${accent}</g>
</svg>`
    out.push({ svg, name: `${motifLabel(primaryMotif)} graphic ${i + 1}` })
  }
  return out
}

function motifLabel(m: GraphicMotif): string {
  const labels: Record<GraphicMotif, string> = {
    helmet: 'Helmet',
    car: 'Race car',
    circuit: 'Circuit',
    tire: 'Tire',
    steering: 'Steering',
    speed: 'Speed lines',
    checker: 'Checkers',
    burst: 'Burst',
  }
  return labels[m]
}

function hashStr(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function hexToRgb(hex: string): [number, number, number] {
  const n = hex.replace('#', '')
  return [parseInt(n.slice(0, 2), 16), parseInt(n.slice(2, 4), 16), parseInt(n.slice(4, 6), 16)]
}

function colorDistance(a: string, b: string): number {
  const [r1, g1, b1] = hexToRgb(a)
  const [r2, g2, b2] = hexToRgb(b)
  return Math.hypot(r1 - r2, g1 - g2, b1 - b2) / 441
}
