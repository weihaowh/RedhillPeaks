import * as THREE from 'three'
import type { CameraControls } from '@react-three/drei'
import type { RootState } from '@react-three/fiber'
import type { Vec2 } from '../../types/plan'

/**
 * Handles on the live 3D scene for code outside the <Canvas> (library drag-and-drop, "add at
 * view centre") and for event handlers that must act before React re-renders (freezing the
 * camera when a furniture drag starts). Filled in by <SceneBridge /> inside the canvas.
 */
export const sceneBridge: {
  camera?: THREE.Camera
  canvas?: HTMLCanvasElement
  controls?: CameraControls
  /** The canvas's R3F state getter (renderer, size, pixel ratio). */
  getState?: () => RootState
  /** Plan-space position of the world origin (the flat is centred on it). */
  offset: Vec2
  /** Centre of the 2D plan view, while it's showing. */
  planCentre?: () => Vec2
} = { offset: [0, 0] }

/** Drag-and-drop type for furniture coming from the library panel. */
export const FURNITURE_MIME = 'application/x-redhill-furniture'

const FLOOR = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)

/** Plan point on the floor under a screen position, if the 3D view is showing. */
export function floorPointAt(clientX: number, clientY: number): Vec2 | null {
  const { camera, canvas, offset } = sceneBridge
  if (!camera || !canvas) return null
  const rect = canvas.getBoundingClientRect()
  const ndc = new THREE.Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1)
  const ray = new THREE.Raycaster()
  ray.setFromCamera(ndc, camera)
  const hit = ray.ray.intersectPlane(FLOOR, new THREE.Vector3())
  return hit ? [hit.x + offset[0], hit.z + offset[1]] : null
}

/** Plan point the camera is looking at. */
export function viewCentre(): Vec2 | null {
  const { controls, offset } = sceneBridge
  if (!controls) return null
  const t = controls.getTarget(new THREE.Vector3())
  return [t.x + offset[0], t.z + offset[1]]
}

export function setCameraEnabled(enabled: boolean) {
  if (sceneBridge.controls) sceneBridge.controls.enabled = enabled
}

/** JPEG snapshot of the current 3D view, centre-cropped to 4:3, or null if the 3D view isn't showing. */
export function captureThumbnail(width = 480, height = 360): Promise<Blob | null> {
  const source = sceneBridge.canvas
  if (!source || !source.width) return Promise.resolve(null)
  const out = document.createElement('canvas')
  out.width = width
  out.height = height
  const ctx = out.getContext('2d')!
  const scale = Math.max(width / source.width, height / source.height)
  const sw = width / scale
  const sh = height / scale
  ctx.drawImage(source, (source.width - sw) / 2, (source.height - sh) / 2, sw, sh, 0, 0, width, height)
  return new Promise((resolve) => out.toBlob((b) => resolve(b), 'image/jpeg', 0.85))
}

export type ShotScale = 1 | 2 | '4k'

/**
 * PNG of the current 3D view at a higher resolution: temporarily raises the renderer's pixel
 * ratio, lets a few frames render (post-processing resizes with it), grabs the canvas, restores.
 */
export async function captureScreenshot(scale: ShotScale): Promise<Blob | null> {
  const get = sceneBridge.getState
  if (!get) return null
  const state = get()
  const previous = state.viewport.dpr
  const { width, height } = state.size
  const wanted = scale === '4k' ? 3840 / width : previous * scale
  const limit = state.gl.capabilities.maxTextureSize / Math.max(width, height)
  state.setDpr(Math.min(wanted, limit, 6))
  const frame = () => new Promise((r) => requestAnimationFrame(r))
  for (let i = 0; i < 4; i++) await frame()
  const blob = await new Promise<Blob | null>((r) => state.gl.domElement.toBlob(r, 'image/png'))
  state.setDpr(previous)
  return blob
}
