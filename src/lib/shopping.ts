import type { FloorPlan, Room } from '../types/plan'
import { faceKey, type Design } from '../types/design'
import { itemPrice } from '../data/pricing'
import { FABRICS, FURNITURE_FINISHES, catalogEntry, option } from '../features/furniture/catalog'
import { finishById, floorSpecFor } from '../features/scene/finishes'
import { PAINT_PALETTES, featureById } from '../features/scene/wallFinishes'
import { bandRun } from '../features/scene/Ceilings'
import { faceRoom, pointInPolygon, polygonArea, wallLength } from './planMath'

// Per-room shopping list and mood board: what to buy, how much material, and the palette.

export interface ListItem {
  name: string
  detail: string
  price: number
}

export interface Material {
  label: string
  quantity: string
}

export interface Swatch {
  label: string
  color: string
}

export interface RoomList {
  room: Room
  items: ListItem[]
  materials: Material[]
  swatches: Swatch[]
}

const WASTAGE = 0.1
const PAINT_COVERAGE = 10 // m² per litre per coat
const mm = (m: number) => Math.round(m * 1000)
const paintName = (hex: string) => PAINT_PALETTES.flatMap((p) => p.colors).find((c) => c.hex === hex.toLowerCase())?.label ?? hex.toUpperCase()
const perimeter = (pts: [number, number][]) => pts.reduce((sum, p, i) => sum + Math.hypot(pts[(i + 1) % pts.length][0] - p[0], pts[(i + 1) % pts.length][1] - p[1]), 0)

export function shoppingList(plan: FloorPlan, design: Design): RoomList[] {
  return plan.rooms
    .filter((r) => r.kind !== 'ledge')
    .map((room) => {
      const items: ListItem[] = []
      const materials: Material[] = []
      const swatches: Swatch[] = []
      const add = (s: Swatch) => !swatches.some((x) => x.color === s.color) && swatches.push(s)

      // Paint
      const paint = design.roomPaint[room.id] ?? design.wallPaint
      add({ label: `Walls: ${paintName(paint)}`, color: paint })
      const wallArea = perimeter(room.polygon) * plan.ceilingHeight * 0.85
      materials.push({ label: `Wall paint, ${paintName(paint)} (${paint.toUpperCase()})`, quantity: `${Math.ceil((wallArea * 2) / PAINT_COVERAGE)} L for 2 coats` })

      // Floor
      const spec = floorSpecFor(design.floors[room.id], room.kind)
      const floor = finishById(spec.finish)
      add({ label: `Floor: ${floor.label}`, color: floor.swatch })
      if (design.floors[room.id]) {
        const area = polygonArea(room.polygon) * (1 + WASTAGE)
        const size = floor.sizes?.find((s) => s.value === spec.size)?.label
        materials.push({ label: `Flooring, ${floor.label}${size ? ` ${size}` : ''}`, quantity: `${area.toFixed(1)} m² incl. 10% spare` })
      }

      // Feature walls
      for (const w of plan.walls) {
        for (const side of [1, -1] as const) {
          const f = design.features[faceKey(w.id, side)]
          if (!f || faceRoom(plan, w, side)?.id !== room.id) continue
          const finish = featureById(f.feature)
          const area = wallLength(w) * (w.height ?? plan.ceilingHeight) * (1 + WASTAGE)
          materials.push({ label: `Feature wall, ${finish?.label ?? f.feature}`, quantity: `${area.toFixed(1)} m² (${(wallLength(w) * 1000).toFixed(0)} mm wall)` })
          add({ label: finish?.label ?? f.feature, color: f.color ?? finish?.swatch ?? '#ccc' })
        }
      }

      // Ceiling
      const ceiling = design.ceilings[room.id]
      if (ceiling && ceiling.style !== 'flat') {
        materials.push({ label: ceiling.style === 'cove' ? `Cove false ceiling + LED strip (${ceiling.warmth ?? 3000}K)` : 'L-box ceiling', quantity: `${bandRun(plan, room).toFixed(1)} m run` })
      }

      // Furniture in this room
      for (const it of design.items.filter((i) => pointInPolygon([i.x, i.y], room.polygon))) {
        const e = catalogEntry(it.type)
        if (!e) continue
        const bits = [it.variant, `${mm(it.width)} × ${mm(it.depth)} × ${mm(it.height)} mm`]
        const finish = FURNITURE_FINISHES.find((f) => f.id === it.finish)
        const fabric = FABRICS.find((f) => f.id === it.fabric)
        if (finish) bits.push(finish.label)
        if (fabric) bits.push(`${fabric.label} fabric`)
        for (const o of e.options ?? []) bits.push(`${o.label}: ${o.choices.find(([v]) => v === option(it, o.key))?.[1] ?? ''}`)
        items.push({ name: e.name, detail: bits.filter(Boolean).join(' · '), price: itemPrice(it) })
        if (finish) add({ label: `${e.name}: ${finish.label}`, color: finish.color })
        if (fabric) add({ label: `${e.name}: ${fabric.label}`, color: fabric.color })
      }

      return { room, items, materials, swatches }
    })
}

const csvCell = (v: string | number) => {
  const s = String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function shoppingCsv(lists: RoomList[]): string {
  const rows: (string | number)[][] = [['Room', 'Type', 'Item', 'Details / quantity', 'Est. price (SGD)']]
  for (const l of lists) {
    for (const m of l.materials) rows.push([l.room.name, 'Material', m.label, m.quantity, ''])
    for (const i of l.items) rows.push([l.room.name, 'Furniture', i.name, i.detail, i.price || ''])
  }
  return rows.map((r) => r.map(csvCell).join(',')).join('\n')
}
