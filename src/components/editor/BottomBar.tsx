'use client'

import type { CameraView } from '@/components/three/CameraRig'
import { useEditorStore } from '@/stores/editor-store'
import { ZONES, ZONE_IDS } from '@/lib/garment/zones'

const VIEWS: { id: CameraView; label: string }[] = [
  { id: 'front', label: 'Front' },
  { id: 'back', label: 'Back' },
  { id: 'left', label: 'Left' },
  { id: 'right', label: 'Right' },
  { id: 'product', label: 'Product' },
  { id: 'closeup', label: 'Close' },
  { id: 'top', label: 'Top' },
  { id: 'orbit', label: '360°' },
]

export function BottomBar() {
  const view = useEditorStore((s) => s.view)
  const setView = useEditorStore((s) => s.setView)
  const setZone = useEditorStore((s) => s.setZone)
  const activeZone = useEditorStore((s) => s.activeZone)
  const zoom = useEditorStore((s) => s.zoom)

  return (
    <footer className="flex h-11 shrink-0 items-center justify-between gap-2 border-t border-afra-border bg-afra-panel px-3">
      <div className="hidden items-center gap-0.5 lg:flex">
        <span className="mr-1.5 hidden text-[10px] uppercase tracking-wider text-afra-muted xl:block">Zone</span>
        {ZONE_IDS.map((z) => (
          <Seg key={z} active={activeZone === z} onClick={() => setZone(z)} label={ZONES[z].short} title={ZONES[z].label} />
        ))}
      </div>
      <div className="flex items-center gap-0.5 overflow-x-auto">
        {VIEWS.map((v) => (
          <Seg key={v.id} active={view === v.id} onClick={() => setView(v.id)} label={v.label} />
        ))}
      </div>
      <div className="flex items-center gap-0.5">
        <button onClick={() => zoom(-1)} className="btn-ghost h-7 w-7 text-base leading-none" aria-label="Zoom out" title="Zoom out">
          −
        </button>
        <button onClick={() => zoom(1)} className="btn-ghost h-7 w-7 text-base leading-none" aria-label="Zoom in" title="Zoom in">
          +
        </button>
      </div>
    </footer>
  )
}

function Seg({ active, onClick, label, title }: { active: boolean; onClick: () => void; label: string; title?: string }) {
  return (
    <button
      onClick={onClick}
      title={title ?? label}
      className={`shrink-0 rounded-md px-2 py-1 text-[11px] font-medium transition-colors duration-150 ${
        active ? 'bg-afra-orange/15 text-afra-orange' : 'text-afra-muted hover:bg-afra-hover hover:text-afra-white'
      }`}
    >
      {label}
    </button>
  )
}
