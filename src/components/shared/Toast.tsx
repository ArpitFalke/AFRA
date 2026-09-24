'use client'

import { create } from 'zustand'

export type ToastKind = 'info' | 'success' | 'error'

interface ToastItem {
  id: number
  kind: ToastKind
  message: string
}

interface ToastState {
  toasts: ToastItem[]
  push: (message: string, kind?: ToastKind) => void
  dismiss: (id: number) => void
}

let nextId = 1

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  push: (message, kind = 'info') => {
    const id = nextId++
    set({ toasts: [...get().toasts, { id, kind, message }] })
    setTimeout(() => get().dismiss(id), kind === 'error' ? 5200 : 2800)
  },
  dismiss: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
}))

export const toast = {
  info: (m: string) => useToastStore.getState().push(m, 'info'),
  success: (m: string) => useToastStore.getState().push(m, 'success'),
  error: (m: string) => useToastStore.getState().push(m, 'error'),
}

const COLORS: Record<ToastKind, string> = {
  info: 'border-afra-border text-afra-white/90',
  success: 'border-[rgba(100,196,102,0.4)] text-afra-success',
  error: 'border-[rgba(224,82,82,0.5)] text-afra-danger',
}

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts)
  return (
    <div aria-live="polite" className="pointer-events-none fixed bottom-5 left-1/2 z-[200] flex -translate-x-1/2 flex-col items-center gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto animate-slide-up rounded-md border bg-afra-panel/95 px-4 py-2.5 text-sm shadow-lg shadow-black/40 backdrop-blur ${COLORS[t.kind]}`}
        >
          {t.message}
        </div>
      ))}
    </div>
  )
}
