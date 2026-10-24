import type { FloorPlan, Wall } from '../types/plan'
import { faceKey, type Design } from '../types/design'
import { redhillPeaks } from '../data/redhillPeaks'
import { catalogEntry } from '../features/furniture/catalog'
import { featureById } from '../features/scene/wallFinishes'
import { closestOnSegment, faceRoom, pointInPolygon } from './planMath'
import { footprint, itemWarnings } from './furnitureMath'

// Guidance checks against common HDB renovation rules. They're a planning aid, not HDB advice:
// always confirm with HDB's renovation guidelines and a registered contractor.

export type CheckStatus = 'ok' | 'info' | 'warn' | 'fail'

export interface Check {
  id: string
  title: string
  status: CheckStatus
  detail: string
  /** Things to highlight when the user clicks "Show". */
  itemIds?: string[]
  roomId?: string
}

const moved = (a: Wall, b: Wall) => Math.hypot(a.start[0] - b.start[0], a.start[1] - b.start[1]) > 0.05 || Math.hypot(a.end[0] - b.end[0], a.end[1] - b.end[1]) > 0.05
const label = (type: string) => catalogEntry(type)?.name.toLowerCase() ?? type

export function runChecks(plan: FloorPlan, design: Design): Check[] {
  const checks: Check[] = []
  const traced = plan.id === redhillPeaks.id ? redhillPeaks : null
  const current = new Map(plan.walls.map((w) => [w.id, w]))

  // 1. Structural walls
  if (traced) {
    const problems: string[] = []
    for (const w of traced.walls.filter((x) => x.structural)) {
      const now = current.get(w.id)
      if (!now) problems.push('a structural wall was deleted')
      else if (moved(w, now)) problems.push('a structural wall was moved')
      else if ((now.openings ?? []).some((o) => !(w.openings ?? []).some((orig) => orig.id === o.id))) problems.push('a new opening was cut into a structural wall')
      else if (!now.structural) problems.push('a structural wall was unmarked')
    }
    checks.push(
      problems.length
        ? { id: 'structural', title: 'Structural walls changed', status: 'fail', detail: `In the plan, ${[...new Set(problems)].join(', ')}. Walls shaded black on the HDB plan, and all beams and slabs, must not be hacked, removed or tampered with.` }
        : { id: 'structural', title: 'Structural walls untouched', status: 'ok', detail: 'All walls shaded black on your HDB plan are as traced.' },
    )

    // 2. Non-structural changes
    const changed = traced.walls.filter((w) => !w.structural && (!current.has(w.id) || moved(w, current.get(w.id)!)))
    const added = plan.walls.filter((w) => !traced.walls.some((t) => t.id === w.id))
    if (changed.length || added.length) {
      checks.push({
        id: 'partitions',
        title: 'Partition walls changed',
        status: 'warn',
        detail: `${changed.length ? `${changed.length} existing non-structural wall${changed.length > 1 ? 's' : ''} removed or moved. ` : ''}${added.length ? `${added.length} new wall${added.length > 1 ? 's' : ''} added. ` : ''}Hacking non-structural walls needs a permit from HDB, and removing reinforced-concrete walls also needs a Professional Engineer's supervision. Ask your contractor to apply through HDB's renovation permit system.`,
      })
    } else {
      checks.push({ id: 'partitions', title: 'No wall hacking planned', status: 'ok', detail: 'The layout matches your HDB plan, so no hacking permit is needed for walls.' })
    }
  } else {
    checks.push({
      id: 'structural',
      title: 'Structural walls',
      status: 'info',
      detail: 'This is an uploaded plan, so changes can’t be compared with an original. Mark walls shaded black on the HDB plan as Structural while tracing; they must not be hacked.',
    })
  }

  // 3. Household shelter
  const shelterWalls = plan.walls.filter((w) => ([1, -1] as const).some((s) => faceRoom(plan, w, s)?.kind === 'shelter'))
  const shelterFeatures = shelterWalls.flatMap((w) => ([1, -1] as const).filter((s) => design.features[faceKey(w.id, s)]).map((s) => featureById(design.features[faceKey(w.id, s)].feature)?.label ?? 'feature finish'))
  const fixedToShelter = design.items.filter((it) => {
    const e = catalogEntry(it.type)
    if (!e || (e.category !== 'Carpentry' && e.layer !== 'wall')) return false
    return footprint(it).some((p) => shelterWalls.some((w) => closestOnSegment(p, w.start, w.end).dist < w.thickness / 2 + 0.03))
  })
  const shelter = plan.rooms.find((r) => r.kind === 'shelter')
  if (shelter) {
    if (shelterFeatures.length || fixedToShelter.length) {
      checks.push({
        id: 'shelter',
        title: 'Household shelter walls',
        status: shelterFeatures.length ? 'fail' : 'warn',
        detail: `${shelterFeatures.length ? `${[...new Set(shelterFeatures)].join(', ')} on a shelter wall. ` : ''}${fixedToShelter.length ? `${fixedToShelter.map((i) => label(i.type)).join(', ')} against a shelter wall: keep it free-standing. ` : ''}The shelter's walls, floor, ceiling and steel door must not be hacked, drilled, nailed or covered with fixed panels.`,
        itemIds: fixedToShelter.map((i) => i.id),
        roomId: shelter.id,
      })
    } else {
      checks.push({ id: 'shelter', title: 'Household shelter untouched', status: 'ok', detail: 'No finishes or fixed carpentry on the shelter walls. Free-standing shelves inside are fine.', roomId: shelter.id })
    }
  }

  // 4. Doors
  const blocking = design.items.filter((it) => itemWarnings(it, design.items, plan).some((w) => w.kind === 'door'))
  checks.push(
    blocking.length
      ? { id: 'doors', title: 'Doors blocked', status: 'warn', detail: `The ${[...new Set(blocking.map((i) => label(i.type)))].join(', ')} ${blocking.length > 1 ? 'are' : 'is'} in a door's swing. The main door and shelter door especially must open fully for fire safety.`, itemIds: blocking.map((i) => i.id) }
      : { id: 'doors', title: 'All doors open fully', status: 'ok', detail: 'Nothing sits in a door swing, including the main door and shelter door.' },
  )

  // 5. A/C ledge
  const ledge = plan.rooms.find((r) => r.kind === 'ledge')
  if (ledge) {
    const onLedge = design.items.filter((it) => pointInPolygon([it.x, it.y], ledge.polygon))
    checks.push(
      onLedge.length
        ? { id: 'ledge', title: 'Items on the A/C ledge', status: 'fail', detail: `${onLedge.map((i) => label(i.type)).join(', ')} placed on the A/C ledge. It's for aircon condensers only and must not be used for storage or as living space.`, itemIds: onLedge.map((i) => i.id), roomId: ledge.id }
        : { id: 'ledge', title: 'A/C ledge kept clear', status: 'ok', detail: 'The A/C ledge is only for the aircon condensers.', roomId: ledge.id },
    )
  }

  // 6. Wet-area floors
  const wet = plan.rooms.filter((r) => r.kind === 'bath' || r.kind === 'kitchen' || r.kind === 'service')
  const unsuitable = wet.filter((r) => {
    const f = design.floors[r.id]?.finish
    return f && (['oak', 'ash', 'walnut', 'herringbone', 'carpet'].includes(f) || (r.kind === 'bath' && f === 'marble'))
  })
  if (unsuitable.length) {
    checks.push({
      id: 'wet-floors',
      title: 'Wet-area flooring',
      status: 'warn',
      detail: `${unsuitable.map((r) => `${r.name} (${design.floors[r.id].finish === 'marble' ? 'polished stone look' : design.floors[r.id].finish})`).join(', ')}: wet areas need waterproofing and a slip-resistant, water-safe floor. Pick textured tiles, terrazzo or screed there.`,
      roomId: unsuitable[0].id,
    })
  } else {
    checks.push({ id: 'wet-floors', title: 'Wet-area flooring', status: 'ok', detail: 'Kitchen, bathroom and service yard floors are suitable for wet areas.' })
  }

  // 7. New-flat bathroom rule
  const bathWork = plan.rooms
    .filter((r) => r.kind === 'bath')
    .filter((r) => design.floors[r.id] || plan.walls.some((w) => ([1, -1] as const).some((s) => design.features[faceKey(w.id, s)] && faceRoom(plan, w, s)?.id === r.id)))
  if (bathWork.length) {
    checks.push({
      id: 'bath-3yr',
      title: 'Bathroom tiles in a new flat',
      status: 'info',
      detail: `You're changing finishes in ${bathWork.map((r) => r.name).join(' and ')}. For a new flat, HDB doesn't allow hacking bathroom wall or floor tiles within 3 years of key collection, so overlay the new tiles on the existing ones instead.`,
      roomId: bathWork[0].id,
    })
  }

  // 8. Pieces built into walls
  const intoWalls = design.items.filter((it) => itemWarnings(it, design.items, plan).some((w) => w.kind === 'wall'))
  if (intoWalls.length) {
    checks.push({
      id: 'into-walls',
      title: 'Furniture overlapping walls',
      status: 'warn',
      detail: `The ${[...new Set(intoWalls.map((i) => label(i.type)))].join(', ')} overlap${intoWalls.length > 1 ? '' : 's'} a wall in the plan. Recessing into walls means hacking them; move the piece or check the wall isn't structural.`,
      itemIds: intoWalls.map((i) => i.id),
    })
  }

  return checks
}

export const CHECK_ORDER: Record<CheckStatus, number> = { fail: 0, warn: 1, info: 2, ok: 3 }
