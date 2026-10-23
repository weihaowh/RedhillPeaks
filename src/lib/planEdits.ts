import type { FloorPlan, Opening, Room, Vec2, Wall } from '../types/plan'
import { wallLength } from './planMath'

// Pure, immutable edits on a FloorPlan. The plan store wraps these with undo history.

export const newId = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 8)}`

const same = (a: Vec2, b: Vec2, eps = 1e-3) => Math.abs(a[0] - b[0]) < eps && Math.abs(a[1] - b[1]) < eps

export const addWall = (plan: FloorPlan, wall: Wall): FloorPlan => ({ ...plan, walls: [...plan.walls, wall] })

export const updateWall = (plan: FloorPlan, id: string, patch: Partial<Wall>): FloorPlan => ({
  ...plan,
  walls: plan.walls.map((w) => (w.id === id ? { ...w, ...patch } : w)),
})

export const deleteWall = (plan: FloorPlan, id: string): FloorPlan => ({ ...plan, walls: plan.walls.filter((w) => w.id !== id) })

export const addOpening = (plan: FloorPlan, wallId: string, opening: Opening): FloorPlan => ({
  ...plan,
  walls: plan.walls.map((w) => (w.id === wallId ? { ...w, openings: [...(w.openings ?? []), opening] } : w)),
})

export const updateOpening = (plan: FloorPlan, wallId: string, id: string, patch: Partial<Opening>): FloorPlan => ({
  ...plan,
  walls: plan.walls.map((w) =>
    w.id === wallId ? { ...w, openings: (w.openings ?? []).map((o) => (o.id === id ? clampOpening(w, { ...o, ...patch }) : o)) } : w,
  ),
})

export const deleteOpening = (plan: FloorPlan, wallId: string, id: string): FloorPlan => ({
  ...plan,
  walls: plan.walls.map((w) => (w.id === wallId ? { ...w, openings: (w.openings ?? []).filter((o) => o.id !== id) } : w)),
})

export function clampOpening(wall: Wall, o: Opening): Opening {
  const len = wallLength(wall)
  const width = Math.min(Math.max(o.width, 0.2), len)
  return { ...o, width, offset: Math.min(Math.max(o.offset, 0), len - width) }
}

export const addRoom = (plan: FloorPlan, room: Room): FloorPlan => ({ ...plan, rooms: [...plan.rooms, room] })

export const updateRoom = (plan: FloorPlan, id: string, patch: Partial<Room>): FloorPlan => ({
  ...plan,
  rooms: plan.rooms.map((r) => (r.id === id ? { ...r, ...patch } : r)),
})

export const deleteRoom = (plan: FloorPlan, id: string): FloorPlan => ({ ...plan, rooms: plan.rooms.filter((r) => r.id !== id) })

/**
 * Moves every wall endpoint and room vertex sitting at `from` to `to`, so joined walls and the
 * rooms drawn against them stay connected. Openings keep their distance from the wall start.
 */
export function movePoint(plan: FloorPlan, from: Vec2, to: Vec2): FloorPlan {
  return {
    ...plan,
    walls: plan.walls.map((w) => {
      const start = same(w.start, from) ? to : w.start
      const end = same(w.end, from) ? to : w.end
      if (start === w.start && end === w.end) return w
      const moved = { ...w, start, end }
      return { ...moved, openings: moved.openings?.map((o) => clampOpening(moved, o)) }
    }),
    rooms: plan.rooms.map((r) => (r.polygon.some((p) => same(p, from)) ? { ...r, polygon: r.polygon.map((p) => (same(p, from) ? to : p)) } : r)),
  }
}

/** Scales the drawing underneath about `origin`; optionally the traced walls and rooms too. */
export function scalePlan(plan: FloorPlan, origin: Vec2, factor: number, includeTrace: boolean): FloorPlan {
  const sp = ([x, y]: Vec2): Vec2 => [origin[0] + (x - origin[0]) * factor, origin[1] + (y - origin[1]) * factor]
  const underlay = plan.underlay && {
    ...plan.underlay,
    x: origin[0] + (plan.underlay.x - origin[0]) * factor,
    y: origin[1] + (plan.underlay.y - origin[1]) * factor,
    width: plan.underlay.width * factor,
    height: plan.underlay.height * factor,
  }
  if (!includeTrace) return { ...plan, underlay }
  return {
    ...plan,
    underlay,
    walls: plan.walls.map((w) => ({
      ...w,
      start: sp(w.start),
      end: sp(w.end),
      openings: w.openings?.map((o) => ({ ...o, offset: o.offset * factor, width: o.width * factor })),
    })),
    rooms: plan.rooms.map((r) => ({ ...r, polygon: r.polygon.map(sp), labelAt: r.labelAt && sp(r.labelAt) })),
  }
}
