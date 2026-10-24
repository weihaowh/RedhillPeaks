// The look of the flat, kept separate from its geometry (FloorPlan) so a design can be
// saved, swapped or reset without touching the trace.

export interface FloorSpec {
  finish: string
  /** Plank width or tile size in metres; finishes without size options ignore it. */
  size?: number
  /** Direction of planks/tiles: 0 runs along plan x, 90 along plan y. */
  rotation?: 0 | 90
}

export interface FeatureSpec {
  feature: string
  /** Tint for finishes that take one (limewash, painted flutes, wallpaper). */
  color?: string
}

export type CeilingStyle = 'flat' | 'lbox' | 'cove'

export interface CeilingSpec {
  style: CeilingStyle
  /** Cove light colour temperature in kelvin. */
  warmth?: number
}

export interface Design {
  /** Paint for every wall face without a room-specific colour. */
  wallPaint: string
  roomPaint: Record<string, string>
  floors: Record<string, FloorSpec>
  /** Feature finishes keyed by wall face: `${wallId}|${side}`. */
  features: Record<string, FeatureSpec>
  ceilings: Record<string, CeilingSpec>
  items: FurnitureItem[]
  /** Electrical points, lights, aircon and data points. */
  fixtures: Fixture[]
}

export const faceKey = (wallId: string, side: 1 | -1) => `${wallId}|${side}`

/** A piece of furniture or built-in carpentry placed in the flat. */
export interface FurnitureItem {
  id: string
  /** Catalog entry id, e.g. 'sofa' or 'wardrobe'. */
  type: string
  /** Centre of the footprint in plan metres. */
  x: number
  y: number
  /** Degrees, clockwise on the plan drawing. At 0 the front faces +y (toward the bottom of the plan). */
  rotation: number
  width: number
  depth: number
  height: number
  /** Height of the item's base above the floor, for wall-mounted pieces. */
  elevation?: number
  /** Body finish id (see furniture materials). */
  finish?: string
  /** Upholstery colour. */
  fabric?: string
  /** Size preset label, e.g. 'Queen'. */
  variant?: string
  /** Model-specific choices such as door style or chair count. */
  options?: Record<string, string | number | boolean>
  locked?: boolean
}

/** An electrical, lighting, aircon or data point. */
export interface Fixture {
  id: string
  /** Fixture catalog id, e.g. 'socket-twin' or 'light-down' (see features/electrical/fixtures). */
  type: string
  /** Plan position in metres: on the wall face for wall-mounted points, else where it hangs. */
  x: number
  y: number
  /** Degrees, same convention as furniture: wall points face into the room. */
  rotation: number
  /** Height of the centre above the floor (m). */
  height: number
  /** Wall face it's mounted on, for wall points. */
  wallId?: string
  side?: 1 | -1
  /** For lights: the switch that controls it. */
  switchId?: string
  /** Placed by "Suggest points" rather than by hand. */
  suggested?: boolean
  note?: string
}
