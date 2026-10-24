import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import type { FloorPlan } from '../../types/plan'
import { pointInPolygon, polygonArea, roomAnchor } from '../../lib/planMath'
import { useDesign } from '../design/designContext'
import { LIGHT_POWER } from '../electrical/fixtures'
import { kelvinToColor } from './Ceilings'
import { paintMaterial } from './wallFinishes'

const WARM_WHITE = kelvinToColor(3000)
const DOWNLIGHT = new THREE.MeshStandardMaterial({ color: WARM_WHITE, emissive: WARM_WHITE, emissiveIntensity: 4 })
const DOWNLIGHT_OFF = new THREE.MeshStandardMaterial({ color: '#e9e7e2', roughness: 0.4 })

/**
 * Warm light per room for evenings and night. Rooms with placed light fittings glow from where
 * those fittings are, as bright as their number and type; others get one generic ceiling light.
 * One point light per room keeps the light count (and shader cost) low.
 */
export function RoomLights({ plan, height }: { plan: FloorPlan; height: number }) {
  const fixtures = useDesign((d) => d.fixtures)
  return (
    <>
      {plan.rooms
        .filter((r) => r.kind !== 'ledge')
        .map((room) => {
          const lights = fixtures.filter((f) => LIGHT_POWER[f.type] && pointInPolygon([f.x, f.y], room.polygon))
          let [x, y] = roomAnchor(room)
          // Roughly scale with floor area so big rooms aren't dim and small ones aren't glaring.
          let intensity = 1.5 + polygonArea(room.polygon) * 0.35
          if (lights.length) {
            x = lights.reduce((s, f) => s + f.x, 0) / lights.length
            y = lights.reduce((s, f) => s + f.y, 0) / lights.length
            intensity = lights.reduce((s, f) => s + LIGHT_POWER[f.type], 0) * 1.2
          }
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
  const fixtures = useDesign((d) => d.fixtures)
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
            {/* A stand-in downlight until real fittings are placed in the room. */}
            {!fixtures.some((f) => LIGHT_POWER[f.type] && pointInPolygon([f.x, f.y], room.polygon)) && (
              <mesh position={[x, height - 0.004, y]} rotation-x={Math.PI / 2} material={lightsOn ? DOWNLIGHT : DOWNLIGHT_OFF}>
                <circleGeometry args={[0.07, 24]} />
              </mesh>
            )}
          </group>
        )
      })}
    </>
  )
}
