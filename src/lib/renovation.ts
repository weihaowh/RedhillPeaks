import type { BuiltKind, FloorPlan, Opening, Wall } from '../types/plan'
import type { Design, Hack, Renovation } from '../types/design'
import { closestOnSegment, faceRoom, wallLength } from './planMath'

// Renovation on top of the traced plan: walls to hack (demolish) and new walls to build. The
// trace stays the "as handed over" flat; everything else (3D, furniture checks, costs) works on
// the renovated plan from applyRenovation().

export const EMPTY_RENOVATION: Renovation = { walls: [], hacks: [] }
export const renovationOf = (design: Pick<Design, 'renovation'>): Renovation => design.renovation ?? EMPTY_RENOVATION

/** Hacked spans appear in the renovated plan as full-height openings with these ids. */
export const HACK_PREFIX = 'hack:'
export const isHackOpening = (openingId: string) => openingId.startsWith(HACK_PREFIX)
export const hackIdOf = (openingId: string) => openingId.slice(HACK_PREFIX.length)

export interface BuiltKindDef {
  id: BuiltKind
  label: string
  thickness: number
  hint: string
}

export const BUILT_KINDS: BuiltKindDef[] = [
  { id: 'drywall', label: 'Board partition', thickness: 0.1, hint: 'Gypsum board on a metal frame. Quick, light and paintable. Not for wet areas.' },
  { id: 'brick', label: 'Brick wall', thickness: 0.13, hint: 'Plastered brick. Solid and quieter, and the one to use next to wet areas. Slower and heavier.' },
  { id: 'glass', label: 'Glass partition', thickness: 0.06, hint: 'Clear glass in slim black frames. Keeps daylight flowing, e.g. for a glass-walled study.' },
]
export const builtKind = (id: BuiltKind | undefined) => BUILT_KINDS.find((k) => k.id === id) ?? BUILT_KINDS[0]

/** Why an existing wall can't be hacked, or null if it can (with an HDB permit). */
export function hackBlocker(plan: FloorPlan, wall: Wall): string | null {
  if (wall.built) return null
  if (wall.structural) return 'This is a structural wall (shaded black on the HDB plan), so it must not be hacked.'
  if (([1, -1] as const).some((s) => faceRoom(plan, wall, s)?.kind === 'shelter')) return 'Household shelter walls must not be hacked, drilled or altered.'
  if (wall.exterior) return 'External walls and the facade can’t be hacked.'
  return null
}

interface Span {
  id: string
  from: number
  to: number
}

/** Hack spans for one wall, merged, and widened to swallow any door or window they touch. */
function hackSpans(wall: Wall, hacks: Hack[]): { spans: Span[]; kept: Opening[] } {
  const len = wallLength(wall)
  let spans: Span[] = hacks.map((h) => ({ id: h.id, from: Math.max(0, Math.min(h.from, h.to)), to: Math.min(len, Math.max(h.from, h.to)) }))
  let kept = [...(wall.openings ?? [])]
  for (let changed = true; changed; ) {
    changed = false
    spans.sort((a, b) => a.from - b.from)
    const merged: Span[] = []
    for (const s of spans) {
      const last = merged[merged.length - 1]
      if (last && s.from <= last.to + 1e-6) last.to = Math.max(last.to, s.to)
      else merged.push({ ...s })
    }
    spans = merged
    kept = kept.filter((o) => {
      const hit = spans.find((s) => o.offset < s.to && s.from < o.offset + o.width)
      if (!hit) return true
      hit.from = Math.min(hit.from, o.offset)
      hit.to = Math.max(hit.to, o.offset + o.width)
      changed = true
      return false
    })
  }
  return { spans, kept }
}

/** A span's extent for drawing and openings: hacks reaching a wall end also take its end cap. */
export function spanExtent(wall: Wall, from: number, to: number): [number, number] {
  const len = wallLength(wall)
  const ext = wall.thickness / 2
  return [from <= 0.001 ? -ext : from, to >= len - 0.001 ? len + ext : to]
}

/** The plan as it will be after the renovation. Returns the same object when nothing changes. */
export function applyRenovation(plan: FloorPlan, reno: Renovation | undefined): FloorPlan {
  if (!reno || (!reno.walls.length && !reno.hacks.length)) return plan
  const byWall = new Map<string, Hack[]>()
  for (const h of reno.hacks) byWall.set(h.wallId, [...(byWall.get(h.wallId) ?? []), h])
  const height = plan.ceilingHeight
  const walls = plan.walls.map((w) => {
    const hacks = byWall.get(w.id)
    if (!hacks) return w
    const { spans, kept } = hackSpans(w, hacks)
    const top = (w.height ?? height) + 0.05
    const holes: Opening[] = spans.map((s) => {
      const [a, b] = spanExtent(w, s.from, s.to)
      return { id: HACK_PREFIX + s.id, kind: 'opening', offset: a, width: b - a, sill: 0, height: top }
    })
    return { ...w, openings: [...kept, ...holes], tracedOpenings: w.openings }
  })
  return { ...plan, walls: [...walls, ...reno.walls] }
}

const round = (m: number) => Math.round(m * 1000) / 1000

/**
 * The hack span for a press at `a` and release at `b` (metres along the wall). A click hacks the
 * whole wall; a drag hacks that stretch, snapped to 50 mm and to the wall ends.
 */
export function hackSpan(wall: Wall, a: number, b: number): [number, number] {
  const len = wallLength(wall)
  if (Math.abs(b - a) < 0.1) return [0, round(len)]
  const snap = (t: number) => {
    if (t < 0.15) return 0
    if (t > len - 0.15) return len
    return Math.round(t / 0.05) * 0.05
  }
  return [round(snap(Math.min(a, b))), round(snap(Math.max(a, b)))]
}

/** Solid wall area (m²) a hack takes out: the span, less the doors and windows already in it. */
export function hackedArea(plan: FloorPlan, hack: Hack): number {
  const wall = plan.walls.find((w) => w.id === hack.wallId)
  if (!wall) return 0
  const h = wall.height ?? plan.ceilingHeight
  const from = Math.min(hack.from, hack.to)
  const to = Math.max(hack.from, hack.to)
  const holes = (wall.tracedOpenings ?? wall.openings ?? [])
    .filter((o) => !isHackOpening(o.id))
    .reduce((sum, o) => sum + Math.max(0, Math.min(to, o.offset + o.width) - Math.max(from, o.offset)) * Math.max(0, Math.min(o.height, h - o.sill)), 0)
  return Math.max((to - from) * h - holes, 0)
}

/** Net face area (m²) of a new wall, less its doors and windows. */
export function builtArea(plan: FloorPlan, wall: Wall): number {
  const h = wall.height ?? plan.ceilingHeight
  const openings = (wall.openings ?? []).reduce((sum, o) => sum + o.width * Math.min(o.height, h - o.sill), 0)
  return Math.max(wallLength(wall) * h - openings, 0)
}

/** Electrical points mounted on a stretch of wall that's being hacked. */
export function fixturesOnHacks(trace: FloorPlan, design: Design): string[] {
  const reno = renovationOf(design)
  return (design.fixtures ?? [])
    .filter((f) => {
      if (!f.wallId) return false
      const wall = trace.walls.find((w) => w.id === f.wallId)
      if (!wall) return false
      const t = closestOnSegment([f.x, f.y], wall.start, wall.end).t
      return reno.hacks.some((h) => h.wallId === wall.id && t >= Math.min(h.from, h.to) - 0.02 && t <= Math.max(h.from, h.to) + 0.02)
    })
    .map((f) => f.id)
}
