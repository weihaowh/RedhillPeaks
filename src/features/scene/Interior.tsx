import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import type { FloorPlan } from '../../types/plan'
import { polygonArea, roomAnchor } from '../../lib/planMath'
import { kelvinToColor } from './Ceilings'
import { paintMaterial } from './wallFinishes'

const WARM_WHITE = kelvinToColor(3000)
const DOWNLIGHT = new THREE.MeshStandardMaterial({ color: WARM_WHITE, emissive: WARM_WHITE, emissiveIntensity: 4 })
const DOWNLIGHT_OFF = new THREE.MeshStandardMaterial({ color: '#e9e7e2', roughness: 0.4 })

/** One warm ceiling light per room, for evenings and night-time views. */
export function RoomLights({ plan, height }: { plan: FloorPlan; height: number }) {
  return (
    <>
      {plan.rooms
        .filter((r) => r.kind !== 'ledge')
        .map((room) => {
          const [x, y] = roomAnchor(room)
          // Roughly scale with floor area so big rooms aren't dim and small ones aren't glaring.
          const intensity = 1.5 + polygonArea(room.polygon) * 0.35
          return <pointLight key={room.id} position={[x, height - 0.25, y]} color={WARM_WHITE} intensity={intensity} decay={2} />
        })}
    </>
  )
}

/**
 * Flat slab ceilings, only drawn in the walkthrough (the orbit view looks in from above).
 * They cast shadows, so daylight comes in through the windows rather than the roof.
 */
export function CeilingSlabs({ plan, height, lightsOn }: { plan: FloorPlan; height: number; lightsOn: boolean }) {
  const geometries = useMemo(
    () =>
      plan.rooms
        .filter((r) => r.kind !== 'ledge')
        .map((room) => ({ room, geometry: new THREE.ShapeGeometry(new THREE.Shape(room.polygon.map(([x, y]) => new THREE.Vector2(x, y)))) })),
    [plan],
  )
  useEffect(() => () => geometries.forEach((g) => g.geometry.dispose()), [geometries])
  const white = paintMaterial('#f6f4ef')

  return (
    <>
      {geometries.map(({ room, geometry }) => {
        const [x, y] = roomAnchor(room)
        return (
          <group key={room.id}>
            {/* Rotating +90° about x maps shape (x, y) to world (x, 0, y) with the face pointing down. */}
            <mesh geometry={geometry} rotation-x={Math.PI / 2} position-y={height} material={white} castShadow receiveShadow />
            <mesh position={[x, height - 0.004, y]} rotation-x={Math.PI / 2} material={lightsOn ? DOWNLIGHT : DOWNLIGHT_OFF}>
              <circleGeometry args={[0.07, 24]} />
            </mesh>
          </group>
        )
      })}
    </>
  )
}
