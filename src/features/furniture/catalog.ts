import type { FurnitureItem } from '../../types/design'

// Furniture and built-ins at real-world sizes (metres). Every model is procedural (see models.tsx),
// so sizes can change freely and the app needs no downloaded 3D assets.

export type Layer = 'floor' | 'rug' | 'wall'
export type Category = 'Living' | 'Dining' | 'Bedroom' | 'Study' | 'Kitchen' | 'Bathroom' | 'Utility' | 'Décor' | 'Carpentry'

export interface Size {
  w: number
  d: number
  h: number
}

export interface OptionDef {
  key: string
  label: string
  choices: [string | number, string][]
  default: string | number
}

export interface CatalogEntry {
  id: string
  name: string
  category: Category
  layer: Layer
  size: Size
  variants?: (Size & { label: string })[]
  /** Free sizing (min/max in metres) for built-ins; other items use their variants. */
  resizable?: { w?: [number, number]; d?: [number, number]; h?: [number, number] }
  finish?: string
  fabric?: string
  options?: OptionDef[]
  /** Default height above the floor for wall-mounted pieces. */
  elevation?: number
  /** A low table you reach across from a seat: gaps to it aren't walkways. */
  reach?: boolean
  hint?: string
}

export const FURNITURE_FINISHES = [
  { id: 'oak', label: 'Oak', color: '#c39b70', roughness: 0.55 },
  { id: 'walnut', label: 'Walnut', color: '#6b4930', roughness: 0.5 },
  { id: 'white', label: 'Matte white', color: '#efece6', roughness: 0.45 },
  { id: 'greige', label: 'Greige', color: '#cfc7bb', roughness: 0.45 },
  { id: 'sage', label: 'Sage', color: '#9aa58f', roughness: 0.45 },
  { id: 'navy', label: 'Navy', color: '#3d4a5c', roughness: 0.45 },
  { id: 'black', label: 'Black', color: '#2c2c2e', roughness: 0.4 },
]

export const FABRICS = [
  { id: 'oat', label: 'Oat', color: '#d8cdbd' },
  { id: 'cream', label: 'Cream', color: '#efe8dc' },
  { id: 'stone', label: 'Stone grey', color: '#a3a29e' },
  { id: 'charcoal', label: 'Charcoal', color: '#4a4a4c' },
  { id: 'olive', label: 'Olive', color: '#7d7a5c' },
  { id: 'terracotta', label: 'Terracotta', color: '#b86f52' },
  { id: 'navy', label: 'Navy', color: '#34425a' },
  { id: 'blush', label: 'Blush', color: '#d8b2a8' },
]

const COUNTERTOPS: [string, string][] = [
  ['white', 'White quartz'],
  ['grey', 'Grey quartz'],
  ['black', 'Black quartz'],
]

export const CATALOG: CatalogEntry[] = [
  // Living
  {
    id: 'sofa', name: 'Sofa', category: 'Living', layer: 'floor', size: { w: 2.1, d: 0.92, h: 0.82 }, fabric: 'oat',
    variants: [{ label: '2-seater', w: 1.6, d: 0.9, h: 0.82 }, { label: '3-seater', w: 2.1, d: 0.92, h: 0.82 }, { label: '4-seater', w: 2.5, d: 0.95, h: 0.82 }],
    hint: 'Leave 400–450 mm between the sofa and the coffee table so you can reach it without squeezing past.',
  },
  {
    id: 'sofa-l', name: 'L-shaped sofa', category: 'Living', layer: 'floor', size: { w: 2.7, d: 1.65, h: 0.82 }, fabric: 'stone',
    variants: [{ label: '2.4 m', w: 2.4, d: 1.55, h: 0.82 }, { label: '2.7 m', w: 2.7, d: 1.65, h: 0.82 }, { label: '3.0 m', w: 3.0, d: 1.7, h: 0.82 }],
    options: [{ key: 'chaise', label: 'Chaise side', choices: [['left', 'Left'], ['right', 'Right']], default: 'left' }],
  },
  { id: 'armchair', name: 'Armchair', category: 'Living', layer: 'floor', size: { w: 0.82, d: 0.82, h: 0.8 }, fabric: 'olive', finish: 'oak' },
  {
    id: 'coffee-table', name: 'Coffee table', category: 'Living', layer: 'floor', size: { w: 1.2, d: 0.6, h: 0.4 }, finish: 'oak', reach: true,
    variants: [{ label: '1.0 m', w: 1.0, d: 0.55, h: 0.4 }, { label: '1.2 m', w: 1.2, d: 0.6, h: 0.4 }, { label: 'Round 0.9 m', w: 0.9, d: 0.9, h: 0.38 }],
    options: [{ key: 'shape', label: 'Shape', choices: [['rect', 'Rectangle'], ['round', 'Round']], default: 'rect' }],
  },
  { id: 'side-table', name: 'Side table', category: 'Living', layer: 'floor', size: { w: 0.45, d: 0.45, h: 0.55 }, finish: 'walnut' },
  {
    id: 'tv-console', name: 'TV console', category: 'Living', layer: 'floor', size: { w: 1.8, d: 0.4, h: 0.45 }, finish: 'walnut',
    variants: [{ label: '1.5 m', w: 1.5, d: 0.4, h: 0.45 }, { label: '1.8 m', w: 1.8, d: 0.4, h: 0.45 }, { label: '2.1 m', w: 2.1, d: 0.42, h: 0.45 }],
  },
  {
    id: 'tv', name: 'TV (wall-mounted)', category: 'Living', layer: 'wall', size: { w: 1.45, d: 0.05, h: 0.83 }, elevation: 0.95,
    variants: [{ label: '55"', w: 1.23, d: 0.05, h: 0.71 }, { label: '65"', w: 1.45, d: 0.05, h: 0.83 }, { label: '75"', w: 1.67, d: 0.05, h: 0.96 }],
    hint: 'Sit about 1.5× the screen diagonal away: around 2.5 m for a 65" TV. The centre of the screen should be near eye level when seated (about 1.0–1.1 m).',
  },
  {
    id: 'rug', name: 'Rug', category: 'Living', layer: 'rug', size: { w: 2.0, d: 1.4, h: 0.012 }, fabric: 'cream',
    variants: [{ label: '140×200', w: 2.0, d: 1.4, h: 0.012 }, { label: '160×230', w: 2.3, d: 1.6, h: 0.012 }, { label: '200×300', w: 3.0, d: 2.0, h: 0.012 }],
    hint: 'Pick a rug big enough that at least the front legs of the sofa and chairs sit on it.',
  },
  { id: 'floor-lamp', name: 'Floor lamp', category: 'Living', layer: 'floor', size: { w: 0.4, d: 0.4, h: 1.6 }, finish: 'black' },
  { id: 'bookshelf', name: 'Bookshelf', category: 'Living', layer: 'floor', size: { w: 0.8, d: 0.35, h: 1.8 }, finish: 'oak' },

  // Dining
  {
    id: 'dining-set', name: 'Dining set', category: 'Dining', layer: 'floor', size: { w: 1.6, d: 0.9, h: 0.75 }, finish: 'oak', fabric: 'oat',
    variants: [{ label: '1.4 m', w: 1.4, d: 0.8, h: 0.75 }, { label: '1.6 m', w: 1.6, d: 0.9, h: 0.75 }, { label: '1.8 m', w: 1.8, d: 0.9, h: 0.75 }, { label: 'Round 1.1 m', w: 1.1, d: 1.1, h: 0.75 }],
    options: [
      { key: 'shape', label: 'Table', choices: [['rect', 'Rectangle'], ['round', 'Round']], default: 'rect' },
      { key: 'chairs', label: 'Chairs', choices: [[4, '4'], [6, '6']], default: 4 },
    ],
    hint: 'Allow about 900 mm behind each chair so people can pull out and sit down comfortably.',
  },
  { id: 'bar-stool', name: 'Bar stool', category: 'Dining', layer: 'floor', size: { w: 0.4, d: 0.4, h: 0.75 }, finish: 'black', fabric: 'terracotta' },

  // Bedroom
  {
    id: 'bed', name: 'Bed', category: 'Bedroom', layer: 'floor', size: { w: 1.52, d: 2.02, h: 1.05 }, finish: 'oak', fabric: 'oat',
    variants: [
      { label: 'Single', w: 0.91, d: 2.0, h: 1.0 },
      { label: 'Super single', w: 1.07, d: 2.0, h: 1.0 },
      { label: 'Queen', w: 1.52, d: 2.02, h: 1.05 },
      { label: 'King', w: 1.83, d: 2.02, h: 1.05 },
    ],
    hint: 'Keep at least 600 mm on each side you get in from, and about 900 mm at the foot if a wardrobe opens there.',
  },
  { id: 'bedside', name: 'Bedside table', category: 'Bedroom', layer: 'floor', size: { w: 0.45, d: 0.4, h: 0.5 }, finish: 'oak' },
  { id: 'dresser', name: 'Dresser', category: 'Bedroom', layer: 'floor', size: { w: 1.2, d: 0.45, h: 0.8 }, finish: 'white' },

  // Study
  {
    id: 'desk', name: 'Study desk', category: 'Study', layer: 'floor', size: { w: 1.2, d: 0.6, h: 0.75 }, finish: 'oak',
    variants: [{ label: '1.0 m', w: 1.0, d: 0.55, h: 0.75 }, { label: '1.2 m', w: 1.2, d: 0.6, h: 0.75 }, { label: '1.6 m', w: 1.6, d: 0.7, h: 0.75 }],
    hint: 'Put the desk side-on to the window to avoid glare on your screen.',
  },
  { id: 'office-chair', name: 'Office chair', category: 'Study', layer: 'floor', size: { w: 0.62, d: 0.62, h: 1.05 }, fabric: 'charcoal' },

  // Kitchen
  {
    id: 'fridge', name: 'Fridge', category: 'Kitchen', layer: 'floor', size: { w: 0.7, d: 0.72, h: 1.8 },
    variants: [{ label: '2-door', w: 0.7, d: 0.72, h: 1.8 }, { label: 'Side-by-side', w: 0.91, d: 0.75, h: 1.79 }],
    options: [{ key: 'color', label: 'Finish', choices: [['steel', 'Stainless'], ['white', 'White'], ['black', 'Black']], default: 'steel' }],
  },
  {
    id: 'island', name: 'Kitchen island', category: 'Kitchen', layer: 'floor', size: { w: 1.8, d: 0.9, h: 0.9 }, finish: 'sage',
    resizable: { w: [1.2, 2.6], d: [0.6, 1.2] },
    options: [{ key: 'counter', label: 'Countertop', choices: COUNTERTOPS, default: 'white' }],
    hint: 'Keep 1,000–1,100 mm between the island and the counter run so two people can pass.',
  },

  // Bathroom
  {
    id: 'vanity', name: 'Vanity & mirror', category: 'Bathroom', layer: 'floor', size: { w: 0.8, d: 0.48, h: 0.85 }, finish: 'oak',
    variants: [{ label: '600', w: 0.6, d: 0.45, h: 0.85 }, { label: '800', w: 0.8, d: 0.48, h: 0.85 }, { label: '1000', w: 1.0, d: 0.5, h: 0.85 }],
  },
  { id: 'toilet', name: 'Toilet', category: 'Bathroom', layer: 'floor', size: { w: 0.38, d: 0.68, h: 0.8 } },
  {
    id: 'shower-screen', name: 'Shower screen', category: 'Bathroom', layer: 'floor', size: { w: 0.9, d: 0.05, h: 2.0 },
    variants: [{ label: '800', w: 0.8, d: 0.05, h: 2.0 }, { label: '900', w: 0.9, d: 0.05, h: 2.0 }, { label: '1200', w: 1.2, d: 0.05, h: 2.0 }],
  },

  // Utility
  {
    id: 'washer', name: 'Washer', category: 'Utility', layer: 'floor', size: { w: 0.6, d: 0.6, h: 0.85 },
    options: [{ key: 'stacked', label: 'Dryer on top', choices: [['no', 'No'], ['yes', 'Yes']], default: 'no' }],
  },

  // Décor
  {
    id: 'plant', name: 'Plant', category: 'Décor', layer: 'floor', size: { w: 0.5, d: 0.5, h: 1.4 }, finish: 'white',
    variants: [{ label: 'Small', w: 0.35, d: 0.35, h: 0.6 }, { label: 'Tall', w: 0.5, d: 0.5, h: 1.4 }],
  },
  {
    id: 'wall-art', name: 'Wall art', category: 'Décor', layer: 'wall', size: { w: 0.9, d: 0.03, h: 0.6 }, finish: 'black', elevation: 1.25,
    variants: [{ label: '60×40', w: 0.6, d: 0.03, h: 0.4 }, { label: '90×60', w: 0.9, d: 0.03, h: 0.6 }, { label: '120×80', w: 1.2, d: 0.03, h: 0.8 }],
  },
  { id: 'wall-shelf', name: 'Floating shelf', category: 'Décor', layer: 'wall', size: { w: 1.0, d: 0.24, h: 0.03 }, finish: 'oak', elevation: 1.5, resizable: { w: [0.4, 2.4] } },
  { id: 'mirror', name: 'Standing mirror', category: 'Décor', layer: 'floor', size: { w: 0.6, d: 0.06, h: 1.7 }, finish: 'black' },

  // Carpentry: built-ins sized to the room
  {
    id: 'wardrobe', name: 'Wardrobe', category: 'Carpentry', layer: 'floor', size: { w: 1.8, d: 0.6, h: 2.4 }, finish: 'white',
    resizable: { w: [0.6, 3.6], d: [0.45, 0.65], h: [1.8, 2.6] },
    options: [{ key: 'doors', label: 'Doors', choices: [['swing', 'Swing'], ['sliding', 'Sliding'], ['open', 'Open']], default: 'swing' }],
    hint: 'Swing doors need about 550 mm clear in front to open. Pick sliding doors when the walkway is tight.',
  },
  {
    id: 'shoe-cabinet', name: 'Shoe cabinet', category: 'Carpentry', layer: 'floor', size: { w: 1.2, d: 0.35, h: 1.0 }, finish: 'oak',
    resizable: { w: [0.6, 2.4], d: [0.3, 0.45], h: [0.8, 2.2] },
    options: [{ key: 'floating', label: 'Mounting', choices: [['yes', 'Floating'], ['no', 'On floor']], default: 'yes' }],
  },
  {
    id: 'tv-wall', name: 'TV feature wall', category: 'Carpentry', layer: 'floor', size: { w: 2.4, d: 0.4, h: 2.4 }, finish: 'oak',
    resizable: { w: [1.2, 4.0], h: [1.2, 2.6] },
    options: [{ key: 'panel', label: 'Panel', choices: [['fluted', 'Fluted'], ['slats', 'Slats'], ['plain', 'Plain']], default: 'fluted' }],
    hint: 'Run conduit for the TV cables behind the panel before it goes up.',
  },
  {
    id: 'platform-bed', name: 'Platform bed', category: 'Carpentry', layer: 'floor', size: { w: 2.0, d: 2.3, h: 0.4 }, finish: 'oak', fabric: 'cream',
    resizable: { w: [1.2, 2.6], d: [2.0, 2.6], h: [0.25, 0.5] },
    hint: 'Lift-up or drawer storage underneath works well in smaller BTO bedrooms.',
  },
  {
    id: 'kitchen-run', name: 'Kitchen cabinets', category: 'Carpentry', layer: 'floor', size: { w: 3.0, d: 0.6, h: 0.9 }, finish: 'white',
    resizable: { w: [0.6, 4.5], h: [0.85, 0.95] },
    options: [
      { key: 'counter', label: 'Countertop', choices: COUNTERTOPS, default: 'white' },
      { key: 'uppers', label: 'Wall cabinets', choices: [['yes', 'Yes'], ['no', 'No']], default: 'yes' },
      { key: 'sink', label: 'Sink', choices: [['yes', 'Yes'], ['no', 'No']], default: 'yes' },
      { key: 'hob', label: 'Hob', choices: [['yes', 'Yes'], ['no', 'No']], default: 'yes' },
    ],
    hint: 'Keep the sink, hob and fridge within a few steps of each other, ideally with 600 mm or more of counter between sink and hob.',
  },
]

export const CATEGORIES: Category[] = ['Living', 'Dining', 'Bedroom', 'Study', 'Kitchen', 'Bathroom', 'Utility', 'Décor', 'Carpentry']

const byId = new Map(CATALOG.map((e) => [e.id, e]))
export const catalogEntry = (id: string) => byId.get(id)

export const option = <T extends string | number>(item: FurnitureItem, key: string): T => {
  const def = catalogEntry(item.type)?.options?.find((o) => o.key === key)
  return (item.options?.[key] ?? def?.default) as T
}

/** Floor area the item occupies, which can exceed its nominal size (chairs around a table). */
export function footprintOf(item: FurnitureItem): { width: number; depth: number } {
  if (item.type === 'dining-set') {
    const chairSpace = 0.5
    if (option(item, 'shape') === 'round') return { width: item.width + chairSpace * 2, depth: item.depth + chairSpace * 2 }
    return { width: item.width, depth: item.depth + chairSpace * 2 }
  }
  return { width: item.width, depth: item.depth }
}

let counter = 0
export function createItem(type: string, x: number, y: number): FurnitureItem {
  const e = catalogEntry(type)!
  const variant = e.variants?.find((v) => v.w === e.size.w && v.d === e.size.d)?.label
  return {
    id: `item-${Date.now().toString(36)}-${(counter++).toString(36)}`,
    type,
    x,
    y,
    rotation: 0,
    width: e.size.w,
    depth: e.size.d,
    height: e.size.h,
    elevation: e.elevation,
    finish: e.finish,
    fabric: e.fabric,
    variant,
    options: Object.fromEntries((e.options ?? []).map((o) => [o.key, o.default])),
  }
}
