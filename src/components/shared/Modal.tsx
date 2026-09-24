'use client'

import { useEffect } from 'react'
import { createPortal } from 'react-dom'

export function Modal({
  open,
  onClose,
  title,
  children,
  width = 520,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  width?: number
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 animate-fade-in bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative z-10 max-h-[86vh] w-full animate-slide-up overflow-y-auto rounded-xl border border-afra-border bg-afra-panel shadow-2xl shadow-black/60"
        style={{ maxWidth: width }}
      >
        <div className="flex items-center justify-between border-b border-afra-border px-5 py-3.5">
          <h2 className="text-sm font-semibold tracking-wide">{title}</h2>
          <button onClick={onClose} className="btn-ghost -mr-1 h-7 w-7 rounded-md text-afra-muted" aria-label="Close">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M2 2l8 8M10 2l-8 8" />
            </svg>
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>,
    document.body,
  )
}
