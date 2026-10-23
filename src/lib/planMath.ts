import type { FloorPlan, Opening, Room, Vec2, Wall } from '../types/plan'

export function polygonArea(points: Vec2[]): number {
  let sum = 0
  for (let i = 0; i < points.length; i++) {
    const [x1, y1] = points[i]
    const [x2, y2] = points[(i + 1) % points.length]
    sum += x1 * y2 - x2 * y1
  }
  return Math.abs(sum) / 2
}

export function polygonCentroid(points: Vec2[]): Vec2 {
  let a = 0
  let cx = 0
  let cy = 0
  for (let i = 0; i < points.length; i++) {
    const [x1, y1] = points[i]
    const [x2, y2] = points[(i + 1) % points.length]
    const f = x1 * y2 - x2 * y1
    a += f
    cx += (x1 + x2) * f
    cy += (y1 + y2) * f
  }
  a *= 0.5
  if (Math.abs(a) < 1e-9) {
    const n = points.length || 1
    return [points.reduce((t, p) => t + p[0], 0) / n, points.reduce((t, p) => t + p[1], 0) / n]
  }
  return [cx / (6 * a), cy / (6 * a)]
}

export const roomAnchor = (room: Room): Vec2 => room.labelAt ?? polygonCentroid(room.polygon)

export function planBounds(plan: FloorPlan) {
  const pts: Vec2[] = [...plan.rooms.flatMap((r) => r.polygon), ...plan.walls.flatMap((w) => [w.start, w.end])]
  if (!pts.length && plan.underlay) {
    const u = plan.underlay
    pts.push([u.x, u.y], [u.x + u.width, u.y + u.height])
  }
  if (!pts.length) pts.push([0, 0], [10, 8])
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const [x, y] of pts) {
    minX = Math.min(minX, x)
    minY = Math.min(minY, y)
    maxX = Math.max(maxX, x)
    maxY = Math.max(maxY, y)
  }
  return { minX, minY, maxX, maxY, cx: (minX + maxX) / 2, cy: (minY + maxY) / 2 }
}

export const distance = (a: Vec2, b: Vec2) => Math.hypot(a[0] - b[0], a[1] - b[1])

/** Closest point on segment ab to p, with `t` as the distance from a along the segment. */
export function closestOnSegment(p: Vec2, a: Vec2, b: Vec2): { point: Vec2; t: number; dist: number } {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const len = Math.hypot(dx, dy)
  if (len < 1e-9) return { point: a, t: 0, dist: distance(p, a) }
  const u = Math.min(Math.max(((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (len * len), 0), 1)
  const point: Vec2 = [a[0] + dx * u, a[1] + dy * u]
  return { point, t: u * len, dist: distance(p, point) }
}

/** Intersection of the infinite line through `origin` along `dir` with segment ab, if any. */
export function rayHitSegment(origin: Vec2, dir: Vec2, a: Vec2, b: Vec2): Vec2 | null {
  const ex = b[0] - a[0]
  const ey = b[1] - a[1]
  const denom = dir[0] * ey - dir[1] * ex
  if (Math.abs(denom) < 1e-9) return null
  const wx = a[0] - origin[0]
  const wy = a[1] - origin[1]
  const s = (wx * ey - wy * ex) / denom
  const u = (wx * dir[1] - wy * dir[0]) / denom
  if (u < -1e-6 || u > 1 + 1e-6) return null
  return [origin[0] + dir[0] * s, origin[1] + dir[1] * s]
}

export const wallLength = (w: Wall) => Math.hypot(w.end[0] - w.start[0], w.end[1] - w.start[1])

/** Angle of the wall in plan space (radians, y pointing down the drawing). */
export const wallAngle = (w: Wall) => Math.atan2(w.end[1] - w.start[1], w.end[0] - w.start[0])

/** Point at distance `t` along the wall from its start. */
export function alongWall(w: Wall, t: number): Vec2 {
  const len = wallLength(w)
  return [
    w.start[0] + ((w.end[0] - w.start[0]) / len) * t,
    w.start[1] + ((w.end[1] - w.start[1]) / len) * t,
  ]
}

/** Wall outline as four plan-space corners, extended by half the thickness at each end so corners close. */
export function wallOutline(w: Wall, from = -w.thickness / 2, to = wallLength(w) + w.thickness / 2): Vec2[] {
  const len = wallLength(w)
  const ux = (w.end[0] - w.start[0]) / len
  const uy = (w.end[1] - w.start[1]) / len
  const nx = -uy * (w.thickness / 2)
  const ny = ux * (w.thickness / 2)
  const a: Vec2 = [w.start[0] + ux * from, w.start[1] + uy * from]
  const b: Vec2 = [w.start[0] + ux * to, w.start[1] + uy * to]
  return [
    [a[0] + nx, a[1] + ny],
    [b[0] + nx, b[1] + ny],
    [b[0] - nx, b[1] - ny],
    [a[0] - nx, a[1] - ny],
  ]
}

export interface WallPiece {
  from: number
  to: number
  bottom: number
  top: number
}

/**
 * Splits a wall into solid blocks around its openings: full-height piers between openings,
 * plus the sill below and lintel above each one. `cut` trims everything to a cutaway height.
 */
export function wallPieces(w: Wall, ceiling: number, cut?: number): WallPiece[] {
  const len = wallLength(w)
  const height = w.height ?? ceiling
  const ext = w.thickness / 2
  const openings = [...(w.openings ?? [])].sort((a, b) => a.offset - b.offset)
  const pieces: WallPiece[] = []
  let cursor = -ext

  for (const o of openings) {
    if (o.offset > cursor) pieces.push({ from: cursor, to: o.offset, bottom: 0, top: height })
    if (o.sill > 0) pieces.push({ from: o.offset, to: o.offset + o.width, bottom: 0, top: o.sill })
    const head = o.sill + o.height
    if (head < height) pieces.push({ from: o.offset, to: o.offset + o.width, bottom: head, top: height })
    cursor = o.offset + o.width
  }
  if (len + ext > cursor) pieces.push({ from: cursor, to: len + ext, bottom: 0, top: height })

  if (cut === undefined) return pieces
  return pieces.filter((p) => p.bottom < cut).map((p) => ({ ...p, top: Math.min(p.top, cut) }))
}

/**
 * Door swing in plan space: the hinge point on the wall centre-line, the opposite jamb,
 * the leaf direction when closed, and the direction it swings toward.
 */
export function doorSwing(w: Wall, o: Opening) {
  const len = wallLength(w)
  const u: Vec2 = [(w.end[0] - w.start[0]) / len, (w.end[1] - w.start[1]) / len]
  const side = o.side ?? 1
  const atStart = (o.hinge ?? 'start') === 'start'
  const hinge = alongWall(w, atStart ? o.offset : o.offset + o.width)
  const jamb = alongWall(w, atStart ? o.offset + o.width : o.offset)
  const closed: Vec2 = atStart ? u : [-u[0], -u[1]]
  const toward: Vec2 = [-u[1] * side, u[0] * side]
  return { hinge, jamb, closed, toward }
}

export function pointInPolygon([x, y]: Vec2, poly: Vec2[]): boolean {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i]
    const [xj, yj] = poly[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

/** The room a wall face looks into, found by probing just in front of the face's midpoint. */
export function faceRoom(plan: FloorPlan, w: Wall, side: 1 | -1): Room | undefined {
  const len = wallLength(w)
  if (len < 1e-6) return undefined
  const mid = alongWall(w, len / 2)
  const d = w.thickness / 2 + 0.1
  const probe: Vec2 = [mid[0] - ((w.end[1] - w.start[1]) / len) * side * d, mid[1] + ((w.end[0] - w.start[0]) / len) * side * d]
  return plan.rooms.find((r) => pointInPolygon(probe, r.polygon))
}
