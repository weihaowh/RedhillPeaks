import type { FloorPlan, Vec2 } from '../types/plan'
import type { FurnitureItem } from '../types/design'
import { doorSwing, wallLength, wallOutline, wallPieces } from './planMath'
import { catalogEntry, footprintOf } from '../features/furniture/catalog'

// Plan-space geometry for furniture: footprints, wall snapping, clearances and warnings.
// An item's local x (width) runs along u = (cos θ, sin θ); its front faces n = (-sin θ, cos θ).

const dot = (a: Vec2, b: Vec2) => a[0] * b[0] + a[1] * b[1]
const add = (a: Vec2, b: Vec2, k = 1): Vec2 => [a[0] + b[0] * k, a[1] + b[1] * k]

export function itemAxes(item: FurnitureItem) {
  const t = (item.rotation * Math.PI) / 180
  const u: Vec2 = [Math.cos(t), Math.sin(t)]
  const n: Vec2 = [-Math.sin(t), Math.cos(t)]
  return { u, n }
}

/** Footprint corners: back-left, back-right, front-right, front-left. */
export function footprint(item: FurnitureItem, inset = 0): Vec2[] {
  const { u, n } = itemAxes(item)
  const { width, depth } = footprintOf(item)
  const hw = width / 2 - inset
  const hd = depth / 2 - inset
  const c: Vec2 = [item.x, item.y]
  return [add(add(c, u, -hw), n, -hd), add(add(c, u, hw), n, -hd), add(add(c, u, hw), n, hd), add(add(c, u, -hw), n, hd)]
}

/** Separating-axis test for two convex polygons. */
export function convexOverlap(a: Vec2[], b: Vec2[]): boolean {
  for (const poly of [a, b]) {
    for (let i = 0; i < poly.length; i++) {
      const p = poly[i]
      const q = poly[(i + 1) % poly.length]
      const axis: Vec2 = [-(q[1] - p[1]), q[0] - p[0]]
      const project = (pts: Vec2[]) => pts.map((v) => dot(v, axis))
      const pa = project(a)
      const pb = project(b)
      if (Math.max(...pa) <= Math.min(...pb) || Math.max(...pb) <= Math.min(...pa)) return false
    }
  }
  return true
}

/** Distance along a ray to a segment, or null if it misses. */
function raySegment(origin: Vec2, dir: Vec2, a: Vec2, b: Vec2): number | null {
  const ex = b[0] - a[0]
  const ey = b[1] - a[1]
  const denom = dir[0] * ey - dir[1] * ex
  if (Math.abs(denom) < 1e-9) return null
  const wx = a[0] - origin[0]
  const wy = a[1] - origin[1]
  const s = (wx * ey - wy * ex) / denom
  const t = (wx * dir[1] - wy * dir[0]) / denom
  return s >= 0 && t >= 0 && t <= 1 ? s : null
}

/** Solid wall blocks at floor level (doorways are gaps), as rectangles. */
export function wallBlocks(plan: FloorPlan): Vec2[][] {
  return plan.walls
    .filter((w) => wallLength(w) > 0.01)
    .flatMap((w) => wallPieces(w, plan.ceilingHeight).filter((p) => p.bottom === 0).map((p) => wallOutline(w, p.from, p.to)))
}

const layerOf = (item: FurnitureItem) => catalogEntry(item.type)?.layer ?? 'floor'

/**
 * Nudges an item so any edge within `tolerance` of a parallel wall face sits flush against it.
 * Works per item axis, so a piece can tuck into a corner.
 */
export function snapToWalls(item: FurnitureItem, plan: FloorPlan, tolerance = 0.15): Vec2 {
  const { u, n } = itemAxes(item)
  const { width, depth } = footprintOf(item)
  const c: Vec2 = [item.x, item.y]
  const edges: { mid: Vec2; out: Vec2; axis: 'u' | 'n' }[] = [
    { mid: add(c, n, -depth / 2), out: [-n[0], -n[1]], axis: 'n' },
    { mid: add(c, n, depth / 2), out: n, axis: 'n' },
    { mid: add(c, u, width / 2), out: u, axis: 'u' },
    { mid: add(c, u, -width / 2), out: [-u[0], -u[1]], axis: 'u' },
  ]
  const best: Record<'u' | 'n', { d: number; shift: Vec2 } | null> = { u: null, n: null }

  for (const w of plan.walls) {
    const len = wallLength(w)
    if (len < 0.05) continue
    const dir: Vec2 = [(w.end[0] - w.start[0]) / len, (w.end[1] - w.start[1]) / len]
    for (const side of [1, -1]) {
      const f: Vec2 = [-dir[1] * side, dir[0] * side]
      const faceStart = add(w.start, f, w.thickness / 2)
      for (const e of edges) {
        if (dot(e.out, f) > -0.995) continue // edge must face the wall face head-on
        const d = dot([e.mid[0] - faceStart[0], e.mid[1] - faceStart[1]], f)
        if (d < -0.05 || d > tolerance) continue
        const along = dot([e.mid[0] - faceStart[0], e.mid[1] - faceStart[1]], dir)
        if (along < -0.05 || along > len + 0.05) continue
        const current = best[e.axis]
        if (!current || Math.abs(d) < current.d) best[e.axis] = { d: Math.abs(d), shift: [-f[0] * d, -f[1] * d] }
      }
    }
  }
  let p = c
  if (best.n) p = add(p, best.n.shift)
  if (best.u) p = add(p, best.u.shift)
  return p
}

export interface Clearance {
  side: 'front' | 'back' | 'left' | 'right'
  from: Vec2
  to: Vec2
  distance: number
}

const MAX_CLEARANCE = 3
const RAY_INSET = 0.01

/** Gap from each side of a floor item to the nearest wall or other floor item. */
export function clearances(item: FurnitureItem, items: FurnitureItem[], plan: FloorPlan): Clearance[] {
  if (layerOf(item) !== 'floor') return []
  const obstacles = [...wallBlocks(plan), ...items.filter((o) => o.id !== item.id && layerOf(o) === 'floor').map((o) => footprint(o))]
  const [bl, br, fr, fl] = footprint(item)
  const { u, n } = itemAxes(item)
  const sides: [Clearance['side'], Vec2, Vec2, Vec2][] = [
    ['front', fl, fr, n],
    ['back', br, bl, [-n[0], -n[1]]],
    ['right', fr, br, u],
    ['left', bl, fl, [-u[0], -u[1]]],
  ]
  const result: Clearance[] = []
  for (const [side, a, b, out] of sides) {
    let best: Clearance | null = null
    for (const t of [0.08, 0.5, 0.92]) {
      const from: Vec2 = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]
      // Cast from just inside the edge so an obstacle sitting flush against it is hit at its
      // near face (≈0), rather than the ray starting inside it and finding its far face.
      const origin = add(from, out, -RAY_INSET)
      let hit = Infinity
      for (const poly of obstacles) {
        for (let i = 0; i < poly.length; i++) {
          const s = raySegment(origin, out, poly[i], poly[(i + 1) % poly.length])
          if (s !== null && s < hit) hit = s
        }
      }
      const distance = Math.max(0, hit - RAY_INSET)
      if (distance <= MAX_CLEARANCE && (!best || distance < best.distance)) best = { side, from, to: add(from, out, distance), distance }
    }
    if (best) result.push(best)
  }
  return result
}

/** Comfortable walkway width; narrower gaps show amber in the 3D measurements. */
export const WALKWAY_COMFORT = 0.8
/** Minimum usable walkway (e.g. beside a bed); narrower gaps get a warning. */
export const WALKWAY_MIN = 0.6
/** Gaps narrower than this are treated as deliberate (against a wall), not as walkways. */
export const WALKWAY_GAP = 0.3

export interface Warning {
  kind: 'overlap' | 'wall' | 'door' | 'walkway'
  message: string
}

export function itemWarnings(item: FurnitureItem, items: FurnitureItem[], plan: FloorPlan): Warning[] {
  const layer = layerOf(item)
  if (layer === 'rug') return []
  const warnings: Warning[] = []
  const fp = footprint(item, 0.01)

  const hits = items.filter((o) => o.id !== item.id && layerOf(o) === layer && convexOverlap(fp, footprint(o, 0.01)))
  if (hits.length) {
    const names = hits.map((o) => catalogEntry(o.type)?.name.toLowerCase() ?? 'item')
    warnings.push({ kind: 'overlap', message: `Overlaps the ${[...new Set(names)].join(', ')}` })
  }
  if (wallBlocks(plan).some((poly) => convexOverlap(footprint(item, 0.02), poly))) {
    warnings.push({ kind: 'wall', message: 'Goes into a wall' })
  }
  if (layer === 'floor') {
    const blocked = plan.walls.some((w) =>
      (w.openings ?? [])
        .filter((o) => o.kind === 'door')
        .some((o) => {
          const { hinge, jamb, toward } = doorSwing(w, o)
          const swing: Vec2[] = [hinge, jamb, add(jamb, toward, o.width), add(hinge, toward, o.width)]
          return convexOverlap(fp, swing)
        }),
    )
    if (blocked) warnings.push({ kind: 'door', message: 'Blocks a door from opening fully' })
    // Small pieces (lamps, side tables, chairs) aren't what people walk around, and gaps under
    // 300 mm aren't walkways at all (a sofa nudged off a wall), so only flag 300–600 mm gaps
    // beside sizeable furniture.
    // A coffee table sits a deliberate 400 mm from the sofa, so gaps to it aren't walkways either.
    const { width, depth } = footprintOf(item)
    if (!catalogEntry(item.type)?.reach && Math.min(width, depth) >= 0.5 && width * depth >= 0.4) {
      const walkable = items.filter((o) => !catalogEntry(o.type)?.reach)
      const tight = clearances(item, walkable, plan).filter((c) => c.distance >= WALKWAY_GAP && c.distance < WALKWAY_MIN)
      for (const c of tight) {
        warnings.push({ kind: 'walkway', message: `Tight walkway: ${Math.round(c.distance * 1000)} mm on the ${c.side} (600 minimum, 800 comfortable)` })
      }
    }
  }
  return warnings
}
