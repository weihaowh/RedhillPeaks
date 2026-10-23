import { useEffect, useLayoutEffect, type ReactNode } from 'react'
import * as THREE from 'three'
import { useThree } from '@react-three/fiber'
import { Environment, Lightformer, SoftShadows } from '@react-three/drei'
import { Bloom, EffectComposer, N8AO, SMAA, ToneMapping } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import type { FloorPlan } from '../../types/plan'
import { useAppStore, type Quality } from '../../store/useAppStore'
import { planBounds } from '../../lib/planMath'
import { useDaylight } from './daylight'
import { RoomLights } from './Interior'

// Lighting, environment, ground and post-processing shared by the main 3D view and the
// side-by-side compare panes.

const GROUND = { light: '#dfe0e2', dark: '#181a1e' }
export const FOV = 38
const EXPOSURE = 1.0
/** Default viewing direction (from target to camera): south-east and well above the flat. */
export const VIEW_DIR = new THREE.Vector3(0.42, 0.78, 0.47).normalize()

/** Lights and ground, with `children` placed in plan space (the flat centred on the origin). */
export function Stage({ plan, children }: { plan: FloorPlan; children: ReactNode }) {
  const theme = useAppStore((s) => s.theme)
  const quality = useAppStore((s) => s.quality)
  const light = useDaylight()
  // Inside the flat the ceiling blocks the sky, so stand in for daylight bouncing in through the
  // windows with extra soft fill (which fades with the daylight itself).
  const indoor = useAppStore((s) => s.mode === 'walk') ? 1.9 : 1
  const b = planBounds(plan)
  const [dx, dy, dz] = light.direction
  return (
    <>
      <RendererSettings />
      <EnvironmentIntensity value={light.environment * indoor} />
      <color attach="background" args={[light.background]} />
      {quality === 'ultra' && <SoftShadows size={18} samples={12} focus={0.5} />}

      <hemisphereLight args={['#ffffff', '#d8cfc4', light.hemisphere * indoor]} />
      <directionalLight
        castShadow
        position={[dx * 25, dy * 25, dz * 25]}
        intensity={light.sunIntensity}
        color={light.sunColor}
        shadow-mapSize={quality === 'draft' ? [1024, 1024] : [4096, 4096]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.03}
      >
        <orthographicCamera attach="shadow-camera" args={[-10, 10, 10, -10, 0.5, 50]} />
      </directionalLight>
      {/* Cool sky bounce from the opposite side, no shadows. */}
      <directionalLight position={[8, 6, -6]} intensity={0.35 * (light.hemisphere / 0.55)} color="#dfe8ff" />
      <Environment resolution={256} frames={1}>
        <Lightformer intensity={1.2} rotation-x={Math.PI / 2} position={[0, 8, 0]} scale={[16, 16, 1]} />
        <Lightformer intensity={0.9} color="#ffe6cc" rotation-y={Math.PI / 2} position={[-10, 3, 0]} scale={[14, 4, 1]} />
        <Lightformer intensity={0.6} color="#dce8ff" rotation-y={-Math.PI / 2} position={[10, 3, 0]} scale={[14, 4, 1]} />
        <Lightformer intensity={0.5} position={[0, 3, 10]} scale={[14, 4, 1]} />
      </Environment>

      {/* Centre the flat on the origin so lights and camera don't depend on plan coordinates. */}
      <group position={[-b.cx, 0, -b.cy]}>
        {children}
        {light.lightsOn && <RoomLights plan={plan} height={plan.ceilingHeight} />}
      </group>

      <mesh rotation-x={-Math.PI / 2} position-y={-0.21} receiveShadow>
        <circleGeometry args={[40, 64]} />
        <meshStandardMaterial color={GROUND[theme]} roughness={1} />
      </mesh>
    </>
  )
}

/** Post-processing for the current quality setting; `max` caps it (two compare panes at once). */
export function Effects({ max }: { max?: Quality }) {
  const setting = useAppStore((s) => s.quality)
  const order: Quality[] = ['draft', 'high', 'ultra']
  const quality = max && order.indexOf(setting) > order.indexOf(max) ? max : setting
  if (quality === 'high') {
    return (
      <EffectComposer multisampling={0}>
        <N8AO aoRadius={0.6} distanceFalloff={0.8} intensity={2.2} halfRes />
        <ToneMapping mode={ToneMappingMode.NEUTRAL} />
        <SMAA />
      </EffectComposer>
    )
  }
  if (quality === 'ultra') {
    return (
      <EffectComposer multisampling={0}>
        <N8AO aoRadius={0.7} distanceFalloff={0.8} intensity={2.4} quality="high" />
        <Bloom mipmapBlur intensity={0.3} luminanceThreshold={0.9} luminanceSmoothing={0.2} />
        <ToneMapping mode={ToneMappingMode.NEUTRAL} />
        <SMAA />
      </EffectComposer>
    )
  }
  return null
}

/**
 * Neutral (Khronos PBR) tone mapping keeps paint and floor colours close to their swatches.
 * Draft uses the renderer's; in High/Ultra the effect composer turns that off and the
 * <ToneMapping /> effect applies the same curve, reading the same exposure.
 */
function RendererSettings() {
  const gl = useThree((s) => s.gl)
  useLayoutEffect(() => {
    gl.toneMapping = THREE.NeutralToneMapping
    gl.toneMappingExposure = EXPOSURE
  }, [gl])
  return null
}

/** Dims the image-based lighting at night (three's scene.environmentIntensity). */
function EnvironmentIntensity({ value }: { value: number }) {
  const scene = useThree((s) => s.scene)
  useEffect(() => {
    scene.environmentIntensity = value
  }, [scene, value])
  return null
}

/** Camera position that fits the whole flat from the default direction. */
export function overviewEye(plan: FloorPlan, aspect: number, margin = 1.25) {
  const b = planBounds(plan)
  const radius = Math.hypot(b.maxX - b.minX, b.maxY - b.minY) / 2
  const halfFov = THREE.MathUtils.degToRad(FOV / 2)
  const fit = Math.min(Math.tan(halfFov), Math.tan(halfFov) * aspect)
  return VIEW_DIR.clone().multiplyScalar(Math.max((radius / fit) * margin, 3.5))
}
