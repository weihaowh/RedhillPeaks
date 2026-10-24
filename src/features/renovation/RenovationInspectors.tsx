import { AlertTriangle, AppWindow, Axe, DoorOpen, Info, RotateCcw } from 'lucide-react'
import clsx from 'clsx'
import type { FloorPlan, Wall } from '../../types/plan'
import type { Hack } from '../../types/design'
import { useAppStore } from '../../store/useAppStore'
import { useDesignStore } from '../../store/useDesignStore'
import { faceRoom, wallLength } from '../../lib/planMath'
import { movePoint, updateWall } from '../../lib/planEdits'
import { BUILT_KINDS, builtArea, builtKind, fixturesOnHacks, hackBlocker, hackedArea, renovationOf } from '../../lib/renovation'
import { BUILD_RATE, HACK_MAKE_GOOD, HACK_RATE } from '../../data/pricing'
import { sgd } from '../../lib/estimate'
import { Field, MmInput, Panel } from '../floorplan/Inspector'
import { addHack, editWalls, removeBuiltWall, removeHack, removeHacksOn } from './renoActions'

// Side-panel editors for renovation: a new wall, a hacked stretch, and the hack controls shown
// on an existing wall.

const mm = (m: number) => `${Math.round(m * 1000).toLocaleString()} mm`

export function BuiltWallInspector({ wall, plan }: { wall: Wall; plan: FloorPlan }) {
  const clearSelection = useAppStore((s) => s.clearSelection)
  const selectOpening = useAppStore((s) => s.selectOpening)
  const kind = builtKind(wall.built)
  const len = wallLength(wall)
  const area = builtArea(plan, wall)
  const patch = (p: Partial<Wall>) => editWalls(true, (pl) => updateWall(pl, wall.id, p))

  const setLength = (m: number) => {
    if (m < 0.1) return
    const ux = (wall.end[0] - wall.start[0]) / len
    const uy = (wall.end[1] - wall.start[1]) / len
    editWalls(true, (pl) => movePoint(pl, wall.end, [wall.start[0] + ux * m, wall.start[1] + uy * m]))
  }

  return (
    <Panel
      title={`New ${kind.label.toLowerCase()}`}
      subtitle={`Renovation · ${area.toFixed(1)} m² · about ${sgd(area * BUILD_RATE[kind.id])}`}
      onDelete={() => {
        removeBuiltWall(wall.id)
        clearSelection()
      }}
    >
      <Field label="Built from">
        <div className="grid grid-cols-3 gap-1">
          {BUILT_KINDS.map((k) => (
            <button key={k.id} type="button" title={k.hint} onClick={() => patch({ built: k.id, thickness: k.thickness })} className={clsx('chip justify-center', kind.id === k.id && 'chip-on')}>
              {k.label.split(' ')[0]}
            </button>
          ))}
        </div>
        <p className="text-xs leading-relaxed text-muted">{kind.hint}</p>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Length">
          <MmInput value={len} min={0.1} onCommit={setLength} />
        </Field>
        <Field label="Height">
          <MmInput value={wall.height ?? plan.ceilingHeight} min={0.3} onCommit={(height) => patch({ height: Math.abs(height - plan.ceilingHeight) < 1e-3 ? undefined : height })} />
        </Field>
      </div>
      {!!wall.openings?.length && (
        <Field label="Openings">
          <ul className="space-y-1">
            {wall.openings.map((o) => (
              <li key={o.id}>
                <button type="button" onClick={() => selectOpening({ wallId: wall.id, openingId: o.id })} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs hover:bg-ink/5">
                  {o.kind === 'window' ? <AppWindow size={13} className="text-sky-500" /> : <DoorOpen size={13} className="text-accent" />}
                  <span className="flex-1 capitalize">{o.kind}</span>
                  <span className="tabular-nums text-muted">{mm(o.width)}</span>
                </button>
              </li>
            ))}
          </ul>
        </Field>
      )}
      <Note>
        Add a door with the Door tool (D) on this wall. Drag its end handles in 2D to move it. A new wall needs an HDB renovation permit, applied for by your contractor.
        {kind.id === 'drywall' && ' Board partitions shouldn’t be used to enclose wet areas.'}
      </Note>
    </Panel>
  )
}

export function HackInspector({ hack, wall, plan }: { hack: Hack; wall: Wall; plan: FloorPlan }) {
  const clearSelection = useAppStore((s) => s.clearSelection)
  const design = useDesignStore((s) => s.design)
  const len = wallLength(wall)
  const from = Math.min(hack.from, hack.to)
  const to = Math.max(hack.from, hack.to)
  const area = hackedArea(plan, hack)
  const nextToBath = ([1, -1] as const).some((s) => faceRoom(plan, wall, s)?.kind === 'bath')
  const onIt = fixturesOnHacks(plan, design).length
  const whole = from <= 0.001 && to >= len - 0.001
  const set = (a: number, b: number) =>
    useDesignStore.getState().edit((d) => {
      const r = renovationOf(d)
      const span = { from: Math.max(0, Math.min(a, len)), to: Math.max(0, Math.min(b, len)) }
      return { ...d, renovation: { ...r, hacks: r.hacks.map((h) => (h.id === hack.id ? { ...h, ...span } : h)) } }
    })

  return (
    <Panel
      title={whole ? 'Hack whole wall' : 'Hack part of a wall'}
      subtitle={`${mm(to - from)} of a ${mm(len)} wall · ${area.toFixed(1)} m² · about ${sgd(area * HACK_RATE + HACK_MAKE_GOOD)}`}
      onDelete={() => {
        removeHack(hack.id)
        clearSelection()
      }}
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label="From wall start">
          <MmInput value={from} onCommit={(m) => set(m, m + (to - from))} />
        </Field>
        <Field label="Width">
          <MmInput value={to - from} min={0.1} onCommit={(m) => set(from, from + m)} />
        </Field>
      </div>
      <div className="flex gap-2">
        {!whole && (
          <button type="button" className="chip flex-1 justify-center ring-1 ring-line" onClick={() => set(0, len)}>
            <Axe size={13} /> Whole wall
          </button>
        )}
        <button
          type="button"
          className="chip flex-1 justify-center ring-1 ring-line"
          onClick={() => {
            removeHack(hack.id)
            clearSelection()
          }}
        >
          <RotateCcw size={13} /> Keep this wall
        </button>
      </div>
      {nextToBath && (
        <Warn>
          This wall borders a bathroom. HDB doesn’t allow hacking or relocating bathroom walls in a new flat within 3 years of key collection, as it would break the waterproofing.
        </Warn>
      )}
      {onIt > 0 && <Warn>{onIt} electrical point{onIt > 1 ? 's are' : ' is'} on a wall being hacked. Move or remove {onIt > 1 ? 'them' : 'it'} in the Electrical tab.</Warn>}
      <Note>Hacking a non-structural wall needs an HDB renovation permit, applied for by an HDB-registered contractor. Cost includes debris disposal and making good the floor, ceiling and wall ends.</Note>
    </Panel>
  )
}

/** Hack controls on an existing wall's inspector. */
export function WallRenovation({ wall, plan }: { wall: Wall; plan: FloorPlan }) {
  const hacks = renovationOf(useDesignStore((s) => s.design)).hacks.filter((h) => h.wallId === wall.id)
  const selectOpening = useAppStore((s) => s.selectOpening)
  const blocked = hackBlocker(plan, wall)
  return (
    <section className="space-y-2 rounded-xl bg-ink/5 p-3">
      <div className="text-xs font-semibold text-muted">Renovation</div>
      {blocked ? (
        <p className="text-xs leading-relaxed text-muted">{blocked}</p>
      ) : hacks.length ? (
        <>
          <p className="text-xs leading-relaxed text-muted">{hacks.length === 1 ? 'Part of this wall is' : `${hacks.length} stretches of this wall are`} marked to be hacked.</p>
          <div className="flex gap-2">
            <button type="button" className="chip flex-1 justify-center ring-1 ring-line" onClick={() => selectOpening({ wallId: wall.id, openingId: `hack:${hacks[0].id}` })}>
              Edit hack
            </button>
            <button type="button" className="chip flex-1 justify-center ring-1 ring-line" onClick={() => removeHacksOn(wall.id)}>
              <RotateCcw size={13} /> Keep wall
            </button>
          </div>
        </>
      ) : (
        <button
          type="button"
          className="chip w-full justify-center ring-1 ring-line"
          onClick={() => {
            const h = addHack(wall.id, 0, Math.round(wallLength(wall) * 1000) / 1000)
            selectOpening({ wallId: wall.id, openingId: `hack:${h.id}` })
          }}
        >
          <Axe size={13} /> Hack this wall
        </button>
      )}
    </section>
  )
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2 rounded-xl bg-ink/5 p-3 text-xs leading-relaxed text-muted">
      <Info size={14} className="mt-0.5 shrink-0" />
      <p>{children}</p>
    </div>
  )
}

function Warn({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2 rounded-xl bg-amber-500/10 p-3 text-xs leading-relaxed text-amber-700 dark:text-amber-400">
      <AlertTriangle size={14} className="mt-0.5 shrink-0" />
      <p>{children}</p>
    </div>
  )
}
