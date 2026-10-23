import type { Opening, Wall } from '../../types/plan'
import { MATERIALS } from './sceneMaterials'

// Doors and windows, drawn in the opening's local frame: x runs along the wall (centred on
// the opening), y is up, and z points to the wall's left-hand normal (the `side: 1` side).

const DOOR_OPEN_ANGLE = (72 * Math.PI) / 180
const FRAME = 0.04
const LEAF = 0.04

interface OpeningProps {
  wall: Wall
  opening: Opening
  /** Cutaway height, if walls are being cut. */
  cut?: number
}

export function Door({ wall, opening, cut }: OpeningProps) {
  const w = opening.width
  const h = Math.min(opening.height, cut ?? Infinity)
  const side = opening.side ?? 1
  const atStart = (opening.hinge ?? 'start') === 'start'
  const leafWidth = w - 0.01
  const leafHeight = h - 0.01
  const material = opening.style === 'main' ? MATERIALS.doorMain : opening.style === 'shelter' ? MATERIALS.doorShelter : MATERIALS.doorStandard

  // Hinge sits just inside the face on the swing side; the leaf opens toward that side.
  const hingeX = atStart ? -w / 2 : w / 2
  const hingeZ = side * Math.max(wall.thickness / 2 - LEAF, 0)
  const dx = (atStart ? 1 : -1) * Math.cos(DOOR_OPEN_ANGLE)
  const dz = side * Math.sin(DOOR_OPEN_ANGLE)
  const leafRotation = Math.atan2(-dz, dx)
  const frameDepth = wall.thickness + 0.02

  return (
    <group>
      {/* Jambs and head */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * (w / 2 + FRAME / 2), h / 2, 0]} material={MATERIALS.frame}>
          <boxGeometry args={[FRAME, h, frameDepth]} />
        </mesh>
      ))}
      {h >= opening.height && (
        <mesh position={[0, h + FRAME / 2, 0]} material={MATERIALS.frame}>
          <boxGeometry args={[w + FRAME * 2, FRAME, frameDepth]} />
        </mesh>
      )}

      <group position={[hingeX, 0, hingeZ]} rotation-y={leafRotation}>
        <mesh position={[leafWidth / 2, leafHeight / 2 + 0.005, 0]} material={material} castShadow receiveShadow>
          <boxGeometry args={[leafWidth, leafHeight, opening.style === 'shelter' ? 0.06 : LEAF]} />
        </mesh>
        {leafHeight > 1.05 &&
          [-1, 1].map((s) => (
            <mesh key={s} position={[leafWidth - 0.09, 1.0, s * 0.035]} material={MATERIALS.handle}>
              <boxGeometry args={[0.13, 0.018, 0.018]} />
            </mesh>
          ))}
      </group>
    </group>
  )
}

export function WindowUnit({ opening, cut }: OpeningProps) {
  const w = opening.width
  const top = Math.min(opening.sill + opening.height, cut ?? Infinity)
  const h = top - opening.sill
  if (h <= 0.02) return null
  const bar = 0.045
  const depth = 0.06
  const panels = w > 1.8 ? 3 : w > 0.9 ? 2 : 1
  const midY = opening.sill + h / 2

  return (
    <group>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * (w / 2 - bar / 2), midY, 0]} material={MATERIALS.aluminium}>
          <boxGeometry args={[bar, h, depth]} />
        </mesh>
      ))}
      <mesh position={[0, opening.sill + bar / 2, 0]} material={MATERIALS.aluminium}>
        <boxGeometry args={[w, bar, depth]} />
      </mesh>
      {top >= opening.sill + opening.height - 1e-6 && (
        <mesh position={[0, top - bar / 2, 0]} material={MATERIALS.aluminium}>
          <boxGeometry args={[w, bar, depth]} />
        </mesh>
      )}
      {Array.from({ length: panels - 1 }, (_, i) => (
        <mesh key={i} position={[-w / 2 + (w * (i + 1)) / panels, midY, 0]} material={MATERIALS.aluminium}>
          <boxGeometry args={[0.035, h, depth - 0.01]} />
        </mesh>
      ))}
      <mesh position={[0, midY, 0]} material={MATERIALS.glass} renderOrder={2}>
        <boxGeometry args={[w - bar, h - bar, 0.008]} />
      </mesh>
    </group>
  )
}
