'use client'

import { useState } from 'react'
import { ColorRow, SectionTitle, Segmented, SelectRow, SliderRow, TextInputRow } from '@/components/shared/Controls'
import { FONTS } from '@/lib/design/fonts'
import type { LightingPreset } from '@/lib/design/types'
import { MATERIAL_PRESETS, getMaterialPreset, type WeaveType } from '@/lib/garment/materials'
import { ZONES, ZONE_IDS } from '@/lib/garment/zones'
import { selectedLayer, useEditorStore } from '@/stores/editor-store'
import { toast } from '@/components/shared/Toast'

export function PropertiesPanel() {
  const doc = useEditorStore((s) => s.doc)
  const sel = useEditorStore(selectedLayer)
  const setGarment = useEditorStore((s) => s.setGarment)
  const setScene = useEditorStore((s) => s.setScene)
  const setLighting = useEditorStore((s) => s.setLighting)
  const updateLayer = useEditorStore((s) => s.updateLayer)
  const duplicateLayer = useEditorStore((s) => s.duplicateLayer)
  const deleteLayer = useEditorStore((s) => s.deleteLayer)
  const [advancedOpen, setAdvancedOpen] = useState(false)

  if (!sel) {
    const preset = getMaterialPreset(doc.garment.material)
    const o = doc.garment.fabricOverride ?? {}
    return (
      <div className="flex h-full flex-col gap-5 overflow-y-auto p-3.5">
        <div>
          <SectionTitle>Garment</SectionTitle>
          <ColorRow label="Color" value={doc.garment.color} onChange={(c) => setGarment({ color: c })} />
          <SelectRow
            label="Material"
            value={doc.garment.material}
            options={MATERIAL_PRESETS.map((m) => ({ value: m.id, label: m.name }))}
            onChange={(m) => setGarment({ material: m })}
          />
          <p className="mt-1 text-[10px] leading-snug text-afra-muted">{preset.description}</p>
          <SliderRow label="Roughness" value={o.roughness ?? preset.roughness} min={0.4} max={1} step={0.01} onChange={(v) => setGarment({ fabricOverride: { ...o, roughness: v } })} />
          <SliderRow label="Opacity" value={doc.garment.opacity ?? 1} min={0.3} max={1} step={0.01} format={(v) => `${Math.round(v * 100)}%`} onChange={(v) => setGarment({ opacity: v })} />
          <button onClick={() => setAdvancedOpen((v) => !v)} className="mt-1 text-[10px] uppercase tracking-wider text-afra-muted hover:text-afra-white">
            {advancedOpen ? '− Advanced' : '+ Advanced'}
          </button>
          {advancedOpen && (
            <div className="mt-1 rounded-lg border border-afra-border bg-afra-surface/50 p-2">
              <SelectRow
                label="Weave"
                value={preset.weave}
                options={[
                  { value: 'jersey', label: 'Jersey' },
                  { value: 'knit', label: 'Knit loops' },
                  { value: 'heavy', label: 'Heavy' },
                  { value: 'fine', label: 'Fine' },
                  { value: 'micro', label: 'Micro' },
                  { value: 'soft', label: 'Soft' },
                  { value: 'washed', label: 'Washed' },
                ]}
                onChange={(w) => setGarment({ material: materialForWeave(w as WeaveType) })}
              />
              <SliderRow label="Weave scale" value={o.weaveScale ?? preset.weaveScale} min={8} max={60} step={1} onChange={(v) => setGarment({ fabricOverride: { ...o, weaveScale: v } })} />
              <SliderRow label="Sheen" value={o.sheen ?? preset.sheen} min={0} max={1} step={0.01} onChange={(v) => setGarment({ fabricOverride: { ...o, sheen: v } })} />
              <SliderRow label="Relief" value={o.normalStrength ?? preset.normalScale} min={0} max={1.6} step={0.02} onChange={(v) => setGarment({ fabricOverride: { ...o, normalStrength: v } })} />
            </div>
          )}
        </div>
        <div>
          <SectionTitle>Scene</SectionTitle>
          <SelectRow
            label="Background"
            value={doc.scene.background}
            options={[
              { value: 'studio', label: 'Studio' },
              { value: 'dark', label: 'Dark' },
              { value: 'custom', label: 'Custom' },
            ]}
            onChange={(v) => setScene({ background: v as 'studio' | 'dark' | 'custom' })}
          />
          {doc.scene.background === 'custom' && <ColorRow label="Backdrop" value={doc.scene.customBackground} onChange={(c) => setScene({ customBackground: c })} />}
          <label className="flex cursor-pointer items-center justify-between py-1">
            <span className="text-xs text-afra-muted">Floor & reflection</span>
            <input type="checkbox" checked={doc.scene.floor} onChange={(e) => setScene({ floor: e.target.checked })} className="accent-[#FF5A1F]" />
          </label>
        </div>
        <div>
          <SectionTitle>Lighting</SectionTitle>
          <Segmented<LightingPreset>
            options={[
              { value: 'studio', label: 'Studio' },
              { value: 'dramatic', label: 'Dramatic' },
              { value: 'soft', label: 'Soft' },
            ]}
            value={doc.lighting.preset}
            onChange={(p) => setLighting({ preset: p })}
          />
          <SliderRow label="Intensity" value={doc.lighting.intensity} min={0.4} max={1.6} step={0.05} onChange={(v) => setLighting({ intensity: v })} />
          <label className="flex cursor-pointer items-center justify-between py-1">
            <span className="text-xs text-afra-muted">Contact shadow</span>
            <input type="checkbox" checked={doc.lighting.shadow} onChange={(e) => setLighting({ shadow: e.target.checked })} className="accent-[#FF5A1F]" />
          </label>
        </div>
        <p className="mt-auto text-[10px] leading-relaxed text-afra-muted">
          Select a layer to edit it, or click it directly on the model. Shortcuts: F/B/L/R views · P product · C close-up · 0 default · Ctrl+Z undo.
        </p>
      </div>
    )
  }

  const l = sel

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="border-b border-afra-border p-3.5">
        <TextInputRow label="Name" value={l.name} onChange={(v) => updateLayer(l.id, { name: v.slice(0, 40) }, 'coalesce')} />
        <div className="mt-2">
          <div className="label mb-1.5">Placement zone</div>
          <div className="grid grid-cols-3 gap-1">
            {ZONE_IDS.map((z) => (
              <button
                key={z}
                onClick={() => updateLayer(l.id, { zone: z, side: z === 'back' ? 'back' : 'front' })}
                className={`rounded-md border px-1 py-1.5 text-[9px] font-medium transition-colors ${
                  l.zone === z ? 'border-afra-orange bg-afra-orange/10 text-afra-orange' : 'border-afra-border text-afra-muted hover:text-afra-white'
                }`}
              >
                {ZONES[z].label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3.5">
        <SectionTitle>Transform</SectionTitle>
        <SliderRow label="X" value={l.x} min={0} max={1} step={0.005} onChange={(v) => updateLayer(l.id, { x: v }, 'coalesce')} />
        <SliderRow label="Y" value={l.y} min={0} max={1} step={0.005} onChange={(v) => updateLayer(l.id, { y: v }, 'coalesce')} />
        <SliderRow label="Rotation" value={l.rotation} min={-180} max={180} step={1} format={(v) => `${v}°`} onChange={(v) => updateLayer(l.id, { rotation: v }, 'coalesce')} />
        <SliderRow label="Scale" value={l.scale} min={0.1} max={3} step={0.01} format={(v) => `${Math.round(v * 100)}%`} onChange={(v) => updateLayer(l.id, { scale: v }, 'coalesce')} />
        <SliderRow label="Opacity" value={l.opacity} min={0} max={1} step={0.02} format={(v) => `${Math.round(v * 100)}%`} onChange={(v) => updateLayer(l.id, { opacity: v }, 'coalesce')} />
        {l.type === 'graphic' && (
          <div className="mt-1">
            <div className="label mb-1.5">Blend</div>
            <Segmented
              size="sm"
              options={[
                { value: 'normal', label: 'Normal' },
                { value: 'multiply', label: 'Multiply' },
                { value: 'screen', label: 'Screen' },
              ]}
              value={l.blend ?? 'normal'}
              onChange={(b) => updateLayer(l.id, { blend: b as 'normal' | 'multiply' | 'screen' })}
            />
          </div>
        )}

        {l.type === 'text' && (
          <div className="mt-4">
            <SectionTitle>Text</SectionTitle>
            <textarea value={l.text} onChange={(e) => updateLayer(l.id, { text: e.target.value }, 'coalesce')} rows={2} className="input resize-none text-sm" aria-label="Text content" />
            <div className="mt-2">
              <SelectRow label="Font" value={l.fontId} options={FONTS.map((f) => ({ value: f.id, label: f.name }))} onChange={(f) => updateLayer(l.id, { fontId: f })} />
              <SliderRow label="Size" value={l.fontSize} min={20} max={420} step={2} onChange={(v) => updateLayer(l.id, { fontSize: v }, 'coalesce')} />
              <div className="my-1.5 flex items-center justify-between gap-2 py-1">
                <span className="text-xs text-afra-muted">Weight</span>
                <Segmented
                  size="sm"
                  options={[
                    { value: '400', label: 'Reg' },
                    { value: '700', label: 'Bold' },
                    { value: '900', label: 'Black' },
                  ]}
                  value={String(l.weight)}
                  onChange={(w) => updateLayer(l.id, { weight: Number(w) as 400 | 700 | 900 })}
                />
              </div>
              <label className="flex cursor-pointer items-center justify-between py-1">
                <span className="text-xs text-afra-muted">Italic</span>
                <input type="checkbox" checked={l.italic} onChange={(e) => updateLayer(l.id, { italic: e.target.checked })} className="accent-[#FF5A1F]" />
              </label>
              <label className="flex cursor-pointer items-center justify-between py-1">
                <span className="text-xs text-afra-muted">Uppercase</span>
                <input type="checkbox" checked={l.uppercase} onChange={(e) => updateLayer(l.id, { uppercase: e.target.checked })} className="accent-[#FF5A1F]" />
              </label>
              <SliderRow label="Tracking" value={l.letterSpacing} min={-0.05} max={0.6} step={0.01} onChange={(v) => updateLayer(l.id, { letterSpacing: v }, 'coalesce')} />
              <ColorRow label="Color" value={l.color} onChange={(c) => updateLayer(l.id, { color: c }, 'coalesce')} />
              <label className="mt-1 flex cursor-pointer items-center justify-between py-1">
                <span className="text-xs text-afra-muted">Outline</span>
                <input type="checkbox" checked={l.outline.enabled} onChange={(e) => updateLayer(l.id, { outline: { ...l.outline, enabled: e.target.checked } })} className="accent-[#FF5A1F]" />
              </label>
              {l.outline.enabled && (
                <>
                  <ColorRow label="Outline color" value={l.outline.color} onChange={(c) => updateLayer(l.id, { outline: { ...l.outline, color: c } }, 'coalesce')} />
                  <SliderRow label="Outline width" value={l.outline.width} min={1} max={24} step={0.5} onChange={(v) => updateLayer(l.id, { outline: { ...l.outline, width: v } }, 'coalesce')} />
                </>
              )}
            </div>
          </div>
        )}

        {l.type === 'shape' && (
          <div className="mt-4">
            <SectionTitle>Shape</SectionTitle>
            <ColorRow label="Color" value={l.color} onChange={(c) => updateLayer(l.id, { color: c }, 'coalesce')} />
            <ColorRow label="Accent" value={l.secondaryColor} onChange={(c) => updateLayer(l.id, { secondaryColor: c }, 'coalesce')} />
          </div>
        )}

        {l.type === 'pattern' && (
          <div className="mt-4">
            <SectionTitle>Pattern</SectionTitle>
            <ColorRow label="Color A" value={l.colorA} onChange={(c) => updateLayer(l.id, { colorA: c }, 'coalesce')} />
            <ColorRow label="Color B" value={l.colorB} onChange={(c) => updateLayer(l.id, { colorB: c }, 'coalesce')} />
            <SliderRow label="Density" value={l.density} min={2} max={28} step={1} onChange={(v) => updateLayer(l.id, { density: v }, 'coalesce')} />
            <SliderRow label="Angle" value={l.angle} min={0} max={180} step={1} format={(v) => `${v}°`} onChange={(v) => updateLayer(l.id, { angle: v }, 'coalesce')} />
            <SliderRow label="Coverage" value={l.coverage} min={0.2} max={1.4} step={0.02} format={(v) => `${Math.round(v * 100)}%`} onChange={(v) => updateLayer(l.id, { coverage: v }, 'coalesce')} />
          </div>
        )}

        {l.type === 'graphic' && (
          <div className="mt-4">
            <SectionTitle>Graphic</SectionTitle>
            <SliderRow label="Width" value={l.baseSize} min={80} max={900} step={5} onChange={(v) => updateLayer(l.id, { baseSize: v }, 'coalesce')} />
            <SliderRow
              label="Height"
              value={l.stretchY ?? 1}
              min={0.4}
              max={2.2}
              step={0.02}
              format={(v) => `${Math.round(v * 100)}%`}
              onChange={(v) => updateLayer(l.id, { stretchY: v }, 'coalesce')}
            />
            <div className="my-1.5 flex items-center justify-between gap-2 py-1">
              <span className="text-xs text-afra-muted">Flip</span>
              <div className="flex gap-1">
                <button
                  onClick={() => updateLayer(l.id, { flipX: !l.flipX })}
                  className={`rounded-md border px-2 py-1 text-[10px] transition-colors ${
                    l.flipX ? 'border-afra-orange text-afra-orange' : 'border-afra-border text-afra-muted hover:text-afra-white'
                  }`}
                >
                  ↔ Horizontal
                </button>
                <button
                  onClick={() => updateLayer(l.id, { flipY: !l.flipY })}
                  className={`rounded-md border px-2 py-1 text-[10px] transition-colors ${
                    l.flipY ? 'border-afra-orange text-afra-orange' : 'border-afra-border text-afra-muted hover:text-afra-white'
                  }`}
                >
                  ↕ Vertical
                </button>
              </div>
            </div>
            <div className="label mb-1 mt-1">Crop</div>
            {(['top', 'right', 'bottom', 'left'] as const).map((edge) => (
              <SliderRow
                key={edge}
                label={edge[0].toUpperCase() + edge.slice(1)}
                value={(l.crop?.[edge] ?? 0) * 100}
                min={0}
                max={45}
                step={1}
                format={(v) => `${Math.round(v)}%`}
                onChange={(v) =>
                  updateLayer(l.id, { crop: { top: 0, right: 0, bottom: 0, left: 0, ...l.crop, [edge]: v / 100 } }, 'coalesce')
                }
              />
            ))}
            <p className="mt-1 text-[10px] leading-snug text-afra-muted">Drag the graphic directly on the shirt to reposition it. Prints follow the fabric.</p>
          </div>
        )}
      </div>

      <div className="flex gap-1.5 border-t border-afra-border p-3">
        <button onClick={() => duplicateLayer(l.id)} className="btn-outline flex-1 py-1.5 text-xs">
          Duplicate
        </button>
        <button
          onClick={() => {
            if (l.locked) {
              toast.error('Layer is locked.')
              return
            }
            deleteLayer(l.id)
          }}
          className="btn-danger flex-1 py-1.5 text-xs"
        >
          Delete
        </button>
      </div>
    </div>
  )
}

function materialForWeave(weave: WeaveType): string {
  const match = MATERIAL_PRESETS.find((m) => m.weave === weave)
  return match?.id ?? 'cotton'
}
