import type { FurnitureItem } from '../types/design'
import type { BuiltKind } from '../types/plan'

// Indicative mid-range Singapore prices (SGD, incl. installation where it applies). They're a
// planning guide only. Quotes vary a lot by contractor, brand and site conditions.

/** Supply and lay, per m² of floor. */
export const FLOOR_RATE: Record<string, number> = {
  oak: 45, // SPC/vinyl planks in a timber look
  ash: 45,
  walnut: 50,
  herringbone: 75,
  'tile-grey': 80,
  'tile-warm': 80,
  'tile-charcoal': 85,
  'tile-terracotta': 95,
  marble: 115,
  terrazzo: 130,
  carpet: 55,
  screed: 85, // microcement
}

/** Two coats of emulsion, per m² of wall. */
export const PAINT_RATE = 7

/** Feature wall finishes, per m² of wall. */
export const FEATURE_RATE: Record<string, number> = {
  limewash: 45,
  fluted: 170,
  'fluted-oak': 220,
  'slats-oak': 200,
  'slats-walnut': 230,
  'paper-linen': 35,
  'paper-arch': 40,
  'tile-subway': 130,
  'tile-zellige': 260,
}

/** Hacking a non-structural wall, per m² of wall, including debris disposal. */
export const HACK_RATE = 95
/** Making good after each hack: plastering the cut ends and patching the floor and ceiling. */
export const HACK_MAKE_GOOD = 180
/** New walls, per m² of wall (one side), plastered or skimmed ready for paint. */
export const BUILD_RATE: Record<BuiltKind, number> = { drywall: 95, brick: 140, glass: 450 }
/** A door set (leaf, frame, lockset) or internal window fitted into a new wall. */
export const NEW_DOOR = 550
export const NEW_WINDOW = 320

/** Perimeter ceiling work, per metre run. */
export const CEILING_RATE = { lbox: 95, cove: 140 } as const

const FT = 3.2808
/** Carpentry is quoted per foot run in Singapore. */
const perFoot = (rate: number) => (it: FurnitureItem) => Math.round(it.width * FT) * rate

type Pricer = number | ((it: FurnitureItem) => number)

export const ITEM_PRICE: Record<string, Pricer> = {
  sofa: (it) => (it.width < 1.8 ? 1300 : it.width < 2.3 ? 1800 : 2300),
  'sofa-l': (it) => (it.width < 2.6 ? 2300 : it.width < 2.9 ? 2700 : 3100),
  armchair: 650,
  'coffee-table': 380,
  'side-table': 140,
  'tv-console': (it) => Math.round(it.width * 380),
  rug: (it) => Math.round(it.width * it.depth * 110),
  'floor-lamp': 220,
  bookshelf: 260,
  'dining-set': (it) => (it.options?.chairs === 6 ? 1700 : 1250),
  'bar-stool': 160,
  bed: (it) => ({ Single: 850, 'Super single': 1150, Queen: 1800, King: 2400 })[it.variant ?? 'Queen'] ?? 1800, // frame + mattress
  bedside: 190,
  dresser: 520,
  desk: (it) => (it.width < 1.1 ? 300 : it.width < 1.4 ? 400 : 520),
  'office-chair': 380,
  vanity: (it) => Math.round(500 + it.width * 400),
  toilet: 450,
  'shower-screen': (it) => Math.round(it.width * 700),
  'wall-art': 160,
  'wall-shelf': 90,
  mirror: 220,
  plant: (it) => (it.height < 1 ? 70 : 190),
  // Appliances
  tv: (it) => (it.width < 1.3 ? 900 : it.width < 1.55 ? 1400 : 2200),
  fridge: (it) => (it.width > 0.85 ? 2400 : 1500),
  washer: (it) => (it.options?.stacked === 'yes' ? 1800 : 900),
  // Carpentry
  wardrobe: (it) => perFoot(it.options?.doors === 'sliding' ? 300 : it.options?.doors === 'open' ? 190 : 260)(it),
  'shoe-cabinet': perFoot(160),
  'tv-wall': (it) => perFoot(it.options?.panel === 'plain' ? 200 : 290)(it),
  'platform-bed': (it) => Math.round(1400 + it.width * 500 + 1200), // platform + queen mattress
  'kitchen-run': (it) => {
    let rate = 160 + 95 // base cabinet + quartz top, per ft
    if (it.options?.uppers !== 'no') rate += 120
    return perFoot(rate)(it) + (it.options?.sink !== 'no' ? 450 : 0) + (it.options?.hob !== 'no' ? 600 : 0)
  },
  island: (it) => Math.round(it.width * FT * 320),
}

export const APPLIANCES = new Set(['tv', 'fridge', 'washer'])
export const FITTINGS = new Set(['vanity', 'toilet', 'shower-screen'])

export function itemPrice(it: FurnitureItem): number {
  const p = ITEM_PRICE[it.type]
  if (p === undefined) return 0
  return typeof p === 'number' ? p : p(it)
}

/** Share of the subtotal set aside for surprises. */
export const CONTINGENCY = 0.1
