import { useEffect, useRef, useState } from 'react'
import { Axe, BrickWall, Camera, Gauge, Hammer, LogOut, Redo2, RotateCcw, Sun, Tag, Undo2 } from 'lucide-react'
import clsx from 'clsx'
import { useAppStore } from '../store/useAppStore'
import { useDesignStore } from '../store/useDesignStore'
import { PlanToolbar } from '../features/floorplan/PlanToolbar'
import { SunPanel } from '../features/scene/SunPanel'
import { ScreenshotPanel } from '../features/scene/ScreenshotPanel'
import { formatHour } from '../lib/sun'
import { useEditorStore } from '../store/useEditorStore'
import { BUILT_KINDS } from '../lib/renovation'
import { finePointer } from '../features/scene/FlyCamera'

type Panel = 'sun' | 'shot' | null

const QUALITY_HINT = {
  draft: 'Fastest. Best for phones and older laptops.',
  high: 'Soft ambient shading and smooth edges.',
  ultra: 'Soft shadows and light glow. Needs a strong GPU.',
}

export function ViewControls() {
  const mode = useAppStore((s) => s.mode)
  const setMode = useAppStore((s) => s.setMode)
  const showLabels = useAppStore((s) => s.showLabels)
  const toggleLabels = useAppStore((s) => s.toggleLabels)
  const showStructural = useAppStore((s) => s.showStructural)
  const toggleStructural = useAppStore((s) => s.toggleStructural)
  const wallMode = useAppStore((s) => s.wallMode)
  const setWallMode = useAppStore((s) => s.setWallMode)
  const quality = useAppStore((s) => s.quality)
  const setQuality = useAppStore((s) => s.setQuality)
  const resetView = useAppStore((s) => s.resetView)
  const hour = useAppStore((s) => s.sun.hour)
  const canUndo = useDesignStore((s) => s.past.length > 0)
  const canRedo = useDesignStore((s) => s.future.length > 0)
  const undo = useDesignStore((s) => s.undo)
  const redo = useDesignStore((s) => s.redo)
  const [panel, setPanel] = useState<Panel>(null)
  const root = useRef<HTMLDivElement>(null)
  const walking = mode === 'walk'
  const cameraMode = useAppStore((s) => s.cameraMode)
  const setCameraMode = useAppStore((s) => s.setCameraMode)
  const tool = useEditorStore((s) => s.tool)
  const setTool = useEditorStore((s) => s.setTool)
  const buildKind = useEditorStore((s) => s.buildKind)
  const setBuildKind = useEditorStore((s) => s.setBuildKind)
  const toggleTool = (t: 'build' | 'hack') => setTool(tool === t ? 'select' : t)

  // Close the popover on outside click or when leaving the 3D views.
  useEffect(() => {
    if (!panel) return
    const onDown = (e: PointerEvent) => !root.current?.contains(e.target as Node) && setPanel(null)
    window.addEventListener('pointerdown', onDown)
    return () => window.removeEventListener('pointerdown', onDown)
  }, [panel])
  useEffect(() => setPanel(null), [mode])

  const toggle = (p: Exclude<Panel, null>) => setPanel((cur) => (cur === p ? null : p))

  return (
    <div ref={root}>
      {panel && mode !== 'plan' && (
        <div className="glass absolute bottom-[4.25rem] left-1/2 z-30 -translate-x-1/2">
          {panel === 'sun' ? <SunPanel /> : <ScreenshotPanel onDone={() => setPanel(null)} />}
        </div>
      )}
      <div className="glass absolute bottom-3 left-1/2 z-20 flex max-w-[calc(100vw-1.5rem)] -translate-x-1/2 items-center gap-1 overflow-x-auto p-1.5">
        {mode === 'plan' ? (
          <PlanToolbar />
        ) : (
          <>
            <button type="button" className="chip" title="Undo design change (Ctrl+Z)" disabled={!canUndo} onClick={undo}>
              <Undo2 size={14} />
            </button>
            <button type="button" className="chip" title="Redo (Ctrl+Shift+Z)" disabled={!canRedo} onClick={redo}>
              <Redo2 size={14} />
            </button>
            <Divider />
            {!walking && (
              <>
                <Toggle on={showLabels} onClick={toggleLabels} icon={<Tag size={14} />} label="Labels" />
                <Toggle on={showStructural} onClick={toggleStructural} icon={<BrickWall size={14} />} label="Structural" />
                <Divider />
                <Segment value={wallMode} onChange={setWallMode} options={[['full', 'Full walls'], ['cutaway', 'Cutaway']]} />
                <Divider />
                {finePointer && (
                  <>
                    <Segment
                      value={cameraMode}
                      onChange={setCameraMode}
                      options={[['orbit', 'Orbit'], ['fly', 'Fly']]}
                      titles={{ orbit: 'Orbit around the flat: drag to rotate, right-drag to pan, scroll to zoom', fly: 'Fly freely like Unreal Engine: hold right mouse and use WASD, Q/E' }}
                    />
                    <Divider />
                  </>
                )}
                <Toggle on={tool === 'build'} onClick={() => toggleTool('build')} icon={<Hammer size={14} />} label="Build" title="Build new walls (B)" />
                <Toggle on={tool === 'hack'} onClick={() => toggleTool('hack')} icon={<Axe size={14} />} label="Hack" title="Hack walls (H)" />
                {tool === 'build' &&
                  BUILT_KINDS.map((k) => (
                    <button key={k.id} type="button" title={k.hint} onClick={() => setBuildKind(k.id)} className={clsx('chip whitespace-nowrap', buildKind === k.id && 'chip-on')}>
                      {k.label.split(' ')[0]}
                    </button>
                  ))}
                <Divider />
              </>
            )}
            <button type="button" className={clsx('chip whitespace-nowrap', panel === 'sun' && 'chip-on')} onClick={() => toggle('sun')} title="Time of day and lighting">
              <Sun size={14} /> {formatHour(hour)}
            </button>
            <Divider />
            <Segment
              value={quality}
              onChange={setQuality}
              icon={<Gauge size={14} />}
              options={[['draft', 'Draft'], ['high', 'High'], ['ultra', 'Ultra']]}
              titles={QUALITY_HINT}
            />
            <Divider />
            <button type="button" className={clsx('chip', panel === 'shot' && 'chip-on')} onClick={() => toggle('shot')} title="Save a picture">
              <Camera size={14} />
            </button>
            {walking ? (
              <button type="button" className="chip whitespace-nowrap" onClick={() => setMode('orbit')} title="Back to the overview (Esc)">
                <LogOut size={14} /> <span className="hidden sm:inline">Exit</span>
              </button>
            ) : (
              <button type="button" className="chip" onClick={resetView} title="Reset camera">
                <RotateCcw size={14} />
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function Divider() {
  return <span className="mx-0.5 h-5 w-px shrink-0 bg-line" />
}

function Toggle({ on, onClick, icon, label, title }: { on: boolean; onClick: () => void; icon: React.ReactNode; label: string; title?: string }) {
  return (
    <button type="button" title={title} onClick={onClick} className={clsx('chip whitespace-nowrap', on && 'chip-on')}>
      {icon} <span className="hidden sm:inline">{label}</span>
    </button>
  )
}

function Segment<T extends string>({
  value,
  onChange,
  options,
  icon,
  titles,
}: {
  value: T
  onChange: (v: T) => void
  options: [T, string][]
  icon?: React.ReactNode
  titles?: Partial<Record<T, string>>
}) {
  return (
    <div className="flex items-center gap-0.5">
      {icon && <span className="pl-1.5 text-muted">{icon}</span>}
      {options.map(([v, label]) => (
        <button key={v} type="button" title={titles?.[v]} onClick={() => onChange(v)} className={clsx('chip whitespace-nowrap', value === v && 'chip-on')}>
          {label}
        </button>
      ))}
    </div>
  )
}
