'use client'

import { useEffect, useRef, useState } from 'react'
import {
  createGraphicLayer,
  createNumberLayer,
  createPatternLayer,
  createShapeLayer,
  createTextLayer,
  SHAPE_LABELS,
} from '@/lib/design/defaults'
import { FONTS } from '@/lib/design/fonts'
import type { PatternPreset, ShapePreset } from '@/lib/design/types'
import { useEditorStore } from '@/stores/editor-store'
import { toast } from '@/components/shared/Toast'
import { Spinner } from '@/components/shared/Spinner'
import { useAssets, type AssetItem } from '@/hooks/useAssets'

export type PanelId = 'templates' | 'objects' | 'text' | 'graphics' | 'patterns' | 'layers' | null

const RAIL: { id: Exclude<PanelId, null>; label: string; icon: React.ReactNode }[] = [
  { id: 'templates', label: 'Templates', icon: <IconTemplates /> },
  { id: 'objects', label: 'Objects', icon: <IconShapes /> },
  { id: 'text', label: 'Text', icon: <IconText /> },
  { id: 'graphics', label: 'Graphics', icon: <IconImage /> },
  { id: 'patterns', label: 'Patterns', icon: <IconPattern /> },
  { id: 'layers', label: 'Layers', icon: <IconLayers /> },
]

export function LeftToolbar({ panel, setPanel, onClose }: { panel: PanelId; setPanel: (p: PanelId) => void; onClose: () => void }) {
  return (
    <div className="flex h-full">
      <nav className="flex w-14 shrink-0 flex-col items-center gap-1 border-r border-afra-border bg-afra-panel py-2" aria-label="Design tools">
        {RAIL.map((item) => (
          <button
            key={item.id}
            onClick={() => (panel === item.id ? onClose() : setPanel(item.id))}
            className={`flex h-12 w-12 flex-col items-center justify-center gap-0.5 rounded-lg text-[9px] font-medium transition-colors duration-150 ${
              panel === item.id ? 'bg-afra-surface text-afra-orange' : 'text-afra-muted hover:bg-afra-hover hover:text-afra-white'
            }`}
            aria-label={item.label}
            aria-pressed={panel === item.id}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </nav>
      {panel && (
        <div className="absolute inset-y-0 left-14 z-30 w-60 overflow-y-auto border-r border-afra-border bg-afra-panel/98 p-3 backdrop-blur lg:static lg:z-auto lg:w-64 lg:bg-afra-panel">
          {panel === 'templates' && <TemplatesPanel />}
          {panel === 'objects' && <ObjectsPanel />}
          {panel === 'text' && <TextPanel />}
          {panel === 'graphics' && <GraphicsPanel />}
          {panel === 'patterns' && <PatternsPanel />}
          {panel === 'layers' && <LayersPanel />}
        </div>
      )}
    </div>
  )
}

function PanelTitle({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="mb-3">
      <div className="panel-section-title">{children}</div>
      {hint && <p className="mt-1 text-[11px] leading-snug text-afra-muted">{hint}</p>}
    </div>
  )
}

/* ── Templates ─────────────────────────────────────────────────────── */

interface TemplateRow {
  id: string
  slug: string
  name: string
  description: string | null
  tags: string[]
  designDocument: string
}

function TemplatesPanel() {
  const [templates, setTemplates] = useState<TemplateRow[] | null>(null)
  const activeSide = useEditorStore((s) => s.activeSide)
  const replaceDoc = useEditorStore((s) => s.replaceDoc)
  const setSide = useEditorStore((s) => s.setSide)

  useEffect(() => {
    void fetch('/api/templates')
      .then((r) => r.json())
      .then((b: { templates?: TemplateRow[] }) => setTemplates(b.templates ?? []))
      .catch(() => setTemplates([]))
  }, [])

  function apply(t: TemplateRow) {
    try {
      const doc = JSON.parse(t.designDocument)
      replaceDoc(doc)
      setSide(activeSide)
      toast.success(`Applied “${t.name}” — undo with Ctrl+Z if it replaced something`)
    } catch {
      toast.error('Template is invalid.')
    }
  }

  return (
    <div>
      <PanelTitle hint="Original racing-inspired starting points. Applying replaces the current layers — undo brings them back.">Templates</PanelTitle>
      {!templates && (
        <div className="flex items-center gap-2 py-4 text-xs text-afra-muted">
          <Spinner size={12} /> Loading templates…
        </div>
      )}
      <div className="flex flex-col gap-1.5">
        {templates?.map((t) => (
          <button
            key={t.id}
            onClick={() => apply(t)}
            className="group rounded-lg border border-afra-border bg-afra-surface px-3 py-2.5 text-left transition-colors hover:border-afra-orange/60 hover:bg-afra-hover"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold">{t.name}</span>
              <span className="text-[10px] text-afra-muted opacity-0 transition-opacity group-hover:opacity-100">Apply →</span>
            </div>
            {t.description && <div className="mt-0.5 text-[11px] leading-snug text-afra-muted">{t.description}</div>}
          </button>
        ))}
      </div>
    </div>
  )
}

/* ── Objects (shapes) ──────────────────────────────────────────────── */

const SHAPE_ORDER: ShapePreset[] = ['stripe-h', 'stripe-v', 'double-stripe', 'chevron', 'ring', 'circle', 'round-rect', 'triangle', 'star', 'bolt']

function ObjectsPanel() {
  const addLayer = useEditorStore((s) => s.addLayer)
  const activeSide = useEditorStore((s) => s.activeSide)
  return (
    <div>
      <PanelTitle hint="Click to place on the current side, then drag it into position on the model.">Objects</PanelTitle>
      <div className="grid grid-cols-2 gap-1.5">
        {SHAPE_ORDER.map((preset) => (
          <button
            key={preset}
            onClick={() => addLayer(createShapeLayer(activeSide, preset))}
            className="rounded-lg border border-afra-border bg-afra-surface px-2 py-2.5 text-left text-[11px] leading-tight text-afra-white/85 transition-colors hover:border-afra-orange/60 hover:bg-afra-hover"
          >
            <ShapeGlyph preset={preset} />
            <span className="mt-1.5 block">{SHAPE_LABELS[preset]}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

function ShapeGlyph({ preset }: { preset: ShapePreset }) {
  const common = { fill: 'currentColor' } as const
  return (
    <svg width="34" height="18" viewBox="0 0 34 18" className="text-afra-orange/80" aria-hidden>
      {preset === 'stripe-h' && <rect x="3" y="7.5" width="28" height="3" {...common} />}
      {preset === 'stripe-v' && <rect x="15.5" y="1" width="3" height="16" {...common} />}
      {preset === 'double-stripe' && (
        <>
          <rect x="3" y="4" width="28" height="3" {...common} />
          <rect x="3" y="11" width="28" height="3" opacity="0.55" {...common} />
        </>
      )}
      {preset === 'chevron' && <path d="M6 13l11-8 11 8-3 3-8-5.5L9 16z" {...common} />}
      {preset === 'ring' && <circle cx="17" cy="9" r="6.5" fill="none" stroke="currentColor" strokeWidth="2.5" />}
      {preset === 'circle' && <circle cx="17" cy="9" r="6.5" {...common} />}
      {preset === 'round-rect' && <rect x="5" y="4" width="24" height="10" rx="3" {...common} />}
      {preset === 'triangle' && <path d="M17 3l8 12H9z" {...common} />}
      {preset === 'star' && <path d="M17 2l2 6h6l-5 3.7 2 6.3-5-4-5 4 2-6.3L9 8h6z" {...common} />}
      {preset === 'bolt' && <path d="M19 1l-8 9h5l-2 7 9-10h-5z" {...common} />}
    </svg>
  )
}

/* ── Text ──────────────────────────────────────────────────────────── */

function TextPanel() {
  const addLayer = useEditorStore((s) => s.addLayer)
  const activeSide = useEditorStore((s) => s.activeSide)
  const [text, setText] = useState('')
  const [font, setFont] = useState('bebas')
  const [color, setColor] = useState('#F7F5EF')

  function add() {
    const value = text.trim()
    if (!value) {
      toast.error('Type some text first.')
      return
    }
    addLayer(
      createTextLayer(activeSide, {
        text: value,
        name: value.length > 18 ? `${value.slice(0, 18)}…` : value,
        fontId: font,
        color,
        fontSize: value.length > 8 ? 90 : 140,
        uppercase: font === 'bebas',
      }),
    )
    setText('')
  }

  function addNumber() {
    const value = text.trim()
    if (!/^\d{1,3}$/.test(value)) {
      toast.error('Enter 1–3 digits for a race number.')
      return
    }
    addLayer(createNumberLayer(activeSide, value, { color }))
    setText('')
  }

  return (
    <div>
      <PanelTitle hint="Added at chest center — drag on the model to place it.">Text</PanelTitle>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Your text or race number…"
        rows={2}
        className="input resize-none text-sm"
      />
      <div className="mt-2">
        <div className="label mb-1">Font</div>
        <select className="input cursor-pointer text-xs" value={font} onChange={(e) => setFont(e.target.value)}>
          {FONTS.map((f) => (
            <option key={f.id} value={f.id} className="bg-afra-panel">
              {f.name}
            </option>
          ))}
        </select>
      </div>
      <div className="mt-2 flex items-center justify-between">
        <div className="label">Color</div>
        <input type="color" value={color} onChange={(e) => setColor(e.target.value.toUpperCase())} className="h-6 w-9 rounded-md" aria-label="Text color" />
      </div>
      <div className="mt-3 flex gap-1.5">
        <button onClick={add} className="btn-primary flex-1 py-1.5 text-xs">
          Add text
        </button>
        <button onClick={addNumber} className="btn-outline flex-1 py-1.5 text-xs">
          Add number
        </button>
      </div>
    </div>
  )
}

/* ── Graphics (assets) ─────────────────────────────────────────────── */

function GraphicsPanel() {
  const { assets, loading, uploading, upload, remove, rename } = useAssets()
  const addLayer = useEditorStore((s) => s.addLayer)
  const activeSide = useEditorStore((s) => s.activeSide)
  const fileRef = useRef<HTMLInputElement>(null)

  async function onUpload(files: FileList | null) {
    if (!files?.length) return
    try {
      const asset = await upload(files[0])
      if (asset) toast.success('Asset uploaded')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed')
    }
  }

  function addGraphic(asset: AssetItem) {
    const img = new Image()
    img.onload = () => {
      addLayer(
        createGraphicLayer(activeSide, {
          id: asset.id,
          src: asset.src,
          aspect: img.naturalWidth / Math.max(1, img.naturalHeight),
        }),
      )
    }
    img.onerror = () => toast.error('Could not read that image.')
    img.src = asset.src
  }

  return (
    <div>
      <PanelTitle hint="Upload PNG, JPG, WEBP or SVG logos and artwork, then click to place.">Graphics & Decals</PanelTitle>
      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        className="hidden"
        onChange={(e) => void onUpload(e.target.files)}
      />
      <button onClick={() => fileRef.current?.click()} disabled={uploading} className="btn-outline mb-3 w-full py-2 text-xs">
        {uploading ? (
          <>
            <Spinner size={12} /> Uploading…
          </>
        ) : (
          '+ Upload artwork'
        )}
      </button>

      {loading && (
        <div className="flex items-center gap-2 py-4 text-xs text-afra-muted">
          <Spinner size={12} /> Loading assets…
        </div>
      )}
      {!loading && assets.length === 0 && <p className="py-3 text-[11px] leading-relaxed text-afra-muted">No assets yet. Upload your logo or artwork — it stays in your library across projects.</p>}
      <div className="grid grid-cols-2 gap-1.5">
        {assets.map((a) => (
          <div key={a.id} className="group relative overflow-hidden rounded-lg border border-afra-border bg-afra-surface">
            <button onClick={() => addGraphic(a)} className="block h-20 w-full p-2" title={`Place ${a.name}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={a.src} alt={a.name} className="mx-auto h-full w-full object-contain" draggable={false} />
            </button>
            <div className="flex items-center justify-between border-t border-afra-border px-1.5 py-1">
              <span className="truncate text-[10px] text-afra-muted">{a.name}</span>
              <span className="flex opacity-0 transition-opacity group-hover:opacity-100">
                <button
                  onClick={() => {
                    const name = window.prompt('Rename asset', a.name)
                    if (name?.trim()) void rename(a.id, name.trim())
                  }}
                  className="px-1 text-[10px] text-afra-muted hover:text-afra-white"
                  aria-label="Rename"
                >
                  ✎
                </button>
                <button onClick={() => void remove(a.id)} className="px-1 text-[10px] text-afra-muted hover:text-afra-danger" aria-label="Delete">
                  ✕
                </button>
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Patterns ──────────────────────────────────────────────────────── */

const PATTERN_PRESETS: PatternPreset[] = ['stripes', 'checker', 'dots', 'grid', 'zigzag', 'camo']

function PatternsPanel() {
  const addLayer = useEditorStore((s) => s.addLayer)
  const activeSide = useEditorStore((s) => s.activeSide)
  return (
    <div>
      <PanelTitle hint="Patterns fill the design area of the current side. Tune colors and density in Properties.">Patterns</PanelTitle>
      <div className="grid grid-cols-2 gap-1.5">
        {PATTERN_PRESETS.map((p) => (
          <button
            key={p}
            onClick={() => addLayer(createPatternLayer(activeSide, p, { name: `${p[0].toUpperCase()}${p.slice(1)}` }))}
            className="rounded-lg border border-afra-border bg-afra-surface px-2 py-3 text-left text-[11px] capitalize text-afra-white/85 transition-colors hover:border-afra-orange/60 hover:bg-afra-hover"
          >
            <PatternGlyph preset={p} />
            <span className="mt-1.5 block">{p}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

function PatternGlyph({ preset }: { preset: PatternPreset }) {
  const id = `pg-${preset}`
  const pattern = () => {
    switch (preset) {
      case 'stripes':
        return <pattern id={id} width="8" height="8" patternUnits="userSpaceOnUse"><rect width="8" height="8" fill="#2a2a2e" /><rect width="4" height="8" fill="#FF5A1F" /></pattern>
      case 'checker':
        return <pattern id={id} width="8" height="8" patternUnits="userSpaceOnUse"><rect width="8" height="8" fill="#2a2a2e" /><rect width="4" height="4" fill="#FF5A1F" /><rect x="4" y="4" width="4" height="4" fill="#FF5A1F" /></pattern>
      case 'dots':
        return <pattern id={id} width="8" height="8" patternUnits="userSpaceOnUse"><rect width="8" height="8" fill="#2a2a2e" /><circle cx="4" cy="4" r="1.6" fill="#FF5A1F" /></pattern>
      case 'grid':
        return <pattern id={id} width="8" height="8" patternUnits="userSpaceOnUse"><rect width="8" height="8" fill="#2a2a2e" /><path d="M0 0h8M0 0v8" stroke="#FF5A1F" strokeWidth="1.4" /></pattern>
      case 'zigzag':
        return <pattern id={id} width="10" height="6" patternUnits="userSpaceOnUse"><rect width="10" height="6" fill="#2a2a2e" /><path d="M0 4l2.5-3 2.5 3 2.5-3 2.5 3" stroke="#FF5A1F" strokeWidth="1.3" fill="none" /></pattern>
      case 'camo':
        return <pattern id={id} width="16" height="12" patternUnits="userSpaceOnUse"><rect width="16" height="12" fill="#2a2a2e" /><ellipse cx="4" cy="4" rx="3.4" ry="2.4" fill="#FF5A1F" /><ellipse cx="12" cy="8" rx="3.2" ry="2.2" fill="#F7F5EF" opacity="0.75" /></pattern>
    }
  }
  return (
    <svg width="44" height="22" viewBox="0 0 44 22" className="overflow-hidden rounded" aria-hidden>
      <defs>{pattern()}</defs>
      <rect width="44" height="22" fill={`url(#${id})`} />
    </svg>
  )
}

/* ── Layers ────────────────────────────────────────────────────────── */

function LayersPanel() {
  const layers = useEditorStore((s) => s.doc.layers)
  const selectedLayerId = useEditorStore((s) => s.selectedLayerId)
  const select = useEditorStore((s) => s.select)
  const updateLayer = useEditorStore((s) => s.updateLayer)
  const deleteLayer = useEditorStore((s) => s.deleteLayer)
  const duplicateLayer = useEditorStore((s) => s.duplicateLayer)
  const reorderLayer = useEditorStore((s) => s.reorderLayer)

  const ordered = [...layers].reverse()

  return (
    <div>
      <PanelTitle hint="Top of the list draws in front. Double-click a name to rename.">Layers</PanelTitle>
      {ordered.length === 0 && <p className="py-3 text-[11px] text-afra-muted">No layers yet. Add text, graphics or patterns.</p>}
      <div className="flex flex-col gap-0.5">
        {ordered.map((layer) => {
          const selected = layer.id === selectedLayerId
          return (
            <div
              key={layer.id}
              className={`group flex items-center gap-1 rounded-md border px-2 py-1.5 transition-colors ${
                selected ? 'border-afra-orange/70 bg-afra-surface' : 'border-transparent hover:bg-afra-hover'
              }`}
            >
              <button
                onClick={() => select(layer.id)}
                className="flex min-w-0 flex-1 items-center gap-2 text-left"
                title={`Select ${layer.name}`}
              >
                <span className={`text-[9px] font-bold ${layer.side === 'front' ? 'text-afra-orange' : 'text-afra-muted'}`}>{layer.side === 'front' ? 'F' : 'B'}</span>
                <span className={`truncate text-[11px] ${layer.visible ? 'text-afra-white/85' : 'text-afra-muted line-through'}`}>
                  {layer.type === 'text' && layer.text ? layer.text : layer.name}
                </span>
              </button>
              <span className="flex shrink-0 items-center opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                <IconBtn label="Raise" onClick={() => reorderLayer(layer.id, 'up')}>↑</IconBtn>
                <IconBtn label="Lower" onClick={() => reorderLayer(layer.id, 'down')}>↓</IconBtn>
                <IconBtn label="Duplicate" onClick={() => duplicateLayer(layer.id)}>⧉</IconBtn>
                <IconBtn label="Delete" onClick={() => deleteLayer(layer.id)} danger>✕</IconBtn>
              </span>
              <button
                onClick={() => updateLayer(layer.id, { visible: !layer.visible })}
                className="ml-0.5 text-afra-muted hover:text-afra-white"
                aria-label={layer.visible ? 'Hide layer' : 'Show layer'}
                title={layer.visible ? 'Hide' : 'Show'}
              >
                {layer.visible ? <IconEye /> : <IconEyeOff />}
              </button>
              <button
                onClick={() => updateLayer(layer.id, { locked: !layer.locked })}
                className="text-afra-muted hover:text-afra-white"
                aria-label={layer.locked ? 'Unlock layer' : 'Lock layer'}
                title={layer.locked ? 'Unlock' : 'Lock'}
              >
                {layer.locked ? <IconLock /> : <IconUnlock />}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function IconBtn({ children, onClick, label, danger }: { children: React.ReactNode; onClick: () => void; label: string; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`px-1 text-[10px] hover:scale-110 ${danger ? 'text-afra-muted hover:text-afra-danger' : 'text-afra-muted hover:text-afra-white'}`}
      aria-label={label}
      title={label}
    >
      {children}
    </button>
  )
}

/* ── Icons ─────────────────────────────────────────────────────────── */

function IconTemplates() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden>
      <rect x="2" y="2" width="5.4" height="5.4" rx="1" />
      <rect x="8.6" y="2" width="5.4" height="5.4" rx="1" />
      <rect x="2" y="8.6" width="5.4" height="5.4" rx="1" />
      <path d="M11.3 8.8v5M8.8 11.3h5" strokeLinecap="round" />
    </svg>
  )
}
function IconShapes() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden>
      <rect x="2" y="2" width="7" height="7" rx="1" />
      <circle cx="10.5" cy="10.5" r="3.5" />
    </svg>
  )
}
function IconText() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path d="M3 4V2.5h10V4M8 2.5v11M6 13.5h4" strokeLinecap="round" />
    </svg>
  )
}
function IconImage() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden>
      <rect x="2" y="2.5" width="12" height="11" rx="1.5" />
      <circle cx="5.8" cy="6.2" r="1.2" fill="currentColor" stroke="none" />
      <path d="M2.5 11l3.2-3 2.8 2.4 2.4-2 2.6 2.2" />
    </svg>
  )
}
function IconPattern() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
      <rect x="2" y="2" width="3" height="3" />
      <rect x="8" y="2" width="3" height="3" opacity="0.5" />
      <rect x="5" y="6.5" width="3" height="3" opacity="0.7" />
      <rect x="11" y="6.5" width="3" height="3" />
      <rect x="2" y="11" width="3" height="3" opacity="0.6" />
      <rect x="8" y="11" width="3" height="3" />
    </svg>
  )
}
function IconLayers() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden>
      <path d="M8 2l6 3-6 3-6-3 6-3z" />
      <path d="M2 8.5l6 3 6-3M2 11.5l6 3 6-3" />
    </svg>
  )
}
function IconEye() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden>
      <path d="M1.5 8s2.4-4 6.5-4 6.5 4 6.5 4-2.4 4-6.5 4S1.5 8 1.5 8z" />
      <circle cx="8" cy="8" r="1.8" />
    </svg>
  )
}
function IconEyeOff() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden>
      <path d="M3 3l10 10M6.2 6.4A2.8 2.8 0 008 10.8c.7 0 1.4-.3 1.9-.7M4 5.2C2.4 6.3 1.5 8 1.5 8s2.4 4 6.5 4c1 0 1.9-.2 2.7-.6M14.5 8s-2.4-4-6.5-4c-.4 0-.8 0-1.1.1" strokeLinecap="round" />
    </svg>
  )
}
function IconLock() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
      <rect x="3.5" y="7" width="9" height="6.5" rx="1.2" />
      <path d="M5.5 7V5.2a2.5 2.5 0 015 0V7" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}
function IconUnlock() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <rect x="3.5" y="7" width="9" height="6.5" rx="1.2" />
      <path d="M5.5 7V5.2a2.5 2.5 0 014.9-.6" />
    </svg>
  )
}
