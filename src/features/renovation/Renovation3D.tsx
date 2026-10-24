import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { Html } from '@react-three/drei'
import { useThree, type ThreeEvent } from '@react-three/fiber'
import { create } from 'zustand'
import type { FloorPlan, Vec2, Wall } from '../../types/plan'
import { useAppStore } from '../../store/useAppStore'
import { useEditorStore } from '../../store/useEditorStore'
import { useDesignStore } from '../../store/useDesignStore'
import { alongWall, distance, wallAngle, wallLength, wallPieces } from '../../lib/planMath'
import { snapPoint } from '../../lib/snapping'
import { builtKind, hackBlocker, spanExtent } from '../../lib/renovation'
import { floorPointAt } from '../scene/sceneBridge'
import { MATERIALS } from '../scene/sceneMaterials'
import { addBuiltWall, addHack, removeBuiltWall, removeHack, useRenoNotice } from './renoActions'

// Building and hacking walls in the 3D overview. Children of <Stage>, so positions are plan
// metres (plan x, y → world x, z). The traced walls themselves react in FlatModel's WallMesh.

/** The renovation tool active in 3D: the 2D editor's Build/Hack tool, while orbiting or flying. */
export function useRenoTool3d(): 'build' | 'hack' | null {
  const tool = useEditorStore((s) => s.tool)
  const overview = useAppStore((s) => s.mode === 'orbit')
  return overview && (tool === 'build' || tool === 'hack') ? tool : null
}

export const renoTool3d = () => {
  const tool = useEditorStore.getState().tool
  return useAppStore.getState().mode === 'orbit' && (tool === 'build' || tool === 'hack') ? tool : null
}

/** Wall under the pointer while hacking, for the red highlight. */
export const useHackHover = create<{ wallId: string | null; set: (id: string | null) => void }>()((set) => ({ wallId: null, set: (wallId) => set({ wallId }) }))

export const HACK_OK = new THREE.MeshStandardMaterial({ color: '#e5484d', roughness: 0.7, transparent: true, opacity: 0.85 })
export const HACK_BLOCKED = new THREE.MeshStandardMaterial({ color: '#55565a', roughness: 0.9 })
const GHOST = new THREE.MeshBasicMaterial({ color: '#e5484d', transparent: true, opacity: 0.22, depthWrite: false })
const GHOST_HOVER = new THREE.MeshBasicMaterial({ color: '#e5484d', transparent: true, opacity: 0.45, depthWrite: false })
const PREVIEW = new THREE.MeshStandardMaterial({ color: '#d08850', transparent: true, opacity: 0.55, depthWrite: false })
const PREVIEW_GLASS = new THREE.MeshStandardMaterial({ color: '#7cc4ea', transparent: true, opacity: 0.4, depthWrite: false })
const FRAME = new THREE.MeshStandardMaterial({ color: '#232427', roughness: 0.45, metalness: 0.3 })

/** Pointer handlers for a wall in hack mode: hover highlight, click to hack (or remove a new wall). */
export function hackHandlers(plan: FloorPlan, wall: Wall) {
  return {
    onPointerOver: (e: ThreeEvent<PointerEvent>) => {
      if (renoTool3d() !== 'hack') return
      e.stopPropagation()
      useHackHover.getState().set(wall.id)
    },
    onPointerOut: () => {
      if (useHackHover.getState().wallId === wall.id) useHackHover.getState().set(null)
    },
    onClick: (e: ThreeEvent<MouseEvent>) => {
      if (renoTool3d() !== 'hack' || e.delta > 4) return false
      e.stopPropagation()
      if (wall.built) {
        removeBuiltWall(wall.id)
        useRenoNotice.getState().show('New wall removed.')
        return true
      }
      const blocked = hackBlocker(plan, wall)
      if (blocked) {
        useRenoNotice.getState().show(blocked)
        return true
      }
      addHack(wall.id, 0, Math.round(wallLength(wall) * 1000) / 1000)
      useHackHover.getState().set(null)
      return true
    },
  }
}

/** Red ghosts where walls have been hacked; click one in hack mode to keep that wall after all. */
export function HackGhosts({ plan }: { plan: FloorPlan }) {
  const hacks = useDesignStore((s) => s.design.renovation?.hacks)
  const [hover, setHover] = useState<string | null>(null)
  if (!hacks?.length) return null
  return (
    <>
      {hacks.map((h) => {
        const wall = plan.walls.find((w) => w.id === h.wallId)
        if (!wall) return null
        const [a, b] = spanExtent(wall, Math.min(h.from, h.to), Math.max(h.from, h.to))
        const height = wall.height ?? plan.ceilingHeight
        const [x, z] = alongWall(wall, (a + b) / 2)
        return (
          <mesh
            key={h.id}
            position={[x, height / 2, z]}
            rotation-y={-wallAngle(wall)}
            material={hover === h.id ? GHOST_HOVER : GHOST}
            onPointerOver={(e) => {
              e.stopPropagation()
              setHover(h.id)
            }}
            onPointerOut={() => setHover(null)}
            onClick={(e) => {
              if (e.delta > 4) return
              e.stopPropagation()
              removeHack(h.id)
              useRenoNotice.getState().show('Wall kept: hack removed.')
            }}
          >
            <boxGeometry args={[b - a, height, wall.thickness + 0.01]} />
          </mesh>
        )
      })}
    </>
  )
}

/** A new glass partition: clear panels in slim black frames, with gaps for its doors. */
export function GlassWall({ wall, ceiling, cut, onClick }: { wall: Wall; ceiling: number; cut?: number; onClick?: (e: ThreeEvent<MouseEvent>) => void }) {
  const pieces = useMemo(() => wallPieces(wall, ceiling, cut), [wall, ceiling, cut])
  const rotation = -wallAngle(wall)
  const bar = 0.04
  return (
    <>
      {pieces.map((p, i) => {
        const len = p.to - p.from
        const h = p.top - p.bottom
        if (len < 0.02 || h < 0.02) return null
        const [x, z] = alongWall(wall, (p.from + p.to) / 2)
        const mullions = Math.max(0, Math.round(len / 1.2) - 1)
        return (
          <group key={i} position={[x, p.bottom, z]} rotation-y={rotation} onClick={onClick}>
            <mesh position-y={h / 2} material={MATERIALS.glass} renderOrder={2}>
              <boxGeometry args={[len, h, 0.012]} />
            </mesh>
            {[bar / 2, h - bar / 2].map((y) => (
              <mesh key={y} position-y={y} material={FRAME} castShadow>
                <boxGeometry args={[len, bar, wall.thickness]} />
              </mesh>
            ))}
            {[-1, 1].map((s) => (
              <mesh key={s} position={[s * (len / 2 - bar / 2), h / 2, 0]} material={FRAME} castShadow>
                <boxGeometry args={[bar, h, wall.thickness]} />
              </mesh>
            ))}
            {Array.from({ length: mullions }, (_, k) => (
              <mesh key={`m${k}`} position={[-len / 2 + (len * (k + 1)) / (mullions + 1), h / 2, 0]} material={FRAME}>
                <boxGeometry args={[0.025, h, wall.thickness * 0.8]} />
              </mesh>
            ))}
          </group>
        )
      })}
    </>
  )
}

/** Build tool in 3D: click the floor to start a wall, click again for each corner. */
export function BuildTool3D({ plan }: { plan: FloorPlan }) {
  const canvas = useThree((s) => s.gl.domElement)
  const draft = useEditorStore((s) => s.draft)
  const kindId = useEditorStore((s) => s.buildKind)
  const [cursor, setCursor] = useState<Vec2 | null>(null)
  const kind = builtKind(kindId)
  const last = draft[draft.length - 1]
  // Read through a ref so adding a wall (which changes the plan) doesn't reset the listeners.
  const planRef = useRef(plan)
  planRef.current = plan

  // Leaving the tool drops any half-drawn wall.
  useEffect(() => () => useEditorStore.getState().setDraft([]), [])

  useEffect(() => {
    let down: { x: number; y: number } | null = null
    const snapAt = (e: PointerEvent | MouseEvent): Vec2 | null => {
      const p = floorPointAt(e.clientX, e.clientY)
      if (!p) return null
      const { draft } = useEditorStore.getState()
      return snapPoint(p, planRef.current, 0.15, { from: draft[draft.length - 1], extra: draft, disabled: e.altKey }).point
    }
    const move = (e: PointerEvent) => setCursor(snapAt(e))
    const pointerDown = (e: PointerEvent) => {
      if (e.button === 0) down = { x: e.clientX, y: e.clientY }
    }
    const pointerUp = (e: PointerEvent) => {
      // A click, not the end of a camera drag.
      if (e.button !== 0 || !down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5) return
      down = null
      const p = snapAt(e)
      if (!p) return
      const { draft, setDraft, buildKind } = useEditorStore.getState()
      const prev = draft[draft.length - 1]
      if (!prev) return setDraft([p])
      if (distance(p, prev) < 0.05) return setDraft([])
      const k = builtKind(buildKind)
      addBuiltWall({ start: prev, end: p, thickness: k.thickness, built: k.id })
      setDraft(draft.length >= 2 && distance(p, draft[0]) < 1e-3 ? [] : [...draft, p])
    }
    const finish = () => useEditorStore.getState().setDraft([])
    const leave = () => setCursor(null)
    canvas.addEventListener('pointermove', move)
    canvas.addEventListener('pointerdown', pointerDown)
    canvas.addEventListener('pointerup', pointerUp)
    canvas.addEventListener('dblclick', finish)
    canvas.addEventListener('pointerleave', leave)
    return () => {
      canvas.removeEventListener('pointermove', move)
      canvas.removeEventListener('pointerdown', pointerDown)
      canvas.removeEventListener('pointerup', pointerUp)
      canvas.removeEventListener('dblclick', finish)
      canvas.removeEventListener('pointerleave', leave)
    }
  }, [canvas])

  const height = plan.ceilingHeight
  const ghost = last && cursor && distance(last, cursor) > 0.02 ? { len: distance(last, cursor), mid: [(last[0] + cursor[0]) / 2, (last[1] + cursor[1]) / 2] as Vec2, angle: Math.atan2(cursor[1] - last[1], cursor[0] - last[0]) } : null

  return (
    <group>
      {cursor && (
        <mesh position={[cursor[0], 0.02, cursor[1]]} rotation-x={-Math.PI / 2}>
          <ringGeometry args={[0.09, 0.13, 32]} />
          <meshBasicMaterial color="#d08850" depthTest={false} />
        </mesh>
      )}
      {draft.map((p, i) => (
        <mesh key={i} position={[p[0], 0.02, p[1]]} rotation-x={-Math.PI / 2}>
          <circleGeometry args={[0.07, 24]} />
          <meshBasicMaterial color="#d08850" depthTest={false} />
        </mesh>
      ))}
      {ghost && (
        <group position={[ghost.mid[0], 0, ghost.mid[1]]} rotation-y={-ghost.angle}>
          <mesh position-y={height / 2} material={kind.id === 'glass' ? PREVIEW_GLASS : PREVIEW}>
            <boxGeometry args={[ghost.len, height, kind.thickness]} />
          </mesh>
          <Html position={[0, height + 0.25, 0]} center zIndexRange={[20, 0]}>
            <div className="label-pill whitespace-nowrap tabular-nums">{Math.round(ghost.len * 1000).toLocaleString()} mm</div>
          </Html>
        </group>
      )}
    </group>
  )
}
