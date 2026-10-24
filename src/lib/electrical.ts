import type { FloorPlan, Room, Vec2, Wall } from '../types/plan'
import type { Fixture } from '../types/design'
import { fixtureDef } from '../features/electrical/fixtures'
import { closestOnSegment, faceRoom, pointInPolygon, wallLength } from './planMath'

// Plan geometry for electrical points: snapping to wall faces, which room a point serves, and
// dimensions for the contractor plan.

export interface FacePoint {
  wall: Wall
  side: 1 | -1
  /** Point on the wall face (plan metres). */
  point: Vec2
  /** Distance from the wall start along its length. */
  along: number
  /** Furniture-style rotation so the fixture faces into the room. */
  rotation: number
  room?: Room
}

const unit = (w: Wall): Vec2 => {
  const len = wallLength(w)
  return [(w.end[0] - w.start[0]) / len, (w.end[1] - w.start[1]) / len]
}

/** Rotation (degrees) whose front, (-sin θ, cos θ), points along `n`. */
const facing = (n: Vec2) => (Math.atan2(-n[0], n[1]) * 180) / Math.PI

/**
 * Nearest wall face to `p` within `tolerance`, on the side the point is on. Returns null over a
 * doorway or open side, where nothing can be mounted.
 */
export function wallFaceAt(p: Vec2, plan: FloorPlan, tolerance: number): FacePoint | null {
  let best: { w: Wall; t: number; dist: number } | null = null
  for (const w of plan.walls) {
    if (wallLength(w) < 0.1) continue
    const hit = closestOnSegment(p, w.start, w.end)
    const dist = hit.dist - w.thickness / 2
    if (dist <= tolerance && (!best || dist < best.dist)) best = { w, t: hit.t, dist }
  }
  if (!best) return null
  const { w, t } = best
  const len = wallLength(w)
  if (t < 0.05 || t > len - 0.05) return null
  if ((w.openings ?? []).some((o) => o.kind !== 'window' && t > o.offset - 0.05 && t < o.offset + o.width + 0.05)) return null
  const u = unit(w)
  const n: Vec2 = [-u[1], u[0]]
  const on = closestOnSegment(p, w.start, w.end).point
  const side: 1 | -1 = (p[0] - on[0]) * n[0] + (p[1] - on[1]) * n[1] >= 0 ? 1 : -1
  const f: Vec2 = [n[0] * side, n[1] * side]
  const offset = w.thickness / 2 + 0.005
  return {
    wall: w,
    side,
    point: [on[0] + f[0] * offset, on[1] + f[1] * offset],
    along: t,
    rotation: facing(f),
    room: faceRoom(plan, w, side),
  }
}

/** The room a fixture serves: the one it faces into, or the one it hangs in. */
export function fixtureRoom(f: Fixture, plan: FloorPlan): Room | undefined {
  if (f.wallId) {
    const w = plan.walls.find((x) => x.id === f.wallId)
    if (w && f.side) return faceRoom(plan, w, f.side)
  }
  return plan.rooms.find((r) => pointInPolygon([f.x, f.y], r.polygon))
}

export const newFixtureId = () => `fx-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`

/** A new fixture of `type` at plan point `p`, or null if it can't go there. */
export function placeFixtureAt(type: string, p: Vec2, plan: FloorPlan, tolerance: number): Fixture | null {
  const def = fixtureDef(type)
  if (!def) return null
  if (def.mount === 'wall') {
    const face = wallFaceAt(p, plan, tolerance)
    if (!face) return null
    return { id: newFixtureId(), type, x: face.point[0], y: face.point[1], rotation: face.rotation, height: def.height, wallId: face.wall.id, side: face.side }
  }
  if (!plan.rooms.some((r) => pointInPolygon(p, r.polygon))) return null
  const snap = (v: number) => Math.round(v * 20) / 20
  return { id: newFixtureId(), type, x: snap(p[0]), y: snap(p[1]), rotation: 0, height: def.mount === 'ceiling' ? plan.ceilingHeight : def.height }
}

/**
 * Setting-out dimensions for the contractor plan. Wall points: distance along the wall from
 * the nearer corner. Ceiling points: distance to the nearest wall face in x and in y.
 */
export function settingOut(f: Fixture, plan: FloorPlan): string {
  const w = f.wallId ? plan.walls.find((x) => x.id === f.wallId) : undefined
  if (w) {
    const t = closestOnSegment([f.x, f.y], w.start, w.end).t
    const fromCorner = Math.min(t, wallLength(w) - t) - w.thickness / 2
    return `${Math.round(Math.max(fromCorner, 0) * 1000)} from corner`
  }
  const nearest = (dir: Vec2) => {
    let best = Infinity
    for (const wall of plan.walls) {
      const len = wallLength(wall)
      if (len < 0.1) continue
      const u = unit(wall)
      // Only walls running perpendicular to `dir` give a setting-out distance on that axis.
      if (Math.abs(u[0] * dir[0] + u[1] * dir[1]) > 0.1) continue
      const hit = closestOnSegment([f.x, f.y], wall.start, wall.end)
      const along = (hit.point[0] - f.x) * dir[0] + (hit.point[1] - f.y) * dir[1]
      if (hit.t > 0 && hit.t < len && Math.abs(along) - wall.thickness / 2 < best) best = Math.abs(along) - wall.thickness / 2
    }
    return best
  }
  const dx = nearest([1, 0])
  const dy = nearest([0, 1])
  return [dx, dy].every(Number.isFinite) ? `${Math.round(dx * 1000)} × ${Math.round(dy * 1000)} from walls` : ''
}
