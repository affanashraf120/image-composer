import { create } from "zustand"
import { subscribeWithSelector } from "zustand/middleware"
import type { CustomFont } from "./font-manager"

export interface ImageData {
  src: string
  width: number
  height: number
  displayWidth: number
  displayHeight: number
}

export interface TextLayer {
  id: string
  text: string
  x: number
  y: number
  fontSize: number
  fontFamily: string
  fontWeight?: string
  fill: string
  opacity: number
  align: string
  lineHeight: number
  letterSpacing: number
  shadowColor: string
  shadowBlur: number
  shadowOffsetX: number
  shadowOffsetY: number
  width?: number
  rotation?: number
  scaleX?: number
  scaleY?: number
  locked?: boolean
  visible?: boolean
  fontStyle?: string
  textDecoration?: string
  shadowOpacity?: number
}

interface EditorState {
  imageData: ImageData | null
  textLayers: TextLayer[]
  selectedLayerId: string | null
  selectedLayerIds: string[]
  snapGuides: { x?: number; y?: number }
  customFonts: CustomFont[]
}

interface HistoryState {
  past: EditorState[]
  present: EditorState
  future: EditorState[]
}

interface EditorStore extends HistoryState {
  // Actions
  setImageData: (imageData: ImageData | null) => void
  addTextLayer: (layer: TextLayer) => void
  updateTextLayer: (id: string, updates: Partial<TextLayer>) => void
  deleteTextLayer: (id: string) => void
  moveLayerUp: (id: string) => void
  moveLayerDown: (id: string) => void
  duplicateLayer: (id: string) => void
  toggleLayerLock: (id: string) => void
  toggleLayerVisibility: (id: string) => void
  setSelectedLayerId: (id: string | null) => void
  setSelectedLayerIds: (ids: string[]) => void
  setSnapGuides: (guides: { x?: number; y?: number }) => void

  addCustomFont: (font: CustomFont) => void
  removeCustomFont: (fontId: string) => void

  // History actions
  undo: () => void
  redo: () => void
  canUndo: () => boolean
  canRedo: () => boolean
  getHistoryInfo: () => { currentStep: number; totalSteps: number }

  // Utility actions
  reset: () => void
}

const initialState: EditorState = {
  imageData: null,
  textLayers: [],
  selectedLayerId: null,
  selectedLayerIds: [],
  snapGuides: {},
  customFonts: [],
}

const MAX_HISTORY_SIZE = 25

// Helper function to create a new history state
const createHistoryState = (newPresent: EditorState, currentHistory: HistoryState): HistoryState => {
  const newPast = [...currentHistory.past, currentHistory.present].slice(-MAX_HISTORY_SIZE)

  return {
    past: newPast,
    present: newPresent,
    future: [],
  }
}

// Helper function to check if state should be saved to history
const shouldSaveToHistory = (action: string): boolean => {
  const nonHistoryActions = ["setSelectedLayerId", "setSelectedLayerIds", "setSnapGuides"]
  return !nonHistoryActions.includes(action)
}

export const useEditorStore = create<EditorStore>()(
  subscribeWithSelector((set, get) => ({
    // Initial history state
    past: [],
    present: initialState,
    future: [],

    // Image actions
    setImageData: (imageData) => {
      const current = get()
      const newPresent = { ...current.present, imageData }
      set(createHistoryState(newPresent, current))
    },

    // Text layer actions
    addTextLayer: (layer) => {
      const current = get()
      const newPresent = {
        ...current.present,
        textLayers: [...current.present.textLayers, layer],
        selectedLayerId: layer.id,
      }
      set(createHistoryState(newPresent, current))
    },

    updateTextLayer: (id, updates) => {
      const current = get()
      const newPresent = {
        ...current.present,
        textLayers: current.present.textLayers.map((layer) => (layer.id === id ? { ...layer, ...updates } : layer)),
      }
      set(createHistoryState(newPresent, current))
    },

    deleteTextLayer: (id) => {
      const current = get()
      const newPresent = {
        ...current.present,
        textLayers: current.present.textLayers.filter((layer) => layer.id !== id),
        selectedLayerId: current.present.selectedLayerId === id ? null : current.present.selectedLayerId,
      }
      set(createHistoryState(newPresent, current))
    },

    moveLayerUp: (id) => {
      const current = get()
      const layers = [...current.present.textLayers]
      const index = layers.findIndex((layer) => layer.id === id)

      if (index < layers.length - 1) {
        ;[layers[index], layers[index + 1]] = [layers[index + 1], layers[index]]
        const newPresent = { ...current.present, textLayers: layers }
        set(createHistoryState(newPresent, current))
      }
    },

    moveLayerDown: (id) => {
      const current = get()
      const layers = [...current.present.textLayers]
      const index = layers.findIndex((layer) => layer.id === id)

      if (index > 0) {
        ;[layers[index], layers[index - 1]] = [layers[index - 1], layers[index]]
        const newPresent = { ...current.present, textLayers: layers }
        set(createHistoryState(newPresent, current))
      }
    },

    duplicateLayer: (id) => {
      const current = get()
      const layerToDuplicate = current.present.textLayers.find((layer) => layer.id === id)

      if (layerToDuplicate) {
        const newLayer: TextLayer = {
          ...layerToDuplicate,
          id: `text-${Date.now()}`,
          x: layerToDuplicate.x + 20,
          y: layerToDuplicate.y + 20,
        }
        const newPresent = {
          ...current.present,
          textLayers: [...current.present.textLayers, newLayer],
          selectedLayerId: newLayer.id,
        }
        set(createHistoryState(newPresent, current))
      }
    },

    toggleLayerLock: (id) => {
      const current = get()
      const layer = current.present.textLayers.find((l) => l.id === id)

      if (layer) {
        const newPresent = {
          ...current.present,
          textLayers: current.present.textLayers.map((l) => (l.id === id ? { ...l, locked: !l.locked } : l)),
          selectedLayerId: layer.locked ? current.present.selectedLayerId : null,
        }
        set(createHistoryState(newPresent, current))
      }
    },

    toggleLayerVisibility: (id) => {
      const current = get()
      const newPresent = {
        ...current.present,
        textLayers: current.present.textLayers.map((layer) =>
          layer.id === id ? { ...layer, visible: layer.visible === false } : layer,
        ),
      }
      set(createHistoryState(newPresent, current))
    },

    // Selection actions (don't save to history)
    setSelectedLayerId: (id) => {
      set((state) => ({
        ...state,
        present: { ...state.present, selectedLayerId: id },
      }))
    },

    setSelectedLayerIds: (ids) => {
      set((state) => ({
        ...state,
        present: { ...state.present, selectedLayerIds: ids },
      }))
    },

    setSnapGuides: (guides) => {
      set((state) => ({
        ...state,
        present: { ...state.present, snapGuides: guides },
      }))
    },

    addCustomFont: (font) => {
      const current = get()
      const newPresent = {
        ...current.present,
        customFonts: [...current.present.customFonts, font],
      }
      set(createHistoryState(newPresent, current))
    },

    removeCustomFont: (fontId) => {
      const current = get()
      const newPresent = {
        ...current.present,
        customFonts: current.present.customFonts.filter((f) => f.id !== fontId),
      }
      set(createHistoryState(newPresent, current))
    },

    // History actions
    undo: () => {
      const current = get()
      if (current.past.length === 0) return

      const previous = current.past[current.past.length - 1]
      const newPast = current.past.slice(0, current.past.length - 1)

      set({
        past: newPast,
        present: previous,
        future: [current.present, ...current.future],
      })
    },

    redo: () => {
      const current = get()
      if (current.future.length === 0) return

      const next = current.future[0]
      const newFuture = current.future.slice(1)

      set({
        past: [...current.past, current.present],
        present: next,
        future: newFuture,
      })
    },

    canUndo: () => get().past.length > 0,
    canRedo: () => get().future.length > 0,

    getHistoryInfo: () => {
      const current = get()
      return {
        currentStep: current.past.length + 1,
        totalSteps: current.past.length + current.future.length + 1,
      }
    },

    // Utility actions
    reset: () => {
      set({
        past: [],
        present: initialState,
        future: [],
      })
    },
  })),
)
