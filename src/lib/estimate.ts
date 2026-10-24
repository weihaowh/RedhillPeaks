import type { FloorPlan } from '../types/plan'
import { faceKey, type Design } from '../types/design'
import { APPLIANCES, BUILD_RATE, CEILING_RATE, HACK_MAKE_GOOD, HACK_RATE, NEW_DOOR, NEW_WINDOW, CONTINGENCY, FEATURE_RATE, FITTINGS, FLOOR_RATE, PAINT_RATE, itemPrice } from '../data/pricing'
import { EMPTY_DESIGN } from '../store/useDesignStore'
import { catalogEntry } from '../features/furniture/catalog'
import { finishById } from '../features/scene/finishes'
import { featureById } from '../features/scene/wallFinishes'
import { bandRun } from '../features/scene/Ceilings'
import { fixtureDef } from '../features/electrical/fixtures'
import { fixtureRoom } from './electrical'
import { faceRoom, pointInPolygon, polygonArea, wallLength } from './planMath'
import { builtArea, builtKind, hackedArea, renovationOf } from './renovation'

// A rough renovation budget from the current plan and design. `plan` is the renovated plan
// (new walls included); hacks are measured on the walls they cut.

export type CostCategory = 'Hacking & new walls' | 'Flooring' | 'Painting & feature walls' | 'Ceilings' | 'Electrical & aircon' | 'Carpentry' | 'Furniture' | 'Appliances' | 'Bathroom fittings'
export const CATEGORIES: CostCategory[] = ['Hacking & new walls', 'Flooring', 'Painting & feature walls', 'Ceilings', 'Electrical & aircon', 'Carpentry', 'Furniture', 'Appliances', 'Bathroom fittings']

export interface CostLine {
  category: CostCategory
  label: string
  room?: string
  /** e.g. "12.4 m²" or "6 ft run". */
  quantity: string
  amount: number
}

export interface Estimate {
  lines: CostLine[]
  byCategory: Record<CostCategory, number>
  subtotal: number
  contingency: number
  total: number
}

const perimeter = (pts: [number, number][]) => pts.reduce((sum, p, i) => sum + Math.hypot(pts[(i + 1) % pts.length][0] - p[0], pts[(i + 1) % pts.length][1] - p[1]), 0)
const m2 = (v: number) => `${v.toFixed(1)} m²`

export function estimate(plan: FloorPlan, design: Design): Estimate {
  const lines: CostLine[] = []
  const height = plan.ceilingHeight
  const indoor = plan.rooms.filter((r) => r.kind !== 'ledge')
  const roomName = (x: number, y: number) => plan.rooms.find((r) => pointInPolygon([x, y], r.polygon))?.name

  // Hacking and new walls.
  const reno = renovationOf(design)
  for (const h of reno.hacks) {
    const wall = plan.walls.find((w) => w.id === h.wallId)
    if (!wall) continue
    const area = hackedArea(plan, h)
    const room = [faceRoom(plan, wall, 1)?.name, faceRoom(plan, wall, -1)?.name].filter(Boolean).join(' / ')
    lines.push({ category: 'Hacking & new walls', label: 'Hack wall and make good', room, quantity: m2(area), amount: area * HACK_RATE + HACK_MAKE_GOOD })
  }
  for (const w of reno.walls) {
    const area = builtArea(plan, w)
    const room = faceRoom(plan, w, 1)?.name ?? faceRoom(plan, w, -1)?.name
    lines.push({ category: 'Hacking & new walls', label: `New ${builtKind(w.built).label.toLowerCase()}`, room, quantity: m2(area), amount: area * BUILD_RATE[w.built ?? 'drywall'] })
    for (const o of w.openings ?? []) {
      if (o.kind === 'opening') continue
      lines.push({ category: 'Hacking & new walls', label: o.kind === 'door' ? 'Door in new wall' : 'Window in new wall', room, quantity: '1', amount: o.kind === 'door' ? NEW_DOOR : NEW_WINDOW })
    }
  }

  // Flooring: only rooms given a new finish; untouched rooms keep the handed-over floor.
  for (const room of indoor) {
    const spec = design.floors[room.id]
    if (!spec) continue
    const area = polygonArea(room.polygon)
    lines.push({ category: 'Flooring', label: finishById(spec.finish).label, room: room.name, quantity: m2(area), amount: area * (FLOOR_RATE[spec.finish] ?? 80) })
  }

  // Painting: the whole flat once the base colour changes, otherwise just the repainted rooms.
  // Wall area ≈ perimeter × height, less ~15% for doors and windows.
  const paintArea = (roomIds: string[]) => indoor.filter((r) => roomIds.includes(r.id)).reduce((sum, r) => sum + perimeter(r.polygon) * height * 0.85, 0)
  if (design.wallPaint.toLowerCase() !== EMPTY_DESIGN.wallPaint) {
    const area = paintArea(indoor.map((r) => r.id))
    lines.push({ category: 'Painting & feature walls', label: 'Repaint whole flat', quantity: m2(area), amount: area * PAINT_RATE })
  } else {
    for (const room of indoor.filter((r) => design.roomPaint[r.id])) {
      const area = paintArea([room.id])
      lines.push({ category: 'Painting & feature walls', label: 'Repaint', room: room.name, quantity: m2(area), amount: area * PAINT_RATE })
    }
  }
  for (const w of plan.walls) {
    for (const side of [1, -1] as const) {
      const spec = design.features[faceKey(w.id, side)]
      if (!spec) continue
      const gross = wallLength(w) * (w.height ?? height)
      const openings = (w.openings ?? []).reduce((sum, o) => sum + o.width * Math.min(o.height, height - o.sill), 0)
      const area = Math.max(gross - openings, 0)
      lines.push({
        category: 'Painting & feature walls',
        label: featureById(spec.feature)?.label ?? spec.feature,
        room: faceRoom(plan, w, side)?.name,
        quantity: m2(area),
        amount: area * (FEATURE_RATE[spec.feature] ?? 100),
      })
    }
  }

  // Ceilings: L-box and cove bands run along the room's walls.
  for (const room of indoor) {
    const spec = design.ceilings[room.id]
    if (!spec || spec.style === 'flat') continue
    const run = bandRun(plan, room)
    lines.push({ category: 'Ceilings', label: spec.style === 'cove' ? 'Cove light false ceiling' : 'L-box', room: room.name, quantity: `${run.toFixed(1)} m run`, amount: run * CEILING_RATE[spec.style] })
  }

  // Electrical points, grouped per room and type.
  const groups = new Map<string, { room?: string; type: string; n: number }>()
  for (const f of design.fixtures ?? []) {
    const room = fixtureRoom(f, plan)?.name ?? (plan.rooms.find((r) => pointInPolygon([f.x, f.y], r.polygon))?.name)
    const key = `${room}|${f.type}`
    const g = groups.get(key) ?? { room, type: f.type, n: 0 }
    g.n++
    groups.set(key, g)
  }
  for (const g of groups.values()) {
    const def = fixtureDef(g.type)
    if (!def || !def.cost) continue
    lines.push({ category: 'Electrical & aircon', label: def.name, room: g.room, quantity: String(g.n), amount: def.cost * g.n })
  }

  // Furniture, carpentry, appliances and fittings.
  for (const it of design.items) {
    const entry = catalogEntry(it.type)
    if (!entry) continue
    const category: CostCategory = entry.category === 'Carpentry' || it.type === 'island' ? 'Carpentry' : APPLIANCES.has(it.type) ? 'Appliances' : FITTINGS.has(it.type) ? 'Bathroom fittings' : 'Furniture'
    const quantity = category === 'Carpentry' ? `${Math.round(it.width * 3.2808)} ft run` : '1'
    lines.push({ category, label: it.variant ? `${entry.name} (${it.variant})` : entry.name, room: roomName(it.x, it.y), quantity, amount: itemPrice(it) })
  }

  const byCategory = Object.fromEntries(CATEGORIES.map((c) => [c, 0])) as Record<CostCategory, number>
  for (const l of lines) {
    l.amount = Math.round(l.amount)
    byCategory[l.category] += l.amount
  }
  const subtotal = lines.reduce((s, l) => s + l.amount, 0)
  const contingency = Math.round(subtotal * CONTINGENCY)
  return { lines, byCategory, subtotal, contingency, total: subtotal + contingency }
}

export const sgd = (n: number) => `S$${Math.round(n).toLocaleString('en-SG')}`
