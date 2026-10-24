import type { FloorPlan, Room, Vec2, Wall } from '../types/plan'
import type { Design, Fixture, FurnitureItem } from '../types/design'
import { fixtureDef } from '../features/electrical/fixtures'
import { closestOnSegment, faceRoom, pointInPolygon, polygonArea, roomAnchor, wallLength } from './planMath'
import { footprint, itemAxes } from './furnitureMath'
import { newFixtureId } from './electrical'

// "Suggest points for me": a sensible starting electrical layout from the rooms and furniture.
// Everything it places is marked `suggested`, so running it again replaces only its own points.

interface Face {
  wall: Wall
  side: 1 | -1
  len: number
  u: Vec2
  f: Vec2
}

const WET = new Set(['bath', 'service', 'shelter'])

function facesOf(plan: FloorPlan, roomId: string): Face[] {
  const out: Face[] = []
  for (const wall of plan.walls) {
    const len = wallLength(wall)
    if (len < 0.4) continue
    const u: Vec2 = [(wall.end[0] - wall.start[0]) / len, (wall.end[1] - wall.start[1]) / len]
    for (const side of [1, -1] as const) {
      if (faceRoom(plan, wall, side)?.id === roomId) out.push({ wall, side, len, u, f: [-u[1] * side, u[0] * side] })
    }
  }
  return out
}

/** Spot `t` along a face is clear of doors and open sides. */
const clearAt = (face: Face, t: number) => !(face.wall.openings ?? []).some((o) => o.kind !== 'window' && t > o.offset - 0.08 && t < o.offset + o.width + 0.08)

function onFace(type: string, face: Face, t: number, height?: number): Fixture | null {
  const tt = Math.min(Math.max(t, 0.12), face.len - 0.12)
  if (!clearAt(face, tt)) return null
  const def = fixtureDef(type)!
  const off = face.wall.thickness / 2 + 0.005
  const x = face.wall.start[0] + face.u[0] * tt + face.f[0] * off
  const y = face.wall.start[1] + face.u[1] * tt + face.f[1] * off
  return {
    id: newFixtureId(),
    type,
    x,
    y,
    rotation: (Math.atan2(-face.f[0], face.f[1]) * 180) / Math.PI,
    height: height ?? def.height,
    wallId: face.wall.id,
    side: face.side,
    suggested: true,
  }
}

/** Wall point nearest `p` on any face of the room. */
function nearestOnFaces(type: string, faces: Face[], p: Vec2, height?: number): Fixture | null {
  let best: { face: Face; t: number; d: number } | null = null
  for (const face of faces) {
    const hit = closestOnSegment(p, face.wall.start, face.wall.end)
    if (!clearAt(face, hit.t)) continue
    if (!best || hit.dist < best.d) best = { face, t: hit.t, d: hit.dist }
  }
  return best ? onFace(type, best.face, best.t, height) : null
}

/** Ceiling light positions spread across the room, away from the walls. */
function lightSpots(room: Room, count: number): Vec2[] {
  const xs = room.polygon.map((p) => p[0])
  const ys = room.polygon.map((p) => p[1])
  const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)]
  const edgeDist = (p: Vec2) =>
    Math.min(...room.polygon.map((a, i) => closestOnSegment(p, a, room.polygon[(i + 1) % room.polygon.length]).dist))
  const candidates: Vec2[] = []
  for (let x = minX + 0.3; x < maxX; x += 0.3) for (let y = minY + 0.3; y < maxY; y += 0.3) {
    const p: Vec2 = [x, y]
    if (pointInPolygon(p, room.polygon) && edgeDist(p) > 0.55) candidates.push(p)
  }
  if (!candidates.length) return [roomAnchor(room)]
  // Farthest-point sampling from the room's anchor gives an even spread.
  const anchor = roomAnchor(room)
  const picked: Vec2[] = [candidates.reduce((a, b) => (Math.hypot(b[0] - anchor[0], b[1] - anchor[1]) < Math.hypot(a[0] - anchor[0], a[1] - anchor[1]) ? b : a))]
  while (picked.length < count && picked.length < candidates.length) {
    let next = candidates[0]
    let far = -1
    for (const c of candidates) {
      const d = Math.min(...picked.map((p) => Math.hypot(c[0] - p[0], c[1] - p[1])))
      if (d > far) {
        far = d
        next = c
      }
    }
    picked.push(next)
  }
  return picked.map(([x, y]) => [Math.round(x * 20) / 20, Math.round(y * 20) / 20])
}

/** Doors that belong to the room: they swing into it (shelter: any door in its walls). */
function ownDoors(plan: FloorPlan, room: Room) {
  const doors: { wall: Wall; t: number; insideSide: 1 | -1 }[] = []
  for (const wall of plan.walls) {
    for (const o of wall.openings ?? []) {
      if (o.kind !== 'door') continue
      const side = o.side ?? 1
      const into = faceRoom(plan, wall, side)?.id === room.id
      const onShelter = room.kind === 'shelter' && faceRoom(plan, wall, -side as 1 | -1)?.id === room.id
      if (!into && !onShelter) continue
      // Switch goes on the latch side, 150 mm past the frame.
      const t = (o.hinge ?? 'start') === 'start' ? o.offset + o.width + 0.15 : o.offset - 0.15
      doors.push({ wall, t, insideSide: into ? side : (-side as 1 | -1) })
    }
  }
  // Prefer an external door (the main door) for the living room.
  return doors.sort((a, b) => Number(!!b.wall.exterior) - Number(!!a.wall.exterior))
}

const within = (it: FurnitureItem, room: Room) => pointInPolygon([it.x, it.y], room.polygon)

export function suggestFixtures(plan: FloorPlan, design: Design): Fixture[] {
  const out: Fixture[] = []
  const push = (f: Fixture | null) => f && out.push(f)
  const items = design.items
  const ledge = plan.rooms.find((r) => r.kind === 'ledge')
  let fanCoils = 0

  for (const room of plan.rooms) {
    if (room.kind === 'ledge') continue
    const faces = facesOf(plan, room.id)
    const here = items.filter((it) => within(it, room))
    const area = polygonArea(room.polygon)

    // Lights
    // About one downlight per 4 m² in living rooms, bedrooms and the kitchen; small rooms get one.
    const count = room.kind === 'living' || room.kind === 'bedroom' || room.kind === 'kitchen' ? Math.ceil(area / 4) : room.kind === 'bath' && area > 4.5 ? 2 : 1
    let spots = lightSpots(room, count)
    const dining = here.find((it) => it.type === 'dining-set')
    const lights: Fixture[] = []
    if (dining) {
      spots = spots.filter((p) => Math.hypot(p[0] - dining.x, p[1] - dining.y) > 1.0)
      lights.push({ id: newFixtureId(), type: 'light-pendant', x: dining.x, y: dining.y, rotation: 0, height: plan.ceilingHeight, suggested: true })
    }
    for (const [x, y] of spots) lights.push({ id: newFixtureId(), type: 'light-down', x, y, rotation: 0, height: plan.ceilingHeight, suggested: true })

    // Switch at the room's door (outside for wet rooms and the shelter), controlling its lights.
    const door = ownDoors(plan, room)[0]
    let sw: Fixture | null = null
    const gang = lights.length >= 3 ? 'switch-3' : lights.length === 2 ? 'switch-2' : 'switch-1'
    if (door) {
      const len = wallLength(door.wall)
      const u: Vec2 = [(door.wall.end[0] - door.wall.start[0]) / len, (door.wall.end[1] - door.wall.start[1]) / len]
      const side = WET.has(room.kind) ? (-door.insideSide as 1 | -1) : door.insideSide
      sw = onFace(gang, { wall: door.wall, side, len, u, f: [-u[1] * side, u[0] * side] }, door.t)
    }
    if (!sw) {
      // No door (e.g. the open kitchen): put it on the wall nearest the living area.
      const living = plan.rooms.find((r) => r.kind === 'living')
      sw = nearestOnFaces(gang, faces, living ? roomAnchor(living) : roomAnchor(room))
    }
    push(sw)
    for (const l of lights) out.push(sw ? { ...l, switchId: sw.id } : l)

    // Power and data from the furniture.
    const behind = (it: FurnitureItem, localX: number): Vec2 => {
      const { u, n } = itemAxes(it)
      return [it.x + u[0] * localX - n[0] * (it.depth / 2 + 0.05), it.y + u[1] * localX - n[1] * (it.depth / 2 + 0.05)]
    }
    let sockets = 0
    for (const it of here) {
      switch (it.type) {
        case 'bedside':
          push(nearestOnFaces('socket-twin', faces, behind(it, 0), 0.45)) && sockets++
          break
        case 'bed':
          if (!here.some((o) => o.type === 'bedside')) {
            for (const s of [-1, 1]) push(nearestOnFaces('socket-twin', faces, behind(it, s * (it.width / 2 + 0.25)), 0.45)) && sockets++
          }
          break
        case 'desk':
          push(nearestOnFaces('socket-twin', faces, behind(it, -it.width / 4), 0.9)) && sockets++
          push(nearestOnFaces('data-lan', faces, behind(it, it.width / 4), 0.9))
          break
        case 'tv-console':
        case 'tv-wall':
          push(nearestOnFaces('socket-twin', faces, behind(it, -0.4), 0.55)) && sockets++
          push(nearestOnFaces('socket-twin', faces, behind(it, 0.4), 0.55)) && sockets++
          push(nearestOnFaces('data-tv', faces, behind(it, -0.15), 0.55))
          push(nearestOnFaces('data-lan', faces, behind(it, 0.15), 0.55))
          if (room.kind === 'living') push(nearestOnFaces('data-router', faces, behind(it, it.width / 2 + 0.3), 0.3))
          break
        case 'sofa':
        case 'sofa-l':
          push(nearestOnFaces('socket-twin', faces, behind(it, it.width / 2 - 0.1))) && sockets++
          break
        case 'kitchen-run': {
          const hob = it.options?.hob !== 'no' && it.width >= 1.8
          const hobX = -it.width / 2 + 0.6
          for (let x = -it.width / 2 + 0.5; x <= it.width / 2 - 0.3; x += 1.0) {
            if (hob && Math.abs(x - hobX) < 0.45) continue
            push(nearestOnFaces('socket-twin', faces, behind(it, x), 1.1)) && sockets++
          }
          if (hob) {
            push(nearestOnFaces('point-hob', faces, behind(it, hobX + 0.45), 1.2))
            push(nearestOnFaces('point-hood', faces, behind(it, hobX), 2.1))
          }
          break
        }
        case 'fridge':
          push(nearestOnFaces('point-fridge', faces, behind(it, 0)))
          break
        case 'washer':
          push(nearestOnFaces('point-washer', faces, behind(it, 0)))
          break
      }
    }

    // Bedrooms get at least two twin sockets; living rooms about one per 8 m².
    if (room.kind === 'living' || room.kind === 'bedroom') {
      const target = room.kind === 'living' ? Math.max(2, Math.ceil(area / 8)) : 2
      const free = faces.filter((f) => f.len > 1.2 && !(f.wall.openings ?? []).some((o) => o.kind === 'door')).sort((a, b) => b.len - a.len)
      for (const face of free) {
        if (sockets >= target) break
        const s = onFace('socket-twin', face, face.len / 2)
        if (s && !out.some((o) => o.type.startsWith('socket') && Math.hypot(o.x - s.x, o.y - s.y) < 1.0)) {
          out.push(s)
          sockets++
        }
      }
    }

    // Water heater in each bathroom.
    if (room.kind === 'bath') {
      const face = [...faces].sort((a, b) => b.len - a.len)[0]
      if (face) push(onFace('point-heater', face, face.len - 0.4))
    }

    // Aircon fan coil: a long wall with no door or window, not behind a wardrobe.
    if (room.kind === 'living' || room.kind === 'bedroom') {
      const tall = here.filter((it) => it.height >= 1.8).map((it) => footprint(it))
      const ok = faces
        .filter((f) => f.len >= 1.1 && !(f.wall.openings ?? []).length)
        .filter((f) => {
          const mid: Vec2 = [(f.wall.start[0] + f.wall.end[0]) / 2 + f.f[0] * 0.4, (f.wall.start[1] + f.wall.end[1]) / 2 + f.f[1] * 0.4]
          return !tall.some((poly) => pointInPolygon(mid, poly))
        })
        .sort((a, b) => b.len - a.len)
      if (ok[0] && push(onFace('ac-indoor', ok[0], ok[0].len / 2))) fanCoils++
    }
  }

  if (fanCoils && ledge) {
    const [x, y] = roomAnchor(ledge)
    out.push({ id: newFixtureId(), type: 'ac-condenser', x, y, rotation: 0, height: 0, suggested: true })
  }
  return out
}
