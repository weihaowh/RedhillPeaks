import { useMemo } from 'react'
import * as THREE from 'three'
import type { FloorPlan, Room, Vec2, Wall } from '../../types/plan'
import type { CeilingSpec } from '../../types/design'
import { closestOnSegment, pointInPolygon } from '../../lib/planMath'
import { paintMaterial } from './wallFinishes'

const CEILING_WHITE = '#f6f4ef'
/** Perimeter band sizes: [width from the wall, drop below the slab] in metres. */
const LBOX = { width: 0.35, drop: 0.3 }
const COVE = { width: 0.45, drop: 0.25, pocket: 0.08 }

/** Approximate colour of a white LED at a given colour temperature. */
export function kelvinToColor(k: number): THREE.Color {
  const t = k / 100
  const r = t <= 66 ? 255 : 329.7 * Math.pow(t - 60, -0.1332)
  const g = t <= 66 ? 99.47 * Math.log(t) - 161.12 : 288.12 * Math.pow(t - 60, -0.0755)
  const b = t >= 66 ? 255 : t <= 19 ? 0 : 138.52 * Math.log(t - 10) - 305.04
  const c = (v: number) => Math.min(Math.max(v, 0), 255) / 255
  return new THREE.Color().setRGB(c(r), c(g), c(b), THREE.SRGBColorSpace)
}

const stripCache = new Map<number, THREE.MeshStandardMaterial>()
function stripMaterial(kelvin: number) {
  let m = stripCache.get(kelvin)
  if (!m) {
    const color = kelvinToColor(kelvin)
    m = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 3, toneMapped: true })
    stripCache.set(kelvin, m)
  }
  return m
}

/**
 * Room edges that run along a wall, which is where L-box and cove bands go (not open sides
 * such as the kitchen beam). Shared with the cost estimate so both use the same run length.
 */
export function bandEdges(plan: FloorPlan, room: Room) {
  const pts = room.polygon
  const edges: { a: Vec2; b: Vec2; len: number; mid: Vec2; wall: Wall }[] = []
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i]
    const b = pts[(i + 1) % pts.length]
    const len = Math.hypot(b[0] - a[0], b[1] - a[1])
    if (len < 0.3) continue
    const mid: Vec2 = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
    const wall = plan.walls.find((w) => {
      if (closestOnSegment(mid, w.start, w.end).dist > 0.03) return false
      const wx = w.end[0] - w.start[0]
      const wy = w.end[1] - w.start[1]
      return Math.abs(wx * (b[1] - a[1]) - wy * (b[0] - a[0])) / (Math.hypot(wx, wy) * len) < 0.05
    })
    if (!wall || (wall.openings ?? []).some((o) => o.kind === 'opening')) continue
    edges.push({ a, b, len, mid, wall })
  }
  return edges
}

/** Total band length round a room (m). */
export const bandRun = (plan: FloorPlan, room: Room) => bandEdges(plan, room).reduce((sum, e) => sum + e.len, 0)

interface Band {
  position: [number, number, number]
  rotation: number
  size: [number, number, number]
  strip?: { position: [number, number, number]; length: number }
}

/**
 * L-box and cove ceilings, drawn as dropped bands along every room edge that sits on a wall.
 * The flat slab ceiling itself is left off so the dollhouse view can see in.
 */
export function Ceilings({ plan, ceilings, height }: { plan: FloorPlan; ceilings: Record<string, CeilingSpec>; height: number }) {
  const rooms = useMemo(
    () =>
      plan.rooms
        .filter((r) => ceilings[r.id] && ceilings[r.id].style !== 'flat')
        .map((room) => {
          const spec = ceilings[room.id]
          const cove = spec.style === 'cove'
          const dims = cove ? COVE : LBOX
          const bands: Band[] = []
          const pts = room.polygon
          for (const { a, b, len, mid, wall } of bandEdges(plan, room)) {
            let n: Vec2 = [-(b[1] - a[1]) / len, (b[0] - a[0]) / len]
            if (!pointInPolygon([mid[0] + n[0] * 0.3, mid[1] + n[1] * 0.3], pts)) n = [-n[0], -n[1]]
            const inset = wall.thickness / 2 + dims.width / 2
            const top = cove ? height - COVE.pocket : height
            const bottom = height - dims.drop
            const band: Band = {
              position: [mid[0] + n[0] * inset, (top + bottom) / 2, mid[1] + n[1] * inset],
              rotation: -Math.atan2(b[1] - a[1], b[0] - a[0]),
              size: [len, top - bottom, dims.width],
            }
            if (cove) {
              const s = wall.thickness / 2 + dims.width - 0.03
              band.strip = { position: [mid[0] + n[0] * s, top + 0.012, mid[1] + n[1] * s], length: len - dims.width }
            }
            bands.push(band)
          }
          return { id: room.id, kelvin: spec.warmth ?? 3000, bands }
        }),
    [plan, ceilings, height],
  )

  const white = paintMaterial(CEILING_WHITE)
  return (
    <>
      {rooms.flatMap((room) =>
        room.bands.map((band, i) => (
          <group key={`${room.id}-${i}`}>
            <mesh position={band.position} rotation-y={band.rotation} material={white} castShadow receiveShadow>
              <boxGeometry args={band.size} />
            </mesh>
            {band.strip && (
              <mesh position={band.strip.position} rotation-y={band.rotation} material={stripMaterial(room.kelvin)}>
                <boxGeometry args={[Math.max(band.strip.length, 0.1), 0.02, 0.025]} />
              </mesh>
            )}
          </group>
        )),
      )}
    </>
  )
}
