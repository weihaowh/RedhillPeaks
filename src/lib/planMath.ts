import type { FloorPlan, Room, Vec2, Wall } from '../types/plan'

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
  return [cx / (6 * a), cy / (6 * a)]
}

export const roomAnchor = (room: Room): Vec2 => room.labelAt ?? polygonCentroid(room.polygon)

export function planBounds(plan: FloorPlan) {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const room of plan.rooms) {
    for (const [x, y] of room.polygon) {
      minX = Math.min(minX, x)
      minY = Math.min(minY, y)
      maxX = Math.max(maxX, x)
      maxY = Math.max(maxY, y)
    }
  }
  return { minX, minY, maxX, maxY, cx: (minX + maxX) / 2, cy: (minY + maxY) / 2 }
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
