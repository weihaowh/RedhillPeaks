import { useEffect, useState } from 'react'
import { Lightbulb, Trash2, X } from 'lucide-react'
import type { FloorPlan } from '../../types/plan'
import type { Fixture } from '../../types/design'
import { useAppStore } from '../../store/useAppStore'
import { useDesignStore } from '../../store/useDesignStore'
import { fixtureRoom, settingOut } from '../../lib/electrical'
import { GROUP_COLOR, fixtureDef, isLight, isSwitch } from './fixtures'

const edit = (fn: (fx: Fixture[]) => Fixture[]) => useDesignStore.getState().edit((d) => ({ ...d, fixtures: fn(d.fixtures) }))

export function FixtureInspector({ fixture: f, plan }: { fixture: Fixture; plan: FloorPlan }) {
  const fixtures = useDesignStore((s) => s.design.fixtures)
  const def = fixtureDef(f.type)
  const room = fixtureRoom(f, plan)
  if (!def) return null
  const patch = (p: Partial<Fixture>) => edit((fx) => fx.map((x) => (x.id === f.id ? { ...x, ...p, suggested: false } : x)))
  const remove = () => {
    edit((fx) => fx.filter((x) => x.id !== f.id).map((x) => (x.switchId === f.id ? { ...x, switchId: undefined } : x)))
    useAppStore.getState().selectFixture(null)
  }

  // Switches in the same room first; wet-room switches often sit just outside, so list all.
  const sameRoom = (x: Fixture) => fixtureRoom(x, plan)?.id === room?.id
  const switches = fixtures.filter((x) => isSwitch(x.type)).sort((a, b) => Number(sameRoom(b)) - Number(sameRoom(a)))
  const lightsHere = fixtures.filter((x) => isLight(x.type) && (sameRoom(x) || x.switchId === f.id))

  return (
    <>
      <div className="flex items-start gap-2.5 border-b border-line/80 p-4">
        <span className="mt-0.5 flex h-6 w-8 shrink-0 items-center justify-center rounded-md text-[10px] font-bold text-white" style={{ background: GROUP_COLOR[def.group] }}>
          {def.code}
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold">{def.name}</div>
          <div className="text-xs text-muted">
            {room?.name ?? 'Outside rooms'}
            {f.suggested ? ' · suggested' : ''}
          </div>
        </div>
        <button type="button" className="icon-btn -mr-1 -mt-1 h-8 w-8" title="Close" onClick={() => useAppStore.getState().selectFixture(null)}>
          <X size={16} />
        </button>
      </div>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        {def.mount === 'wall' && (
          <Field label="Height above floor (centre)">
            <MmInput value={f.height} onCommit={(height) => patch({ height: Math.min(Math.max(height, 0.1), plan.ceilingHeight - 0.05) })} />
          </Field>
        )}
        <Field label="Setting out">
          <p className="text-sm tabular-nums">{settingOut(f, plan) || '—'}</p>
          <p className="text-[11px] text-muted">Drag the symbol in 2D Plan to move it{def.mount === 'wall' ? ' along the walls' : ''}.</p>
        </Field>

        {isLight(f.type) && (
          <Field label="Controlled by">
            <select
              value={f.switchId ?? ''}
              onChange={(e) => patch({ switchId: e.target.value || undefined })}
              className="h-9 w-full rounded-xl border border-line bg-canvas/60 px-2 text-sm outline-none focus:ring-2 focus:ring-accent/40"
            >
              <option value="">No switch yet</option>
              {switches.map((s) => (
                <option key={s.id} value={s.id}>
                  {fixtureDef(s.type)?.name} · {fixtureRoom(s, plan)?.name ?? 'outside'}
                </option>
              ))}
            </select>
          </Field>
        )}

        {isSwitch(f.type) && (
          <Field label="Lights on this switch">
            {lightsHere.length ? (
              <ul className="space-y-1">
                {lightsHere.map((l) => (
                  <li key={l.id}>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={l.switchId === f.id}
                        onChange={(e) => edit((fx) => fx.map((x) => (x.id === l.id ? { ...x, switchId: e.target.checked ? f.id : undefined } : x)))}
                        className="accent-[rgb(var(--accent))]"
                      />
                      <Lightbulb size={13} className="text-muted" /> {fixtureDef(l.type)?.name}
                      <span className="text-xs text-muted">{fixtureRoom(l, plan)?.name}</span>
                    </label>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted">No lights in this room yet.</p>
            )}
          </Field>
        )}

        <Field label="Note for the electrician">
          <NoteInput value={f.note ?? ''} onCommit={(note) => patch({ note: note || undefined })} />
        </Field>

        {def.hint && <p className="rounded-xl bg-accent/10 p-3 text-xs leading-relaxed">{def.hint}</p>}

        <button type="button" onClick={remove} className="flex items-center gap-1.5 text-xs font-medium text-red-500 hover:text-red-600">
          <Trash2 size={13} /> Delete point
        </button>
      </div>
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

function MmInput({ value, onCommit }: { value: number; onCommit: (m: number) => void }) {
  const shown = String(Math.round(value * 1000))
  const [text, setText] = useState(shown)
  useEffect(() => setText(shown), [shown])
  const commit = () => {
    const v = Number(text) / 1000
    if (Number.isFinite(v) && v > 0 && text !== shown) onCommit(v)
    else setText(shown)
  }
  return (
    <label className="flex items-center rounded-xl border border-line bg-canvas/60 px-3 focus-within:ring-2 focus-within:ring-accent/40">
      <input
        inputMode="numeric"
        value={text}
        onChange={(e) => setText(e.target.value.replace(/[^\d]/g, ''))}
        onBlur={commit}
        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        className="h-9 min-w-0 flex-1 bg-transparent text-sm tabular-nums outline-none"
      />
      <span className="text-xs text-muted">mm</span>
    </label>
  )
}

function NoteInput({ value, onCommit }: { value: string; onCommit: (v: string) => void }) {
  const [text, setText] = useState(value)
  useEffect(() => setText(value), [value])
  return (
    <textarea
      value={text}
      rows={2}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => text !== value && onCommit(text.trim())}
      placeholder="e.g. Smart switch, or behind the TV"
      className="w-full rounded-xl border border-line bg-canvas/60 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent/40"
    />
  )
}
