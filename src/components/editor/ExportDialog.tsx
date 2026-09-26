'use client'

import { useState } from 'react'
import { Modal } from '@/components/shared/Modal'
import { Spinner } from '@/components/shared/Spinner'
import { toast } from '@/components/shared/Toast'
import { Segmented } from '@/components/shared/Controls'
import { getExporter } from '@/components/three/ExportBridge'
import { isWebGLAvailable } from '@/components/three/webgl'
import { useEditorStore } from '@/stores/editor-store'
import { renderZoneToCanvas } from '@/lib/design/render'
import type { Zone } from '@/lib/garment/zones'
import { ensureFontsReady } from '@/lib/design/fonts'

type Mode = 'render' | 'artwork'
type BgMode = 'scene' | 'transparent' | 'custom'

const RES_PRESETS = [
  { id: 'hd', label: 'HD · 1280', px: 1280 },
  { id: '2k', label: '2K · 2048', px: 2048 },
  { id: '4k', label: '4K · 3840', px: 3840 },
] as const

/**
 * Export dialog. "Render" captures the live 3D viewport; "Artwork" exports
 * the flattened, transparent design per side (production-friendly).
 */
export function ExportDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const doc = useEditorStore((s) => s.doc)
  const projectId = useEditorStore((s) => s.projectId)
  const setSaveState = useEditorStore((s) => s.setSaveState)
  const [mode, setMode] = useState<Mode>('render')
  const [res, setRes] = useState<(typeof RES_PRESETS)[number]['id']>('2k')
  const [bg, setBg] = useState<BgMode>('scene')
  const [customBg, setCustomBg] = useState('#0D0D0E')
  const [side, setSide] = useState<Zone | 'both'>('front')
  const [format, setFormat] = useState<'png' | 'jpg'>('png')
  const [busy, setBusy] = useState(false)

  async function exportRender() {
    const exporter = getExporter()
    if (!exporter) {
      toast.error(
        isWebGLAvailable()
          ? 'The 3D scene is still loading. Try again in a moment.'
          : '3D rendering needs WebGL, which this browser does not provide. Use the Production artwork export instead.',
      )
      return
    }
    setBusy(true)
    try {
      const check = await fetch('/api/exports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phase: 'check', projectId, format, resolutionPx: px() }),
      })
      if (!check.ok) {
        const body = (await check.json()) as { error?: { message: string } }
        toast.error(body.error?.message ?? 'Export limit reached.')
        return
      }

      const width = px()
      const height = Math.round((width * 3) / 4)
      const transparent = format === 'png' && bg === 'transparent'
      let dataUrl: string | null
      if (bg === 'custom' || bg === 'transparent') {
        // Swap the scene backdrop for the requested one for this capture
        const saved = doc.scene.background
        const savedCustom = doc.scene.customBackground
        useEditorStore.setState((s) => ({
          doc: {
            ...s.doc,
            scene: { ...s.doc.scene, background: bg === 'custom' ? 'custom' : 'dark', customBackground: bg === 'custom' ? customBg : '#0D0D0E' },
          },
        }))
        await new Promise((r) => setTimeout(r, 60))
        dataUrl = exporter({ width, height, transparent, format })
        useEditorStore.setState((s) => ({ doc: { ...s.doc, scene: { ...s.doc.scene, background: saved, customBackground: savedCustom } } }))
      } else {
        dataUrl = exporter({ width, height, transparent, format })
      }
      if (!dataUrl) throw new Error('Render failed')
      download(dataUrl, filename(`render-${width}px`))
      await recordComplete()
    } catch (err) {
      console.error(err)
      toast.error(err instanceof Error ? err.message : "We couldn't render this design. Try a lower quality.")
    } finally {
      setBusy(false)
    }
  }

  async function exportArtwork() {
    setBusy(true)
    try {
      const check = await fetch('/api/exports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phase: 'check', projectId, format: 'png', resolutionPx: px() }),
      })
      if (!check.ok) {
        const body = (await check.json()) as { error?: { message: string } }
        toast.error(body.error?.message ?? 'Export limit reached.')
        return
      }
      await ensureFontsReady(['inter', 'bebas', 'saira-condensed', 'archivo-black'])
      const zones: Zone[] = side === 'both' ? ['front', 'back'] : [side]
      const size = Math.min(4096, px())
      const images: Record<string, HTMLImageElement> = {}
      await Promise.all(
        doc.layers
          .filter((l) => l.type === 'graphic')
          .map(async (l) => {
            const src = (l as { src: string }).src
            const img = new Image()
            img.crossOrigin = 'anonymous'
            await new Promise<void>((resolve) => {
              img.onload = () => resolve()
              img.onerror = () => resolve()
              img.src = src
            })
            if (img.naturalWidth) images[src] = img
          }),
      )
      for (const z of zones) {
        const canvas = document.createElement('canvas')
        canvas.width = canvas.height = size
        const ctx = canvas.getContext('2d')!
        renderZoneToCanvas(ctx, doc, z, size, images)
        download(canvas.toDataURL('image/png'), filename(`artwork-${z}-${size}px`, 'png'))
      }
      await recordComplete('png')
    } catch (err) {
      console.error(err)
      toast.error('Artwork export failed. Try again.')
    } finally {
      setBusy(false)
    }
  }

  async function recordComplete(exportFormat: 'png' | 'jpg' = format) {
    await fetch('/api/exports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phase: 'complete', projectId, format: exportFormat, resolutionPx: px() }),
    })
    setSaveState('saved')
    toast.success('Export complete — check your downloads.')
  }

  function filename(kind: string, ext: 'png' | 'jpg' = format) {
    return `AFRA-${doc.metadata.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase() || 'design'}-${kind}.${ext}`
  }

  function px() {
    return RES_PRESETS.find((r) => r.id === res)!.px
  }

  return (
    <Modal open={open} onClose={onClose} title="Export" width={520}>
      <Segmented<Mode>
        options={[
          { value: 'render', label: '3D render' },
          { value: 'artwork', label: 'Production artwork' },
        ]}
        value={mode}
        onChange={setMode}
      />

      {mode === 'render' ? (
        <div className="mt-4">
          <div className="label mb-1.5">Resolution</div>
          <Segmented options={RES_PRESETS.map((r) => ({ value: r.id, label: r.label }))} value={res} onChange={(v) => setRes(v)} />
          <div className="mt-4">
            <div className="label mb-1.5">Background</div>
            <Segmented<BgMode>
              options={[
                { value: 'scene', label: 'Scene' },
                { value: 'transparent', label: 'Transparent' },
                { value: 'custom', label: 'Custom' },
              ]}
              value={bg}
              onChange={setBg}
            />
            {bg === 'custom' && (
              <div className="mt-2 flex items-center gap-2">
                <input type="color" value={customBg} onChange={(e) => setCustomBg(e.target.value.toUpperCase())} className="h-6 w-9 rounded-md" aria-label="Custom background" />
                <span className="text-xs text-afra-muted">Backdrop color for the exported image</span>
              </div>
            )}
            {bg === 'transparent' && format === 'jpg' && (
              <p className="mt-2 text-[10px] text-afra-yellow">JPG does not support transparency — switch to PNG.</p>
            )}
          </div>
          <div className="mt-4">
            <div className="label mb-1.5">Format</div>
            <Segmented
              options={[
                { value: 'png', label: 'PNG' },
                { value: 'jpg', label: 'JPG' },
              ]}
              value={format}
              onChange={(v) => setFormat(v)}
            />
          </div>
        </div>
      ) : (
        <div className="mt-4">
          <div className="label mb-1.5">Zone</div>
          <Segmented
            options={[
              { value: 'front', label: 'Front' },
              { value: 'back', label: 'Back' },
              { value: 'left-chest', label: 'L Chest' },
              { value: 'right-chest', label: 'R Chest' },
              { value: 'left-sleeve', label: 'L Sleeve' },
              { value: 'right-sleeve', label: 'R Sleeve' },
              { value: 'both', label: 'F + B' },
            ]}
            value={side}
            onChange={(v) => setSide(v as typeof side)}
          />
          <div className="mt-4">
            <div className="label mb-1.5">Resolution</div>
            <Segmented options={RES_PRESETS.map((r) => ({ value: r.id, label: r.label }))} value={res} onChange={(v) => setRes(v)} />
          </div>
          <p className="mt-3 rounded-md border border-afra-border bg-afra-surface px-3 py-2.5 text-[11px] leading-relaxed text-afra-muted">
            Production artwork is the flattened, transparent-background design — ready for print shops and merch workflows. This is a design
            preview export; AFRA does not claim CMYK color compliance.
          </p>
        </div>
      )}

      <div className="mt-5 flex justify-end gap-2">
        <button onClick={onClose} className="btn-ghost px-3 py-2 text-xs">
          Cancel
        </button>
        <button
          onClick={() => (mode === 'render' ? void exportRender() : void exportArtwork())}
          disabled={busy}
          className="btn-primary min-w-28 px-5 py-2 text-xs"
        >
          {busy ? (
            <>
              <Spinner size={13} /> Exporting…
            </>
          ) : mode === 'render' ? (
            'Export render'
          ) : (
            'Export artwork'
          )}
        </button>
      </div>
    </Modal>
  )
}

function download(dataUrl: string, name: string) {
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
}
