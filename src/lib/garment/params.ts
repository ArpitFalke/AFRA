/**
 * T-shirt variant system. Every selection produces a genuinely different
 * garment — dimensions feed the parametric geometry builder, so
 * Oversized vs Slim are different meshes, not relabeled ones.
 */

export type Gender = 'mens' | 'womens'
export type Fit = 'oversized' | 'regular' | 'slim' | 'cropped' | 'boxy' | 'longline'
export type SleeveLen = 'half' | 'full'

export interface TShirtVariant {
  gender: Gender
  fit: Fit
  sleeve: SleeveLen
}

export const GENDERS: { id: Gender; label: string }[] = [
  { id: 'mens', label: 'Men' },
  { id: 'womens', label: 'Women' },
]

export const FITS: { id: Fit; label: string; description: string; soon?: boolean }[] = [
  { id: 'oversized', label: 'Oversized', description: 'Relaxed drape, wider body' },
  { id: 'regular', label: 'Regular', description: 'Classic everyday cut' },
  { id: 'slim', label: 'Slim', description: 'Close, tailored fit' },
  { id: 'cropped', label: 'Cropped', description: 'Shortened hem', soon: true },
  { id: 'boxy', label: 'Boxy', description: 'Square, wide profile', soon: true },
  { id: 'longline', label: 'Longline', description: 'Extended length', soon: true },
]

export const SLEEVES: { id: SleeveLen; label: string }[] = [
  { id: 'half', label: 'Half Sleeve' },
  { id: 'full', label: 'Full Sleeve' },
]

export type JerseySport = 'football' | 'basketball' | 'racing' | 'esports'

export const JERSEY_SPORTS: { id: JerseySport; label: string; description: string }[] = [
  { id: 'football', label: 'Football', description: 'Short sleeve, crew collar' },
  { id: 'basketball', label: 'Basketball', description: 'Sleeveless tank' },
  { id: 'racing', label: 'Racing', description: 'Snap-fit race cut' },
  { id: 'esports', label: 'Esports', description: 'Long sleeve, high collar' },
]

export const DEFAULT_VARIANT: TShirtVariant = { gender: 'mens', fit: 'regular', sleeve: 'half' }

export function variantKey(v: TShirtVariant): string {
  return `${v.gender}-${v.fit}-${v.sleeve}`
}

const JERSEY_DIMS: Record<JerseySport, Partial<GarmentDims>> = {
  football: { hemY: -0.84, chestHalfWidth: 0.52, waistHalfWidth: 0.5, neckScoop: 0.05, neckWidthFrac: 0.34, drapeAmp: 0.012 },
  basketball: { hemY: -0.88, chestHalfWidth: 0.54, waistHalfWidth: 0.53, shoulderHalfWidth: 0.54, neckScoop: 0.075, neckWidthFrac: 0.42, sleeveless: true, drapeAmp: 0.008 },
  racing: { hemY: -0.8, chestHalfWidth: 0.49, waistHalfWidth: 0.46, neckScoop: 0.035, neckWidthFrac: 0.26, drapeAmp: 0.007, sleeveLength: 0.34, sleeveCuffRadius: 0.1 },
  esports: { hemY: -0.8, chestHalfWidth: 0.5, waistHalfWidth: 0.48, neckScoop: 0.03, neckWidthFrac: 0.24, drapeAmp: 0.008, sleeveLength: 0.6, sleeveCuffRadius: 0.09, sleeveAngle: 0.72 },
}

export function isJerseyVariant(key: string): boolean {
  return key.startsWith('jersey-')
}

export function jerseyDimsFor(key: string): GarmentDims {
  const sport = (key.replace('jersey-', '') || 'football') as JerseySport
  const base = getDims({ gender: 'mens', fit: 'regular', sleeve: 'half' })
  const overridden = { ...base, ...(JERSEY_DIMS[sport] ?? JERSEY_DIMS.football) }
  return overridden
}

export function parseVariantKey(key: string | undefined | null): TShirtVariant {
  if (!key) return { ...DEFAULT_VARIANT }
  const [gender, fit, sleeve] = key.split('-')
  const validGender = gender === 'womens' ? 'womens' : 'mens'
  const validFit = FITS.some((f) => f.id === fit) ? (fit as Fit) : 'regular'
  const validSleeve = sleeve === 'full' ? 'full' : 'half'
  return { gender: validGender, fit: validFit, sleeve: validSleeve }
}

/** Garment dimensions in world units (shirt height ≈ 1.6). */
export interface GarmentDims {
  /** Tank tops (basketball) have no sleeves. */
  sleeveless?: boolean
  /** Neck opening half-width as a fraction of the shoulder line. */
  neckWidthFrac?: number
  /** y of hem (negative = below origin). */
  hemY: number
  /** y of shoulder line. */
  shoulderY: number
  /** half-widths at key heights. */
  hemHalfWidth: number
  waistHalfWidth: number
  chestHalfWidth: number
  shoulderHalfWidth: number
  /** front-back half-depth ratio relative to half-width. */
  depthRatio: number
  neckRadius: number
  /** extra neckline scoop at the front (crew neck). */
  neckScoop: number
  /** vertical drop of shoulder seam from neck level. */
  shoulderDrop: number
  sleeveLength: number
  sleeveStartRadius: number
  sleeveCuffRadius: number
  sleeveAngle: number // radians from vertical
  /** vertical drape fold amplitude at hem. */
  drapeAmp: number
  drapeCount: number
  /** how much the hem flares versus the waist. */
  hemFlare: number
}

const BASE: GarmentDims = {
  hemY: -0.78,
  shoulderY: 0.62,
  hemHalfWidth: 0.5,
  waistHalfWidth: 0.47,
  chestHalfWidth: 0.5,
  shoulderHalfWidth: 0.52,
  depthRatio: 0.56,
  neckRadius: 0.13,
  neckScoop: 0.028,
  shoulderDrop: 0.1,
  sleeveLength: 0.36,
  sleeveStartRadius: 0.12,
  sleeveCuffRadius: 0.105,
  sleeveAngle: 0.88,
  drapeAmp: 0.01,
  drapeCount: 6,
  hemFlare: 1.04,
}

const FIT_OVERRIDES: Record<Fit, Partial<GarmentDims>> = {
  oversized: {
    hemHalfWidth: 0.6,
    waistHalfWidth: 0.58,
    chestHalfWidth: 0.58,
    shoulderHalfWidth: 0.6,
    hemY: -0.86,
    drapeAmp: 0.014,
    drapeCount: 6,
    hemFlare: 1.02,
    sleeveStartRadius: 0.14,
    sleeveCuffRadius: 0.125,
    sleeveLength: 0.4,
  },
  regular: {},
  slim: {
    hemHalfWidth: 0.44,
    waistHalfWidth: 0.42,
    chestHalfWidth: 0.47,
    shoulderHalfWidth: 0.5,
    drapeAmp: 0.006,
    drapeCount: 5,
    hemFlare: 1.05,
    sleeveStartRadius: 0.115,
    sleeveCuffRadius: 0.095,
  },
  cropped: {
    hemY: -0.42,
    hemHalfWidth: 0.54,
    hemFlare: 1.06,
  },
  boxy: {
    hemHalfWidth: 0.58,
    waistHalfWidth: 0.58,
    chestHalfWidth: 0.56,
    shoulderHalfWidth: 0.58,
    hemY: -0.66,
    drapeAmp: 0.016,
    hemFlare: 1.0,
  },
  longline: {
    hemY: -0.98,
    hemHalfWidth: 0.48,
    drapeAmp: 0.016,
  },
}

const GENDER_OVERRIDES: Record<Gender, Partial<GarmentDims>> = {
  mens: {},
  womens: {
    shoulderHalfWidth: 0.46,
    chestHalfWidth: 0.47,
    waistHalfWidth: 0.4,
    hemHalfWidth: 0.46,
    neckScoop: 0.075,
    depthRatio: 0.52,
    sleeveAngle: 0.82,
  },
}

const SLEEVE_OVERRIDES: Record<SleeveLen, Partial<GarmentDims>> = {
  half: {},
  full: {
    sleeveLength: 0.62,
    sleeveCuffRadius: 0.09,
    sleeveAngle: 0.76,
  },
}

export function getDims(variant: TShirtVariant): GarmentDims {
  return {
    ...BASE,
    ...FIT_OVERRIDES[variant.fit],
    ...GENDER_OVERRIDES[variant.gender],
    ...SLEEVE_OVERRIDES[variant.sleeve],
  }
}
