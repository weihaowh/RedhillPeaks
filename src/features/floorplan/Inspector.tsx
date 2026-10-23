import { useEffect, useState } from 'react'
import { AppWindow, DoorOpen, RefreshCcw, Trash2 } from 'lucide-react'
import clsx from 'clsx'
import type { FloorPlan, Opening, OpeningKind, Room, RoomKind, Wall } from '../../types/plan'
import { usePlanStore } from '../../store/usePlanStore'
import { useAppStore } from '../../store/useAppStore'
import { wallLength } from '../../lib/planMath'
import { deleteOpening, deleteRoom, deleteWall, movePoint, updateOpening, updateRoom, updateWall } from '../../lib/planEdits'
import { UploadPlanButton } from './UploadPlan'

// Property editors for the plan editor. Every committed change goes through the undo history.

const ROOM_KINDS: [RoomKind, string][] = [
  ['living', 'Living / Dining'],
  ['bedroom', 'Bedroom / Study'],
  ['kitchen', 'Kitchen'],
  ['bath', 'Bathroom'],
  ['service', 'Service yard'],
  ['shelter', 'Household shelter'],
  ['ledge', 'Ledge / outdoor'],
]

export function WallInspector({ wall, plan }: { wall: Wall; plan: FloorPlan }) {
  const edit = usePlanStore((s) => s.edit)
  const selectOpening = useAppStore((s) => s.selectOpening)
  const clearSelection = useAppStore((s) => s.clearSelection)
  const len = wallLength(wall)
  const patch = (p: Partial<Wall>) => edit((pl) => updateWall(pl, wall.id, p))

  const setLength = (m: number) => {
    if (m < 0.05) return
    const ux = (wall.end[0] - wall.start[0]) / len
    const uy = (wall.end[1] - wall.start[1]) / len
    edit((pl) => movePoint(pl, wall.end, [wall.start[0] + ux * m, wall.start[1] + uy * m]))
  }

  return (
    <Panel
      title={wall.structural ? 'Structural wall' : 'Wall'}
      subtitle={wall.exterior ? 'External wall' : 'Internal wall'}
      onDelete={() => {
        edit((pl) => deleteWall(pl, wall.id))
        clearSelection()
      }}
    >
      <Field label="Length">
        <MmInput value={len} onCommit={setLength} />
      </Field>
      <Field label="Thickness">
        <div className="flex gap-1">
          {[0.1, 0.15, 0.2, 0.3].map((t) => (
            <button key={t} type="button" onClick={() => patch({ thickness: t })} className={clsx('chip flex-1 justify-center tabular-nums', Math.abs(wall.thickness - t) < 1e-3 && 'chip-on')}>
              {t * 1000}
            </button>
          ))}
        </div>
        <MmInput value={wall.thickness} min={0.05} onCommit={(thickness) => patch({ thickness })} />
      </Field>
      <Field label="Height">
        <MmInput value={wall.height ?? plan.ceilingHeight} min={0.3} onCommit={(height) => patch({ height: Math.abs(height - plan.ceilingHeight) < 1e-3 ? undefined : height })} />
      </Field>
      <Switch
        checked={!!wall.structural}
        onChange={(structural) => patch({ structural })}
        label="Structural"
        hint="Shaded black on the HDB plan. These walls must not be hacked, removed or tampered with."
      />
      <Switch checked={!!wall.exterior} onChange={(exterior) => patch({ exterior })} label="External wall" />
      {!!wall.openings?.length && (
        <Field label="Openings">
          <ul className="space-y-1">
            {wall.openings.map((o) => (
              <li key={o.id}>
                <button
                  type="button"
                  onClick={() => selectOpening({ wallId: wall.id, openingId: o.id })}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs hover:bg-ink/5"
                >
                  {o.kind === 'window' ? <AppWindow size={13} className="text-sky-500" /> : <DoorOpen size={13} className="text-accent" />}
                  <span className="flex-1 capitalize">{o.kind}</span>
                  <span className="tabular-nums text-muted">{Math.round(o.width * 1000)} mm</span>
                </button>
              </li>
            ))}
          </ul>
        </Field>
      )}
    </Panel>
  )
}

export function OpeningInspector({ wall, opening }: { wall: Wall; opening: Opening }) {
  const edit = usePlanStore((s) => s.edit)
  const selectWall = useAppStore((s) => s.selectWall)
  const clearSelection = useAppStore((s) => s.clearSelection)
  const patch = (p: Partial<Opening>) => edit((pl) => updateOpening(pl, wall.id, opening.id, p))

  const setKind = (kind: OpeningKind) => {
    if (kind === 'window') patch({ kind, sill: opening.sill || 0.9, height: Math.min(opening.height, 1.35) })
    else patch({ kind, sill: 0, height: Math.max(opening.height, 2.1) })
  }

  return (
    <Panel
      title={opening.kind === 'window' ? 'Window' : opening.kind === 'door' ? 'Door' : 'Opening'}
      subtitle={
        <button type="button" className="hover:text-ink hover:underline" onClick={() => selectWall(wall.id)}>
          In a {Math.round(wallLength(wall) * 1000)} mm wall
        </button>
      }
      onDelete={() => {
        edit((pl) => deleteOpening(pl, wall.id, opening.id))
        clearSelection()
      }}
    >
      <div className="flex gap-1 rounded-xl bg-ink/5 p-1">
        {(['door', 'window', 'opening'] as OpeningKind[]).map((k) => (
          <button key={k} type="button" onClick={() => setKind(k)} className={clsx('chip flex-1 justify-center capitalize', opening.kind === k && 'chip-on')}>
            {k}
          </button>
        ))}
      </div>
      <Field label="Width">
        <MmInput value={opening.width} min={0.2} onCommit={(width) => patch({ width })} />
      </Field>
      <Field label="From wall start">
        <MmInput value={opening.offset} min={0} onCommit={(offset) => patch({ offset })} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Sill">
          <MmInput value={opening.sill} min={0} onCommit={(sill) => patch({ sill })} />
        </Field>
        <Field label="Height">
          <MmInput value={opening.height} min={0.2} onCommit={(height) => patch({ height })} />
        </Field>
      </div>
      <p className="text-xs text-muted">Tip: with the Select tool, drag the highlighted opening along its wall.</p>
    </Panel>
  )
}

export function RoomEditFields({ room }: { room: Room }) {
  const edit = usePlanStore((s) => s.edit)
  const clearSelection = useAppStore((s) => s.clearSelection)
  const [name, setName] = useState(room.name)
  useEffect(() => setName(room.name), [room.name])

  const commitName = () => {
    const trimmed = name.trim()
    if (trimmed && trimmed !== room.name) edit((pl) => updateRoom(pl, room.id, { name: trimmed }))
    else setName(room.name)
  }

  return (
    <section className="space-y-3">
      <Field label="Name">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={commitName}
          onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
          className="h-9 w-full rounded-xl border border-line bg-canvas/60 px-3 text-sm outline-none focus:ring-2 focus:ring-accent/40"
        />
      </Field>
      <Field label="Type">
        <select
          value={room.kind}
          onChange={(e) => edit((pl) => updateRoom(pl, room.id, { kind: e.target.value as RoomKind }))}
          className="h-9 w-full rounded-xl border border-line bg-canvas/60 px-2 text-sm outline-none focus:ring-2 focus:ring-accent/40"
        >
          {ROOM_KINDS.map(([k, label]) => (
            <option key={k} value={k}>
              {label}
            </option>
          ))}
        </select>
      </Field>
      <button
        type="button"
        onClick={() => {
          edit((pl) => deleteRoom(pl, room.id))
          clearSelection()
        }}
        className="flex items-center gap-1.5 text-xs font-medium text-red-500 hover:text-red-600"
      >
        <Trash2 size={13} /> Delete room
      </button>
    </section>
  )
}

export function DrawingPanel() {
  const opacity = useAppStore((s) => s.underlayOpacity)
  const setOpacity = useAppStore((s) => s.setUnderlayOpacity)
  const resetToTraced = usePlanStore((s) => s.resetToTraced)
  const hasUnderlay = usePlanStore((s) => !!s.plan.underlay)
  const clearSelection = useAppStore((s) => s.clearSelection)

  return (
    <section className="space-y-3">
      <div className="text-xs font-semibold uppercase tracking-wider text-muted">Floor plan drawing</div>
      {hasUnderlay && (
        <label className="flex items-center gap-3 text-xs text-muted">
          Opacity
          <input type="range" min={0} max={1} step={0.05} value={opacity} onChange={(e) => setOpacity(Number(e.target.value))} className="flex-1 accent-[rgb(var(--accent))]" />
        </label>
      )}
      <UploadPlanButton />
      <button
        type="button"
        onClick={() => {
          resetToTraced()
          clearSelection()
        }}
        className="flex w-full items-center justify-center gap-2 rounded-xl py-1.5 text-xs text-muted hover:bg-ink/5 hover:text-ink"
      >
        <RefreshCcw size={13} /> Restore the original Redhill Peaks trace
      </button>
    </section>
  )
}

function Panel({ title, subtitle, onDelete, children }: { title: string; subtitle: React.ReactNode; onDelete: () => void; children: React.ReactNode }) {
  return (
    <>
      <div className="flex items-start gap-2 border-b border-line/80 p-4">
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold">{title}</div>
          <div className="text-xs text-muted">{subtitle}</div>
        </div>
        <button type="button" className="icon-btn -mr-1 -mt-1 h-8 w-8 hover:text-red-500" title="Delete (Del)" onClick={onDelete}>
          <Trash2 size={15} />
        </button>
      </div>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">{children}</div>
    </>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="text-xs font-medium text-muted">{label}</div>
      {children}
    </div>
  )
}

/** Number input in millimetres that commits on blur or Enter. */
function MmInput({ value, onCommit, min = 0 }: { value: number; onCommit: (metres: number) => void; min?: number }) {
  const shown = String(Math.round(value * 1000))
  const [text, setText] = useState(shown)
  useEffect(() => setText(shown), [shown])

  const commit = () => {
    const v = Number(text) / 1000
    if (Number.isFinite(v) && v >= min && text !== shown) onCommit(v)
    else setText(shown)
  }

  return (
    <label className="flex items-center rounded-xl border border-line bg-canvas/60 px-3 focus-within:ring-2 focus-within:ring-accent/40">
      <input
        inputMode="numeric"
        value={text}
        onChange={(e) => setText(e.target.value.replace(/[^\d.]/g, ''))}
        onBlur={commit}
        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        className="h-9 min-w-0 flex-1 bg-transparent text-sm tabular-nums outline-none"
      />
      <span className="text-xs text-muted">mm</span>
    </label>
  )
}

function Switch({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className="flex w-full items-start gap-3 text-left">
      <span className={clsx('mt-0.5 flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition', checked ? 'bg-accent' : 'bg-ink/15')}>
        <span className={clsx('h-4 w-4 rounded-full bg-white shadow transition', checked && 'translate-x-4')} />
      </span>
      <span>
        <span className="block text-sm">{label}</span>
        {hint && <span className="block text-xs leading-relaxed text-muted">{hint}</span>}
      </span>
    </button>
  )
}
