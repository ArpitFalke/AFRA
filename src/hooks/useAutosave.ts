'use client'

import { useEffect, useRef } from 'react'
import { useEditorStore } from '@/stores/editor-store'
import { renderPreviewToCanvas } from '@/lib/design/preview'
import type { DesignDocument } from '@/lib/design/types'

const AUTOSAVE_DELAY = 1400

/**
 * Debounced autosave of the design document plus a generated thumbnail.
 * Ctrl/Cmd+S (manual save) also snapshots a version server-side.
 */
export function useAutosave(projectId: string) {
  const doc = useEditorStore((s) => s.doc)
  const projectName = useEditorStore((s) => s.projectName)
  const dirty = useEditorStore((s) => s.dirty)
  const saveState = useEditorStore((s) => s.saveState)
  const setSaveState = useEditorStore((s) => s.setSaveState)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const firstRun = useRef(true)

  const doSave = async (options: { snapshot?: boolean } = {}) => {
    setSaveState('saving')
    try {
      let thumbnail: string | undefined
      try {
        if (typeof document !== 'undefined') {
          const canvas = renderPreviewToCanvas(useEditorStore.getState().doc, 512)
          thumbnail = canvas.toDataURL('image/jpeg', 0.82)
        }
      } catch {
        // thumbnail is best-effort
      }
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: useEditorStore.getState().projectName,
          designDocument: useEditorStore.getState().doc,
          ...(thumbnail ? { thumbnail } : {}),
        }),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null
        throw new Error(body?.error?.message ?? 'Save failed')
      }
      setSaveState('saved')
      if (options.snapshot) {
        await fetch(`/api/projects/${projectId}/versions`, { method: 'POST' }).catch(() => null)
      }
    } catch (err) {
      console.error('[afra:autosave]', err)
      setSaveState('error')
    }
  }

  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false
      return
    }
    if (!dirty) return
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => void doSave(), AUTOSAVE_DELAY)
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc, projectName, dirty])

  // Warn before leaving with unsaved work; flush a save attempt.
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!useEditorStore.getState().dirty) return
      e.preventDefault()
      void doSave()
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  return { saveState, saveManually: () => void doSave({ snapshot: true }) }
}

export type { DesignDocument }
