import type { FurnitureItem } from '../types/design'
import { createItem } from '../features/furniture/catalog'

// Designer's starter layout for the Redhill Peaks 4-room trace. Positions are plan metres and
// were checked against the walls, door swings and 600 mm walkway rule, so the layout starts
// with no warnings. Rotation: 90 = front faces left on the plan, 270 = right, 180 = up.

type Spec = [type: string, x: number, y: number, rotation: number, overrides?: Partial<FurnitureItem>]

const SPECS: Spec[] = [
  // Living: sofa against the side window facing a TV on the Bedroom 3 wall.
  ['sofa', 0.64, 2.2, 270],
  ['rug', 1.75, 2.2, 270],
  ['side-table', 0.6, 0.9, 0],
  ['floor-lamp', 0.45, 3.6, 0],
  ['tv-console', 2.8, 2.2, 90],
  ['tv', 2.975, 2.2, 90],
  ['plant', 2.65, 0.5, 0],
  // Dining in the open zone by the kitchen beam; 900 mm corridor kept clear behind it.
  ['dining-set', 5.1, 5.25, 0, { width: 1.4, depth: 0.8, variant: '1.4 m' }],
  // Kitchen: L-shaped run on the two structural walls, fridge at the open end.
  ['kitchen-run', 5.17, 8.45, 180, { width: 2.8 }],
  ['kitchen-run', 4.05, 7.5, 270, { width: 1.3, options: { counter: 'white', uppers: 'yes', sink: 'no', hob: 'no' } }],
  ['fridge', 4.11, 6.5, 270],
  ['shoe-cabinet', 3.3, 6.75, 90, { width: 1.0, depth: 0.3 }],
  // Bedroom 3 as a study: desk side-on to the window, shelving opposite.
  ['desk', 3.45, 1.0, 270, { width: 1.6, depth: 0.7, variant: '1.6 m' }],
  ['office-chair', 4.2, 1.05, 90],
  ['bookshelf', 5.55, 0.63, 90], // clear of the structural column at the window
  ['bookshelf', 5.55, 1.43, 90],
  ['plant', 3.4, 3.05, 0, { width: 0.35, depth: 0.35, height: 0.6, variant: 'Small' }],
  // Bedroom 2 as a guest room.
  ['bed', 7.54, 1.6, 90],
  ['bedside', 8.35, 0.595, 90],
  ['bedside', 8.35, 2.605, 90],
  // Main bedroom: queen bed on the solid wall, sliding wardrobe by the en-suite.
  ['bed', 10.54, 1.6, 90, { fabric: 'stone' }],
  ['bedside', 11.35, 0.595, 90],
  ['bedside', 11.35, 2.605, 90],
  ['wardrobe', 11.25, 3.65, 90, { width: 1.6, options: { doors: 'sliding' } }],
  ['wall-art', 11.535, 1.6, 90, { elevation: 1.35 }],
  // Bathrooms and service yard.
  ['vanity', 10.0, 6.15, 180],
  ['toilet', 11.21, 5.0, 90],
  ['toilet', 7.4, 6.05, 180],
  ['vanity', 8.76, 5.3, 90, { width: 0.6, depth: 0.45, variant: '600' }],
  ['washer', 8.375, 8.45, 180, { options: { stacked: 'yes' } }],
]

export function starterLayout(): FurnitureItem[] {
  return SPECS.map(([type, x, y, rotation, overrides]) => {
    const item = createItem(type, x, y)
    return { ...item, rotation, ...overrides, options: { ...item.options, ...overrides?.options } }
  })
}
