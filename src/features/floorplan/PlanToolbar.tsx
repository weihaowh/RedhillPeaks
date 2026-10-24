import { AppWindow, DoorOpen, Maximize2, MousePointer2, PenLine, Pentagon, Redo2, Ruler, Undo2, Zap } from 'lucide-react'
import clsx from 'clsx'
import { useEditorStore, type Tool } from '../../store/useEditorStore'
import { usePlanStore } from '../../store/usePlanStore'
import { useAppStore } from '../../store/useAppStore'
import { useDesignStore } from '../../store/useDesignStore'
import { UploadPlanButton } from './UploadPlan'

const TOOLS: { id: Tool; label: string; key: string; icon: typeof PenLine }[] = [
  { id: 'select', label: 'Select', key: 'V', icon: MousePointer2 },
  { id: 'wall', label: 'Wall', key: 'W', icon: PenLine },
  { id: 'door', label: 'Door', key: 'D', icon: DoorOpen },
  { id: 'window', label: 'Window', key: 'N', icon: AppWindow },
  { id: 'room', label: 'Room', key: 'R', icon: Pentagon },
  { id: 'electrical', label: 'Electrical', key: 'E', icon: Zap },
  { id: 'calibrate', label: 'Calibrate', key: 'C', icon: Ruler },
]

const THICKNESSES = [0.1, 0.15, 0.2, 0.3]

export function PlanToolbar() {
  const tool = useEditorStore((s) => s.tool)
  const setTool = useEditorStore((s) => s.setTool)
  const wallThickness = useEditorStore((s) => s.wallThickness)
  const setWallThickness = useEditorStore((s) => s.setWallThickness)
  const doorWidth = useEditorStore((s) => s.doorWidth)
  const setDoorWidth = useEditorStore((s) => s.setDoorWidth)
  const windowWidth = useEditorStore((s) => s.windowWidth)
  const setWindowWidth = useEditorStore((s) => s.setWindowWidth)
  // Furniture and electrical points live in the design, so undo follows it while working on them.
  const electrical = useElectricalUndo()
  const planCanUndo = usePlanStore((s) => s.past.length > 0)
  const planCanRedo = usePlanStore((s) => s.future.length > 0)
  const designCanUndo = useDesignStore((s) => s.past.length > 0)
  const designCanRedo = useDesignStore((s) => s.future.length > 0)
  const canUndo = electrical ? designCanUndo : planCanUndo
  const canRedo = electrical ? designCanRedo : planCanRedo
  const undo = () => (electrical ? useDesignStore : usePlanStore).getState().undo()
  const redo = () => (electrical ? useDesignStore : usePlanStore).getState().redo()
  const resetView = useAppStore((s) => s.resetView)

  return (
    <>
      {TOOLS.map(({ id, label, key, icon: Icon }) => (
        <button
          key={id}
          type="button"
          title={`${label} (${key})`}
          onClick={() => {
            setTool(id)
            if (id === 'electrical') useAppStore.getState().setLeftTab('electrical')
          }}
          className={clsx('chip whitespace-nowrap', tool === id && 'chip-on')}
        >
          <Icon size={14} /> <span className="hidden xl:inline">{label}</span>
        </button>
      ))}
      <Divider />
      <button type="button" className="chip" title="Undo (Ctrl+Z)" disabled={!canUndo} onClick={undo}>
        <Undo2 size={14} />
      </button>
      <button type="button" className="chip" title="Redo (Ctrl+Shift+Z)" disabled={!canRedo} onClick={redo}>
        <Redo2 size={14} />
      </button>

      {tool === 'wall' && (
        <>
          <Divider />
          <span className="pl-1 text-xs text-muted">Thickness</span>
          {THICKNESSES.map((t) => (
            <button key={t} type="button" onClick={() => setWallThickness(t)} className={clsx('chip tabular-nums', wallThickness === t && 'chip-on')}>
              {t * 1000}
            </button>
          ))}
        </>
      )}
      {(tool === 'door' || tool === 'window') && (
        <>
          <Divider />
          <WidthInput value={tool === 'door' ? doorWidth : windowWidth} onChange={tool === 'door' ? setDoorWidth : setWindowWidth} />
        </>
      )}

      <Divider />
      <button type="button" className="chip" title="Fit to screen" onClick={resetView}>
        <Maximize2 size={14} />
      </button>
      <UploadPlanButton compact />
    </>
  )
}

function WidthInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <label className="flex items-center gap-1.5 px-1 text-xs text-muted">
      Width
      <input
        type="number"
        min={300}
        max={3000}
        step={50}
        value={Math.round(value * 1000)}
        onChange={(e) => {
          const v = Number(e.target.value)
          if (v >= 300) onChange(v / 1000)
        }}
        className="h-8 w-20 rounded-lg border border-line bg-canvas/60 px-2 text-right tabular-nums text-ink outline-none focus:ring-2 focus:ring-accent/40"
      />
      mm
    </label>
  )
}

function Divider() {
  return <span className="mx-0.5 h-5 w-px shrink-0 bg-line" />
}

/** True while working on furniture or electrical points, when 2D undo/redo act on the design. */
export function useElectricalUndo() {
  const tool = useEditorStore((s) => s.tool)
  const designSelected = useAppStore((s) => !!s.selectedFixtureId || !!s.selectedItemId)
  return tool === 'electrical' || designSelected
}
