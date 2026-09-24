'use client'

import { create } from 'zustand'
import type { CameraView } from '@/components/three/CameraRig'
import {
  cloneLayer,
  newLayerId,
  type DesignDocument,
  type DesignLayer,
  type GeneratedDesign,
  type LayerType,
  type Side,
} from '@/lib/design/types'

export type SaveState = 'saved' | 'saving' | 'unsaved' | 'error'

interface EditorState {
  projectId: string
  projectName: string
  doc: DesignDocument
  loaded: boolean

  selectedLayerId: string | null
  activeSide: Side
  view: CameraView
  zoomPulse: { dir: 1 | -1; n: number } | null
  presenting: boolean

  past: DesignDocument[]
  future: DesignDocument[]
  lastHistoryAt: number

  saveState: SaveState
  dirty: boolean

  load: (projectId: string, projectName: string, doc: DesignDocument) => void
  select: (id: string | null) => void
  setSide: (side: Side) => void
  setView: (view: CameraView) => void
  zoom: (dir: 1 | -1) => void
  setPresenting: (v: boolean) => void

  addLayer: (layer: DesignLayer) => void
  updateLayer: (id: string, patch: Partial<DesignLayer>, history?: 'commit' | 'coalesce' | 'none') => void
  deleteLayer: (id: string) => void
  duplicateLayer: (id: string) => void
  reorderLayer: (id: string, dir: 'up' | 'down') => void
  setGarment: (patch: Partial<DesignDocument['garment']>) => void
  setScene: (patch: Partial<DesignDocument['scene']>) => void
  setLighting: (patch: Partial<DesignDocument['lighting']>) => void
  setProjectName: (name: string) => void
  replaceDoc: (doc: DesignDocument) => void
  applyGenerated: (result: GeneratedDesign) => void

  pushHistory: () => void
  undo: () => void
  redo: () => void
  setSaveState: (s: SaveState) => void
}

const MAX_HISTORY = 60

function baseDoc(): DesignDocument {
  return {
    id: '',
    projectType: 'tshirt',
    version: 1,
    metadata: { title: '', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    garment: { color: '#141416', material: 'cotton' },
    layers: [],
    scene: { background: 'studio', customBackground: '#0D0D0E', floor: true },
    lighting: { preset: 'studio', intensity: 1, shadow: true },
  }
}

function withHistory(state: EditorState, doc: DesignDocument, mode: 'commit' | 'coalesce' | 'none' = 'commit') {
  const now = Date.now()
  if (mode === 'none') return { doc, dirty: true, saveState: 'unsaved' as SaveState }
  if (mode === 'coalesce' && now - state.lastHistoryAt < 700) {
    return { doc, dirty: true, saveState: 'unsaved' as SaveState, lastHistoryAt: now }
  }
  return {
    doc,
    dirty: true,
    saveState: 'unsaved' as SaveState,
    past: [...state.past.slice(-MAX_HISTORY), state.doc],
    future: [] as DesignDocument[],
    lastHistoryAt: now,
  }
}

export const useEditorStore = create<EditorState>((set, get) => ({
  projectId: '',
  projectName: '',
  doc: baseDoc(),
  loaded: false,

  selectedLayerId: null,
  activeSide: 'front',
  view: 'orbit',
  zoomPulse: null,
  presenting: false,

  past: [],
  future: [],
  lastHistoryAt: 0,

  saveState: 'saved',
  dirty: false,

  load: (projectId, projectName, doc) =>
    set({ projectId, projectName, doc, loaded: true, past: [], future: [], selectedLayerId: null, saveState: 'saved', dirty: false }),

  select: (id) => set({ selectedLayerId: id }),

  setSide: (side) => set({ activeSide: side, view: side === 'front' ? 'front' : 'back', selectedLayerId: null }),

  setView: (view) => set({ view }),
  zoom: (dir) => set({ zoomPulse: { dir, n: (get().zoomPulse?.n ?? 0) + 1 } }),
  setPresenting: (v) => set({ presenting: v }),

  addLayer: (layer) =>
    set((s) => ({
      ...withHistory(s, { ...s.doc, layers: [...s.doc.layers, layer] }),
      selectedLayerId: layer.id,
      activeSide: layer.side,
    })),

  updateLayer: (id, patch, history = 'commit') =>
    set((s) => ({
      ...withHistory(s, { ...s.doc, layers: s.doc.layers.map((l) => (l.id === id ? ({ ...l, ...patch } as DesignLayer) : l)) }, history),
    })),

  deleteLayer: (id) =>
    set((s) => {
      const layer = s.doc.layers.find((l) => l.id === id)
      if (layer?.locked) return {}
      return {
        ...withHistory(s, { ...s.doc, layers: s.doc.layers.filter((l) => l.id !== id) }),
        selectedLayerId: s.selectedLayerId === id ? null : s.selectedLayerId,
      }
    }),

  duplicateLayer: (id) =>
    set((s) => {
      const layer = s.doc.layers.find((l) => l.id === id)
      if (!layer) return {}
      const copy = cloneLayer(layer, { name: `${layer.name} copy`, x: Math.min(0.9, layer.x + 0.06), y: Math.min(0.9, layer.y + 0.04) })
      const idx = s.doc.layers.findIndex((l) => l.id === id)
      const layers = [...s.doc.layers]
      layers.splice(idx + 1, 0, copy)
      return { ...withHistory(s, { ...s.doc, layers }), selectedLayerId: copy.id }
    }),

  reorderLayer: (id, dir) =>
    set((s) => {
      const idx = s.doc.layers.findIndex((l) => l.id === id)
      if (idx === -1) return {}
      const swapWith = dir === 'up' ? idx + 1 : idx - 1
      if (swapWith < 0 || swapWith >= s.doc.layers.length) return {}
      const layers = [...s.doc.layers]
      const tmp = layers[swapWith]
      layers[swapWith] = layers[idx]
      layers[idx] = tmp
      return withHistory(s, { ...s.doc, layers })
    }),

  setGarment: (patch) => set((s) => withHistory(s, { ...s.doc, garment: { ...s.doc.garment, ...patch } })),
  setScene: (patch) => set((s) => withHistory(s, { ...s.doc, scene: { ...s.doc.scene, ...patch } })),
  setLighting: (patch) => set((s) => withHistory(s, { ...s.doc, lighting: { ...s.doc.lighting, ...patch } })),

  setProjectName: (name) => set({ projectName: name, saveState: 'unsaved', dirty: true }),

  replaceDoc: (doc) => set((s) => ({ ...withHistory(s, doc), selectedLayerId: null })),

  applyGenerated: (result) =>
    set((s) => {
      const layers = result.layers.map((l) => ({ ...l, id: newLayerId() }))
      const doc: DesignDocument = {
        ...s.doc,
        garment: { ...s.doc.garment, ...(result.garment ?? {}) },
        layers: [...s.doc.layers, ...layers],
        metadata: { ...s.doc.metadata, ...(result.title ? { title: result.title } : {}) },
      }
      return { ...withHistory(s, doc), selectedLayerId: null }
    }),

  pushHistory: () =>
    set((s) => ({ past: [...s.past.slice(-MAX_HISTORY), structuredClone(s.doc)], future: [] })),

  undo: () =>
    set((s) => {
      if (s.past.length === 0) return {}
      const prev = s.past[s.past.length - 1]
      return {
        doc: prev,
        past: s.past.slice(0, -1),
        future: [s.doc, ...s.future].slice(0, MAX_HISTORY),
        saveState: 'unsaved',
        dirty: true,
        selectedLayerId: prev.layers.some((l) => l.id === s.selectedLayerId) ? s.selectedLayerId : null,
      }
    }),

  redo: () =>
    set((s) => {
      if (s.future.length === 0) return {}
      const next = s.future[0]
      return {
        doc: next,
        past: [...s.past, s.doc],
        future: s.future.slice(1),
        saveState: 'unsaved',
        dirty: true,
      }
    }),

  setSaveState: (saveState) => set({ saveState, ...(saveState === 'saved' ? { dirty: false } : {}) }),
}))

export function selectedLayer(s: Pick<EditorState, 'doc' | 'selectedLayerId'>): DesignLayer | null {
  return s.doc.layers.find((l) => l.id === s.selectedLayerId) ?? null
}

export const LAYER_TYPE_LABEL: Record<LayerType, string> = {
  text: 'Text',
  graphic: 'Graphic',
  shape: 'Graphic',
  pattern: 'Pattern',
}
