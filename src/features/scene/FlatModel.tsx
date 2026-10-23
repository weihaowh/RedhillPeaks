import { useMemo } from 'react'
import * as THREE from 'three'
import { Html } from '@react-three/drei'
import type { ThreeEvent } from '@react-three/fiber'
import type { FloorPlan, Room, Wall } from '../../types/plan'
import { useAppStore } from '../../store/useAppStore'
import { alongWall, polygonArea, roomAnchor, wallAngle, wallPieces } from '../../lib/planMath'
import { defaultFinish, finishMaterial } from './finishes'

export const CUTAWAY_HEIGHT = 1.1
const SLAB_DEPTH = 0.2
const ACCENT = '#d08850'

// Plan y runs down the drawing; in 3D it maps straight onto +z, so plan (x, y) → world (x, 0, y).

export function FlatModel({ plan }: { plan: FloorPlan }) {
  const wallMode = useAppStore((s) => s.wallMode)
  const wallPaint = useAppStore((s) => s.wallPaint)
  const showStructural = useAppStore((s) => s.showStructural)
  const showLabels = useAppStore((s) => s.showLabels)
  const cut = wallMode === 'cutaway' ? CUTAWAY_HEIGHT : undefined

  const materials = useMemo(
    () => ({
      wall: new THREE.MeshStandardMaterial({ color: wallPaint, roughness: 0.92 }),
      structural: new THREE.MeshStandardMaterial({ color: '#c8643f', roughness: 0.85 }),
      cap: new THREE.MeshStandardMaterial({ color: '#2b2c2f', roughness: 1 }),
      glass: new THREE.MeshStandardMaterial({ color: '#b9d4e3', roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.22, depthWrite: false }),
      slab: new THREE.MeshStandardMaterial({ color: '#cdc8c0', roughness: 0.95 }),
    }),
    [wallPaint],
  )

  return (
    <group>
      {plan.rooms.map((room) => (
        <RoomFloor key={room.id} room={room} slabMaterial={materials.slab} />
      ))}
      {plan.walls.map((wall) => (
        <WallMesh
          key={wall.id}
          wall={wall}
          ceiling={plan.ceilingHeight}
          cut={cut}
          material={showStructural && wall.structural ? materials.structural : materials.wall}
          capMaterial={materials.cap}
          glassMaterial={materials.glass}
        />
      ))}
      {showLabels && plan.rooms.map((room) => <RoomLabel key={room.id} room={room} />)}
    </group>
  )
}

function RoomFloor({ room, slabMaterial }: { room: Room; slabMaterial: THREE.Material }) {
  const finishId = useAppStore((s) => s.floorFinish[room.id]) ?? defaultFinish(room.kind)
  const selected = useAppStore((s) => s.selectedRoomId === room.id)
  const hovered = useAppStore((s) => s.hoveredRoomId === room.id)
  const select = useAppStore((s) => s.selectRoom)
  const setHovered = useAppStore((s) => s.setHoveredRoom)
  const level = room.floorLevel ?? 0

  const { floor, slab } = useMemo(() => {
    const shape = new THREE.Shape(room.polygon.map(([x, y]) => new THREE.Vector2(x, -y)))
    return {
      floor: new THREE.ShapeGeometry(shape),
      slab: new THREE.ExtrudeGeometry(shape, { depth: SLAB_DEPTH, bevelEnabled: false }),
    }
  }, [room])

  const onClick = (e: ThreeEvent<MouseEvent>) => {
    if (e.delta > 4) return // ignore the end of an orbit drag
    e.stopPropagation()
    select(selected ? null : room.id)
  }

  return (
    <group rotation-x={-Math.PI / 2}>
      <mesh geometry={slab} material={slabMaterial} position-z={level - SLAB_DEPTH - 0.002} receiveShadow />
      <mesh
        geometry={floor}
        material={finishMaterial(finishId)}
        position-z={level}
        receiveShadow
        onClick={onClick}
        onPointerOver={(e) => {
          e.stopPropagation()
          setHovered(room.id)
        }}
        onPointerOut={() => setHovered(null)}
      />
      {(selected || hovered) && (
        <mesh geometry={floor} position-z={level + 0.004} renderOrder={1}>
          <meshBasicMaterial color={ACCENT} transparent opacity={selected ? 0.24 : 0.1} depthWrite={false} />
        </mesh>
      )}
    </group>
  )
}

interface WallMeshProps {
  wall: Wall
  ceiling: number
  cut?: number
  material: THREE.Material
  capMaterial: THREE.Material
  glassMaterial: THREE.Material
}

function WallMesh({ wall, ceiling, cut, material, capMaterial, glassMaterial }: WallMeshProps) {
  const pieces = useMemo(() => wallPieces(wall, ceiling, cut), [wall, ceiling, cut])
  const rotation = -wallAngle(wall)
  const visibleTop = Math.min(wall.height ?? ceiling, cut ?? Infinity)

  return (
    <>
      {pieces.map((p, i) => {
        const len = p.to - p.from
        const h = p.top - p.bottom
        const [x, z] = alongWall(wall, (p.from + p.to) / 2)
        return (
          <group key={i} position={[x, 0, z]} rotation-y={rotation}>
            <mesh position-y={p.bottom + h / 2} material={material} castShadow receiveShadow>
              <boxGeometry args={[len, h, wall.thickness]} />
            </mesh>
            {p.top >= visibleTop - 1e-6 && (
              <mesh position-y={p.top + 0.002} material={capMaterial}>
                <boxGeometry args={[len, 0.004, wall.thickness]} />
              </mesh>
            )}
          </group>
        )
      })}
      {(wall.openings ?? [])
        .filter((o) => o.kind === 'window')
        .map((o) => {
          const top = Math.min(o.sill + o.height, cut ?? Infinity)
          if (top <= o.sill) return null
          const h = top - o.sill
          const [x, z] = alongWall(wall, o.offset + o.width / 2)
          return (
            <mesh key={o.id} position={[x, o.sill + h / 2, z]} rotation-y={rotation} material={glassMaterial}>
              <boxGeometry args={[o.width, h, 0.02]} />
            </mesh>
          )
        })}
    </>
  )
}

function RoomLabel({ room }: { room: Room }) {
  const [x, z] = roomAnchor(room)
  return (
    <Html position={[x, (room.floorLevel ?? 0) + 0.05, z]} center zIndexRange={[10, 0]}>
      <div className="label-pill">
        {room.name} <span className="ml-1 text-muted">{polygonArea(room.polygon).toFixed(1)} m²</span>
      </div>
    </Html>
  )
}
