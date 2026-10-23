import { create } from 'zustand'
import type { CompareSide } from './CompareView'

interface PresetUiState {
  saveOpen: boolean
  compare: [CompareSide, CompareSide] | null
  openSave: () => void
  closeSave: () => void
  openCompare: (sides: [CompareSide, CompareSide]) => void
  closeCompare: () => void
}

export const usePresetUi = create<PresetUiState>()((set) => ({
  saveOpen: false,
  compare: null,
  openSave: () => set({ saveOpen: true }),
  closeSave: () => set({ saveOpen: false }),
  openCompare: (compare) => set({ compare }),
  closeCompare: () => set({ compare: null }),
}))

/** Saves text as a file through the browser's normal download. */
export function downloadText(filename: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'preset'
