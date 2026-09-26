'use client'

import dynamic from 'next/dynamic'
import { useCallback, useEffect, useState } from 'react'
import { TopBar } from './TopBar'
import { LeftToolbar, type PanelId } from './LeftToolbar'
import { PropertiesPanel } from './PropertiesPanel'
import { BottomBar } from './BottomBar'
import { AIGenerateModal } from './AIGenerateModal'
import { AIGraphicModal } from './AIGraphicModal'
import { ExportDialog } from './ExportDialog'
import { PresentationMode } from './PresentationMode'
import { Toaster } from '@/components/shared/Toast'
import { useEditorStore } from '@/stores/editor-store'
import { useAutosave } from '@/hooks/useAutosave'
import { useShortcuts } from '@/hooks/useShortcuts'

const Viewport = dynamic(() => import('@/components/three/Viewport').then((m) => m.Viewport), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center">
      <div className="flex items-center gap-3 text-xs text-afra-muted">
        <span className="h-3 w-3 animate-spin rounded-full border-2 border-afra-orange border-t-transparent" />
        Preparing the studio…
      </div>
    </div>
  ),
})

export interface EditorUser {
  email: string
  name: string | null
  plan: string
}

export function EditorShell({ user, autoOpenAI = false }: { user: EditorUser; autoOpenAI?: boolean }) {
  const presenting = useEditorStore((s) => s.presenting)
  const setPresenting = useEditorStore((s) => s.setPresenting)
  const setView = useEditorStore((s) => s.setView)
  const [panel, setPanel] = useState<PanelId>(null)
  const [aiOpen, setAiOpen] = useState(autoOpenAI)
  const [aiGraphicOpen, setAiGraphicOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [propsOpenMobile, setPropsOpenMobile] = useState(false)

  const { saveState, saveManually } = useAutosave(useEditorStore((s) => s.projectId))
  useShortcuts({ save: saveManually })

  useEffect(() => {
    setView('orbit')
  }, [setView])

  const openExport = useCallback(() => setExportOpen(true), [])

  if (presenting) {
    return <PresentationMode onExit={() => setPresenting(false)} />
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <TopBar
        user={user}
        onOpenAI={() => setAiOpen(true)}
        onOpenExport={openExport}
        onTogglePresent={() => setPresenting(true)}
        onSave={saveManually}
      />

      <div className="relative flex min-h-0 flex-1">
        <LeftToolbar panel={panel} setPanel={setPanel} onClose={() => setPanel(null)} onOpenAIGraphic={() => setAiGraphicOpen(true)} />

        <main className="relative min-w-0 flex-1 bg-afra-bg">
          <Viewport />
          {saveState === 'error' && (
            <button
              onClick={saveManually}
              className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-md border border-[rgba(224,82,82,0.5)] bg-afra-panel/95 px-3 py-1.5 text-xs text-afra-danger"
            >
              Save failed — click to retry
            </button>
          )}
        </main>

        {/* Right properties — docked on desktop, sheet on mobile */}
        <aside className="hidden w-64 shrink-0 border-l border-afra-border bg-afra-panel lg:block">
          <PropertiesPanel />
        </aside>
        {propsOpenMobile && (
          <div className="absolute inset-0 z-40 flex flex-col bg-afra-panel lg:hidden">
            <div className="flex h-10 items-center justify-between border-b border-afra-border px-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-afra-muted">Properties</span>
              <button onClick={() => setPropsOpenMobile(false)} className="btn-ghost h-7 px-2 text-xs">
                Close
              </button>
            </div>
            <div className="min-h-0 flex-1">
              <PropertiesPanel />
            </div>
          </div>
        )}
      </div>

      <BottomBar />

      <button
        onClick={() => setPropsOpenMobile(true)}
        className="absolute bottom-16 right-3 z-30 rounded-full bg-afra-orange px-4 py-2 text-xs font-semibold text-black shadow-lg lg:hidden"
      >
        Properties
      </button>

      <AIGenerateModal open={aiOpen} onClose={() => setAiOpen(false)} />
      <AIGraphicModal open={aiGraphicOpen} onClose={() => setAiGraphicOpen(false)} />
      <ExportDialog open={exportOpen} onClose={() => setExportOpen(false)} />
      <Toaster />
    </div>
  )
}
