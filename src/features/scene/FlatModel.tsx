import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { Html } from '@react-three/drei'
import type { ThreeEvent } from '@react-three/fiber'
import type { FloorPlan, Room, Wall } from '../../types/plan'
import { faceKey, type Design } from '../../types/design'
import { useAppStore } from '../../store/useAppStore'
import { useDesignStore } from '../../store/useDesignStore'
import { useDesign, useReadOnly } from '../design/designContext'
import { alongWall, faceRoom, polygonArea, roomAnchor, wallAngle, wallLength, wallPieces, type WallPiece } from '../../lib/planMath'
import { floorMaterial, floorSpecFor } from './finishes'
import { featureMaterial, paintMaterial } from './wallFinishes'
import { Door, WindowUnit } from './Openings'
import { Skirting } from './Skirting'
import { Ceilings } from './Ceilings'
import { CeilingSlabs } from './Interior'
import { useDaylight } from './daylight'
import { sceneBridge } from './sceneBridge'
import { hackBlocker } from '../../lib/renovation'
import { BuildTool3D, GlassWall, HACK_BLOCKED, HACK_OK, HackGhosts, hackHandlers, renoTool3d, useHackHover, useRenoTool3d } from '../renovation/Renovation3D'

export const CUTAWAY_HEIGHT = 1.1
const SLAB_DEPTH = 0.2
const ACCENT = '#d08850'

const STRUCTURAL = new THREE.MeshStandardMaterial({ color: '#c8643f', roughness: 0.85 })
const CAP = new THREE.MeshStandardMaterial({ color: '#2b2c2f', roughness: 1 })
const SLAB = new THREE.MeshStandardMaterial({ color: '#cdc8c0', roughness: 0.95 })

// Plan y runs down the drawing; in 3D it maps straight onto +z, so plan (x, y) → world (x, 0, y).

export function FlatModel({ plan }: { plan: FloorPlan }) {
  const wallMode = useAppStore((s) => s.wallMode)
  const showStructural = useAppStore((s) => s.showStructural)
  const readOnly = useReadOnly()
  const walking = useAppStore((s) => s.mode === 'walk') && !readOnly
  const showLabels = useAppStore((s) => s.showLabels) && !readOnly && !walking
  const design = useDesign((d) => d)
  const { lightsOn } = useDaylight()
  // Walls are always full height when you're inside the flat.
  const cut = wallMode === 'cutaway' && !walking ? CUTAWAY_HEIGHT : undefined
  const tool = useRenoTool3d()
  const renoTool = readOnly ? null : tool
  const hoverId = useHackHover((s) => s.wallId)
  useEffect(() => {
    if (renoTool !== 'hack') useHackHover.getState().set(null)
  }, [renoTool])

  // Which room each wall face looks into only changes with the plan.
  const faceRooms = useMemo(() => {
    const map = new Map<string, string>()
    for (const w of plan.walls) {
      for (const side of [1, -1] as const) {
        const room = faceRoom(plan, w, side)
        if (room) map.set(faceKey(w.id, side), room.id)
      }
    }
    return map
  }, [plan])

  const faceMaterial = (wall: Wall, side: 1 | -1, d: Design): THREE.Material => {
    if (showStructural && wall.structural) return STRUCTURAL
    const feature = d.features[faceKey(wall.id, side)]
    const fm = feature && featureMaterial(feature)
    if (fm) return fm
    const roomId = faceRooms.get(faceKey(wall.id, side))
    return paintMaterial((roomId && d.roomPaint[roomId]) || d.wallPaint)
  }

  return (
    <group>
      {plan.rooms.map((room) => (
        <RoomFloor key={room.id} room={room} />
      ))}
      {plan.walls
        .filter((wall) => wallLength(wall) > 0.005)
        .map((wall) => {
          const hack = renoTool === 'hack' ? hackHandlers(plan, wall) : undefined
          if (wall.built === 'glass') return <GlassWall key={wall.id} wall={wall} ceiling={plan.ceilingHeight} cut={cut} onClick={hack?.onClick} />
          const base = showStructural && wall.structural ? STRUCTURAL : paintMaterial(design.wallPaint)
          // BoxGeometry face order: +x, -x, +y, -y, +z (side 1), -z (side -1).
          let materials = [base, base, base, base, faceMaterial(wall, 1, design), faceMaterial(wall, -1, design)]
          // Hack tool: red where it can be hacked, dark grey where it can't.
          if (hack && hoverId === wall.id) materials = Array(6).fill(hackBlocker(plan, wall) ? HACK_BLOCKED : HACK_OK)
          return <WallMesh key={wall.id} wall={wall} ceiling={plan.ceilingHeight} cut={cut} materials={materials} hack={hack} />
        })}
      {renoTool === 'hack' && <HackGhosts plan={plan} />}
      {renoTool === 'build' && <BuildTool3D plan={plan} />}
      <Skirting plan={plan} />
      {cut === undefined && <Ceilings plan={plan} ceilings={design.ceilings} height={plan.ceilingHeight} />}
      {walking && <CeilingSlabs plan={plan} height={plan.ceilingHeight} lightsOn={lightsOn} />}
      {showLabels && plan.rooms.map((room) => <RoomLabel key={room.id} room={room} />)}
    </group>
  )
}

function RoomFloor({ room }: { room: Room }) {
  const stored = useDesign((d) => d.floors[room.id])
  const readOnly = useReadOnly()
  const selected = useAppStore((s) => s.selectedRoomId === room.id) && !readOnly
  const hovered = useAppStore((s) => s.hoveredRoomId === room.id) && !readOnly
  const select = useAppStore((s) => s.selectRoom)
  const setHovered = useAppStore((s) => s.setHoveredRoom)
  const level = room.floorLevel ?? 0
  const spec = floorSpecFor(stored, room.kind)

  const { floor, slab } = useMemo(() => {
    const shape = new THREE.Shape(room.polygon.map(([x, y]) => new THREE.Vector2(x, -y)))
    return {
      floor: new THREE.ShapeGeometry(shape),
      slab: new THREE.ExtrudeGeometry(shape, { depth: SLAB_DEPTH, bevelEnabled: false }),
    }
  }, [room])

  const onClick = (e: ThreeEvent<MouseEvent>) => {
    if (readOnly || e.delta > 4) return // ignore the end of an orbit drag
    e.stopPropagation()
    const app = useAppStore.getState()
    if (app.featurePick || renoTool3d()) return // picking a wall or building, not selecting a room
    // In the walkthrough, clicking the floor walks you there.
    if (app.mode === 'walk') return app.walkTo([e.point.x + sceneBridge.offset[0], e.point.z + sceneBridge.offset[1]])
    select(selected ? null : room.id)
  }

  return (
    <group rotation-x={-Math.PI / 2}>
      <mesh geometry={slab} material={SLAB} position-z={level - SLAB_DEPTH - 0.002} receiveShadow />
      <mesh
        geometry={floor}
        material={floorMaterial(spec)}
        position-z={level}
        receiveShadow
        onClick={onClick}
        onPointerOver={(e) => {
          if (readOnly) return
          e.stopPropagation()
          setHovered(room.id)
        }}
        onPointerOut={() => !readOnly && setHovered(null)}
      />
      {(selected || hovered) && (
        <mesh geometry={floor} position-z={level + 0.004} renderOrder={1}>
          <meshBasicMaterial color={ACCENT} transparent opacity={selected ? 0.24 : 0.1} depthWrite={false} />
        </mesh>
      )}
    </group>
  )
}

/**
 * Box for one wall piece whose two long faces get UVs in metres: u runs along the wall from
 * its start (mirrored on the -z face so patterns read left-to-right from either side), v is
 * height above the floor. Textures then only need a repeat of 1 / (metres per tile).
 */
function wallPieceGeometry(piece: WallPiece, thickness: number) {
  const len = piece.to - piece.from
  const h = piece.top - piece.bottom
  const along = (piece.from + piece.to) / 2
  const midY = piece.bottom + h / 2
  const geo = new THREE.BoxGeometry(len, h, thickness)
  const pos = geo.getAttribute('position')
  const uv = geo.getAttribute('uv')
  for (const face of [4, 5]) {
    for (let i = face * 4; i < face * 4 + 4; i++) {
      const u = along + pos.getX(i)
      uv.setXY(i, face === 4 ? u : -u, midY + pos.getY(i))
    }
  }
  uv.needsUpdate = true
  return geo
}

function WallMesh({ wall, ceiling, cut, materials, hack }: { wall: Wall; ceiling: number; cut?: number; materials: THREE.Material[]; hack?: ReturnType<typeof hackHandlers> }) {
  const pieces = useMemo(() => wallPieces(wall, ceiling, cut), [wall, ceiling, cut])
  const geometries = useMemo(() => pieces.map((p) => wallPieceGeometry(p, wall.thickness)), [pieces, wall.thickness])
  useEffect(() => () => geometries.forEach((g) => g.dispose()), [geometries])
  const rotation = -wallAngle(wall)
  const visibleTop = Math.min(wall.height ?? ceiling, cut ?? Infinity)

  const onClick = (e: ThreeEvent<MouseEvent>) => {
    if (hack?.onClick(e)) return
    const pick = useAppStore.getState().featurePick
    if (!pick || e.delta > 4) return
    const side = e.face?.materialIndex === 4 ? 1 : e.face?.materialIndex === 5 ? -1 : null
    if (!side) return
    e.stopPropagation()
    useDesignStore.getState().edit((d) => ({ ...d, features: { ...d.features, [faceKey(wall.id, side)]: pick } }))
    useAppStore.getState().setFeaturePick(null)
  }

  return (
    <>
      {pieces.map((p, i) => {
        const len = p.to - p.from
        const h = p.top - p.bottom
        const [x, z] = alongWall(wall, (p.from + p.to) / 2)
        return (
          <group key={i} position={[x, 0, z]} rotation-y={rotation}>
            <mesh
              geometry={geometries[i]}
              position-y={p.bottom + h / 2}
              material={materials}
              castShadow
              receiveShadow
              onClick={onClick}
              onPointerOver={hack?.onPointerOver}
              onPointerOut={hack?.onPointerOut}
            />
            {p.top >= visibleTop - 1e-6 && (
              <mesh position-y={p.top + 0.002} material={CAP}>
                <boxGeometry args={[len, 0.004, wall.thickness]} />
              </mesh>
            )}
          </group>
        )
      })}
      {(wall.openings ?? []).map((o) => {
        if (o.kind === 'opening') return null
        const [x, z] = alongWall(wall, o.offset + o.width / 2)
        return (
          <group key={o.id} position={[x, 0, z]} rotation-y={rotation}>
            {o.kind === 'door' ? <Door wall={wall} opening={o} cut={cut} /> : <WindowUnit wall={wall} opening={o} cut={cut} />}
          </group>
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
