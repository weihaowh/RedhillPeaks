import type { FloorPlan } from '../types/plan'
import type { FurnitureItem } from '../types/design'
import { LAYOUT_ZONES, type LayoutOption, type LayoutScheme, type LayoutZone, type Spec } from '../data/layouts'
import { createItem } from '../features/furniture/catalog'
import { itemWarnings } from './furnitureMath'
import { pointInPolygon } from './planMath'

// Applying layout ideas: each zone's option replaces the furniture inside that zone and leaves
// the rest of the flat alone, so rooms can be mixed and matched.

function build([type, x, y, rotation, overrides]: Spec): FurnitureItem {
  const item = createItem(type, x, y)
  return { ...item, rotation, ...overrides, options: { ...item.options, ...overrides?.options } }
}

export const inZone = (zone: LayoutZone, item: FurnitureItem) => zone.region.some((poly) => pointInPolygon([item.x, item.y], poly))

/** The items with this zone's furniture swapped for the option's. */
export function applyOption(items: FurnitureItem[], zone: LayoutZone, option: LayoutOption): FurnitureItem[] {
  return [...items.filter((it) => !inZone(zone, it)), ...option.specs.map(build)]
}

export function applyScheme(items: FurnitureItem[], scheme: LayoutScheme): FurnitureItem[] {
  return LAYOUT_ZONES.reduce((acc, zone) => {
    const option = zone.options.find((o) => o.id === scheme.picks[zone.id]) ?? zone.options[0]
    return applyOption(acc, zone, option)
  }, items)
}

const near = (a: number, b: number) => Math.abs(a - b) < 0.005

/** The option currently laid out in a zone, if its furniture still matches one exactly (types and positions). */
export function activeOption(zone: LayoutZone, items: FurnitureItem[]): LayoutOption | undefined {
  const here = items.filter((it) => inZone(zone, it))
  return zone.options.find((o) => {
    if (o.specs.length !== here.length) return false
    const left = [...here]
    return o.specs.every(([type, x, y, rotation]) => {
      const i = left.findIndex((it) => it.type === type && near(it.x, x) && near(it.y, y) && near(((it.rotation % 360) + 360) % 360, rotation))
      return i >= 0 && left.splice(i, 1)
    })
  })
}

/** Warnings the option would raise against the rest of the current flat. */
export function optionWarnings(plan: FloorPlan, items: FurnitureItem[], zone: LayoutZone, option: LayoutOption) {
  const next = applyOption(items, zone, option)
  return next.filter((it) => inZone(zone, it)).flatMap((it) => itemWarnings(it, next, plan))
}
