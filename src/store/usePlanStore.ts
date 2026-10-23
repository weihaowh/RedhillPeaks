import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { FloorPlan } from '../types/plan'
import { redhillPeaks } from '../data/redhillPeaks'

const HISTORY_LIMIT = 100

interface PlanState {
  plan: FloorPlan
  past: FloorPlan[]
  future: FloorPlan[]
  /**
   * Applies an edit. Pass `history: false` for live updates while dragging, after calling
   * `checkpoint()` once at the start so the whole drag undoes in one step.
   */
  edit: (fn: (plan: FloorPlan) => FloorPlan, opts?: { history?: boolean }) => void
  checkpoint: () => void
  undo: () => void
  redo: () => void
  replacePlan: (plan: FloorPlan) => void
  resetToTraced: () => void
}

export const usePlanStore = create<PlanState>()(
  persist(
    (set) => ({
      plan: redhillPeaks,
      past: [],
      future: [],

      edit: (fn, { history = true } = {}) =>
        set((s) => {
          const next = fn(s.plan)
          if (next === s.plan) return s
          return history ? { plan: next, past: [...s.past, s.plan].slice(-HISTORY_LIMIT), future: [] } : { plan: next }
        }),
      checkpoint: () => set((s) => ({ past: [...s.past, s.plan].slice(-HISTORY_LIMIT), future: [] })),
      undo: () =>
        set((s) => (s.past.length ? { plan: s.past[s.past.length - 1], past: s.past.slice(0, -1), future: [s.plan, ...s.future] } : s)),
      redo: () => set((s) => (s.future.length ? { plan: s.future[0], past: [...s.past, s.plan], future: s.future.slice(1) } : s)),
      replacePlan: (plan) => set((s) => ({ plan, past: [...s.past, s.plan].slice(-HISTORY_LIMIT), future: [] })),
      resetToTraced: () => set((s) => ({ plan: redhillPeaks, past: [...s.past, s.plan].slice(-HISTORY_LIMIT), future: [] })),
    }),
    {
      name: 'redhill-peaks-plan',
      version: 1,
      partialize: (s) => ({ plan: s.plan }),
    },
  ),
)
