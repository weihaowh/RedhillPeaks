import { BrickWall, Gauge, RotateCcw, Tag } from 'lucide-react'
import clsx from 'clsx'
import { useAppStore } from '../store/useAppStore'
import { PlanToolbar } from '../features/floorplan/PlanToolbar'

export function ViewControls() {
  const mode = useAppStore((s) => s.mode)
  const showLabels = useAppStore((s) => s.showLabels)
  const toggleLabels = useAppStore((s) => s.toggleLabels)
  const showStructural = useAppStore((s) => s.showStructural)
  const toggleStructural = useAppStore((s) => s.toggleStructural)
  const wallMode = useAppStore((s) => s.wallMode)
  const setWallMode = useAppStore((s) => s.setWallMode)
  const quality = useAppStore((s) => s.quality)
  const setQuality = useAppStore((s) => s.setQuality)
  const resetView = useAppStore((s) => s.resetView)

  return (
    <div className="glass absolute bottom-3 left-1/2 z-20 flex max-w-[calc(100vw-1.5rem)] -translate-x-1/2 items-center gap-1 overflow-x-auto p-1.5">
      {mode === 'plan' ? (
        <PlanToolbar />
      ) : (
        <>
          <Toggle on={showLabels} onClick={toggleLabels} icon={<Tag size={14} />} label="Labels" />
          <Toggle on={showStructural} onClick={toggleStructural} icon={<BrickWall size={14} />} label="Structural" />
          <Divider />
          <Segment value={wallMode} onChange={setWallMode} options={[['full', 'Full walls'], ['cutaway', 'Cutaway']]} />
          <Divider />
          <Segment value={quality} onChange={setQuality} icon={<Gauge size={14} />} options={[['draft', 'Draft'], ['high', 'High']]} />
          <Divider />
          <button type="button" className="chip" onClick={resetView} title="Reset camera">
            <RotateCcw size={14} />
          </button>
        </>
      )}
    </div>
  )
}

function Divider() {
  return <span className="mx-0.5 h-5 w-px shrink-0 bg-line" />
}

function Toggle({ on, onClick, icon, label }: { on: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button type="button" onClick={onClick} className={clsx('chip whitespace-nowrap', on && 'chip-on')}>
      {icon} <span className="hidden sm:inline">{label}</span>
    </button>
  )
}

function Segment<T extends string>({ value, onChange, options, icon }: { value: T; onChange: (v: T) => void; options: [T, string][]; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-0.5">
      {icon && <span className="pl-1.5 text-muted">{icon}</span>}
      {options.map(([v, label]) => (
        <button key={v} type="button" onClick={() => onChange(v)} className={clsx('chip whitespace-nowrap', value === v && 'chip-on')}>
          {label}
        </button>
      ))}
    </div>
  )
}
