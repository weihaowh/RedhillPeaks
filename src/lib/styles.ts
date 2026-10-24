import type { FloorPlan, Room } from '../types/plan'
import type { Design, FloorSpec, FurnitureItem } from '../types/design'
import type { DesignStyle } from '../data/styles'
import { catalogEntry } from '../features/furniture/catalog'
import { pointInPolygon } from './planMath'

// Applying a design style to the whole flat or to one room.

const CABINETS = new Set(['tv-console', 'bedside', 'dresser', 'shoe-cabinet', 'wardrobe', 'kitchen-run', 'island', 'vanity', 'tv-wall', 'platform-bed'])
const ACCENT_SEATS = new Set(['armchair', 'dining-set', 'bar-stool', 'office-chair'])

function floorFor(style: DesignStyle, room: Room): FloorSpec | undefined {
  if (room.kind === 'living') return style.floors.living
  if (room.kind === 'bedroom') return style.floors.bedroom
  if (room.kind === 'kitchen' || room.kind === 'bath' || room.kind === 'service') return style.floors.wet
  return undefined // shelter and ledge keep their concrete
}

function restyle(item: FurnitureItem, style: DesignStyle): FurnitureItem {
  const entry = catalogEntry(item.type)
  if (!entry) return item
  const next = { ...item }
  // Lamps, frames and plant pots keep their own finish; only wood and cabinetry change.
  if (entry.finish && !['floor-lamp', 'wall-art', 'plant', 'mirror', 'bar-stool'].includes(item.type)) {
    next.finish = CABINETS.has(item.type) ? style.cabinet : style.wood
  }
  if (entry.fabric) next.fabric = ACCENT_SEATS.has(item.type) ? style.accent : style.fabric
  return next
}

export function applyStyle(design: Design, plan: FloorPlan, style: DesignStyle, roomId?: string): Design {
  const rooms = roomId ? plan.rooms.filter((r) => r.id === roomId) : plan.rooms
  const floors = { ...design.floors }
  const ceilings = { ...design.ceilings }
  for (const room of rooms) {
    const floor = floorFor(style, room)
    if (floor) floors[room.id] = { ...floor }
    const ceiling = room.kind === 'living' ? style.livingCeiling : room.kind === 'bedroom' ? style.bedroomCeiling : undefined
    if (ceiling) ceilings[room.id] = { ...ceiling }
    else if (room.kind === 'living' || room.kind === 'bedroom') delete ceilings[room.id]
  }

  const inScope = (it: FurnitureItem) => !roomId || rooms.some((r) => pointInPolygon([it.x, it.y], r.polygon))
  const items = design.items.map((it) => (inScope(it) ? restyle(it, style) : it))

  if (roomId) return { ...design, floors, ceilings, items, roomPaint: { ...design.roomPaint, [roomId]: style.wall } }
  return { ...design, floors, ceilings, items, wallPaint: style.wall, roomPaint: {} }
}
