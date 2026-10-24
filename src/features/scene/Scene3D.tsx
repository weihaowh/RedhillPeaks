import { useEffect, useMemo, useRef, useState } from 'react'
import clsx from 'clsx'
import * as THREE from 'three'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { CameraControls, PerformanceMonitor } from '@react-three/drei'
import type { FloorPlan } from '../../types/plan'
import { useAppStore } from '../../store/useAppStore'
import { planBounds } from '../../lib/planMath'
import { FlatModel } from './FlatModel'
import { Effects, FOV, Stage, VIEW_DIR } from './SceneStage'
import { Minimap, cameraPose } from './Minimap'
import { Walkthrough } from './Walkthrough'
import { WalkOverlay } from './WalkOverlay'
import { FlyCamera, finePointer } from './FlyCamera'
import { SceneHint } from './SceneHint'
import { FurnitureLayer } from '../furniture/FurnitureLayer'
import { FixtureLayer3D } from '../electrical/FixtureLayer3D'
import { addItem } from '../furniture/itemActions'
import { FURNITURE_MIME, floorPointAt, lookTarget, sceneBridge } from './sceneBridge'

export default function Scene3D({ plan }: { plan: FloorPlan }) {
  const quality = useAppStore((s) => s.quality)
  const mode = useAppStore((s) => s.mode)
  const selectRoom = useAppStore((s) => s.selectRoom)
  // Lowered when the frame rate struggles, raised again when it recovers.
  const [dprFactor, setDprFactor] = useState(1)
  const baseDpr = quality === 'draft' ? 1 : quality === 'high' ? 1.5 : 2
  const dpr = Math.max(0.6, Math.min(window.devicePixelRatio || 1, baseDpr) * dprFactor)
  const picking = useAppStore((s) => !!s.featurePick)
  const flying = useAppStore((s) => s.cameraMode === 'fly') && finePointer
  const b = planBounds(plan)
  const offset = useMemo<[number, number]>(() => [b.cx, b.cy], [b.cx, b.cy])

  return (
    <div
      className={clsx('relative h-full w-full', picking && 'cursor-crosshair')}
      // Furniture dragged in from the library lands where it is dropped.
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes(FURNITURE_MIME)) e.preventDefault()
      }}
      onDrop={(e) => {
        const type = e.dataTransfer.getData(FURNITURE_MIME)
        const p = type ? floorPointAt(e.clientX, e.clientY) : null
        if (!p) return
        e.preventDefault()
        addItem(type, p[0], p[1])
      }}
    >
      <Canvas
        shadows
        dpr={dpr}
        camera={{ fov: FOV, near: 0.1, far: 200, position: [9, 13, 13] }}
        gl={{ antialias: quality === 'draft', preserveDrawingBuffer: true }}
        onPointerMissed={() => {
          // While picking a feature wall, a stray click (e.g. through a window) shouldn't
          // cancel the pick or close the room panel; Esc or Cancel ends it.
          if (!useAppStore.getState().featurePick) selectRoom(null)
        }}
      >
        <Stage plan={plan}>
          <FlatModel plan={plan} />
          <FurnitureLayer plan={plan} />
          <FixtureLayer3D ceiling={plan.ceilingHeight} />
        </Stage>

        <PerformanceMonitor
          onDecline={() => setDprFactor((f) => Math.max(0.5, f - 0.25))}
          onIncline={() => setDprFactor((f) => Math.min(1, f + 0.25))}
        />
        {mode === 'walk' ? <Walkthrough plan={plan} /> : flying ? <FlyCamera plan={plan} /> : <CameraRig plan={plan} />}
        <PoseTracker offset={offset} />
        <SceneBridge offset={offset} />

        <Effects />
      </Canvas>
      <Minimap plan={plan} />
      {mode === 'orbit' && <SceneHint flying={flying} />}
      {mode === 'walk' && <WalkOverlay />}
    </div>
  )
}

function CameraRig({ plan }: { plan: FloorPlan }) {
  const ref = useRef<CameraControls>(null)
  const selectedId = useAppStore((s) => s.selectedRoomId)
  const resetNonce = useAppStore((s) => s.viewResetNonce)
  const aspect = useThree((s) => s.size.width / s.size.height)
  const b = planBounds(plan)

  /** Looks at a plan-space box from the default direction, far enough back to fit it on screen. */
  const frame = (minX: number, minY: number, maxX: number, maxY: number, smooth: boolean, margin: number) => {
    const target = new THREE.Vector3((minX + maxX) / 2 - b.cx, 0, (minY + maxY) / 2 - b.cy)
    const radius = Math.hypot(maxX - minX, maxY - minY) / 2
    const halfFov = THREE.MathUtils.degToRad(FOV / 2)
    // Narrow screens are limited by the horizontal field of view.
    const fit = Math.min(Math.tan(halfFov), Math.tan(halfFov) * aspect)
    const distance = Math.max((radius / fit) * margin, 3.5)
    const eye = target.clone().addScaledVector(VIEW_DIR, distance)
    ref.current?.setLookAt(eye.x, eye.y, eye.z, target.x, target.y, target.z, smooth)
  }

  // Re-frame the whole flat on reset only, not on every resize.
  const mounted = useRef(false)
  useEffect(() => {
    // Coming back from the fly camera: orbit around what it was looking at, from where it was.
    if (!mounted.current && sceneBridge.flyHandoff) {
      const cam = sceneBridge.flyHandoff
      sceneBridge.flyHandoff = undefined
      mounted.current = true
      const t = lookTarget(cam)
      ref.current?.setLookAt(cam.position.x, cam.position.y, cam.position.z, t.x, t.y, t.z, false)
      return
    }
    mounted.current = true
    // Extra margin so the floating panels don't cover the edges of the flat.
    frame(b.minX, b.minY, b.maxX, b.maxY, resetNonce > 0, 1.25)
  }, [resetNonce])

  useEffect(() => {
    const room = plan.rooms.find((r) => r.id === selectedId)
    if (!room) return
    const xs = room.polygon.map((p) => p[0])
    const ys = room.polygon.map((p) => p[1])
    frame(Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys), true, 1.15)
  }, [selectedId])

  const dragging = useAppStore((s) => s.draggingItem)
  return <CameraControls ref={ref} makeDefault enabled={!dragging} maxPolarAngle={Math.PI / 2.1} minDistance={1.5} maxDistance={60} smoothTime={0.35} />
}

/** Publishes the camera's plan-space position and heading for the minimap without re-rendering React. */
function PoseTracker({ offset }: { offset: [number, number] }) {
  const dir = useRef(new THREE.Vector3())
  useFrame(({ camera }) => {
    camera.getWorldDirection(dir.current)
    cameraPose.x = camera.position.x + offset[0]
    cameraPose.y = camera.position.z + offset[1]
    cameraPose.heading = Math.atan2(dir.current.z, dir.current.x)
  })
  return null
}

/** Shares the live camera and controls with code outside the canvas (see sceneBridge). */
function SceneBridge({ offset }: { offset: [number, number] }) {
  const camera = useThree((s) => s.camera)
  const gl = useThree((s) => s.gl)
  const controls = useThree((s) => s.controls) as CameraControls | null
  const get = useThree((s) => s.get)
  useEffect(() => {
    sceneBridge.camera = camera
    sceneBridge.canvas = gl.domElement
    sceneBridge.controls = controls ?? undefined
    sceneBridge.offset = offset
    sceneBridge.getState = get
  }, [camera, gl, controls, offset, get])
  useEffect(
    () => () => {
      sceneBridge.camera = undefined
      sceneBridge.canvas = undefined
      sceneBridge.controls = undefined
      sceneBridge.getState = undefined
    },
    [],
  )
  return null
}
