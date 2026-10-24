import { useMemo } from 'react'
import { create } from 'zustand'
import type { FloorPlan, Wall } from '../../types/plan'
import type { Hack, Renovation } from '../../types/design'
import { useDesignStore } from '../../store/useDesignStore'
import { usePlanStore } from '../../store/usePlanStore'
import { useAppStore } from '../../store/useAppStore'
import { useEditorStore } from '../../store/useEditorStore'
import { applyRenovation, renovationOf } from '../../lib/renovation'
import { newId } from '../../lib/planEdits'

// Renovation edits. Hacks and new walls live in the design, so they undo with the design history
// and travel with presets; the traced plan is never changed by them.

const editReno = (fn: (r: Renovation) => Renovation) => useDesignStore.getState().edit((d) => ({ ...d, renovation: fn(renovationOf(d)) }))

export function addHack(wallId: string, from: number, to: number) {
  const hack: Hack = { id: newId('hack'), wallId, from, to }
  // A new hack covering earlier ones on the same wall replaces them.
  editReno((r) => ({ ...r, hacks: [...r.hacks.filter((h) => h.wallId !== wallId || h.from < from - 1e-3 || h.to > to + 1e-3), hack] }))
  return hack
}

export const removeHack = (id: string) => editReno((r) => ({ ...r, hacks: r.hacks.filter((h) => h.id !== id) }))
export const removeHacksOn = (wallId: string) => editReno((r) => ({ ...r, hacks: r.hacks.filter((h) => h.wallId !== wallId) }))

export function addBuiltWall(wall: Omit<Wall, 'id'>) {
  const built = { ...wall, id: newId('new-wall') }
  editReno((r) => ({ ...r, walls: [...r.walls, built] }))
  return built
}

export function removeBuiltWall(id: string) {
  // Feature finishes on the wall's faces go with it.
  useDesignStore.getState().edit((d) => {
    const r = renovationOf(d)
    const features = Object.fromEntries(Object.entries(d.features).filter(([k]) => !k.startsWith(`${id}|`)))
    return { ...d, features, renovation: { ...r, walls: r.walls.filter((w) => w.id !== id) } }
  })
}

/** The new walls as a plan, so the plan-edit helpers (openings, moving points) work on them. */
export const builtPlan = (): FloorPlan => ({ ...usePlanStore.getState().plan, walls: renovationOf(useDesignStore.getState().design).walls })

/** Applies a plan edit to the traced walls, or to the new walls when `built` is set. */
export function editWalls(built: boolean, fn: (plan: FloorPlan) => FloorPlan, opts?: { history?: boolean }) {
  if (!built) return usePlanStore.getState().edit(fn, opts)
  useDesignStore.getState().edit((d) => {
    const r = renovationOf(d)
    return { ...d, renovation: { ...r, walls: fn({ ...usePlanStore.getState().plan, walls: r.walls }).walls } }
  }, opts)
}

export const isBuiltId = (plan: FloorPlan, wallId: string | null | undefined) => !!wallId && !!plan.walls.find((w) => w.id === wallId)?.built

/** The traced plan with the renovation applied, kept stable between renders. */
export function useRenovatedPlan(trace: FloorPlan): FloorPlan {
  const reno = useDesignStore((s) => s.design.renovation)
  return useMemo(() => applyRenovation(trace, reno), [trace, reno])
}

/** True when 2D undo/redo should act on the design: furniture, electrical and renovation work. */
export function designHistoryActive(): boolean {
  const tool = useEditorStore.getState().tool
  const app = useAppStore.getState()
  const reno = renovationOf(useDesignStore.getState().design)
  const builtSelected = reno.walls.some((w) => w.id === app.selectedWallId || w.id === app.selectedOpening?.wallId)
  return (
    tool === 'electrical' || tool === 'build' || tool === 'hack' || !!app.selectedFixtureId || !!app.selectedItemId || builtSelected || !!app.selectedOpening?.openingId.startsWith('hack:')
  )
}

/** Short-lived message for refused actions, e.g. trying to hack a structural wall. */
export const useRenoNotice = create<{ text: string | null; show: (text: string) => void }>()((set) => {
  let timer: ReturnType<typeof setTimeout> | undefined
  return {
    text: null,
    show: (text) => {
      clearTimeout(timer)
      set({ text })
      timer = setTimeout(() => set({ text: null }), 3500)
    },
  }
})
