import { create } from 'zustand'
import type { Preset, PresetScope } from '../types/preset'
import { dbRequest } from '../lib/db'
import { applyPreset, buildExport, capturePreset, parseImport, replacesPlan } from '../lib/presets'
import { useDesignStore } from './useDesignStore'
import { usePlanStore } from './usePlanStore'

/** Where presets live. IndexedDB today; a cloud backend can implement the same three calls. */
export interface PresetRepository {
  list(): Promise<Preset[]>
  put(preset: Preset): Promise<void>
  remove(id: string): Promise<void>
}

export const localPresets: PresetRepository = {
  list: () => dbRequest<Preset[]>('presets', 'readonly', (s) => s.getAll()),
  put: (p) => dbRequest('presets', 'readwrite', (s) => s.put(p, p.id)),
  remove: (id) => dbRequest('presets', 'readwrite', (s) => s.delete(id)),
}

const repo: PresetRepository = localPresets

interface PresetState {
  presets: Preset[]
  /** Object URLs for thumbnails, by preset id. */
  thumbs: Record<string, string>
  loaded: boolean
  error?: string
  load: () => Promise<void>
  save: (opts: { name: string; scope: PresetScope; roomId?: string; thumbnail?: Blob | null }) => Promise<Preset>
  rename: (id: string, name: string) => Promise<void>
  duplicate: (id: string) => Promise<void>
  remove: (id: string) => Promise<void>
  /** Applies a preset to the current design (undoable). Returns whether the trace was replaced too. */
  apply: (id: string, targetRoomId?: string) => boolean
  importFile: (file: File) => Promise<number>
  exportJson: (ids?: string[]) => Promise<string>
}

const byNewest = (a: Preset, b: Preset) => b.updatedAt - a.updatedAt

function withThumb(thumbs: Record<string, string>, p: Preset) {
  if (!p.thumbnail || thumbs[p.id]) return thumbs
  return { ...thumbs, [p.id]: URL.createObjectURL(p.thumbnail) }
}

export const usePresetStore = create<PresetState>()((set, get) => ({
  presets: [],
  thumbs: {},
  loaded: false,

  load: async () => {
    try {
      const presets = (await repo.list()).sort(byNewest)
      set({ presets, thumbs: presets.reduce(withThumb, get().thumbs), loaded: true, error: undefined })
    } catch {
      set({ loaded: true, error: 'Saved presets are unavailable in this browser window (storage is blocked).' })
    }
  },

  save: async ({ name, scope, roomId, thumbnail }) => {
    const preset = capturePreset(name, scope, useDesignStore.getState().design, usePlanStore.getState().plan, roomId)
    if (thumbnail) preset.thumbnail = thumbnail
    await repo.put(preset)
    set((s) => ({ presets: [preset, ...s.presets], thumbs: withThumb(s.thumbs, preset) }))
    return preset
  },

  rename: async (id, name) => {
    const p = get().presets.find((x) => x.id === id)
    if (!p || !name.trim()) return
    const next = { ...p, name: name.trim(), updatedAt: Date.now() }
    await repo.put(next)
    set((s) => ({ presets: s.presets.map((x) => (x.id === id ? next : x)).sort(byNewest) }))
  },

  duplicate: async (id) => {
    const p = get().presets.find((x) => x.id === id)
    if (!p) return
    const now = Date.now()
    const copy: Preset = { ...structuredClone({ ...p, thumbnail: undefined }), thumbnail: p.thumbnail, id: `preset-${now.toString(36)}-${Math.random().toString(36).slice(2, 6)}`, name: `${p.name} (copy)`, createdAt: now, updatedAt: now }
    await repo.put(copy)
    set((s) => ({ presets: [copy, ...s.presets], thumbs: withThumb(s.thumbs, copy) }))
  },

  remove: async (id) => {
    await repo.remove(id)
    const url = get().thumbs[id]
    if (url) URL.revokeObjectURL(url)
    set((s) => {
      const thumbs = { ...s.thumbs }
      delete thumbs[id]
      return { presets: s.presets.filter((x) => x.id !== id), thumbs }
    })
  },

  apply: (id, targetRoomId) => {
    const preset = get().presets.find((x) => x.id === id)
    if (!preset) return false
    const planStore = usePlanStore.getState()
    const newPlan = replacesPlan(preset, planStore.plan) ? preset.plan! : null
    if (newPlan) planStore.replacePlan(newPlan)
    const plan = newPlan ?? planStore.plan
    useDesignStore.getState().edit((d) => applyPreset(d, plan, preset, targetRoomId))
    return !!newPlan
  },

  importFile: async (file) => {
    const presets = await parseImport(await file.text())
    for (const p of presets) await repo.put(p)
    set((s) => ({ presets: [...presets, ...s.presets].sort(byNewest), thumbs: presets.reduce(withThumb, s.thumbs) }))
    return presets.length
  },

  exportJson: async (ids) => {
    const chosen = ids ? get().presets.filter((p) => ids.includes(p.id)) : get().presets
    return JSON.stringify(await buildExport(chosen), null, 2)
  },
}))
