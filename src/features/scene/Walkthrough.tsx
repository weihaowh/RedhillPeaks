import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import type { FloorPlan, Vec2 } from '../../types/plan'
import { useAppStore } from '../../store/useAppStore'
import { useDesignStore } from '../../store/useDesignStore'
import { closestOnSegment, planBounds, pointInPolygon, roomAnchor } from '../../lib/planMath'
import { footprint, wallBlocks } from '../../lib/furnitureMath'
import { catalogEntry } from '../furniture/catalog'

// First-person walkthrough: drag to look, WASD / arrow keys (or the on-screen joystick) to
// move, click the floor to walk there. You collide with walls and floor furniture.

export const EYE_HEIGHT = 1.6
const WALK_FOV = 70
const SPEED = 1.4 // m/s, a relaxed indoor walk
const RADIUS = 0.22
const LOOK_SPEED = 0.004

/** Joystick input from the touch overlay: x strafes right, y walks forward, both -1..1. */
export const walkInput = { x: 0, y: 0 }

function collides(p: Vec2, blocks: Vec2[][]) {
  return blocks.some((poly) => {
    if (pointInPolygon(p, poly)) return true
    for (let i = 0; i < poly.length; i++) if (closestOnSegment(p, poly[i], poly[(i + 1) % poly.length]).dist < RADIUS) return true
    return false
  })
}

/** Nearest free spot to `p`, searching outwards in rings. */
function freeSpot(p: Vec2, blocks: Vec2[][]): Vec2 {
  if (!collides(p, blocks)) return p
  for (let r = 0.15; r < 2.5; r += 0.15) {
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 8) {
      const q: Vec2 = [p[0] + Math.cos(a) * r, p[1] + Math.sin(a) * r]
      if (!collides(q, blocks)) return q
    }
  }
  return p
}

export function Walkthrough({ plan }: { plan: FloorPlan }) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera
  const canvas = useThree((s) => s.gl.domElement)
  const items = useDesignStore((s) => s.design.items)
  const selectedRoomId = useAppStore((s) => s.selectedRoomId)
  const walkTarget = useAppStore((s) => s.walkTarget)
  const b = planBounds(plan)

  const blocks = useMemo(
    () => [...wallBlocks(plan), ...items.filter((it) => catalogEntry(it.type)?.layer === 'floor' && (it.elevation ?? 0) < 1).map((it) => footprint(it))],
    [plan, items],
  )

  const state = useRef({ pos: [0, 0] as Vec2, yaw: 0, pitch: -0.05, keys: new Set<string>(), target: null as Vec2 | null })

  const placeIn = (roomId?: string | null) => {
    const room = plan.rooms.find((r) => r.id === roomId) ?? plan.rooms.find((r) => r.kind === 'living') ?? plan.rooms[0]
    if (!room) return
    const start = freeSpot(roomAnchor(room), blocks)
    const s = state.current
    s.pos = start
    s.target = null
    // Face the middle of the flat, or along +x if you're already there.
    const dx = b.cx - start[0]
    const dy = b.cy - start[1]
    s.yaw = Math.hypot(dx, dy) > 0.5 ? Math.atan2(-dx, -dy) : -Math.PI / 2
  }

  // Wider lens for walking; restore the orbit lens on exit.
  useEffect(() => {
    const previousFov = camera.fov
    camera.fov = WALK_FOV
    camera.updateProjectionMatrix()
    placeIn(useAppStore.getState().selectedRoomId)
    return () => {
      camera.fov = previousFov
      camera.updateProjectionMatrix()
    }
  }, [camera])

  // Picking a room (minimap, room list) jumps there; clicking the floor walks there.
  useEffect(() => {
    if (selectedRoomId) placeIn(selectedRoomId)
  }, [selectedRoomId])
  useEffect(() => {
    if (walkTarget) state.current.target = freeSpot(walkTarget.point, blocks)
  }, [walkTarget])

  useEffect(() => {
    const keys = state.current.keys
    const isTyping = (e: KeyboardEvent) => e.target instanceof Element && !!e.target.closest('input, textarea, select')
    const down = (e: KeyboardEvent) => {
      if (isTyping(e) || e.ctrlKey || e.metaKey) return
      const k = e.key.toLowerCase()
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'shift'].includes(k)) {
        keys.add(k)
        state.current.target = null
        if (k.startsWith('arrow')) e.preventDefault()
      }
    }
    const up = (e: KeyboardEvent) => keys.delete(e.key.toLowerCase())
    const blur = () => keys.clear()

    // Drag anywhere on the canvas to look around.
    let last: { x: number; y: number } | null = null
    const pointerDown = (e: PointerEvent) => {
      if (e.button === 0) last = { x: e.clientX, y: e.clientY }
    }
    const pointerMove = (e: PointerEvent) => {
      if (!last) return
      const s = state.current
      s.yaw -= (e.clientX - last.x) * LOOK_SPEED
      s.pitch = Math.min(Math.max(s.pitch - (e.clientY - last.y) * LOOK_SPEED, -1.2), 1.2)
      last = { x: e.clientX, y: e.clientY }
    }
    const pointerUp = () => (last = null)

    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', blur)
    canvas.addEventListener('pointerdown', pointerDown)
    window.addEventListener('pointermove', pointerMove)
    window.addEventListener('pointerup', pointerUp)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', blur)
      canvas.removeEventListener('pointerdown', pointerDown)
      window.removeEventListener('pointermove', pointerMove)
      window.removeEventListener('pointerup', pointerUp)
    }
  }, [canvas])

  useFrame((_, delta) => {
    const s = state.current
    const dt = Math.min(delta, 0.05)
    const k = s.keys
    let forward = (k.has('w') || k.has('arrowup') ? 1 : 0) - (k.has('s') || k.has('arrowdown') ? 1 : 0) + walkInput.y
    let strafe = (k.has('d') || k.has('arrowright') ? 1 : 0) - (k.has('a') || k.has('arrowleft') ? 1 : 0) + walkInput.x
    const len = Math.hypot(forward, strafe)
    if (len > 1) {
      forward /= len
      strafe /= len
    }
    // Camera forward is (-sin yaw, -cos yaw) in plan space; right is (cos yaw, -sin yaw).
    const fx = -Math.sin(s.yaw)
    const fy = -Math.cos(s.yaw)
    let step: Vec2 = [0, 0]
    if (len > 0.01) {
      const speed = SPEED * (k.has('shift') ? 2 : 1) * dt
      step = [(fx * forward + Math.cos(s.yaw) * strafe) * speed, (fy * forward - Math.sin(s.yaw) * strafe) * speed]
    } else if (s.target) {
      const dx = s.target[0] - s.pos[0]
      const dy = s.target[1] - s.pos[1]
      const dist = Math.hypot(dx, dy)
      if (dist < 0.05) s.target = null
      else {
        const speed = Math.min(SPEED * 1.5 * dt, dist)
        step = [(dx / dist) * speed, (dy / dist) * speed]
      }
    }

    // Slide along walls: try the full step, then each axis on its own.
    const [px, py] = s.pos
    const candidates: Vec2[] = [
      [px + step[0], py + step[1]],
      [px + step[0], py],
      [px, py + step[1]],
    ]
    const next = candidates.find((c) => !collides(c, blocks))
    if (next) s.pos = next
    else s.target = null

    camera.position.set(s.pos[0] - b.cx, EYE_HEIGHT, s.pos[1] - b.cy)
    camera.rotation.set(s.pitch, s.yaw, 0, 'YXZ')
  })

  return null
}
