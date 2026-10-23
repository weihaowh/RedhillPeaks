import { Bookmark, Info, Layers, PanelLeftClose, PanelLeftOpen, Sofa } from 'lucide-react'
import clsx from 'clsx'
import type { FloorPlan, RoomKind } from '../types/plan'
import { useAppStore, type LeftTab } from '../store/useAppStore'
import { polygonArea } from '../lib/planMath'

export const KIND_COLOR: Record<RoomKind, string> = {
  living: '#d9a066',
  bedroom: '#8fa9c7',
  kitchen: '#c98b7a',
  bath: '#7fb7b0',
  service: '#a7a7a7',
  shelter: '#6b6b6b',
  ledge: '#bdbdbd',
}

const TABS: { id: LeftTab; label: string; icon: typeof Layers }[] = [
  { id: 'rooms', label: 'Rooms', icon: Layers },
  { id: 'library', label: 'Library', icon: Sofa },
  { id: 'presets', label: 'Presets', icon: Bookmark },
]

export function LeftPanel({ plan }: { plan: FloorPlan }) {
  const open = useAppStore((s) => s.leftOpen)
  const setOpen = useAppStore((s) => s.setLeftOpen)
  const tab = useAppStore((s) => s.leftTab)
  const setTab = useAppStore((s) => s.setLeftTab)

  if (!open) {
    return (
      <button type="button" className="glass icon-btn absolute left-3 top-20 z-20 h-11 w-11" title="Show panel" onClick={() => setOpen(true)}>
        <PanelLeftOpen size={18} />
      </button>
    )
  }

  return (
    <aside className="glass absolute bottom-20 left-3 top-20 z-20 flex w-[min(18rem,calc(100vw-1.5rem))] flex-col overflow-hidden">
      <div className="flex items-center gap-1 border-b border-line/80 p-2">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} type="button" onClick={() => setTab(id)} className={clsx('chip flex-1 justify-center', tab === id && 'chip-on')}>
            <Icon size={14} /> {label}
          </button>
        ))}
        <button type="button" className="icon-btn h-8 w-8" title="Hide panel" onClick={() => setOpen(false)}>
          <PanelLeftClose size={16} />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {tab === 'rooms' && <RoomsTab plan={plan} />}
        {tab === 'library' && (
          <EmptyState icon={Sofa} title="Furniture library" body="Sofas, beds, wardrobes, kitchens and décor at real dimensions. You will be able to drag them into any room. Arrives in Phase 5." />
        )}
        {tab === 'presets' && (
          <EmptyState icon={Bookmark} title="No presets yet" body="Save whole-flat designs, single rooms or colour palettes. You will be able to compare them side by side and export them. Arrives in Phase 6." />
        )}
      </div>
    </aside>
  )
}

function RoomsTab({ plan }: { plan: FloorPlan }) {
  const selected = useAppStore((s) => s.selectedRoomId)
  const select = useAppStore((s) => s.selectRoom)
  const setHovered = useAppStore((s) => s.setHoveredRoom)
  const indoor = plan.rooms.filter((r) => r.kind !== 'ledge')
  const total = indoor.reduce((sum, r) => sum + polygonArea(r.polygon), 0)

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between px-1">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted">Rooms</span>
        <span className="text-xs text-muted">≈ {total.toFixed(0)} m² traced</span>
      </div>
      <ul className="space-y-0.5">
        {plan.rooms.map((room) => (
          <li key={room.id}>
            <button
              type="button"
              onClick={() => select(selected === room.id ? null : room.id)}
              onMouseEnter={() => setHovered(room.id)}
              onMouseLeave={() => setHovered(null)}
              className={clsx(
                'flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm transition',
                selected === room.id ? 'bg-accent/10 text-ink ring-1 ring-accent/30' : 'hover:bg-ink/5',
              )}
            >
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: KIND_COLOR[room.kind] }} />
              <span className="flex-1 truncate">{room.name}</span>
              <span className="text-xs tabular-nums text-muted">{polygonArea(room.polygon).toFixed(1)} m²</span>
            </button>
          </li>
        ))}
      </ul>
      <div className="flex gap-2 rounded-xl bg-ink/5 p-3 text-xs leading-relaxed text-muted">
        <Info size={14} className="mt-0.5 shrink-0" />
        <p>
          Room areas are measured along wall centre-lines. Switch to 2D Plan to edit the trace, or to upload a different floor plan.
        </p>
      </div>
    </div>
  )
}

function EmptyState({ icon: Icon, title, body }: { icon: typeof Layers; title: string; body: string }) {
  return (
    <div className="flex flex-col items-center gap-3 px-3 py-10 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-ink/5 text-muted">
        <Icon size={20} />
      </div>
      <div className="text-sm font-semibold">{title}</div>
      <p className="text-xs leading-relaxed text-muted">{body}</p>
    </div>
  )
}
