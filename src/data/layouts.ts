import type { FurnitureItem } from '../types/design'
import type { Vec2 } from '../types/plan'

// Designer layout ideas for the Redhill Peaks 4-room trace. The flat is split into zones; each
// zone has a few alternative arrangements, and schemes pick one per zone for a whole household.
// Positions are plan metres, checked against the walls, door swings and 600 mm walkway rule.
// Rotation: 0 = front faces down the plan, 90 = left, 180 = up, 270 = right.

export type Spec = [type: string, x: number, y: number, rotation: number, overrides?: Partial<FurnitureItem>]

export interface LayoutOption {
  id: string
  name: string
  blurb: string
  specs: Spec[]
}

export interface LayoutZone {
  id: string
  name: string
  /** Plan rooms the zone sits in, for showing its options when a room is selected. */
  rooms: string[]
  /** Furniture whose centre falls in any of these polygons belongs to the zone. */
  region: Vec2[][]
  options: LayoutOption[]
}

export interface LayoutScheme {
  id: string
  name: string
  blurb: string
  /** Option id per zone id. */
  picks: Record<string, string>
}

const rect = (x0: number, y0: number, x1: number, y1: number): Vec2[] => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]

export const LAYOUT_ZONES: LayoutZone[] = [
  {
    id: 'lounge',
    name: 'Living room',
    rooms: ['living'],
    region: [rect(0, 0, 3.05, 4.55)],
    options: [
      {
        id: 'classic',
        name: 'Sofa facing the TV',
        blurb: 'Three-seater against the side window, TV on the Bedroom 3 wall. Light and open.',
        specs: [
          ['sofa', 0.64, 2.2, 270],
          ['rug', 1.75, 2.2, 270],
          ['side-table', 0.6, 0.9, 0],
          ['floor-lamp', 0.45, 3.6, 0],
          ['tv-console', 2.8, 2.2, 90],
          ['tv', 2.975, 2.2, 90],
          ['plant', 2.65, 0.5, 0],
        ],
      },
      {
        id: 'lounge',
        name: 'L-sofa lounge',
        blurb: 'Deep L-shaped sofa with a chaise and a fluted TV feature wall. Made for movie nights.',
        specs: [
          ['sofa-l', 1.0, 2.2, 270, { variant: '2.7 m' }],
          ['rug', 1.7, 2.2, 270, { width: 3.0, depth: 2.0, variant: '200×300' }],
          ['floor-lamp', 0.4, 0.4, 0],
          ['tv-wall', 2.8, 2.2, 90],
          ['tv', 2.575, 2.2, 90],
          ['plant', 2.65, 0.5, 0],
        ],
      },
      {
        id: 'hosting',
        name: 'Conversation set',
        blurb: 'Sofa and two armchairs around a coffee table, so guests face each other as well as the TV.',
        specs: [
          ['sofa', 0.64, 2.2, 270],
          ['coffee-table', 1.775, 2.2, 90, { width: 1.0, depth: 0.55, variant: '1.0 m' }],
          ['rug', 1.65, 2.2, 270, { width: 2.3, depth: 1.6, variant: '160×230' }],
          ['armchair', 1.775, 0.6, 0],
          ['armchair', 1.775, 3.8, 180],
          ['tv-console', 2.8, 2.2, 90],
          ['tv', 2.975, 2.2, 90],
          ['plant', 2.65, 0.5, 0],
        ],
      },
    ],
  },
  {
    id: 'dining',
    name: 'Dining',
    rooms: ['living'],
    region: [[[3.05, 3.4], [8.6, 3.4], [8.6, 4.55], [6.85, 4.55], [6.85, 6.1], [1.85, 6.1], [1.85, 4.55], [3.05, 4.55]]],
    options: [
      {
        id: 'table4',
        name: 'Table for four',
        blurb: '1.4 m table by the kitchen opening, with a clear 900 mm route behind the chairs.',
        specs: [['dining-set', 5.1, 5.25, 0, { width: 1.4, depth: 0.8, variant: '1.4 m' }]],
      },
      {
        id: 'round',
        name: 'Round table',
        blurb: 'A 1.1 m round table seats four with no corners to bump into on the way to the bedrooms.',
        specs: [['dining-set', 5.45, 5.12, 0, { width: 1.1, depth: 1.1, variant: 'Round 1.1 m', options: { shape: 'round' } }]],
      },
      {
        id: 'table6',
        name: 'Six-seater',
        blurb: '1.8 m table with six chairs for family dinners and hosting.',
        specs: [['dining-set', 5.0, 5.05, 0, { width: 1.8, depth: 0.9, variant: '1.8 m', options: { chairs: 6 } }]],
      },
      {
        id: 'island',
        name: 'Breakfast island',
        blurb: 'Island with three bar stools at the kitchen opening instead of a dining table. Extra prep space too.',
        specs: [
          ['island', 5.1, 5.45, 180],
          ['bar-stool', 4.5, 4.6, 0],
          ['bar-stool', 5.1, 4.6, 0],
          ['bar-stool', 5.7, 4.6, 0],
        ],
      },
    ],
  },
  {
    id: 'bed3',
    name: 'Bedroom 3',
    rooms: ['bed3'],
    region: [rect(3.05, 0, 5.8, 3.4)],
    options: [
      {
        id: 'study',
        name: 'Study',
        blurb: 'Wide desk side-on to the window to avoid screen glare, shelving opposite.',
        specs: [
          ['desk', 3.45, 1.0, 270, { width: 1.6, depth: 0.7, variant: '1.6 m' }],
          ['office-chair', 4.2, 1.05, 90],
          ['bookshelf', 5.55, 0.63, 90], // clear of the structural column at the window
          ['bookshelf', 5.55, 1.43, 90],
          ['plant', 3.4, 3.05, 0, { width: 0.35, depth: 0.35, height: 0.6, variant: 'Small' }],
        ],
      },
      {
        id: 'guest',
        name: 'Guest room',
        blurb: 'Queen bed with its head on the party wall and a sliding wardrobe beside the door.',
        specs: [
          ['bed', 4.715, 1.01, 90],
          ['bedside', 5.525, 1.995, 90],
          ['wardrobe', 3.9, 3.05, 180, { width: 1.6, options: { doors: 'sliding' } }],
          ['wall-art', 5.71, 1.01, 90, { elevation: 1.35 }],
        ],
      },
      {
        id: 'kid',
        name: "Kid's room",
        blurb: 'Super single along the wall, homework desk under the window and a wardrobe they can reach.',
        specs: [
          ['bed', 3.635, 2.35, 180, { width: 1.07, depth: 2.0, height: 1.0, variant: 'Super single', fabric: 'blush' }],
          ['desk', 3.7, 0.375, 0, { width: 1.0, depth: 0.55, variant: '1.0 m', finish: 'white' }],
          ['office-chair', 3.7, 0.95, 180],
          ['wardrobe', 5.425, 1.3, 90, { width: 1.6 }],
          ['rug', 4.55, 2.25, 0, { fabric: 'blush' }],
        ],
      },
    ],
  },
  {
    id: 'bed2',
    name: 'Bedroom 2',
    rooms: ['bed2'],
    region: [rect(5.8, 0, 8.6, 3.4)],
    options: [
      {
        id: 'guest',
        name: 'Guest room',
        blurb: 'Queen bed on the far wall with a bedside on each side.',
        specs: [
          ['bed', 7.54, 1.6, 90],
          ['bedside', 8.35, 0.595, 90],
          ['bedside', 8.35, 2.605, 90],
        ],
      },
      {
        id: 'kid',
        name: "Kid's room",
        blurb: 'Super single on the far wall, desk under the window and a full-height wardrobe.',
        specs: [
          ['bed', 8.015, 2.35, 180, { width: 1.07, depth: 2.0, height: 1.0, variant: 'Super single', fabric: 'olive' }],
          ['desk', 7.0, 0.375, 0, { width: 1.0, depth: 0.55, variant: '1.0 m', finish: 'white' }],
          ['office-chair', 7.0, 0.95, 180],
          ['wardrobe', 6.175, 1.05, 270, { width: 1.6 }],
          ['rug', 6.9, 2.0, 0],
        ],
      },
      {
        id: 'office',
        name: 'Home office for two',
        blurb: 'A 1.6 m desk for two under the window, a two-seater for calls and shelving on the side wall.',
        specs: [
          ['desk', 7.46, 0.45, 0, { width: 1.6, depth: 0.7, variant: '1.6 m' }],
          ['office-chair', 7.1, 1.12, 180],
          ['office-chair', 7.85, 1.12, 180],
          ['sofa', 6.325, 1.68, 270, { width: 1.6, depth: 0.9, variant: '2-seater', fabric: 'olive' }],
          ['bookshelf', 8.375, 1.9, 90],
          ['bookshelf', 8.375, 2.7, 90],
        ],
      },
    ],
  },
  {
    id: 'master',
    name: 'Main bedroom',
    rooms: ['master'],
    region: [[[8.6, 0], [11.7, 0], [11.7, 4.55], [8.6, 4.55]]],
    options: [
      {
        id: 'classic',
        name: 'Queen by the window',
        blurb: 'Queen bed on the solid wall, sliding wardrobe beside the en-suite.',
        specs: [
          ['bed', 10.54, 1.6, 90, { fabric: 'stone' }],
          ['bedside', 11.35, 0.595, 90],
          ['bedside', 11.35, 2.605, 90],
          ['wardrobe', 11.25, 3.65, 90, { width: 1.6, options: { doors: 'sliding' } }],
          ['wall-art', 11.535, 1.6, 90, { elevation: 1.35 }],
        ],
      },
      {
        id: 'tv',
        name: 'Bed facing a TV',
        blurb: 'Headboard on the Bedroom 2 wall and a wall-mounted TV opposite, about 2.6 m from the pillows.',
        specs: [
          ['bed', 9.66, 1.6, 270, { fabric: 'stone' }],
          ['bedside', 8.85, 0.595, 270],
          ['bedside', 8.85, 2.605, 270],
          ['wardrobe', 11.25, 3.65, 90, { width: 1.6, options: { doors: 'sliding' } }],
          ['tv', 11.525, 1.6, 90, { width: 1.23, depth: 0.05, height: 0.71, variant: '55"', elevation: 1.0 }],
          ['wall-art', 8.665, 1.6, 270, { elevation: 1.35 }],
        ],
      },
      {
        id: 'king',
        name: 'King + reading chair',
        blurb: 'King bed, a slightly shorter wardrobe to fit and an armchair in the corner by the door.',
        specs: [
          ['bed', 10.54, 1.62, 90, { width: 1.83, depth: 2.02, variant: 'King', fabric: 'stone' }],
          ['bedside', 11.35, 0.48, 90],
          ['bedside', 11.35, 2.76, 90],
          ['wardrobe', 11.25, 3.725, 90, { width: 1.45, options: { doors: 'sliding' } }],
          ['armchair', 9.1, 3.08, 270],
          ['wall-art', 11.535, 1.62, 90, { width: 1.2, height: 0.8, variant: '120×80', elevation: 1.3 }],
        ],
      },
    ],
  },
  {
    // Wet areas and the entrance are fixed by plumbing and the main door, so they have one plan.
    id: 'service',
    name: 'Kitchen, baths & entrance',
    rooms: ['kitchen', 'service', 'bath1', 'bath2'],
    region: [
      [[3.6, 6.1], [6.85, 6.1], [6.85, 6.45], [6.65, 6.45], [6.65, 8.9], [3.6, 8.9]],
      rect(6.65, 6.45, 8.75, 8.9),
      rect(6.85, 4.55, 11.7, 6.45),
      rect(1.85, 6.1, 3.6, 7.4),
    ],
    options: [
      {
        id: 'standard',
        name: 'L-shaped kitchen',
        blurb: 'L-shaped run on the two structural walls with the fridge at the open end.',
        specs: [
          ['kitchen-run', 5.17, 8.45, 180, { width: 2.8 }],
          ['kitchen-run', 4.05, 7.5, 270, { width: 1.3, options: { counter: 'white', uppers: 'yes', sink: 'no', hob: 'no' } }],
          ['fridge', 4.11, 6.5, 270],
          ['shoe-cabinet', 3.3, 6.75, 90, { width: 1.0, depth: 0.3 }],
          ['vanity', 10.0, 6.15, 180],
          ['toilet', 11.21, 5.0, 90],
          ['toilet', 7.4, 6.05, 180],
          ['vanity', 8.76, 5.3, 90, { width: 0.6, depth: 0.45, variant: '600' }],
          ['washer', 8.375, 8.45, 180, { options: { stacked: 'yes' } }],
        ],
      },
    ],
  },
]

export const LAYOUT_SCHEMES: LayoutScheme[] = [
  {
    id: 'starter',
    name: 'Designer starter',
    blurb: 'A balanced flat: study, guest room and a queen in the main bedroom.',
    picks: { lounge: 'classic', dining: 'table4', bed3: 'study', bed2: 'guest', master: 'classic', service: 'standard' },
  },
  {
    id: 'couple',
    name: 'Couple working from home',
    blurb: 'L-sofa lounge, breakfast island, two home offices and a TV in the bedroom.',
    picks: { lounge: 'lounge', dining: 'island', bed3: 'study', bed2: 'office', master: 'tv', service: 'standard' },
  },
  {
    id: 'family',
    name: 'Family with two kids',
    blurb: 'A room for each child, a six-seater for dinners and a king bed for the parents.',
    picks: { lounge: 'classic', dining: 'table6', bed3: 'kid', bed2: 'kid', master: 'king', service: 'standard' },
  },
  {
    id: 'hosts',
    name: 'Hosts',
    blurb: 'Conversation seating, a six-seater, a guest room and a home office.',
    picks: { lounge: 'hosting', dining: 'table6', bed3: 'guest', bed2: 'office', master: 'classic', service: 'standard' },
  },
]
