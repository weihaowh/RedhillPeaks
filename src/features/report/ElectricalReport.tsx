import { useMemo } from 'react'
import { CircleAlert, CircleCheck, CircleX, Info } from 'lucide-react'
import clsx from 'clsx'
import type { FloorPlan, Vec2 } from '../../types/plan'
import type { Design, Fixture } from '../../types/design'
import { useAppStore } from '../../store/useAppStore'
import { electricalChecks } from '../../lib/electricalChecks'
import { fixtureRoom, settingOut } from '../../lib/electrical'
import { sgd } from '../../lib/estimate'
import { CHECK_ORDER, type Check, type CheckStatus } from '../../lib/hdbChecks'
import { planBounds, polygonArea, roomAnchor, wallLength, wallOutline } from '../../lib/planMath'
import { FixtureSymbols } from '../electrical/FixtureSymbols'
import { FIXTURES, FIXTURE_GROUPS, GROUP_COLOR, fixtureDef } from '../electrical/fixtures'

const STATUS: Record<CheckStatus, { icon: typeof Info; tone: string }> = {
  fail: { icon: CircleX, tone: 'text-red-500' },
  warn: { icon: CircleAlert, tone: 'text-amber-500' },
  info: { icon: Info, tone: 'text-sky-500' },
  ok: { icon: CircleCheck, tone: 'text-emerald-500' },
}

interface Row {
  room: string
  type: string
  count: number
  heights: string
  notes: string[]
}

function schedule(plan: FloorPlan, fixtures: Fixture[]): Row[] {
  const rows = new Map<string, Row & { hs: Set<number> }>()
  for (const f of fixtures) {
    const room = fixtureRoom(f, plan)?.name ?? 'Other'
    const key = `${room}|${f.type}`
    const row = rows.get(key) ?? { room, type: f.type, count: 0, heights: '', notes: [], hs: new Set<number>() }
    row.count++
    if (fixtureDef(f.type)?.mount === 'wall') row.hs.add(Math.round(f.height * 1000))
    if (f.note) row.notes.push(f.note)
    rows.set(key, row)
  }
  const order = (r: Row) => FIXTURES.findIndex((d) => d.id === r.type)
  // Rooms in the plan's own order (living first), anything unassigned last.
  const roomOrder = (name: string) => {
    const i = plan.rooms.findIndex((r) => r.name === name)
    return i < 0 ? plan.rooms.length : i
  }
  return [...rows.values()]
    .map(({ hs, ...r }) => ({ ...r, heights: [...hs].sort((a, b) => a - b).join(', ') }))
    .sort((a, b) => roomOrder(a.room) - roomOrder(b.room) || order(a) - order(b))
}

export function ElectricalReport({ plan, design }: { plan: FloorPlan; design: Design }) {
  const checks = useMemo(() => electricalChecks(plan, design).sort((a, b) => CHECK_ORDER[a.status] - CHECK_ORDER[b.status]), [plan, design])
  const rows = useMemo(() => schedule(plan, design.fixtures), [plan, design.fixtures])
  const total = design.fixtures.reduce((s, f) => s + (fixtureDef(f.type)?.cost ?? 0), 0)
  const rooms = [...new Set(rows.map((r) => r.room))]

  const show = (c: Check) => {
    const app = useAppStore.getState()
    app.openReport(null)
    app.setMode('plan')
    if (c.itemIds?.length) app.selectItem(c.itemIds[0])
    else if (c.roomId) app.selectRoom(c.roomId)
  }

  return (
    <>
      <section className="space-y-2 print:hidden">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">Checks</h3>
        <ul className="space-y-2">
          {checks.map((c) => {
            const s = STATUS[c.status]
            return (
              <li key={c.id} className="glass flex gap-3 p-3">
                <s.icon size={18} className={clsx('mt-0.5 shrink-0', s.tone)} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold">{c.title}</div>
                  <p className="text-sm leading-relaxed text-muted">{c.detail}</p>
                </div>
                {(c.itemIds?.length || c.roomId) && c.status !== 'ok' && (
                  <button type="button" onClick={() => show(c)} className="chip h-8 shrink-0 self-start ring-1 ring-line">
                    Show
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      </section>

      <section>
        <div className="mb-2 flex items-baseline justify-between">
          <h3 className="text-lg font-semibold">Electrical layout</h3>
          <span className="text-sm text-muted">
            {design.fixtures.length} points · about {sgd(total)}
          </span>
        </div>
        <ContractorPlan plan={plan} fixtures={design.fixtures} />
        <Legend fixtures={design.fixtures} />
      </section>

      <section className="space-y-4">
        <h3 className="text-lg font-semibold">Schedule</h3>
        {rooms.map((room) => (
          <div key={room} className="break-inside-avoid">
            <h4 className="mb-1 text-sm font-semibold">{room}</h4>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted">
                  <th className="py-1 font-medium">Point</th>
                  <th className="py-1 text-right font-medium">Qty</th>
                  <th className="py-1 pl-3 font-medium">Height (mm)</th>
                  <th className="py-1 pl-3 font-medium">Notes</th>
                  <th className="py-1 text-right font-medium">Est.</th>
                </tr>
              </thead>
              <tbody>
                {rows
                  .filter((r) => r.room === room)
                  .map((r) => {
                    const def = fixtureDef(r.type)!
                    return (
                      <tr key={r.type} className="border-t border-line/60 align-top">
                        <td className="py-1.5">
                          <span className="mr-1.5 inline-block w-8 rounded text-center text-[10px] font-bold text-white" style={{ background: GROUP_COLOR[def.group] }}>
                            {def.code}
                          </span>
                          {def.name}
                        </td>
                        <td className="py-1.5 text-right tabular-nums">{r.count}</td>
                        <td className="py-1.5 pl-3 tabular-nums text-muted">{def.mount === 'ceiling' ? 'ceiling' : def.mount === 'floor' ? 'ledge' : r.heights}</td>
                        <td className="py-1.5 pl-3 text-xs text-muted">{r.notes.join('; ')}</td>
                        <td className="py-1.5 text-right tabular-nums">{def.cost ? sgd(def.cost * r.count) : ''}</td>
                      </tr>
                    )
                  })}
              </tbody>
            </table>
          </div>
        ))}
        {!rows.length && <p className="text-sm text-muted">No points yet. Open the Electrical tab in the left panel and use "Suggest points for me", or place points by hand in 2D Plan.</p>}
      </section>

      <p className="text-xs leading-relaxed text-muted">
        Heights are to the centre of each point, from the finished floor. Setting-out distances are from the nearer corner along the wall (wall points) or from the
        nearest walls (ceiling points). Indicative prices include supply and installation of the point. Light fittings beyond basic downlights, the main
        distribution board and rewiring are not included. All work must be done by a licensed electrical worker (LEW); confirm every position on site.
      </p>
    </>
  )
}

/** Plan drawing for the electrician: walls, doors, rooms and every point with its setting-out. */
function ContractorPlan({ plan, fixtures }: { plan: FloorPlan; fixtures: Fixture[] }) {
  const b = planBounds(plan)
  const pad = 0.8
  // Fixed scale, sized so labels stay legible when the whole flat is printed on A4.
  const px = (n: number) => n * 0.016
  const points = (pts: Vec2[]) => pts.map(([x, y]) => `${x},${y}`).join(' ')
  return (
    <svg viewBox={`${b.minX - pad} ${b.minY - pad} ${b.maxX - b.minX + pad * 2} ${b.maxY - b.minY + pad * 2}`} className="w-full rounded-xl border border-line bg-white">
      {plan.rooms.map((r) => (
        <polygon key={r.id} points={points(r.polygon)} fill="#fafaf9" stroke="none" />
      ))}
      {plan.walls
        .filter((w) => wallLength(w) > 0.005)
        .map((w) => (
          <g key={w.id}>
            <polygon points={points(wallOutline(w))} fill={w.structural ? '#3b3b3b' : '#9a9a9a'} />
            {(w.openings ?? []).map((o) => (
              <polygon key={o.id} points={points(wallOutline({ ...w, thickness: w.thickness + 0.02 }, o.offset, o.offset + o.width))} fill={o.kind === 'window' ? '#dbeafe' : '#ffffff'} />
            ))}
          </g>
        ))}
      {plan.rooms
        .filter((r) => r.kind !== 'ledge')
        .map((r) => {
          const [x, y] = roomAnchor(r)
          return (
            <text key={r.id} x={x} y={y} fontSize={0.2} fontWeight={600} textAnchor="middle" fill="#9ca3af">
              {r.name} · {polygonArea(r.polygon).toFixed(1)} m²
            </text>
          )
        })}
      <FixtureSymbols fixtures={fixtures} selectedId={null} px={px} print />
      {fixtures.map((f) => {
        const def = fixtureDef(f.type)
        if (!def || def.mount === 'floor') return null
        const t = (f.rotation * Math.PI) / 180
        // Label a little into the room, away from the wall.
        const out = def.mount === 'wall' ? 0.26 : 0.21
        const lx = f.x - Math.sin(t) * out
        const ly = f.y + Math.cos(t) * out + (def.mount === 'wall' ? 0 : 0.02)
        const so = settingOut(f, plan)
        return (
          <text key={f.id} x={lx} y={ly} fontSize={0.1} textAnchor="middle" fill="#374151">
            {def.mount === 'wall' ? `h${Math.round(f.height * 1000)}` : ''}
            {so ? `${def.mount === 'wall' ? ' · ' : ''}${so.replace(' from corner', '').replace(' from walls', '')}` : ''}
          </text>
        )
      })}
    </svg>
  )
}

function Legend({ fixtures }: { fixtures: Fixture[] }) {
  const used = FIXTURES.filter((d) => fixtures.some((f) => f.type === d.id))
  if (!used.length) return null
  return (
    <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-xs sm:grid-cols-3">
      {FIXTURE_GROUPS.flatMap((g) =>
        used
          .filter((d) => d.group === g)
          .map((d) => (
            <div key={d.id} className="flex items-center gap-1.5">
              <span className="inline-block w-8 rounded text-center text-[10px] font-bold text-white" style={{ background: GROUP_COLOR[g] }}>
                {d.code}
              </span>
              {d.name} × {fixtures.filter((f) => f.type === d.id).length}
            </div>
          )),
      )}
      <div className="col-span-full mt-1 text-muted">Labels: h = centre height (mm); then distance from the nearer corner, or from the nearest walls for ceiling points. Dashed arcs link switches to their lights.</div>
    </div>
  )
}
