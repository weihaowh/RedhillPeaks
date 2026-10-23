import type { FloorPlan, Opening } from '../types/plan'

// Traced from the HDB unit plan "4 Room Type-1(H)", Blk 147A Redhill Peaks (BM C73 P2).
// Coordinates are wall centre-lines in metres, snapped to the drawing's dimension strings
// (11 700 × 8 900 overall). HDB marks these as approximate, so treat them as ±50 mm.

const win = (id: string, offset: number, width: number, sill = 0.9, height = 1.35): Opening => ({
  id,
  kind: 'window',
  offset,
  width,
  sill,
  height,
})

const door = (id: string, offset: number, width: number, swing: Pick<Opening, 'hinge' | 'side' | 'style'>, height = 2.1): Opening => ({
  id,
  kind: 'door',
  offset,
  width,
  sill: 0,
  height,
  ...swing,
})

export const redhillPeaks: FloorPlan = {
  id: 'redhill-peaks-147a-4rm-1h',
  name: 'Redhill Peaks',
  subtitle: 'Blk 147A · 4-Room Type 1(H) · 90 m²',
  ceilingHeight: 2.6,
  underlay: {
    src: `${import.meta.env.BASE_URL}plans/redhill-peaks-4rm-type1h.png`,
    x: -2.035,
    y: -0.763,
    width: 14.893,
    height: 10.493,
  },
  rooms: [
    {
      id: 'living',
      name: 'Living / Dining',
      kind: 'living',
      polygon: [
        [0, 0], [3.05, 0], [3.05, 3.4], [8.6, 3.4], [8.6, 4.55], [6.85, 4.55],
        [6.85, 6.1], [3.6, 6.1], [3.6, 7.4], [1.85, 7.4], [1.85, 4.55], [0, 4.55],
      ],
      labelAt: [1.55, 2.2],
    },
    { id: 'kitchen', name: 'Kitchen', kind: 'kitchen', polygon: [[3.6, 6.1], [6.85, 6.1], [6.85, 6.45], [6.65, 6.45], [6.65, 8.9], [3.6, 8.9]] },
    { id: 'service', name: 'Service Yard', kind: 'service', polygon: [[6.65, 6.45], [8.75, 6.45], [8.75, 8.9], [6.65, 8.9]] },
    { id: 'bed3', name: 'Bedroom 3', kind: 'bedroom', polygon: [[3.05, 0], [5.8, 0], [5.8, 3.4], [3.05, 3.4]] },
    { id: 'bed2', name: 'Bedroom 2', kind: 'bedroom', polygon: [[5.8, 0], [8.6, 0], [8.6, 3.4], [5.8, 3.4]] },
    { id: 'master', name: 'Main Bedroom', kind: 'bedroom', polygon: [[8.6, 0], [11.7, 0], [11.7, 4.55], [8.6, 4.55]], labelAt: [10.15, 1.9] },
    { id: 'bath2', name: 'Bath / WC 2', kind: 'bath', polygon: [[6.85, 4.55], [9.05, 4.55], [9.05, 6.45], [6.85, 6.45]] },
    { id: 'bath1', name: 'Bath / WC 1', kind: 'bath', polygon: [[9.05, 4.55], [11.7, 4.55], [11.7, 6.45], [9.05, 6.45]] },
    { id: 'shelter', name: 'Household Shelter', kind: 'shelter', polygon: [[0, 4.55], [1.85, 4.55], [1.85, 7.4], [0, 7.4]] },
    { id: 'ledge', name: 'A/C Ledge', kind: 'ledge', polygon: [[8.75, 6.45], [11.7, 6.45], [11.7, 7.7], [8.75, 7.7]], floorLevel: -0.12 },
  ],
  walls: [
    // Facade along the top of the drawing.
    {
      id: 'facade-n', start: [0, 0], end: [11.7, 0], thickness: 0.2, exterior: true,
      openings: [
        win('win-living', 0.35, 2.45, 0.45, 1.95),
        win('win-bed3', 3.35, 1.9),
        win('win-bed2', 6.4, 1.95),
        win('win-master', 8.95, 2.5),
      ],
    },
    { id: 'col-n', start: [5.45, 0], end: [6.15, 0], thickness: 0.45, structural: true, exterior: true },
    { id: 'col-w', start: [0, 0], end: [0, 1.7], thickness: 0.35, structural: true, exterior: true },
    {
      id: 'facade-w', start: [0, 1.7], end: [0, 4.55], thickness: 0.15, exterior: true,
      openings: [win('win-living-side', 0.15, 2.6, 0.45, 1.95)],
    },
    { id: 'wall-e', start: [11.7, 0], end: [11.7, 6.45], thickness: 0.3, structural: true, exterior: true },

    // Household shelter: reinforced concrete box with a steel door.
    { id: 'hs-n', start: [0, 4.55], end: [1.85, 4.55], thickness: 0.3, structural: true },
    { id: 'hs-w', start: [0, 4.55], end: [0, 7.4], thickness: 0.3, structural: true, exterior: true },
    { id: 'hs-s', start: [0, 7.4], end: [1.85, 7.4], thickness: 0.3, structural: true, exterior: true },
    { id: 'hs-e', start: [1.85, 4.55], end: [1.85, 7.4], thickness: 0.3, structural: true, openings: [door('door-hs', 0.93, 0.75, { hinge: 'start', side: -1, style: 'shelter' }, 2.0)] },

    // Entrance and kitchen.
    { id: 'entry', start: [1.85, 7.4], end: [3.6, 7.4], thickness: 0.2, exterior: true, openings: [door('door-main', 0.3, 1.0, { hinge: 'start', side: -1, style: 'main' })] },
    { id: 'kitchen-w', start: [3.6, 6.1], end: [3.6, 8.9], thickness: 0.3, structural: true, exterior: true },
    { id: 'kitchen-s', start: [3.6, 8.9], end: [8.75, 8.9], thickness: 0.3, structural: true, exterior: true },
    {
      id: 'kitchen-beam', start: [3.6, 6.1], end: [6.85, 6.1], thickness: 0.15,
      openings: [{ id: 'kitchen-open', kind: 'opening', offset: 0, width: 3.25, sill: 0, height: 2.3 }],
    },
    { id: 'sy-w', start: [6.65, 6.45], end: [6.65, 8.9], thickness: 0.1, openings: [door('door-sy', 0.5, 1.0, { hinge: 'end', side: -1 })] },
    { id: 'sy-e', start: [8.75, 6.45], end: [8.75, 8.9], thickness: 0.15, exterior: true, openings: [win('win-sy', 0.25, 1.9, 0.95, 1.25)] },

    // Bathrooms.
    { id: 'bath2-w', start: [6.85, 4.55], end: [6.85, 6.45], thickness: 0.45, structural: true },
    {
      id: 'bath-n', start: [7.05, 4.55], end: [11.7, 4.55], thickness: 0.1,
      openings: [door('door-bath2', 0.25, 0.8, { hinge: 'end', side: 1 }), door('door-bath1', 2.65, 0.8, { hinge: 'end', side: 1 })],
    },
    { id: 'bath-mid', start: [9.05, 4.55], end: [9.05, 6.45], thickness: 0.1 },
    {
      id: 'bath-s', start: [7.05, 6.45], end: [11.7, 6.45], thickness: 0.12,
      openings: [win('win-bath2', 0.5, 0.9, 1.6, 0.6), win('win-bath1', 2.6, 1.2, 1.6, 0.6)],
    },

    // A/C ledge parapets.
    { id: 'ledge-s', start: [8.75, 7.7], end: [11.7, 7.7], thickness: 0.1, height: 1.0, exterior: true },
    { id: 'ledge-e', start: [11.7, 6.45], end: [11.7, 7.7], thickness: 0.1, height: 1.0, exterior: true },

    // Bedrooms.
    { id: 'bed3-w', start: [3.05, 0], end: [3.05, 3.4], thickness: 0.1 },
    { id: 'bed3-s', start: [3.05, 3.4], end: [5.8, 3.4], thickness: 0.1, openings: [door('door-bed3', 1.8, 0.85, { hinge: 'end', side: -1 })] },
    { id: 'bed23', start: [5.8, 0], end: [5.8, 3.4], thickness: 0.15 },
    { id: 'bed2-s', start: [5.8, 3.4], end: [8.6, 3.4], thickness: 0.1, openings: [door('door-bed2', 0.2, 0.85, { hinge: 'start', side: -1 })] },
    { id: 'bed2-e', start: [8.6, 0], end: [8.6, 3.4], thickness: 0.1 },
    { id: 'master-w', start: [8.6, 3.4], end: [8.6, 4.55], thickness: 0.1, openings: [door('door-master', 0.12, 0.9, { hinge: 'start', side: -1 })] },
  ],
}
