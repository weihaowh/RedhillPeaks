import { useEffect, useRef } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { CameraControls, Environment, Lightformer } from '@react-three/drei'
import { EffectComposer, N8AO, SMAA } from '@react-three/postprocessing'
import type { FloorPlan } from '../../types/plan'
import { useAppStore } from '../../store/useAppStore'
import { planBounds, roomAnchor } from '../../lib/planMath'
import { FlatModel } from './FlatModel'

const BACKGROUND = { light: '#e9eaec', dark: '#121417' }
const GROUND = { light: '#dfe0e2', dark: '#181a1e' }

export default function Scene3D({ plan }: { plan: FloorPlan }) {
  const theme = useAppStore((s) => s.theme)
  const quality = useAppStore((s) => s.quality)
  const selectRoom = useAppStore((s) => s.selectRoom)
  const b = planBounds(plan)
  const high = quality === 'high'

  return (
    <Canvas
      shadows
      dpr={high ? [1, 2] : 1}
      camera={{ fov: 38, near: 0.1, far: 200, position: [9, 13, 13] }}
      gl={{ antialias: !high, preserveDrawingBuffer: true }}
      onPointerMissed={() => selectRoom(null)}
    >
      <color attach="background" args={[BACKGROUND[theme]]} />

      <hemisphereLight args={['#ffffff', '#d8cfc4', 0.9]} />
      <directionalLight
        castShadow
        position={[-5, 14, 9]}
        intensity={2.6}
        color="#fff3e2"
        shadow-mapSize={high ? [4096, 4096] : [1024, 1024]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.03}
      >
        <orthographicCamera attach="shadow-camera" args={[-10, 10, 10, -10, 0.5, 50]} />
      </directionalLight>
      <Environment resolution={256} frames={1}>
        <Lightformer intensity={1.2} rotation-x={Math.PI / 2} position={[0, 8, 0]} scale={[16, 16, 1]} />
        <Lightformer intensity={0.9} color="#ffe6cc" rotation-y={Math.PI / 2} position={[-10, 3, 0]} scale={[14, 4, 1]} />
        <Lightformer intensity={0.6} color="#dce8ff" rotation-y={-Math.PI / 2} position={[10, 3, 0]} scale={[14, 4, 1]} />
      </Environment>

      {/* Centre the flat on the origin so lights and camera don't depend on plan coordinates. */}
      <group position={[-b.cx, 0, -b.cy]}>
        <FlatModel plan={plan} />
      </group>

      <mesh rotation-x={-Math.PI / 2} position-y={-0.21} receiveShadow>
        <circleGeometry args={[40, 64]} />
        <meshStandardMaterial color={GROUND[theme]} roughness={1} />
      </mesh>

      <CameraRig plan={plan} />

      {high && (
        <EffectComposer multisampling={0}>
          <N8AO aoRadius={0.6} distanceFalloff={0.8} intensity={2.2} halfRes />
          <SMAA />
        </EffectComposer>
      )}
    </Canvas>
  )
}

function CameraRig({ plan }: { plan: FloorPlan }) {
  const ref = useRef<CameraControls>(null)
  const selectedId = useAppStore((s) => s.selectedRoomId)
  const resetNonce = useAppStore((s) => s.viewResetNonce)
  const b = planBounds(plan)
  const aspect = useThree((s) => s.size.width / s.size.height)
  // Portrait screens see less of the flat's width, so start further back.
  const zoomOut = Math.min(Math.max(0.95 / aspect, 1), 2)

  useEffect(() => {
    ref.current?.setLookAt(8.5 * zoomOut, 15.5 * zoomOut, 14.5 * zoomOut, 0, 0, 0.6, resetNonce > 0)
    // Only re-frame on reset, not on every resize.
  }, [resetNonce])

  useEffect(() => {
    const room = plan.rooms.find((r) => r.id === selectedId)
    if (!room) return
    const [px, py] = roomAnchor(room)
    const x = px - b.cx
    const z = py - b.cy
    ref.current?.setLookAt(x + 2.2, 7, z + 5, x, 0, z, true)
  }, [selectedId, plan, b.cx, b.cy])

  return <CameraControls ref={ref} makeDefault maxPolarAngle={Math.PI / 2.1} minDistance={2} maxDistance={50} smoothTime={0.35} />
}
