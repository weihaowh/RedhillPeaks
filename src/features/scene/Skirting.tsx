import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import type { FloorPlan, RoomKind } from '../../types/plan'
import { alongWall, faceRoom, wallAngle, wallLength, wallPieces } from '../../lib/planMath'
import { MATERIALS } from './sceneMaterials'

const HEIGHT = 0.08
const DEPTH = 0.012
/** Wet areas get tiled skirting in practice, so only dry rooms get a painted board. */
const ROOM_KINDS: RoomKind[] = ['living', 'bedroom']

/**
 * Skirting boards along every wall face that looks into a living room or bedroom, broken at
 * doorways. Merged into one geometry since there are dozens of short pieces.
 */
export function Skirting({ plan }: { plan: FloorPlan }) {
  const geometry = useMemo(() => {
    const parts: THREE.BufferGeometry[] = []
    const matrix = new THREE.Matrix4()
    const quat = new THREE.Quaternion()
    const up = new THREE.Vector3(0, 1, 0)

    for (const wall of plan.walls) {
      const len = wallLength(wall)
      if (len < 0.05) continue
      const ux = (wall.end[0] - wall.start[0]) / len
      const uy = (wall.end[1] - wall.start[1]) / len
      quat.setFromAxisAngle(up, -wallAngle(wall))

      for (const side of [1, -1]) {
        const nx = -uy * side
        const ny = ux * side
        const room = faceRoom(plan, wall, side as 1 | -1)
        if (!room || !ROOM_KINDS.includes(room.kind)) continue

        const offset = wall.thickness / 2 + DEPTH / 2
        for (const piece of wallPieces(wall, 1)) {
          if (piece.bottom > 0) continue
          const length = piece.to - piece.from
          const [x, y] = alongWall(wall, (piece.from + piece.to) / 2)
          const box = new THREE.BoxGeometry(length, HEIGHT, DEPTH)
          matrix.compose(new THREE.Vector3(x + nx * offset, HEIGHT / 2, y + ny * offset), quat, new THREE.Vector3(1, 1, 1))
          box.applyMatrix4(matrix)
          parts.push(box)
        }
      }
    }
    if (!parts.length) return null
    const merged = mergeGeometries(parts)
    parts.forEach((p) => p.dispose())
    return merged
  }, [plan])

  useEffect(() => () => geometry?.dispose(), [geometry])

  if (!geometry) return null
  return <mesh geometry={geometry} material={MATERIALS.skirting} receiveShadow />
}
