import type { FloorPlan, RoomKind } from './plan'
import type { Design } from './design'

/**
 * What a preset captures:
 * - flat: the whole design (finishes, ceilings, furniture) plus the floor plan trace it was made on
 * - room: one room's floor, paint, ceiling, feature walls and the furniture inside it
 * - palette: materials and colours only (paint, floors, feature walls), no furniture
 */
export type PresetScope = 'flat' | 'room' | 'palette'

export interface Preset {
  id: string
  name: string
  scope: PresetScope
  createdAt: number
  updatedAt: number
  /** Plan the preset was made on; room ids in `design` refer to it. */
  planId: string
  /** Snapshot of the trace, for whole-flat presets (lets an export carry the layout with it). */
  plan?: FloorPlan
  room?: { id: string; name: string; kind: RoomKind }
  design: Partial<Design>
  /** JPEG thumbnail of the 3D view when it was saved. */
  thumbnail?: Blob
}

/** File format for exported presets. Thumbnails travel as data URLs. */
export interface PresetExport {
  app: 'redhill-peaks-studio'
  kind: 'presets'
  version: 1
  exportedAt: string
  presets: (Omit<Preset, 'thumbnail'> & { thumbnail?: string })[]
}
