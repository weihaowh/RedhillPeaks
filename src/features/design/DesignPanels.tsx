import { useState } from 'react'
import { MousePointerClick, RotateCcw, X } from 'lucide-react'
import clsx from 'clsx'
import type { FloorPlan, Room } from '../../types/plan'
import { faceKey, type CeilingStyle, type Design, type FloorSpec } from '../../types/design'
import { useDesignStore } from '../../store/useDesignStore'
import { useAppStore } from '../../store/useAppStore'
import { faceRoom, wallLength } from '../../lib/planMath'
import { FLOOR_FINISHES, finishById, floorSpecFor, type FloorFinish } from '../scene/finishes'
import { FEATURE_FINISHES, PAINT_PALETTES, featureById } from '../scene/wallFinishes'
import { kelvinToColor } from '../scene/Ceilings'

type Tab = 'floor' | 'walls' | 'ceiling'

const edit = (fn: (d: Design) => Design) => useDesignStore.getState().edit(fn)

export function RoomDesign({ room, plan }: { room: Room; plan: FloorPlan }) {
  const [tab, setTab] = useState<Tab>('floor')
  const tabs: [Tab, string][] = room.kind === 'ledge' ? [['walls', 'Walls']] : [['floor', 'Floor'], ['walls', 'Walls'], ['ceiling', 'Ceiling']]
  const active = tabs.some(([t]) => t === tab) ? tab : tabs[0][0]

  return (
    <section className="space-y-4">
      <div className="flex gap-1 rounded-xl bg-ink/5 p-1">
        {tabs.map(([t, label]) => (
          <button key={t} type="button" onClick={() => setTab(t)} className={clsx('chip flex-1 justify-center', active === t && 'chip-on')}>
            {label}
          </button>
        ))}
      </div>
      {active === 'floor' && <FloorTab room={room} plan={plan} />}
      {active === 'walls' && <WallsTab room={room} plan={plan} />}
      {active === 'ceiling' && <CeilingTab room={room} />}
    </section>
  )
}

function FloorTab({ room, plan }: { room: Room; plan: FloorPlan }) {
  const stored = useDesignStore((s) => s.design.floors[room.id])
  const spec = floorSpecFor(stored, room.kind)
  const finish = finishById(spec.finish)
  const set = (next: FloorSpec) => edit((d) => ({ ...d, floors: { ...d.floors, [room.id]: next } }))
  const groups = [...new Set(FLOOR_FINISHES.map((f) => f.group))]
  const orientable = !!finish.sizes || finish.id === 'herringbone'

  const applyToDryRooms = () =>
    edit((d) => {
      const floors = { ...d.floors }
      for (const r of plan.rooms) if (r.kind === 'living' || r.kind === 'bedroom') floors[r.id] = { ...spec }
      return { ...d, floors }
    })

  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <div key={group}>
          <Label>{group}</Label>
          <div className="grid grid-cols-3 gap-2">
            {FLOOR_FINISHES.filter((f) => f.group === group).map((f) => (
              <Swatch key={f.id} label={f.label} color={f.swatch} active={f.id === spec.finish} onClick={() => set({ finish: f.id, rotation: spec.rotation })} />
            ))}
          </div>
        </div>
      ))}
      {finish.sizes && (
        <div>
          <Label>{finish.group === 'Wood' ? 'Plank width' : 'Tile size (cm)'}</Label>
          <Chips options={finish.sizes.map((s) => [s.value, s.label])} value={spec.size} onChange={(size) => set({ ...spec, size })} />
        </div>
      )}
      {orientable && (
        <div>
          <Label>Direction</Label>
          <Chips
            options={[
              [0, 'Left–right'],
              [90, 'Front–back'],
            ]}
            value={spec.rotation}
            onChange={(rotation) => set({ ...spec, rotation: rotation as 0 | 90 })}
          />
        </div>
      )}
      {(room.kind === 'living' || room.kind === 'bedroom') && (
        <button type="button" onClick={applyToDryRooms} className="w-full rounded-xl border border-line py-2 text-xs font-medium hover:bg-ink/5">
          Use this floor in living and all bedrooms
        </button>
      )}
      <FloorHint finish={finish} />
    </div>
  )
}

function FloorHint({ finish }: { finish: FloorFinish }) {
  const tips: Partial<Record<FloorFinish['group'], string>> = {
    Wood: 'Planks running toward the main window make a room feel longer. Vinyl looks like timber but copes far better with spills.',
    Tile: 'Large tiles mean fewer grout lines, so small rooms read calmer. Pick matte or textured tiles for wet areas.',
    Stone: 'Polished stone looks are beautiful but slippery when wet, so keep them out of bathrooms.',
    Soft: 'Carpet in Singapore humidity needs regular vacuuming. It suits bedrooms more than living areas.',
  }
  const tip = tips[finish.group]
  return tip ? <p className="text-xs leading-relaxed text-muted">{tip}</p> : null
}

function WallsTab({ room, plan }: { room: Room; plan: FloorPlan }) {
  const roomPaint = useDesignStore((s) => s.design.roomPaint[room.id])
  const wallPaint = useDesignStore((s) => s.design.wallPaint)
  const features = useDesignStore((s) => s.design.features)
  const featurePick = useAppStore((s) => s.featurePick)
  const mode = useAppStore((s) => s.mode)

  const setPaint = (hex: string | null) =>
    edit((d) => {
      const next = { ...d.roomPaint }
      if (hex) next[room.id] = hex
      else delete next[room.id]
      return { ...d, roomPaint: next }
    })

  const faces = plan.walls.flatMap((w) =>
    ([1, -1] as const).filter((side) => features[faceKey(w.id, side)] && faceRoom(plan, w, side)?.id === room.id).map((side) => ({ wall: w, side, key: faceKey(w.id, side) })),
  )

  const startPick = (feature: string) => {
    const finish = featureById(feature)!
    if (mode === 'plan') useAppStore.getState().setMode('orbit')
    useAppStore.getState().setFeaturePick({ feature, color: finish.tintable ? finish.color : undefined })
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="mb-2 flex items-center justify-between">
          <Label className="mb-0">Paint</Label>
          {roomPaint && (
            <button type="button" onClick={() => setPaint(null)} className="text-[11px] text-muted hover:text-ink">
              Use flat default
            </button>
          )}
        </div>
        <PaintPicker value={roomPaint ?? wallPaint} onChange={setPaint} />
      </div>

      <div>
        <Label>Feature walls</Label>
        {faces.length > 0 && (
          <ul className="mb-3 space-y-1">
            {faces.map(({ wall, key }) => {
              const spec = features[key]
              const finish = featureById(spec.feature)
              return (
                <li key={key} className="flex items-center gap-2 rounded-xl bg-ink/5 px-2.5 py-2 text-xs">
                  <span className="h-4 w-4 shrink-0 rounded ring-1 ring-inset ring-black/10" style={{ background: spec.color ?? finish?.swatch }} />
                  <span className="flex-1 truncate">
                    {finish?.label ?? spec.feature} <span className="text-muted">· {(wallLength(wall) * 1000).toFixed(0)} mm wall</span>
                  </span>
                  {finish?.tintable && (
                    <input
                      type="color"
                      value={spec.color ?? finish.color}
                      onChange={(e) => edit((d) => ({ ...d, features: { ...d.features, [key]: { ...spec, color: e.target.value } } }))}
                      className="h-6 w-6 cursor-pointer rounded border-0 bg-transparent p-0"
                      title="Tint"
                    />
                  )}
                  <button
                    type="button"
                    title="Remove"
                    className="text-muted hover:text-red-500"
                    onClick={() =>
                      edit((d) => {
                        const next = { ...d.features }
                        delete next[key]
                        return { ...d, features: next }
                      })
                    }
                  >
                    <X size={14} />
                  </button>
                </li>
              )
            })}
          </ul>
        )}
        {featurePick ? (
          <div className="flex items-center gap-2 rounded-xl bg-accent/10 p-3 text-xs">
            <MousePointerClick size={16} className="shrink-0 text-accent" />
            <span className="flex-1">Click a wall in the 3D view to apply {featureById(featurePick.feature)?.label.toLowerCase()}.</span>
            <button type="button" className="font-medium text-muted hover:text-ink" onClick={() => useAppStore.getState().setFeaturePick(null)}>
              Cancel
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {FEATURE_FINISHES.map((f) => (
              <Swatch key={f.id} label={f.label} color={f.swatch} active={false} onClick={() => startPick(f.id)} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

const CEILINGS: { id: CeilingStyle; label: string; hint: string }[] = [
  { id: 'flat', label: 'Flat', hint: 'Plain slab ceiling. Simple, gives the most height.' },
  { id: 'lbox', label: 'L-box', hint: 'A 350 mm drop around the edges that hides aircon piping and trunking.' },
  { id: 'cove', label: 'Cove light', hint: 'A false-ceiling band with a hidden LED strip that washes the ceiling with soft light.' },
]
const WARMTHS: [number, string][] = [
  [2700, '2700K'],
  [3000, '3000K'],
  [4000, '4000K'],
  [5000, '5000K'],
]

function CeilingTab({ room }: { room: Room }) {
  const spec = useDesignStore((s) => s.design.ceilings[room.id]) ?? { style: 'flat' as const }
  const set = (patch: Partial<typeof spec>) => edit((d) => ({ ...d, ceilings: { ...d.ceilings, [room.id]: { ...spec, ...patch } } }))

  return (
    <div className="space-y-3">
      {CEILINGS.map((c) => (
        <button
          key={c.id}
          type="button"
          onClick={() => set({ style: c.id })}
          className={clsx('w-full rounded-xl px-3 py-2.5 text-left transition', spec.style === c.id ? 'bg-accent/10 ring-2 ring-accent' : 'ring-1 ring-line hover:bg-ink/5')}
        >
          <div className="text-sm font-medium">{c.label}</div>
          <div className="text-xs leading-relaxed text-muted">{c.hint}</div>
        </button>
      ))}
      {spec.style === 'cove' && (
        <div>
          <Label>Light colour</Label>
          <div className="flex gap-1">
            {WARMTHS.map(([k, label]) => (
              <button key={k} type="button" onClick={() => set({ warmth: k })} className={clsx('chip flex-1 justify-center', (spec.warmth ?? 3000) === k && 'chip-on')}>
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: kelvinToColor(k).getStyle() }} />
                {label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted">Warm white (2700–3000K) is cosy for living rooms and bedrooms. Neutral (4000K) suits kitchens and study areas.</p>
        </div>
      )}
      <p className="text-xs text-muted">Ceiling details show with Full walls and are hidden in Cutaway.</p>
    </div>
  )
}

export function FlatDesign() {
  const wallPaint = useDesignStore((s) => s.design.wallPaint)
  const reset = useDesignStore((s) => s.reset)
  return (
    <section className="space-y-4">
      <div>
        <Label>Wall paint, whole flat</Label>
        <PaintPicker value={wallPaint} onChange={(hex) => edit((d) => ({ ...d, wallPaint: hex }))} />
      </div>
      <p className="text-xs text-muted">Click a room to give it its own paint, floor, feature wall or ceiling.</p>
      <button type="button" onClick={reset} className="flex items-center gap-1.5 text-xs text-muted hover:text-ink">
        <RotateCcw size={13} /> Reset all finishes
      </button>
    </section>
  )
}

function PaintPicker({ value, onChange }: { value: string; onChange: (hex: string) => void }) {
  return (
    <div className="space-y-2.5">
      {PAINT_PALETTES.map((palette) => (
        <div key={palette.name}>
          <div className="mb-1 text-[10px] text-muted">{palette.name}</div>
          <div className="flex flex-wrap gap-1.5">
            {palette.colors.map((c) => (
              <button
                key={c.hex}
                type="button"
                title={c.label}
                onClick={() => onChange(c.hex)}
                className={clsx('h-7 w-7 rounded-full ring-1 ring-inset ring-black/10 transition hover:scale-110', value.toLowerCase() === c.hex && 'outline outline-2 outline-offset-2 outline-accent')}
                style={{ background: c.hex }}
              />
            ))}
          </div>
        </div>
      ))}
      <label className="flex items-center gap-2 text-xs text-muted">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="h-7 w-7 cursor-pointer rounded-full border-0 bg-transparent p-0" />
        Custom colour <span className="font-mono text-[10px] uppercase">{value}</span>
      </label>
    </div>
  )
}

function Swatch({ label, color, active, onClick }: { label: string; color: string; active: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={clsx('group rounded-xl p-1 text-left transition', active ? 'bg-accent/10 ring-2 ring-accent' : 'hover:bg-ink/5')}>
      <span className="block h-9 rounded-lg ring-1 ring-inset ring-black/10" style={{ background: color }} />
      <span className="mt-1 block truncate px-0.5 text-[10px] leading-tight text-muted group-hover:text-ink">{label}</span>
    </button>
  )
}

function Chips<T extends number>({ options, value, onChange }: { options: [T, string][]; value: number; onChange: (v: T) => void }) {
  return (
    <div className="flex gap-1">
      {options.map(([v, label]) => (
        <button key={v} type="button" onClick={() => onChange(v)} className={clsx('chip flex-1 justify-center ring-1 ring-line', Math.abs(value - v) < 1e-6 && 'chip-on ring-accent')}>
          {label}
        </button>
      ))}
    </div>
  )
}

function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={clsx('mb-2 text-xs font-semibold uppercase tracking-wider text-muted', className)}>{children}</div>
}
