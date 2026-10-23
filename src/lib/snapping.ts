import type { FloorPlan, Vec2 } from '../types/plan'
import { closestOnSegment, distance, rayHitSegment } from './planMath'

export type SnapKind = 'point' | 'wall' | 'angle' | 'grid' | 'free'

export interface Snap {
  point: Vec2
  kind: SnapKind
}

const GRID = 0.05
const ANGLE_STEP = Math.PI / 4
const ANGLE_TOLERANCE = (7 * Math.PI) / 180

// Decimal steps only. Dividing by the inverse step keeps 3.0 from coming out as 3.0000000000000004.
const roundTo = (v: number, step: number) => Math.round(v / step) / Math.round(1 / step)

/** Every wall endpoint and room vertex, the points worth snapping to. */
export function snapTargets(plan: FloorPlan, extra: Vec2[] = []): Vec2[] {
  return [...plan.walls.flatMap((w) => [w.start, w.end]), ...plan.rooms.flatMap((r) => r.polygon), ...extra]
}

/**
 * Snaps a cursor position, strongest rule first: existing points, then (while drawing from `from`)
 * 45° directions, extended to meet a nearby wall, then the 50 mm grid.
 */
export function snapPoint(raw: Vec2, plan: FloorPlan, tolerance: number, opts: { from?: Vec2; extra?: Vec2[]; exclude?: Vec2; disabled?: boolean } = {}): Snap {
  if (opts.disabled) return { point: raw, kind: 'free' }

  let best: Vec2 | null = null
  let bestDist = tolerance
  for (const p of snapTargets(plan, opts.extra)) {
    if (opts.exclude && distance(p, opts.exclude) < 1e-3) continue
    const d = distance(raw, p)
    if (d < bestDist) {
      best = p
      bestDist = d
    }
  }
  if (best) return { point: best, kind: 'point' }

  // Walls attached to the point being dragged would just pull it back along themselves.
  const attached = (p: Vec2) => !!opts.exclude && distance(p, opts.exclude) < 1e-3
  const nearWall = plan.walls
    .filter((w) => !attached(w.start) && !attached(w.end))
    .map((w) => ({ w, hit: closestOnSegment(raw, w.start, w.end) }))
    .filter(({ hit }) => hit.dist < tolerance)
    .sort((a, b) => a.hit.dist - b.hit.dist)[0]

  if (opts.from) {
    const dx = raw[0] - opts.from[0]
    const dy = raw[1] - opts.from[1]
    const angle = Math.atan2(dy, dx)
    const snapped = Math.round(angle / ANGLE_STEP) * ANGLE_STEP
    if (Math.abs(angle - snapped) < ANGLE_TOLERANCE) {
      const dir: Vec2 = [Math.cos(snapped), Math.sin(snapped)]
      if (nearWall) {
        const hit = rayHitSegment(opts.from, dir, nearWall.w.start, nearWall.w.end)
        if (hit && distance(hit, raw) < tolerance * 2) return { point: hit, kind: 'wall' }
      }
      const len = roundTo(Math.hypot(dx, dy), 0.01)
      return { point: [roundTo(opts.from[0] + dir[0] * len, 1e-4), roundTo(opts.from[1] + dir[1] * len, 1e-4)], kind: 'angle' }
    }
  }

  if (nearWall) return { point: nearWall.hit.point, kind: 'wall' }
  return { point: [roundTo(raw[0], GRID), roundTo(raw[1], GRID)], kind: 'grid' }
}
