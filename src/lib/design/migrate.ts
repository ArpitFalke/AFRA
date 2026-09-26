import type { DesignDocument, DesignLayer } from './types'
import { legacySideToZone } from '@/lib/garment/zones'
import { parseVariantKey, variantKey } from '@/lib/garment/params'

/**
 * Brings older documents up to the current schema (V2):
 * - layers without a zone get one derived from their legacy `side`
 * - garment gains variant/opacity; old material ids map to V2 presets
 */
export function migrateDoc(raw: DesignDocument): DesignDocument {
  const doc: DesignDocument = {
    ...raw,
    garment: {
      color: raw.garment?.color ?? '#141416',
      material: mapLegacyMaterial(raw.garment?.material),
      variant: variantKey(parseVariantKey(raw.garment?.variant)),
      opacity: raw.garment?.opacity ?? 1,
      ...(raw.garment?.fabricOverride ? { fabricOverride: raw.garment.fabricOverride } : {}),
    },
    layers: (raw.layers ?? []).map((l) => migrateLayer(l)),
    scene: raw.scene ?? { background: 'studio', customBackground: '#0D0D0E', floor: true },
    lighting: raw.lighting ?? { preset: 'studio', intensity: 1, shadow: true },
  }
  return doc
}

function migrateLayer(l: DesignLayer): DesignLayer {
  if (l.zone) return { ...l, side: l.side ?? 'front' }
  const zone = legacySideToZone((l as { side?: string }).side)
  return { ...l, zone, side: zone === 'back' ? 'back' : 'front' } as DesignLayer
}

const LEGACY_MATERIAL_MAP: Record<string, string> = {
  cotton: 'cotton',
  'sport-poly': 'performance',
  heavy: 'heavy-cotton',
  vintage: 'washed',
}

function mapLegacyMaterial(id: string | undefined): string {
  if (!id) return 'cotton'
  return LEGACY_MATERIAL_MAP[id] ?? id
}
