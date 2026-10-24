import { memo, useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { Html, Line } from '@react-three/drei'
import type { ThreeEvent } from '@react-three/fiber'
import type { FloorPlan, Vec2 } from '../../types/plan'
import type { FurnitureItem } from '../../types/design'
import { useDesignStore } from '../../store/useDesignStore'
import { useDesign, useReadOnly } from '../design/designContext'
import { useAppStore } from '../../store/useAppStore'
import { WALKWAY_COMFORT, WALKWAY_GAP, WALKWAY_MIN, clearances, itemWarnings, snapToWalls } from '../../lib/furnitureMath'
import { catalogEntry, footprintOf } from './catalog'
import { ItemModel } from './models'
import { updateItem } from './itemActions'
import { floorPointAt, setCameraEnabled } from '../scene/sceneBridge'
import { renoTool3d } from '../renovation/Renovation3D'

const ACCENT = '#d08850'
const PROBLEM = '#e5484d'

/** Placed furniture, drawn inside the flat's plan-space group. */
export function FurnitureLayer({ plan }: { plan: FloorPlan }) {
  const items = useDesign((d) => d.items)
  const readOnly = useReadOnly()
  const selectedId = useAppStore((s) => s.selectedItemId)

  // Items with a hard problem (overlap, wall, door) get a red footprint.
  const problems = useMemo(() => {
    const set = new Set<string>()
    if (readOnly) return set
    for (const item of items) if (itemWarnings(item, items, plan).some((w) => w.kind !== 'walkway')) set.add(item.id)
    return set
  }, [items, plan, readOnly])

  const selected = readOnly ? undefined : items.find((it) => it.id === selectedId)

  return (
    <group>
      {items.map((item) => (
        <PlacedItem key={item.id} item={item} plan={plan} selected={item.id === selected?.id} problem={problems.has(item.id)} readOnly={readOnly} />
      ))}
      {selected && <Measurements item={selected} items={items} plan={plan} />}
    </group>
  )
}

/**
 * Follows the pointer across the whole window until release, so a drag can't get stuck when
 * the pointer leaves the piece (or the canvas). The undo checkpoint is only kept if it moved.
 */
function startDrag(id: string, grab: Vec2, plan: FloorPlan, onEnd: () => void) {
  const design = useDesignStore.getState()
  const app = useAppStore.getState()
  design.checkpoint()
  app.setDraggingItem(true)
  document.body.style.cursor = 'grabbing'
  let moved = false

  const move = (ev: PointerEvent) => {
    const p = floorPointAt(ev.clientX, ev.clientY)
    const item = useDesignStore.getState().design.items.find((it) => it.id === id)
    if (!p || !item) return
    const next = { ...item, x: p[0] + grab[0], y: p[1] + grab[1] }
    // Hold Alt to place freely; otherwise pieces tuck flush against nearby walls.
    const free = ev.altKey || catalogEntry(item.type)?.layer === 'rug'
    const [x, y] = free ? [next.x, next.y] : snapToWalls(next, plan)
    moved = true
    updateItem(id, { x: Math.round(x * 1000) / 1000, y: Math.round(y * 1000) / 1000 }, false)
  }
  const end = () => {
    window.removeEventListener('pointermove', move)
    window.removeEventListener('pointerup', end)
    window.removeEventListener('pointercancel', end)
    useAppStore.getState().setDraggingItem(false)
    setCameraEnabled(true)
    document.body.style.cursor = ''
    if (!moved) useDesignStore.getState().dropCheckpoint()
    onEnd()
  }
  window.addEventListener('pointermove', move)
  window.addEventListener('pointerup', end)
  window.addEventListener('pointercancel', end)
}

interface PlacedProps {
  item: FurnitureItem
  plan: FloorPlan
  selected: boolean
  readOnly: boolean
  problem: boolean
}

const PlacedItem = memo(function PlacedItem({ item, plan, selected, problem, readOnly }: PlacedProps) {
  const dragging = useRef(false)
  const { width, depth } = footprintOf(item)
  const elevation = item.elevation ?? 0

  const onPointerDown = (e: ThreeEvent<PointerEvent>) => {
    // In the walkthrough, dragging looks around instead of moving furniture.
    // While building or hacking walls, clicks go through to the walls and floor instead.
    if (readOnly || e.button !== 0 || useAppStore.getState().featurePick || useAppStore.getState().mode === 'walk' || renoTool3d()) return
    e.stopPropagation()
    useAppStore.getState().selectItem(item.id)
    if (item.locked) return
    const start = floorPointAt(e.nativeEvent.clientX, e.nativeEvent.clientY)
    if (!start) return
    // The camera must stop orbiting now, not after React re-renders.
    setCameraEnabled(false)
    dragging.current = true
    startDrag(item.id, [item.x - start[0], item.y - start[1]], plan, () => (dragging.current = false))
  }

  // Box outline around the selected piece.
  const edges = useMemo(() => new THREE.EdgesGeometry(new THREE.BoxGeometry(width, item.height, depth)), [width, depth, item.height])
  useEffect(() => () => edges.dispose(), [edges])

  return (
    <group position={[item.x, 0, item.y]} rotation-y={(-item.rotation * Math.PI) / 180}>
      <group
        position-y={elevation}
        onPointerDown={onPointerDown}
        onClick={(e) => !renoTool3d() && e.stopPropagation()}
        onPointerOver={(e) => {
          if (readOnly) return
          e.stopPropagation()
          if (!dragging.current) document.body.style.cursor = item.locked ? 'pointer' : 'grab'
        }}
        onPointerOut={() => {
          if (!dragging.current) document.body.style.cursor = ''
        }}
      >
        <ItemModel item={item} />
      </group>
      {(selected || problem) && (
        <mesh rotation-x={-Math.PI / 2} position-y={0.008} renderOrder={2}>
          <planeGeometry args={[width, depth]} />
          <meshBasicMaterial color={problem ? PROBLEM : ACCENT} transparent opacity={problem ? 0.32 : 0.18} depthWrite={false} />
        </mesh>
      )}
      {selected && (
        <lineSegments geometry={edges} position-y={elevation + item.height / 2}>
          <lineBasicMaterial color={problem ? PROBLEM : ACCENT} />
        </lineSegments>
      )}
    </group>
  )
})

/** Size label above the selected piece and walkway gaps on each side. */
function Measurements({ item, items, plan }: { item: FurnitureItem; items: FurnitureItem[]; plan: FloorPlan }) {
  const dragging = useAppStore((s) => s.draggingItem)
  const gaps = useMemo(() => clearances(item, items, plan).filter((c) => c.distance >= 0.05), [item, items, plan])
  const top = (item.elevation ?? 0) + item.height + 0.15
  const mm = (m: number) => Math.round(m * 1000).toLocaleString()

  return (
    <group>
      {!dragging && (
        <Html position={[item.x, top, item.y]} center zIndexRange={[20, 10]}>
          <div className="label-pill whitespace-nowrap tabular-nums">
            {mm(item.width)} × {mm(item.depth)} × {mm(item.height)} mm
          </div>
        </Html>
      )}
      {gaps.map((g) => {
        const color = g.distance < WALKWAY_GAP ? '#8b8d91' : g.distance < WALKWAY_MIN ? PROBLEM : g.distance < WALKWAY_COMFORT ? '#e3a008' : '#2f9e6b'
        const mid: [number, number, number] = [(g.from[0] + g.to[0]) / 2, 0.04, (g.from[1] + g.to[1]) / 2]
        return (
          <group key={g.side}>
            <Line points={[[g.from[0], 0.04, g.from[1]], [g.to[0], 0.04, g.to[1]]]} color={color} lineWidth={2} dashed dashSize={0.06} gapSize={0.04} />
            <Html position={mid} center zIndexRange={[20, 10]}>
              <div className="pointer-events-none whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-semibold tabular-nums text-white shadow" style={{ background: color }}>
                {mm(g.distance)}
              </div>
            </Html>
          </group>
        )
      })}
    </group>
  )
}
