import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { create } from 'zustand'
import type { FloorPlan } from '../../types/plan'
import { useAppStore } from '../../store/useAppStore'
import { useDesignStore } from '../../store/useDesignStore'
import { polygonCentroid } from '../../lib/planMath'
import { sceneBridge } from './sceneBridge'
import { overviewEye } from './SceneStage'

// Unreal-style free camera for desktop: hold the right mouse button to look around and fly with
// WASD (Q/E down and up, Shift faster, scroll to change speed while holding). Middle-drag pans,
// the wheel alone moves forward and back, F frames the selection. The left button is left alone,
// so clicking still selects rooms and furniture.

const LOOK_SPEED = 0.0025
const MAX_PITCH = Math.PI / 2 - 0.02

/** UI state for the hint bar: whether the user is looking right now and has tried it yet. */
export const useFlyUi = create<{ looking: boolean; tried: boolean; speedFlash: number; setLooking: (v: boolean) => void; flashSpeed: () => void }>()((set) => ({
  looking: false,
  tried: false,
  speedFlash: 0,
  setLooking: (looking) => set((s) => ({ looking, tried: s.tried || looking })),
  flashSpeed: () => set((s) => ({ speedFlash: s.speedFlash + 1 })),
}))

export const finePointer = typeof window !== 'undefined' && window.matchMedia?.('(pointer: fine)').matches

export function FlyCamera({ plan }: { plan: FloorPlan }) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera
  const canvas = useThree((s) => s.gl.domElement)
  const size = useThree((s) => s.size)
  const resetNonce = useAppStore((s) => s.viewResetNonce)
  const state = useRef({
    yaw: 0,
    pitch: 0,
    keys: new Set<string>(),
    looking: false,
    panning: false,
    velocity: new THREE.Vector3(),
    focus: null as null | { from: THREE.Vector3; to: THREE.Vector3; yaw0: number; pitch0: number; yaw1: number; pitch1: number; t: number },
  })

  useEffect(() => {
    const s = state.current
    // Opened straight into fly mode: start from the usual overview instead of the default pose.
    if (!sceneBridge.flyHandoff && camera.quaternion.equals(new THREE.Quaternion())) {
      camera.position.copy(overviewEye(plan, size.width / size.height, 1.25))
      camera.lookAt(0, 0, 0)
    }
    const e = new THREE.Euler().setFromQuaternion(camera.quaternion, 'YXZ')
    s.yaw = e.y
    s.pitch = THREE.MathUtils.clamp(e.x, -MAX_PITCH, MAX_PITCH)
    sceneBridge.flying = true
    return () => {
      sceneBridge.flyHandoff = camera
      sceneBridge.flying = false
      sceneBridge.flyLooking = false
      useFlyUi.getState().setLooking(false)
      canvas.style.cursor = ''
    }
  }, [camera, canvas])

  useEffect(() => {
    const s = state.current
    const typing = (e: KeyboardEvent) => e.target instanceof Element && !!e.target.closest('input, textarea, select, [contenteditable="true"]')
    const setLooking = (v: boolean) => {
      s.looking = v
      sceneBridge.flyLooking = v
      canvas.style.cursor = v ? 'none' : ''
      useFlyUi.getState().setLooking(v)
      if (!v) s.keys.clear()
    }

    const pointerDown = (e: PointerEvent) => {
      if (e.button === 2) {
        setLooking(true)
        s.focus = null
        canvas.setPointerCapture(e.pointerId)
      } else if (e.button === 1) {
        e.preventDefault()
        s.panning = true
        canvas.setPointerCapture(e.pointerId)
      }
    }
    const pointerMove = (e: PointerEvent) => {
      if (s.looking) {
        s.yaw -= e.movementX * LOOK_SPEED
        s.pitch = THREE.MathUtils.clamp(s.pitch - e.movementY * LOOK_SPEED, -MAX_PITCH, MAX_PITCH)
      } else if (s.panning) {
        const k = 0.006 * Math.max(1, useAppStore.getState().flySpeed / 3)
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion)
        const up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion)
        camera.position.addScaledVector(right, -e.movementX * k).addScaledVector(up, e.movementY * k)
      }
    }
    const pointerUp = (e: PointerEvent) => {
      if (e.button === 2) setLooking(false)
      if (e.button === 1) s.panning = false
    }
    const wheel = (e: WheelEvent) => {
      e.preventDefault()
      const app = useAppStore.getState()
      if (s.looking) {
        app.setFlySpeed(app.flySpeed * (e.deltaY < 0 ? 1.25 : 0.8))
        useFlyUi.getState().flashSpeed()
        return
      }
      // Wheel alone dollies along the view, a bit further when flying fast.
      const forward = new THREE.Vector3()
      camera.getWorldDirection(forward)
      camera.position.addScaledVector(forward, -Math.sign(e.deltaY) * Math.min(Math.abs(e.deltaY) * 0.006, 1.2) * Math.max(1, app.flySpeed / 3))
    }
    const menu = (e: MouseEvent) => e.preventDefault()
    const keyDown = (e: KeyboardEvent) => {
      if (typing(e) || e.ctrlKey || e.metaKey || e.altKey) return
      const k = e.key.toLowerCase()
      if (k === 'f' && !s.looking) return focusSelection()
      if (['w', 'a', 's', 'd', 'q', 'e', 'shift', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'pageup', 'pagedown'].includes(k)) {
        // Letters only fly while the right button is held (as in Unreal); arrows always do.
        if (k.length === 1 && !s.looking) return
        s.keys.add(k)
        s.focus = null
        if (k.startsWith('arrow') || k.startsWith('page')) e.preventDefault()
      }
    }
    const keyUp = (e: KeyboardEvent) => s.keys.delete(e.key.toLowerCase())
    const blur = () => {
      s.keys.clear()
      setLooking(false)
      s.panning = false
    }

    // Frames the selected piece or room, keeping roughly the current heading.
    const focusSelection = () => {
      const app = useAppStore.getState()
      const item = useDesignStore.getState().design.items.find((it) => it.id === app.selectedItemId)
      const room = plan.rooms.find((r) => r.id === app.selectedRoomId)
      const [ox, oz] = sceneBridge.offset
      let target: THREE.Vector3
      let dist: number
      if (item) {
        target = new THREE.Vector3(item.x - ox, (item.elevation ?? 0) + item.height / 2, item.y - oz)
        dist = Math.max(item.width, item.depth, item.height) * 1.6 + 1.2
      } else if (room) {
        const [cx, cy] = polygonCentroid(room.polygon)
        const xs = room.polygon.map((p) => p[0])
        const ys = room.polygon.map((p) => p[1])
        target = new THREE.Vector3(cx - ox, 0.6, cy - oz)
        dist = Math.hypot(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) * 0.9 + 1
      } else return
      const dir = new THREE.Vector3()
      camera.getWorldDirection(dir)
      // Look down at it a little, from the current side.
      dir.y = Math.min(dir.y, -0.45)
      dir.normalize()
      const to = target.clone().addScaledVector(dir, -dist)
      const yaw1 = Math.atan2(-dir.x, -dir.z)
      const pitch1 = Math.asin(THREE.MathUtils.clamp(dir.y, -1, 1))
      // Turn the short way round.
      const yaw0 = s.yaw + Math.round((yaw1 - s.yaw) / (Math.PI * 2)) * Math.PI * 2
      s.focus = { from: camera.position.clone(), to, yaw0, pitch0: s.pitch, yaw1, pitch1, t: 0 }
    }

    canvas.addEventListener('pointerdown', pointerDown)
    window.addEventListener('pointermove', pointerMove)
    window.addEventListener('pointerup', pointerUp)
    canvas.addEventListener('wheel', wheel, { passive: false })
    canvas.addEventListener('contextmenu', menu)
    window.addEventListener('keydown', keyDown)
    window.addEventListener('keyup', keyUp)
    window.addEventListener('blur', blur)
    return () => {
      canvas.removeEventListener('pointerdown', pointerDown)
      window.removeEventListener('pointermove', pointerMove)
      window.removeEventListener('pointerup', pointerUp)
      canvas.removeEventListener('wheel', wheel)
      canvas.removeEventListener('contextmenu', menu)
      window.removeEventListener('keydown', keyDown)
      window.removeEventListener('keyup', keyUp)
      window.removeEventListener('blur', blur)
    }
  }, [camera, canvas, plan])

  // Reset view: glide back to the overview of the whole flat.
  const firstReset = useRef(true)
  useEffect(() => {
    if (firstReset.current) {
      firstReset.current = false
      return
    }
    const s = state.current
    const to = overviewEye(plan, size.width / size.height, 1.25)
    const dir = to.clone().negate().normalize()
    const yaw1 = Math.atan2(-dir.x, -dir.z)
    s.focus = { from: camera.position.clone(), to, yaw0: s.yaw + Math.round((yaw1 - s.yaw) / (Math.PI * 2)) * Math.PI * 2, pitch0: s.pitch, yaw1, pitch1: Math.asin(dir.y), t: 0 }
  }, [resetNonce])

  useFrame((_, delta) => {
    const s = state.current
    const dt = Math.min(delta, 0.05)

    if (s.focus) {
      const f = s.focus
      f.t = Math.min(f.t + dt / 0.45, 1)
      const k = 1 - Math.pow(1 - f.t, 3)
      camera.position.lerpVectors(f.from, f.to, k)
      s.yaw = THREE.MathUtils.lerp(f.yaw0, f.yaw1, k)
      s.pitch = THREE.MathUtils.lerp(f.pitch0, f.pitch1, k)
      if (f.t >= 1) s.focus = null
    }

    const k = s.keys
    const has = (...names: string[]) => names.some((n) => k.has(n))
    const forward = (has('w', 'arrowup') ? 1 : 0) - (has('s', 'arrowdown') ? 1 : 0)
    const strafe = (has('d', 'arrowright') ? 1 : 0) - (has('a', 'arrowleft') ? 1 : 0)
    const lift = (has('e', 'pageup') ? 1 : 0) - (has('q', 'pagedown') ? 1 : 0)

    // Fly along the view direction (pitch included), strafe level, lift straight up.
    const look = new THREE.Vector3(-Math.sin(s.yaw) * Math.cos(s.pitch), Math.sin(s.pitch), -Math.cos(s.yaw) * Math.cos(s.pitch))
    const right = new THREE.Vector3(Math.cos(s.yaw), 0, -Math.sin(s.yaw))
    const wish = new THREE.Vector3().addScaledVector(look, forward).addScaledVector(right, strafe).addScaledVector(THREE.Object3D.DEFAULT_UP, lift)
    if (wish.lengthSq() > 1) wish.normalize()
    const speed = useAppStore.getState().flySpeed * (k.has('shift') ? 2.5 : 1)
    // Ease in and out rather than starting and stopping dead.
    s.velocity.lerp(wish.multiplyScalar(speed), 1 - Math.exp(-dt * 12))
    camera.position.addScaledVector(s.velocity, dt)
    camera.position.y = THREE.MathUtils.clamp(camera.position.y, 0.15, 80)
    camera.rotation.set(s.pitch, s.yaw, 0, 'YXZ')
  })

  return null
}
