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
  src: string
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
