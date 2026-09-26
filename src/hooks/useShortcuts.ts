'use client'

import { useEffect } from 'react'
import { useEditorStore } from '@/stores/editor-store'
import type { CameraView } from '@/components/three/CameraRig'

const VIEW_KEYS: Record<string, CameraView> = {
  f: 'front',
  b: 'back',
  l: 'left',
  r: 'right',
  t: 'top',
  p: 'product',
  c: 'closeup',
}

function isTypingTarget(e: KeyboardEvent): boolean {
  const el = e.target as HTMLElement | null
  if (!el) return false
  return el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable
}

/** Editor keyboard shortcuts (PRD §48). Disabled while typing. */
export function useShortcuts(handlers: { save: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const s = useEditorStore.getState()
      if (!s.loaded || s.presenting) return

      const mod = e.metaKey || e.ctrlKey

      if (mod && e.key.toLowerCase() === 's') {
        e.preventDefault()
        handlers.save()
        return
      }
      if (isTypingTarget(e)) return

      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        if (e.shiftKey) s.redo()
        else s.undo()
        return
      }
      if (mod && e.key.toLowerCase() === 'y') {
        e.preventDefault()
        s.redo()
        return
      }
      if (mod && e.key.toLowerCase() === 'd') {
        e.preventDefault()
        if (s.selectedLayerId) s.duplicateLayer(s.selectedLayerId)
        return
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && s.selectedLayerId) {
        e.preventDefault()
        s.deleteLayer(s.selectedLayerId)
        return
      }
      if (e.key.toLowerCase() === 'v' && s.selectedLayerId) {
        s.select(null)
        return
      }
      if (!mod && !e.altKey) {
        const key = e.key.toLowerCase()
        if (key in VIEW_KEYS) {
          s.setView(VIEW_KEYS[key])
          return
        }
        if (key === '0') {
          s.setView('orbit')
          return
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [handlers])
}
