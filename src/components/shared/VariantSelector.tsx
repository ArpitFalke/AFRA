'use client'

import { GENDERS, FITS, SLEEVES, parseVariantKey, variantKey, type Fit, type SleeveLen, type TShirtVariant } from '@/lib/garment/params'
import { GarmentThumb } from '@/components/shared/GarmentThumb'

/**
 * Visual T-shirt model selector — gender toggle, fit cards and sleeve
 * cards with real silhouette thumbnails. Used on the setup screen and in
 * the editor's Garment panel.
 */
export function VariantSelector({
  value,
  onChange,
  allowSoon = false,
}: {
  value: TShirtVariant
  onChange: (v: TShirtVariant) => void
  allowSoon?: boolean
}) {
  const v = parseVariantKey(variantKey(value))

  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="label mb-1.5">Gender</div>
        <div className="grid grid-cols-2 gap-2">
          {GENDERS.map((g) => {
            const active = v.gender === g.id
            return (
              <button
                key={g.id}
                onClick={() => onChange({ ...v, gender: g.id })}
                className={`flex items-center justify-center gap-2.5 rounded-lg border py-2.5 transition-colors ${
                  active ? 'border-afra-orange bg-afra-orange/10 text-afra-orange' : 'border-afra-border bg-afra-surface text-afra-white/80 hover:bg-afra-hover'
                }`}
              >
                <GarmentThumb variant={{ ...v, gender: g.id }} color={active ? '#5a2a18' : '#26262b'} size={34} />
                <span className="text-xs font-medium">{g.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <div className="label mb-1.5">Fit</div>
        <div className="grid grid-cols-3 gap-2">
          {FITS.map((f) => {
            const active = v.fit === f.id
            const disabled = f.soon && !allowSoon
            return (
              <button
                key={f.id}
                disabled={disabled}
                onClick={() => onChange({ ...v, fit: f.id as Fit })}
                className={`flex flex-col items-center rounded-lg border px-1.5 py-2.5 transition-colors ${
                  disabled
                    ? 'cursor-not-allowed border-afra-border/50 text-afra-muted/40'
                    : active
                      ? 'border-afra-orange bg-afra-orange/10'
                      : 'border-afra-border bg-afra-surface hover:bg-afra-hover'
                }`}
                title={f.description}
              >
                <GarmentThumb variant={{ ...v, fit: f.id }} color={active ? '#5a2a18' : disabled ? '#1d1d20' : '#26262b'} size={44} />
                <span className={`mt-1 text-[10px] font-medium ${active ? 'text-afra-orange' : disabled ? '' : 'text-afra-white/80'}`}>{f.label}</span>
                {f.soon && <span className="text-[8px] uppercase tracking-wider text-afra-muted/50">Soon</span>}
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <div className="label mb-1.5">Sleeves</div>
        <div className="grid grid-cols-2 gap-2">
          {SLEEVES.map((s) => {
            const active = v.sleeve === s.id
            return (
              <button
                key={s.id}
                onClick={() => onChange({ ...v, sleeve: s.id as SleeveLen })}
                className={`flex items-center justify-center gap-2.5 rounded-lg border py-2.5 transition-colors ${
                  active ? 'border-afra-orange bg-afra-orange/10 text-afra-orange' : 'border-afra-border bg-afra-surface text-afra-white/80 hover:bg-afra-hover'
                }`}
              >
                <GarmentThumb variant={{ ...v, sleeve: s.id }} color={active ? '#5a2a18' : '#26262b'} size={38} />
                <span className="text-xs font-medium">{s.label}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
