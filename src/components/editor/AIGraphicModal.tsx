'use client'

import { useState } from 'react'
import { Modal } from '@/components/shared/Modal'
import { Spinner } from '@/components/shared/Spinner'
import { toast } from '@/components/shared/Toast'
import { useEditorStore } from '@/stores/editor-store'
import { createGraphicLayer } from '@/lib/design/defaults'
import { ZONES, ZONE_IDS } from '@/lib/garment/zones'

const EXAMPLES = [
  'Formula racing car speeding through Tokyo at night, black and orange',
  'Racing helmet with aggressive orange speed lines',
  'Night circuit track map, minimal white lines',
  'Tire tread burst, charcoal and racing yellow',
]

interface Variation {
  assetId: string
  src: string
  name: string
}

/**
 * CREATE GRAPHIC — focused AI panel. Generates several original,
 * racing-inspired variations; the chosen one becomes an editable graphic
 * layer in the selected placement zone.
 */
export function AIGraphicModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const activeZone = useEditorStore((s) => s.activeZone)
  const garmentColor = useEditorStore((s) => s.doc.garment.color)
  const addLayer = useEditorStore((s) => s.addLayer)
  const [prompt, setPrompt] = useState('')
  const [style, setStyle] = useState('racing')
  const [zone, setZone] = useState(activeZone)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [variations, setVariations] = useState<Variation[] | null>(null)
  const [picked, setPicked] = useState<string | null>(null)

  async function generate() {
    if (loading) return
    setError(null)
    setVariations(null)
    if (prompt.trim().length < 4) {
      setError('Describe the graphic in a few words.')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/ai/generate-graphic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt.trim(), style, variations: 3, garmentColor }),
      })
      const body = (await res.json()) as { variations?: Variation[]; error?: { message: string } }
      if (!res.ok || !body.variations) throw new Error(body.error?.message ?? 'Generation failed.')
      setVariations(body.variations)
      setPicked(body.variations[0]?.assetId ?? null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed.')
    } finally {
      setLoading(false)
    }
  }

  function addToShirt() {
    const v = variations?.find((x) => x.assetId === picked)
    if (!v) {
      toast.error('Pick a variation first.')
      return
    }
    addLayer(
      createGraphicLayer(zone, { id: v.assetId, src: v.src, aspect: 1 }, { name: v.name, y: 0.45 }),
    )
    toast.success(`Graphic added to ${ZONES[zone].label} — drag it on the shirt to place.`)
    onClose()
    setVariations(null)
    setPicked(null)
  }

  return (
    <Modal open={open} onClose={onClose} title="Create Graphic" width={600}>
      <label className="label mb-1.5 block" htmlFor="graphic-prompt">
        Describe your design
      </label>
      <textarea
        id="graphic-prompt"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        rows={3}
        placeholder="e.g. A futuristic racing car inspired by high-speed motorsport, black and orange"
        className="input resize-none text-sm"
        disabled={loading}
      />
      <div className="mt-2 flex flex-wrap gap-1.5">
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            onClick={() => setPrompt(ex)}
            className="rounded-full border border-afra-border px-2.5 py-1 text-[10px] text-afra-muted transition-colors hover:border-afra-orange/60 hover:text-afra-white"
            disabled={loading}
          >
            {ex.length > 44 ? `${ex.slice(0, 44)}…` : ex}
          </button>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div>
          <label className="label mb-1.5 block" htmlFor="graphic-style">
            Style
          </label>
          <select id="graphic-style" value={style} onChange={(e) => setStyle(e.target.value)} className="input cursor-pointer text-sm" disabled={loading}>
            <option value="racing">Racing</option>
            <option value="street">Street</option>
            <option value="minimal">Minimal</option>
            <option value="retro">Retro</option>
            <option value="technical">Technical</option>
          </select>
        </div>
        <div>
          <label className="label mb-1.5 block" htmlFor="graphic-zone">
            Placement
          </label>
          <select id="graphic-zone" value={zone} onChange={(e) => setZone(e.target.value as typeof zone)} className="input cursor-pointer text-sm">
            {ZONE_IDS.map((z) => (
              <option key={z} value={z}>
                {ZONES[z].label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-md border border-[rgba(224,82,82,0.4)] bg-[rgba(224,82,82,0.08)] px-3 py-2.5 text-xs leading-relaxed text-afra-danger">
          {error}
        </div>
      )}

      {loading && (
        <div className="mt-5 flex items-center justify-center gap-2 rounded-lg border border-afra-border bg-afra-surface py-8 text-xs text-afra-muted">
          <Spinner size={14} /> Generating variations…
        </div>
      )}

      {variations && (
        <div className="mt-4">
          <div className="label mb-2">Choose a variation</div>
          <div className="grid grid-cols-3 gap-2">
            {variations.map((v) => (
              <button
                key={v.assetId}
                onClick={() => setPicked(v.assetId)}
                className={`overflow-hidden rounded-lg border bg-afra-surface transition-colors ${
                  picked === v.assetId ? 'border-afra-orange' : 'border-afra-border hover:border-afra-muted'
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={v.src} alt={v.name} className="aspect-square w-full object-contain" draggable={false} />
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-5 flex items-center justify-between">
        <p className="max-w-[17rem] text-[10px] leading-snug text-afra-muted">
          Variations are original, racing-inspired graphics. The one you pick becomes an editable graphic layer — scale, rotate and recolor
          freely.
        </p>
        <div className="flex gap-2">
          <button onClick={onClose} className="btn-ghost px-3 py-2 text-xs">
            Cancel
          </button>
          {variations ? (
            <button onClick={addToShirt} disabled={!picked} className="btn-primary px-5 py-2 text-xs">
              Add to shirt
            </button>
          ) : (
            <button onClick={() => void generate()} disabled={loading} className="btn-primary px-5 py-2 text-xs">
              {loading ? (
                <>
                  <Spinner size={13} /> Generating…
                </>
              ) : (
                'Generate'
              )}
            </button>
          )}
        </div>
      </div>
    </Modal>
  )
}
