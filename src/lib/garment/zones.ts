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

export type GarmentPart = 'torso' | 'sleeve-l' | 'sleeve-r'

export type Zone = 'front' | 'back' | 'left-chest' | 'right-chest' | 'left-sleeve' | 'right-sleeve'

export const ZONE_IDS: Zone[] = ['front', 'back', 'left-chest', 'right-chest', 'left-sleeve', 'right-sleeve']

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
  front: { id: 'front', label: 'Front', short: 'F', part: 'torso', u0: 0.31, u1: 0.69, v0: 0.26, v1: 0.88, view: 'front' },
  back: { id: 'back', label: 'Back', short: 'B', part: 'torso', u0: 0.81, u1: 1.19, v0: 0.3, v1: 0.92, view: 'back' },
  'left-chest': { id: 'left-chest', label: 'Left Chest', short: 'LC', part: 'torso', u0: 0.565, u1: 0.675, v0: 0.62, v1: 0.8, view: 'front' },
  'right-chest': { id: 'right-chest', label: 'Right Chest', short: 'RC', part: 'torso', u0: 0.325, u1: 0.435, v0: 0.62, v1: 0.8, view: 'front' },
  'left-sleeve': { id: 'left-sleeve', label: 'Left Sleeve', short: 'LS', part: 'sleeve-l', u0: 0.405, u1: 0.595, v0: 0.2, v1: 0.7, view: 'left' },
  'right-sleeve': { id: 'right-sleeve', label: 'Right Sleeve', short: 'RS', part: 'sleeve-r', u0: 0.405, u1: 0.595, v0: 0.2, v1: 0.7, view: 'right' },
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

/** True when the zone spans across u=1/0 (the back zone does). */
export function zoneWraps(zone: ZoneDef): boolean {
  return zone.u1 > 1
}

/** Map design x (0..1, left→right as the viewer sees it) to surface u. */
export function zoneU(zone: ZoneDef, x: number): number {
  const u = zone.u0 + x * (zone.u1 - zone.u0)
  return ((u % 1) + 1) % 1
}
