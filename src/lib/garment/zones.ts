/**
 * Placement zones — regions of the garment where artwork can live.
 *
 * Each zone is a rectangle in the UV texture space of a garment part
 * ("torso" | "sleeve-l" | "sleeve-r"). Because prints are baked into the
 * part's own surface texture (color + roughness), they follow the cloth
 * exactly — folds, lighting, curvature — instead of floating like decals.
 *
 * UV layout per part:
 * - torso: u wraps around the body, u=0 at back center → 0.25 wearer-right
 *   side → 0.5 front center → 0.75 wearer-left side → 1 back center.
 *   v = height, 0 at hem → 1 at neck.
 * - sleeves: u wraps the sleeve, u=0.5 at the outer face; v runs
 *   shoulder(1) → cuff(0).
 */

export type GarmentPart = 'body-front' | 'body-back' | 'sleeve-l' | 'sleeve-r' | 'sneaker-upper'

export type Zone = 'front' | 'back' | 'left-chest' | 'right-chest' | 'left-sleeve' | 'right-sleeve' | 'toe' | 'vamp' | 'side-panel' | 'heel' | 'logo'

export const ZONE_IDS: Zone[] = ['front', 'back', 'left-chest', 'right-chest', 'left-sleeve', 'right-sleeve']

export const SNEAKER_ZONE_IDS: Zone[] = ['toe', 'vamp', 'side-panel', 'heel', 'logo']

export interface ZoneDef {
  id: Zone
  label: string
  short: string
  part: GarmentPart
  /** u range of the zone. Back wraps past 1.0 (mod 1). */
  u0: number
  u1: number
  /** v range: v0 = lower edge, v1 = upper edge. */
  v0: number
  v1: number
  /** Camera view to switch to when editing this zone. */
  view: 'front' | 'back' | 'left' | 'right'
}

export const ZONES: Record<Zone, ZoneDef> = {
  front: { id: 'front', label: 'Front', short: 'F', part: 'body-front', u0: 0.32, u1: 0.68, v0: 0.22, v1: 0.85, view: 'front' },
  back: { id: 'back', label: 'Back', short: 'B', part: 'body-back', u0: 0.32, u1: 0.68, v0: 0.24, v1: 0.88, view: 'back' },
  'left-chest': { id: 'left-chest', label: 'Left Chest', short: 'LC', part: 'body-front', u0: 0.56, u1: 0.68, v0: 0.56, v1: 0.76, view: 'front' },
  'right-chest': { id: 'right-chest', label: 'Right Chest', short: 'RC', part: 'body-front', u0: 0.32, u1: 0.44, v0: 0.56, v1: 0.76, view: 'front' },
  'left-sleeve': { id: 'left-sleeve', label: 'Left Sleeve', short: 'LS', part: 'sleeve-l', u0: 0.4, u1: 0.6, v0: 0.18, v1: 0.68, view: 'left' },
  'right-sleeve': { id: 'right-sleeve', label: 'Right Sleeve', short: 'RS', part: 'sleeve-r', u0: 0.4, u1: 0.6, v0: 0.18, v1: 0.68, view: 'right' },
  // sneaker artwork regions (upper part, t = heel 0 → toe 1)
  toe: { id: 'toe', label: 'Toe', short: 'TOE', part: 'sneaker-upper', u0: 0.72, u1: 1, v0: 0.05, v1: 0.55, view: 'front' },
  vamp: { id: 'vamp', label: 'Vamp', short: 'VMP', part: 'sneaker-upper', u0: 0.42, u1: 0.75, v0: 0.05, v1: 0.5, view: 'front' },
  'side-panel': { id: 'side-panel', label: 'Side Panel', short: 'SIDE', part: 'sneaker-upper', u0: 0.15, u1: 0.62, v0: 0.3, v1: 0.75, view: 'left' },
  heel: { id: 'heel', label: 'Heel', short: 'HEEL', part: 'sneaker-upper', u0: 0, u1: 0.2, v0: 0.2, v1: 0.8, view: 'back' },
  logo: { id: 'logo', label: 'Logo Region', short: 'LOGO', part: 'sneaker-upper', u0: 0.2, u1: 0.45, v0: 0.4, v1: 0.72, view: 'left' },
}

/** Which side of the garment a zone is on (for documents saved pre-V2). */
export function zoneToLegacySide(zone: Zone): 'front' | 'back' {
  return zone === 'back' ? 'back' : 'front'
}

export function legacySideToZone(side: 'front' | 'back' | string | undefined): Zone {
  return side === 'back' ? 'back' : 'front'
}

export function zonesForPart(part: GarmentPart): Zone[] {
  return ZONE_IDS.filter((z) => ZONES[z].part === part)
}

/** Zones for a sneaker part ('sneaker-upper' currently). */
export function zonesForSneakerPart(part: string): Zone[] {
  if (part !== 'sneaker-upper') return []
  return SNEAKER_ZONE_IDS
}

/** True when the zone spans across u=1/0 (the back zone does). */
export function zoneWraps(zone: ZoneDef): boolean {
  return zone.u1 > 1
}

/** Map design x (0..1, left→right as the viewer sees it) to surface u. */
export function zoneU(zone: ZoneDef, x: number): number {
  const u = zone.u0 + x * (zone.u1 - zone.u0)
  return ((u % 1) + 1) % 1
}
