import { useEffect, useLayoutEffect, useMemo, useState } from 'react'
import * as THREE from 'three'
import { Canvas } from '@react-three/fiber'
import { CameraControls } from '@react-three/drei'
import { Check, X } from 'lucide-react'
import type { FloorPlan } from '../../types/plan'
import type { Design } from '../../types/design'
import { FlatModel } from '../scene/FlatModel'
import { FurnitureLayer } from '../furniture/FurnitureLayer'
import { FixtureLayer3D } from '../electrical/FixtureLayer3D'
import { Effects, FOV, Stage, overviewEye } from '../scene/SceneStage'
import { DesignProvider } from '../design/designContext'
import { applyRenovation } from '../../lib/renovation'

export interface CompareSide {
  name: string
  plan: FloorPlan
  design: Design
  /** Shown for presets; absent for the current design. */
  onApply?: () => void
}

/**
 * Two read-only 3D views side by side. Both canvases render through one shared camera, and a
 * single set of camera controls listens on the whole area, so orbiting either side moves both.
 */
/** Each side shows its own design's hacks and new walls. */
const renovated = (side: CompareSide) => applyRenovation(side.plan, side.design.renovation)

export function CompareView({ sides, onClose }: { sides: [CompareSide, CompareSide]; onClose: () => void }) {
  const [area, setArea] = useState<HTMLDivElement | null>(null)
  // One camera for the whole compare session, shared by both canvases.
  const camera = useMemo(() => new THREE.PerspectiveCamera(FOV, 1, 0.1, 200), [])

  // Frame the flat for the actual pane shape (side by side on wide screens, stacked on narrow),
  // before the canvases mount their camera controls.
  useLayoutEffect(() => {
    if (!area) return
    const wide = area.clientWidth >= 768
    const aspect = wide ? area.clientWidth / 2 / area.clientHeight : area.clientWidth / (area.clientHeight / 2)
    camera.position.copy(overviewEye(sides[0].plan, aspect, 1.15))
    camera.lookAt(0, 0, 0)
  }, [area])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-canvas">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-line px-4">
        <div className="text-sm font-semibold">Compare designs</div>
        <div className="hidden text-xs text-muted sm:block">Drag on either side to orbit both views together. Scroll to zoom.</div>
        <button type="button" className="icon-btn ml-auto" title="Close (Esc)" onClick={onClose}>
          <X size={18} />
        </button>
      </header>
      <div ref={setArea} className="grid min-h-0 flex-1 grid-cols-1 grid-rows-2 gap-px bg-line md:grid-cols-2 md:grid-rows-1">
        {sides.map((side, i) => (
          <div key={i} className="relative min-h-0 bg-canvas">
            <Canvas shadows camera={camera} dpr={[1, 1.5]} gl={{ antialias: false }}>
              <DesignProvider value={{ design: side.design, readOnly: true }}>
                <Stage plan={renovated(side)}>
                  <FlatModel plan={renovated(side)} />
                  <FurnitureLayer plan={renovated(side)} />
                  <FixtureLayer3D ceiling={side.plan.ceilingHeight} />
                </Stage>
              </DesignProvider>
              {i === 0 && area && <CameraControls makeDefault domElement={area} maxPolarAngle={Math.PI / 2.1} minDistance={1.5} maxDistance={60} />}
              <Effects max="high" />
            </Canvas>
            {/* Keep clicks on the label from also starting an orbit. */}
            <div className="glass absolute left-3 top-3 flex items-center gap-3 px-3 py-2" onPointerDown={(e) => e.stopPropagation()}>
              <span className="text-sm font-semibold">{side.name}</span>
              {side.onApply && (
                <button type="button" onClick={side.onApply} className="flex items-center gap-1 rounded-lg bg-accent px-2.5 py-1 text-xs font-semibold text-white">
                  <Check size={13} /> Use this
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
