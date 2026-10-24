import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Design } from '../types/design'

const HISTORY_LIMIT = 100

export const EMPTY_DESIGN: Design = {
  wallPaint: '#f4f1ea',
  roomPaint: {},
  floors: {},
  features: {},
  ceilings: {},
  items: [],
  fixtures: [],
}

/** Floor finishes and paint used to live in the UI store (Phase 1–3); carry them over once. */
function legacyDesign(): Design {
  try {
    const legacy = JSON.parse(localStorage.getItem('redhill-peaks-studio') ?? 'null')?.state
    if (!legacy) return EMPTY_DESIGN
    const floors = Object.fromEntries(Object.entries((legacy.floorFinish ?? {}) as Record<string, string>).map(([room, finish]) => [room, { finish }]))
    return { ...EMPTY_DESIGN, wallPaint: legacy.wallPaint ?? EMPTY_DESIGN.wallPaint, floors }
  } catch {
    return EMPTY_DESIGN
  }
}

interface DesignState {
  design: Design
  past: Design[]
  future: Design[]
  /**
   * Applies a change. Pass `history: false` for live updates while dragging, after one
   * `checkpoint()` at the start so the whole drag undoes in one step.
   */
  edit: (fn: (design: Design) => Design, opts?: { history?: boolean }) => void
  checkpoint: () => void
  /** Drops the last checkpoint, for a drag that ended up not moving anything. */
  dropCheckpoint: () => void
  undo: () => void
  redo: () => void
  reset: () => void
}

export const useDesignStore = create<DesignState>()(
  persist(
    (set) => ({
      design: legacyDesign(),
      past: [],
      future: [],
      edit: (fn, { history = true } = {}) =>
        set((s) => {
          const next = fn(s.design)
          if (next === s.design) return s
          return history ? { design: next, past: [...s.past, s.design].slice(-HISTORY_LIMIT), future: [] } : { design: next }
        }),
      checkpoint: () => set((s) => ({ past: [...s.past, s.design].slice(-HISTORY_LIMIT), future: [] })),
      dropCheckpoint: () => set((s) => ({ past: s.past.slice(0, -1) })),
      undo: () =>
        set((s) => (s.past.length ? { design: s.past[s.past.length - 1], past: s.past.slice(0, -1), future: [s.design, ...s.future] } : s)),
      redo: () => set((s) => (s.future.length ? { design: s.future[0], past: [...s.past, s.design], future: s.future.slice(1) } : s)),
      reset: () => set((s) => ({ design: EMPTY_DESIGN, past: [...s.past, s.design].slice(-HISTORY_LIMIT), future: [] })),
    }),
    {
      name: 'redhill-peaks-design',
      version: 3,
      partialize: (s) => ({ design: s.design }),
      // v2 added furniture, v3 electrical fixtures; fill anything missing from the defaults.
      migrate: (persisted) => {
        const state = persisted as { design: Design }
        state.design = { ...EMPTY_DESIGN, ...state.design }
        return state as DesignState
      },
    },
  ),
)
