'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Viewport } from '@/components/three/Viewport'
import { Segmented } from '@/components/shared/Controls'
import type { LightingPreset } from '@/lib/design/types'
import { useEditorStore } from '@/stores/editor-store'

/**
 * Fullscreen presentation mode — the design is the hero. Controls appear
 * only while the pointer moves (PRD §32).
 */
export function PresentationMode({ onExit }: { onExit: () => void }) {
  const setLighting = useEditorStore((s) => s.setLighting)
  const setScene = useEditorStore((s) => s.setScene)
  const setView = useEditorStore((s) => s.setView)
  const doc = useEditorStore((s) => s.doc)
  const containerRef = useRef<HTMLDivElement>(null)
  const [controlsVisible, setControlsVisible] = useState(true)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    void containerRef.current?.requestFullscreen?.().catch(() => null)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onExit()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      if (document.fullscreenElement) void document.exitFullscreen().catch(() => null)
    }
  }, [onExit])

  function reveal() {
    setControlsVisible(true)
    if (hideTimer.current) clearTimeout(hideTimer.current)
    hideTimer.current = setTimeout(() => setControlsVisible(false), 2200)
  }

  return createPortal(
    <div ref={containerRef} className="fixed inset-0 z-[180] bg-black" onMouseMove={reveal} onPointerDown={reveal}>
      <div className="absolute inset-0">
        <Viewport />
      </div>

      <div
        className={`pointer-events-none absolute inset-x-0 top-0 flex justify-center p-4 transition-opacity duration-300 ${
          controlsVisible ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className="pointer-events-auto flex items-center gap-2 rounded-lg border border-afra-border bg-afra-panel/90 px-3 py-2 backdrop-blur">
          <span className="mr-1 text-[10px] uppercase tracking-widest text-afra-muted">Lighting</span>
          <Segmented<LightingPreset>
            size="sm"
            options={[
              { value: 'studio', label: 'Studio' },
              { value: 'dramatic', label: 'Dramatic' },
              { value: 'soft', label: 'Soft' },
            ]}
            value={doc.lighting.preset}
            onChange={(p) => setLighting({ preset: p })}
          />
          <button onClick={() => setScene({ floor: !doc.scene.floor })} className="btn-ghost ml-1 h-6 px-2 text-[11px]">
            {doc.scene.floor ? 'Hide floor' : 'Show floor'}
          </button>
        </div>
      </div>

      <div
        className={`pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-center gap-2 p-4 transition-opacity duration-300 ${
          controlsVisible ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className="pointer-events-auto flex items-center gap-1 rounded-lg border border-afra-border bg-afra-panel/90 px-2 py-1.5 backdrop-blur">
          {(['front', 'back', 'left', 'right', 'top', 'orbit'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className="rounded-md px-2.5 py-1 text-[11px] capitalize text-afra-muted transition-colors hover:bg-afra-hover hover:text-afra-white"
            >
              {v === 'orbit' ? '360°' : v}
            </button>
          ))}
        </div>
        <button onClick={onExit} className="pointer-events-auto rounded-lg border border-afra-border bg-afra-panel/90 px-3 py-2 text-[11px] text-afra-white/85 backdrop-blur hover:bg-afra-hover">
          Exit presentation (Esc)
        </button>
      </div>

      <p
        className={`pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-xs text-afra-muted transition-opacity duration-500 ${
          controlsVisible ? 'opacity-0' : 'opacity-60'
        }`}
      >
        Drag to orbit · scroll to zoom
      </p>
    </div>,
    document.body,
  )
}
