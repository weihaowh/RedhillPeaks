import { memo } from 'react'
import * as THREE from 'three'
import { RoundedBox } from '@react-three/drei'
import type { Fixture } from '../../types/design'
import { useAppStore } from '../../store/useAppStore'
import { useDesign } from '../design/designContext'
import { useDaylight } from '../scene/daylight'
import { kelvinToColor } from '../scene/Ceilings'
import { fixtureDef } from './fixtures'

// Electrical points in 3D, in plan space (x, height, y). Wall points sit on the wall face with
// their front facing into the room (local +z), like furniture.

const PLATE = new THREE.MeshStandardMaterial({ color: '#f3f2ee', roughness: 0.35 })
const SLOT = new THREE.MeshStandardMaterial({ color: '#2a2a2c', roughness: 0.6 })
const UNIT = new THREE.MeshStandardMaterial({ color: '#f5f5f3', roughness: 0.3 })
const CONDENSER = new THREE.MeshStandardMaterial({ color: '#c9cbcd', roughness: 0.45, metalness: 0.3 })
const GRILLE = new THREE.MeshStandardMaterial({ color: '#4a4d50', roughness: 0.7 })
const CORD = new THREE.MeshStandardMaterial({ color: '#2a2a2c', roughness: 0.6 })
const SHADE = new THREE.MeshStandardMaterial({ color: '#2f2f31', roughness: 0.5, metalness: 0.4, side: THREE.DoubleSide })
const WARM = kelvinToColor(3000)
const GLOW = new THREE.MeshStandardMaterial({ color: WARM, emissive: WARM, emissiveIntensity: 4 })
const OFF = new THREE.MeshStandardMaterial({ color: '#e9e7e2', roughness: 0.4 })

export function FixtureLayer3D({ ceiling }: { ceiling: number }) {
  const fixtures = useDesign((d) => d.fixtures)
  const walking = useAppStore((s) => s.mode === 'walk')
  const { lightsOn } = useDaylight()
  return (
    <>
      {fixtures.map((f) => (
        <FixtureModel key={f.id} f={f} ceiling={ceiling} walking={walking} lit={lightsOn} />
      ))}
    </>
  )
}

const FixtureModel = memo(function FixtureModel({ f, ceiling, walking, lit }: { f: Fixture; ceiling: number; walking: boolean; lit: boolean }) {
  const def = fixtureDef(f.type)
  if (!def) return null
  const [w, h, d] = def.body
  const rot = (-f.rotation * Math.PI) / 180

  if (f.type === 'ac-indoor') {
    return (
      <group position={[f.x, f.height, f.y]} rotation-y={rot}>
        <RoundedBox args={[w, h, d]} radius={0.04} smoothness={3} position-z={d / 2} material={UNIT} castShadow />
        <mesh position={[0, -h / 2 + 0.04, d + 0.001]} material={SLOT}>
          <boxGeometry args={[w * 0.8, 0.02, 0.004]} />
        </mesh>
      </group>
    )
  }
  if (f.type === 'ac-condenser') {
    return (
      <group position={[f.x, 0, f.y]} rotation-y={rot}>
        <mesh position-y={h / 2 - 0.1} material={CONDENSER} castShadow receiveShadow>
          <boxGeometry args={[w, h, d]} />
        </mesh>
        <mesh position={[-w * 0.15, h / 2 - 0.1, d / 2 + 0.002]} material={GRILLE}>
          <circleGeometry args={[h * 0.36, 32]} />
        </mesh>
      </group>
    )
  }
  if (def.mount === 'ceiling') {
    if (f.type === 'light-pendant') {
      const drop = 0.95
      return (
        <group position={[f.x, ceiling, f.y]}>
          <mesh position-y={-drop / 2} material={CORD}>
            <cylinderGeometry args={[0.005, 0.005, drop, 6]} />
          </mesh>
          <mesh position-y={-drop - 0.1} material={SHADE} castShadow>
            <coneGeometry args={[0.2, 0.22, 32, 1, true]} />
          </mesh>
          <mesh position-y={-drop - 0.12} material={lit ? GLOW : OFF}>
            <sphereGeometry args={[0.05, 16, 12]} />
          </mesh>
        </group>
      )
    }
    if (f.type === 'light-fan') {
      return (
        <group position={[f.x, ceiling, f.y]}>
          <mesh position-y={-0.15} material={CORD}>
            <cylinderGeometry args={[0.012, 0.012, 0.3, 8]} />
          </mesh>
          <mesh position-y={-0.32} material={UNIT}>
            <cylinderGeometry args={[0.13, 0.11, 0.1, 24]} />
          </mesh>
          {[0, 1, 2].map((i) => (
            <mesh key={i} position-y={-0.33} rotation-y={(i * Math.PI * 2) / 3} material={UNIT} castShadow>
              <boxGeometry args={[1.25, 0.008, 0.12]} />
            </mesh>
          ))}
          <mesh position-y={-0.38} material={lit ? GLOW : OFF}>
            <cylinderGeometry args={[0.1, 0.1, 0.02, 24]} />
          </mesh>
        </group>
      )
    }
    // Downlights and strip points are flush with the ceiling, which only exists in the walkthrough.
    if (!walking) return null
    return (
      <mesh position={[f.x, ceiling - 0.004, f.y]} rotation-x={Math.PI / 2} material={lit ? GLOW : OFF}>
        {f.type === 'light-strip' ? <planeGeometry args={[w, 0.03]} /> : <circleGeometry args={[w / 2, 24]} />}
      </mesh>
    )
  }

  // Wall plate: sockets, switches, appliance and data points.
  const holes = f.type.startsWith('socket') || f.type.startsWith('point') ? (f.type === 'socket' || w < 0.1 ? 1 : 2) : 0
  return (
    <group position={[f.x, f.height, f.y]} rotation-y={rot}>
      <mesh position-z={d / 2} material={PLATE}>
        <boxGeometry args={[w, h, d]} />
      </mesh>
      {Array.from({ length: holes }, (_, i) => (
        <mesh key={i} position={[holes === 1 ? 0 : (i - 0.5) * (w / 2), 0, d + 0.001]} material={SLOT}>
          <boxGeometry args={[0.03, 0.03, 0.002]} />
        </mesh>
      ))}
      {def.group === 'Switches' && (
        <mesh position={[0, 0, d + 0.002]} material={PLATE}>
          <boxGeometry args={[w * 0.55, h * 0.55, 0.006]} />
        </mesh>
      )}
    </group>
  )
})
