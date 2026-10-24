import type { FloorPlan, Vec2 } from '../types/plan'
import type { Design, Fixture } from '../types/design'
import type { Check } from './hdbChecks'
import { isLight, isSwitch } from '../features/electrical/fixtures'
import { pointInPolygon, polygonArea } from './planMath'
import { footprint, itemAxes } from './furnitureMath'
import { fixtureRoom } from './electrical'

// Electrical layout checks: the things owners most often regret after moving in.

const dist = (a: Vec2, b: Vec2) => Math.hypot(a[0] - b[0], a[1] - b[1])
const isSocket = (f: Fixture) => f.type.startsWith('socket')

export function electricalChecks(plan: FloorPlan, design: Design): Check[] {
  const checks: Check[] = []
  const fx = design.fixtures
  const rooms = plan.rooms.filter((r) => r.kind !== 'ledge')

  if (!fx.length) {
    return [{ id: 'el-empty', title: 'No electrical points yet', status: 'info', detail: 'Use "Suggest points for me" in the Electrical tab for a starting layout, then adjust it.' }]
  }

  // Lights in every room
  const dark = rooms.filter((r) => !fx.some((f) => isLight(f.type) && pointInPolygon([f.x, f.y], r.polygon)))
  checks.push(
    dark.length
      ? { id: 'el-lights', title: 'Rooms without lights', status: 'warn', detail: `${dark.map((r) => r.name).join(', ')} ha${dark.length > 1 ? 've' : 's'} no ceiling light.`, roomId: dark[0].id }
      : { id: 'el-lights', title: 'Every room has a light', status: 'ok', detail: 'Each room has at least one ceiling light.' },
  )

  // Lights linked to switches
  const loose = fx.filter((f) => isLight(f.type) && (!f.switchId || !fx.some((s) => s.id === f.switchId)))
  if (loose.length) {
    checks.push({ id: 'el-links', title: 'Lights without a switch', status: 'warn', detail: `${loose.length} light${loose.length > 1 ? 's are' : ' is'} not linked to a switch. Select a light and pick its switch so your electrician knows how to wire it.` })
  } else {
    checks.push({ id: 'el-links', title: 'All lights switched', status: 'ok', detail: 'Every light is linked to a switch.' })
  }

  // Power where it's needed
  const sockets = fx.filter(isSocket)
  const needs: string[] = []
  const needIds: string[] = []
  for (const it of design.items) {
    if (it.type !== 'bed' && it.type !== 'desk') continue
    const { u } = itemAxes(it)
    const reach = it.type === 'bed' ? [-1, 1].map((s): Vec2 => [it.x + u[0] * s * (it.width / 2), it.y + u[1] * s * (it.width / 2)]) : [[it.x, it.y] as Vec2]
    const ok = reach.some((p) => sockets.some((s) => dist(p, [s.x, s.y]) < (it.type === 'bed' ? 1.3 : 1.4)))
    if (!ok) {
      needs.push(it.type === 'bed' ? 'a bed' : 'a desk')
      needIds.push(it.id)
    }
  }
  checks.push(
    needs.length
      ? { id: 'el-power', title: 'Missing sockets', status: 'warn', detail: `No socket within reach of ${[...new Set(needs)].join(' and ')}. Bedside and desk sockets are the most-missed points in a new flat.`, itemIds: needIds }
      : { id: 'el-power', title: 'Beds and desks have power', status: 'ok', detail: 'Every bed side and desk has a socket within reach.' },
  )

  // Wet areas
  const bathSockets = sockets.filter((s) => fixtureRoom(s, plan)?.kind === 'bath')
  const sinks: Vec2[] = design.items.flatMap((it): Vec2[] => {
    if (it.type === 'vanity') return [[it.x, it.y]]
    if (it.type === 'kitchen-run' && it.options?.sink !== 'no' && it.width >= 1.2) {
      const { u } = itemAxes(it)
      const x = it.width / 2 - 0.55
      return [[it.x + u[0] * x, it.y + u[1] * x]]
    }
    return []
  })
  const nearWater = fx.filter((f) => (isSocket(f) || isSwitch(f.type)) && sinks.some((s) => dist(s, [f.x, f.y]) < 0.6))
  if (bathSockets.length || nearWater.length) {
    checks.push({
      id: 'el-water',
      title: 'Points near water',
      status: 'warn',
      detail: `${bathSockets.length ? `${bathSockets.length} socket${bathSockets.length > 1 ? 's' : ''} inside a bathroom (only shaver sockets belong there). ` : ''}${nearWater.length ? `${nearWater.length} point${nearWater.length > 1 ? 's' : ''} within 600 mm of a sink. ` : ''}Keep sockets and switches away from sinks and showers.`,
      roomId: bathSockets.length ? fixtureRoom(bathSockets[0], plan)?.id : undefined,
    })
  } else {
    checks.push({ id: 'el-water', title: 'Points clear of water', status: 'ok', detail: 'No sockets in bathrooms, and nothing within 600 mm of a sink.' })
  }

  // Aircon
  const coils = fx.filter((f) => f.type === 'ac-indoor')
  const blocked = coils.filter((c) => {
    const t = (c.rotation * Math.PI) / 180
    const n: Vec2 = [-Math.sin(t), Math.cos(t)]
    const front: Vec2 = [c.x + n[0] * 0.4, c.y + n[1] * 0.4]
    return design.items.some((it) => it.height >= 1.8 && pointInPolygon(front, footprint(it)))
  })
  if (blocked.length) {
    checks.push({ id: 'el-ac', title: 'Aircon blocked', status: 'warn', detail: `${blocked.length} aircon unit${blocked.length > 1 ? 's sit' : ' sits'} right above a tall piece (e.g. a wardrobe). It needs clear space in front to blow air and be serviced.` })
  } else if (coils.length) {
    checks.push({ id: 'el-ac', title: 'Aircon placement', status: 'ok', detail: `${coils.length} fan coil${coils.length > 1 ? 's' : ''} with clear airflow.` })
  }
  const condensers = fx.filter((f) => f.type === 'ac-condenser').length
  if (coils.length && !condensers) {
    checks.push({ id: 'el-cu', title: 'No aircon condenser', status: 'info', detail: 'Place a condenser on the A/C ledge. One multi-split condenser runs up to 4 fan coils.' })
  } else if (coils.length > condensers * 4) {
    checks.push({ id: 'el-cu', title: 'More condensers needed', status: 'warn', detail: `${coils.length} fan coils need at least ${Math.ceil(coils.length / 4)} condensers.` })
  }

  // Living room socket count
  const living = plan.rooms.find((r) => r.kind === 'living')
  if (living) {
    const n = sockets.filter((s) => fixtureRoom(s, plan)?.id === living.id).length
    if (n < Math.ceil(polygonArea(living.polygon) / 8)) {
      checks.push({ id: 'el-living', title: 'Few sockets in the living room', status: 'info', detail: `${n} socket${n === 1 ? '' : 's'} for about ${Math.round(polygonArea(living.polygon))} m². Think about the vacuum, a lamp by the sofa and charging spots.`, roomId: living.id })
    }
  }

  checks.push({
    id: 'el-lew',
    title: 'Licensed electrician',
    status: 'info',
    detail: 'All electrical work must be done by a licensed electrical worker (LEW). Heights shown are typical defaults; confirm them on site.',
  })
  return checks
}
