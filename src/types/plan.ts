/** Plan-space point in metres: x runs left→right on the drawing, y runs top→bottom. */
export type Vec2 = [number, number]

export type OpeningKind = 'door' | 'window' | 'opening'

export interface Opening {
  id: string
  kind: OpeningKind
  /** Distance from the wall's start point to the near edge of the opening (m). */
  offset: number
  width: number
  sill: number
  height: number
  /** Doors: which jamb the leaf hangs on (default 'start', the jamb nearer the wall start). */
  hinge?: 'start' | 'end'
  /**
   * Doors: which side of the wall the leaf swings into. 1 is the wall's left-hand normal
   * (-dy, dx) in plan space, i.e. +y for a wall drawn left→right; -1 is the other side.
   */
  side?: 1 | -1
  /** Doors: finish preset for the leaf. */
  style?: 'standard' | 'main' | 'shelter'
}

export interface Wall {
  id: string
  start: Vec2
  end: Vec2
  thickness: number
  /** Defaults to the plan's ceiling height. */
  height?: number
  /** Shaded black on the HDB plan: must not be hacked, removed or tampered with. */
  structural?: boolean
  exterior?: boolean
  openings?: Opening[]
}

export type RoomKind = 'living' | 'bedroom' | 'kitchen' | 'bath' | 'service' | 'shelter' | 'ledge'

export interface Room {
  id: string
  name: string
  kind: RoomKind
  polygon: Vec2[]
  /** Floor height relative to the main slab (m). */
  floorLevel?: number
  /** Where to place the label when the centroid falls somewhere awkward. */
  labelAt?: Vec2
}

export interface Underlay {
  /** Static image URL (bundled plans). */
  src?: string
  /** Uploaded image kept in IndexedDB (see lib/assets). */
  assetId?: string
  x: number
  y: number
  width: number
  height: number
}

export interface FloorPlan {
  id: string
  name: string
  subtitle: string
  ceilingHeight: number
  rooms: Room[]
  walls: Wall[]
  underlay?: Underlay
}
