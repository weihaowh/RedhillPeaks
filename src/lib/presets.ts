import type { FloorPlan } from '../types/plan'
import { faceKey, type Design } from '../types/design'
import type { Preset, PresetExport, PresetScope } from '../types/preset'
import { EMPTY_DESIGN } from '../store/useDesignStore'
import { faceRoom, pointInPolygon } from './planMath'

// Pure preset logic: what each scope captures, and how a preset lands on a design.

export const SCOPE_LABEL: Record<PresetScope, string> = {
  flat: 'Whole flat',
  room: 'Single room',
  palette: 'Materials & colours',
}

const newPresetId = () => `preset-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
const newItemId = () => `item-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`

/** Wall faces that look into a room, as design feature keys. */
function roomFaceKeys(plan: FloorPlan, roomId: string): Set<string> {
  const keys = new Set<string>()
  for (const w of plan.walls) for (const side of [1, -1] as const) if (faceRoom(plan, w, side)?.id === roomId) keys.add(faceKey(w.id, side))
  return keys
}

const pick = <T,>(record: Record<string, T>, keys: Iterable<string>) => {
  const out: Record<string, T> = {}
  for (const k of keys) if (record[k] !== undefined) out[k] = record[k]
  return out
}

export function capturePreset(name: string, scope: PresetScope, design: Design, plan: FloorPlan, roomId?: string): Preset {
  const now = Date.now()
  const base = { id: newPresetId(), name, scope, createdAt: now, updatedAt: now, planId: plan.id }
  if (scope === 'flat') return { ...base, plan, design: structuredClone(design) }
  if (scope === 'palette') {
    const { wallPaint, roomPaint, floors, features } = structuredClone(design)
    return { ...base, design: { wallPaint, roomPaint, floors, features } }
  }
  const room = plan.rooms.find((r) => r.id === roomId)
  if (!room) throw new Error('Pick a room to save a room preset.')
  return {
    ...base,
    room: { id: room.id, name: room.name, kind: room.kind },
    design: structuredClone({
      roomPaint: pick(design.roomPaint, [room.id]),
      floors: pick(design.floors, [room.id]),
      ceilings: pick(design.ceilings, [room.id]),
      features: pick(design.features, roomFaceKeys(plan, room.id)),
      items: design.items.filter((it) => pointInPolygon([it.x, it.y], room.polygon)),
      fixtures: design.fixtures.filter((f) => pointInPolygon([f.x, f.y], room.polygon)),
    }),
  }
}

/**
 * The design you'd get by applying a preset. Room presets go to `targetRoomId` (default: the
 * room they were saved from); on a different room only the floor, paint and ceiling carry over,
 * since feature walls and furniture positions belong to the original room's shape.
 */
export function applyPreset(design: Design, plan: FloorPlan, preset: Preset, targetRoomId?: string): Design {
  const p = preset.design
  if (preset.scope === 'flat') return { ...EMPTY_DESIGN, ...structuredClone(p) }
  if (preset.scope === 'palette') {
    return {
      ...design,
      wallPaint: p.wallPaint ?? design.wallPaint,
      roomPaint: { ...(p.roomPaint ?? {}) },
      floors: { ...(p.floors ?? {}) },
      features: { ...(p.features ?? {}) },
    }
  }

  const source = preset.room!.id
  const target = targetRoomId ?? source
  const room = plan.rooms.find((r) => r.id === target)
  if (!room) return design
  const without = <T,>(record: Record<string, T>, keys: Iterable<string>) => {
    const out = { ...record }
    for (const k of keys) delete out[k]
    return out
  }
  const move = <T,>(record: Record<string, T> | undefined, into: Record<string, T>) => (record?.[source] !== undefined ? { ...into, [target]: record[source] } : into)
  const next: Design = {
    ...design,
    roomPaint: move(p.roomPaint, without(design.roomPaint, [target])),
    floors: move(p.floors, without(design.floors, [target])),
    ceilings: move(p.ceilings, without(design.ceilings, [target])),
  }
  if (target !== source) return next

  const faces = roomFaceKeys(plan, target)
  const keep = design.items.filter((it) => !pointInPolygon([it.x, it.y], room.polygon))
  const outside = (design.fixtures ?? []).filter((f) => !pointInPolygon([f.x, f.y], room.polygon))
  // Fresh ids for the incoming points, keeping their switch links pointing at each other.
  const ids = new Map((p.fixtures ?? []).map((f) => [f.id, `fx-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`]))
  return {
    ...next,
    features: { ...without(design.features, faces), ...structuredClone(p.features ?? {}) },
    items: [...keep, ...(p.items ?? []).map((it) => ({ ...structuredClone(it), id: newItemId() }))],
    fixtures: [...outside, ...(p.fixtures ?? []).map((f) => ({ ...structuredClone(f), id: ids.get(f.id)!, switchId: f.switchId && (ids.get(f.switchId) ?? f.switchId) }))],
  }
}

/** Whether applying this preset will also replace the floor plan trace. */
export const replacesPlan = (preset: Preset, plan: FloorPlan) => preset.scope === 'flat' && !!preset.plan && preset.plan.id !== plan.id

// ---------------------------------------------------------------------------------------------
// Export / import

const blobToDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result as string)
    r.onerror = () => reject(r.error)
    r.readAsDataURL(blob)
  })

export async function buildExport(presets: Preset[]): Promise<PresetExport> {
  return {
    app: 'redhill-peaks-studio',
    kind: 'presets',
    version: 1,
    exportedAt: new Date().toISOString(),
    presets: await Promise.all(presets.map(async ({ thumbnail, ...rest }) => ({ ...rest, thumbnail: thumbnail ? await blobToDataUrl(thumbnail) : undefined }))),
  }
}

/** Parses an exported file; imported presets get fresh ids so they never overwrite existing ones. */
export async function parseImport(text: string): Promise<Preset[]> {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error("That file isn't valid JSON.")
  }
  const file = data as Partial<PresetExport>
  if (file?.app !== 'redhill-peaks-studio' || file.kind !== 'presets' || !Array.isArray(file.presets)) {
    throw new Error("That file isn't a Redhill Peaks Studio preset export.")
  }
  return Promise.all(
    file.presets
      .filter((p) => p && typeof p.name === 'string' && p.design && ['flat', 'room', 'palette'].includes(p.scope))
      .map(async ({ thumbnail, ...rest }) => ({
        ...rest,
        id: newPresetId(),
        thumbnail: thumbnail?.startsWith('data:image/') ? await (await fetch(thumbnail)).blob() : undefined,
      })),
  )
}
