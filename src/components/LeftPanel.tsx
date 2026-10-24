import { Bookmark, Info, Layers, LayoutTemplate, PanelLeftClose, PanelLeftOpen, Sofa, Zap } from 'lucide-react'
import clsx from 'clsx'
import type { FloorPlan, RoomKind } from '../types/plan'
import { useAppStore, type LeftTab } from '../store/useAppStore'
import { polygonArea } from '../lib/planMath'
import { LibraryPanel } from '../features/furniture/LibraryPanel'
import { PresetsPanel } from '../features/presets/PresetsPanel'
import { ElectricalPanel } from '../features/electrical/ElectricalPanel'
import { LayoutsPanel } from '../features/layouts/LayoutsPanel'

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
  { id: 'layouts', label: 'Layouts', icon: LayoutTemplate },
  { id: 'presets', label: 'Presets', icon: Bookmark },
  { id: 'electrical', label: 'Electrical', icon: Zap },
]

export function LeftPanel({ plan }: { plan: FloorPlan }) {
  const open = useAppStore((s) => s.leftOpen)
  const setOpen = useAppStore((s) => s.setLeftOpen)
  const tab = useAppStore((s) => s.leftTab)
  const setTab = useAppStore((s) => s.setLeftTab)
  const mode = useAppStore((s) => s.mode)

  if (!open) {
    return (
      <button type="button" className="glass icon-btn absolute left-3 top-20 z-20 h-11 w-11" title="Show panel" onClick={() => setOpen(true)}>
        <PanelLeftOpen size={18} />
      </button>
    )
  }

  return (
    <aside
      className={clsx(
        'glass absolute bottom-20 left-3 top-20 z-20 flex w-[min(18rem,calc(100vw-1.5rem))] flex-col overflow-hidden',
        // Leave room for the 3D minimap in the bottom-left corner.
        mode !== 'plan' && 'lg:bottom-[13.5rem]',
      )}
    >
      <div className="flex items-center gap-1 border-b border-line/80 p-2">
        {TABS.map(({ id, label, icon: Icon }) => (
          // The tabs don't fit with labels, so only the active one shows its name.
          <button key={id} type="button" title={label} onClick={() => setTab(id)} className={clsx('chip justify-center', tab === id ? 'chip-on flex-1' : 'px-2')}>
            <Icon size={14} /> {tab === id && label}
          </button>
        ))}
        <button type="button" className="icon-btn h-8 w-8" title="Hide panel" onClick={() => setOpen(false)}>
          <PanelLeftClose size={16} />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {tab === 'rooms' && <RoomsTab plan={plan} />}
        {tab === 'library' && <LibraryPanel plan={plan} />}
        {tab === 'layouts' && <LayoutsPanel plan={plan} />}
        {tab === 'presets' && <PresetsPanel plan={plan} />}
        {tab === 'electrical' && <ElectricalPanel plan={plan} />}
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
