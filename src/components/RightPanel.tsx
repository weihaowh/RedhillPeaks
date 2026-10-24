import { Lightbulb, X } from 'lucide-react'
import clsx from 'clsx'
import type { FloorPlan, Room } from '../types/plan'
import { useAppStore } from '../store/useAppStore'
import { polygonArea } from '../lib/planMath'
import { DESIGNER_NOTES } from '../data/designerNotes'
import { DrawingPanel, OpeningInspector, RoomEditFields, WallInspector } from '../features/floorplan/Inspector'
import { FlatDesign, RoomDesign } from '../features/design/DesignPanels'
import { ItemInspector } from '../features/furniture/ItemInspector'
import { FixtureInspector } from '../features/electrical/FixtureInspector'
import { useDesignStore } from '../store/useDesignStore'
import { KIND_COLOR } from './LeftPanel'

export function RightPanel({ plan }: { plan: FloorPlan }) {
  const mode = useAppStore((s) => s.mode)
  const selectedRoomId = useAppStore((s) => s.selectedRoomId)
  const selectedWallId = useAppStore((s) => s.selectedWallId)
  const selectedOpening = useAppStore((s) => s.selectedOpening)
  const selectedItemId = useAppStore((s) => s.selectedItemId)
  const item = useDesignStore((s) => s.design.items.find((it) => it.id === selectedItemId))
  const selectedFixtureId = useAppStore((s) => s.selectedFixtureId)
  const fixture = useDesignStore((s) => s.design.fixtures.find((f) => f.id === selectedFixtureId))

  const room = plan.rooms.find((r) => r.id === selectedRoomId)
  const wall = plan.walls.find((w) => w.id === selectedWallId)
  const openingWall = selectedOpening ? plan.walls.find((w) => w.id === selectedOpening.wallId) : undefined
  const opening = openingWall?.openings?.find((o) => o.id === selectedOpening?.openingId)
  const hasSelection = !!(room || wall || opening || item || fixture)
  // In the walkthrough the whole-flat panel would only block the view.
  if (mode === 'walk' && !hasSelection) return null

  return (
    <aside
      className={clsx(
        'glass absolute right-3 z-20 flex w-[min(19rem,calc(100vw-1.5rem))] flex-col overflow-hidden',
        'bottom-20 max-h-[55vh] md:top-20 md:max-h-none',
        !hasSelection && 'hidden md:flex md:bottom-auto md:max-h-[calc(100%-10rem)]',
      )}
    >
      {fixture ? (
        <FixtureInspector fixture={fixture} plan={plan} />
      ) : item ? (
        <ItemInspector item={item} plan={plan} />
      ) : opening && openingWall ? (
        <OpeningInspector wall={openingWall} opening={opening} />
      ) : wall ? (
        <WallInspector wall={wall} plan={plan} />
      ) : room ? (
        <RoomDetails room={room} plan={plan} editable={mode === 'plan'} />
      ) : (
        <div className="min-h-0 space-y-5 overflow-y-auto p-4">
          {mode === 'plan' && <DrawingPanel />}
          <FlatDesign />
        </div>
      )}
    </aside>
  )
}

function RoomDetails({ room, plan, editable }: { room: Room; plan: FloorPlan; editable: boolean }) {
  const select = useAppStore((s) => s.selectRoom)

  return (
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
        {editable && <RoomEditFields room={room} />}
        <RoomDesign room={room} plan={plan} />
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
  )
}
