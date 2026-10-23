import { Lightbulb, Palette, X } from 'lucide-react'
import clsx from 'clsx'
import type { FloorPlan } from '../types/plan'
import { useAppStore } from '../store/useAppStore'
import { polygonArea } from '../lib/planMath'
import { DESIGNER_NOTES } from '../data/designerNotes'
import { FLOOR_FINISHES, WALL_PAINTS, defaultFinish } from '../features/scene/finishes'
import { KIND_COLOR } from './LeftPanel'

export function RightPanel({ plan }: { plan: FloorPlan }) {
  const selectedId = useAppStore((s) => s.selectedRoomId)
  const select = useAppStore((s) => s.selectRoom)
  const floorFinish = useAppStore((s) => s.floorFinish)
  const setFloorFinish = useAppStore((s) => s.setFloorFinish)
  const wallPaint = useAppStore((s) => s.wallPaint)
  const setWallPaint = useAppStore((s) => s.setWallPaint)
  const room = plan.rooms.find((r) => r.id === selectedId)

  return (
    <aside
      className={clsx(
        'glass absolute right-3 z-20 flex w-[min(18rem,calc(100vw-1.5rem))] flex-col overflow-hidden',
        'bottom-20 max-h-[55vh] md:top-20 md:max-h-none',
        !room && 'hidden md:flex md:bottom-auto',
      )}
    >
      {room ? (
        <>
          <div className="flex items-start gap-2.5 border-b border-line/80 p-4">
            <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: KIND_COLOR[room.kind] }} />
            <div className="min-w-0 flex-1">
              <div className="truncate font-semibold">{room.name}</div>
              <div className="text-xs text-muted">≈ {polygonArea(room.polygon).toFixed(1)} m² · centre-line area</div>
            </div>
            <button type="button" className="icon-btn -mr-1 -mt-1 h-8 w-8" title="Close" onClick={() => select(null)}>
              <X size={16} />
            </button>
          </div>
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4">
            {room.kind !== 'ledge' && (
              <section>
                <SectionTitle>Floor finish</SectionTitle>
                <div className="grid grid-cols-3 gap-2">
                  {FLOOR_FINISHES.map((f) => {
                    const active = (floorFinish[room.id] ?? defaultFinish(room.kind)) === f.id
                    return (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setFloorFinish(room.id, f.id)}
                        className={clsx('group rounded-xl p-1 text-left transition', active ? 'bg-accent/10 ring-2 ring-accent' : 'hover:bg-ink/5')}
                      >
                        <span className="block h-10 rounded-lg ring-1 ring-inset ring-black/10" style={{ background: f.swatch }} />
                        <span className="mt-1 block truncate px-0.5 text-[10px] leading-tight text-muted group-hover:text-ink">{f.label}</span>
                      </button>
                    )
                  })}
                </div>
              </section>
            )}
            {DESIGNER_NOTES[room.id] && (
              <section className="rounded-xl bg-accent/10 p-3">
                <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-accent">
                  <Lightbulb size={14} /> Designer note
                </div>
                <p className="text-xs leading-relaxed">{DESIGNER_NOTES[room.id]}</p>
              </section>
            )}
          </div>
        </>
      ) : (
        <div className="space-y-3 p-4">
          <SectionTitle>
            <Palette size={13} /> Wall paint
          </SectionTitle>
          <div className="flex flex-wrap gap-2">
            {WALL_PAINTS.map((p) => (
              <button
                key={p.hex}
                type="button"
                title={p.label}
                onClick={() => setWallPaint(p.hex)}
                className={clsx('h-8 w-8 rounded-full ring-1 ring-inset ring-black/10 transition', wallPaint === p.hex && 'outline outline-2 outline-offset-2 outline-accent')}
                style={{ background: p.hex }}
              />
            ))}
          </div>
          <p className="text-xs text-muted">Click a room to change its floor and read its designer note.</p>
        </div>
      )}
    </aside>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted">{children}</div>
}
