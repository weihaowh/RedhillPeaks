import { useEffect, useRef } from 'react'
import clsx from 'clsx'
import type { FloorPlan, Vec2 } from '../../types/plan'
import { useAppStore } from '../../store/useAppStore'
import { planBounds, wallLength, wallOutline } from '../../lib/planMath'
import { KIND_COLOR } from '../../components/LeftPanel'

/** Camera position (plan metres) and heading (radians, plan space), written every frame by the 3D scene. */
export const cameraPose = { x: 0, y: 0, heading: 0 }

const points = (pts: Vec2[]) => pts.map(([x, y]) => `${x},${y}`).join(' ')

/** Small top-down plan in the corner of the 3D view. Click a room to fly the camera there. */
export function Minimap({ plan }: { plan: FloorPlan }) {
  const marker = useRef<SVGGElement>(null)
  const selectedId = useAppStore((s) => s.selectedRoomId)
  const hoveredId = useAppStore((s) => s.hoveredRoomId)
  const selectRoom = useAppStore((s) => s.selectRoom)
  const setHovered = useAppStore((s) => s.setHoveredRoom)
  const b = planBounds(plan)
  const pad = 0.6
  const vb = { x: b.minX - pad, y: b.minY - pad, w: b.maxX - b.minX + pad * 2, h: b.maxY - b.minY + pad * 2 }

  useEffect(() => {
    let raf = 0
    const tick = () => {
      // Keep the marker inside the map even when the camera is far outside the flat.
      const x = Math.min(Math.max(cameraPose.x, vb.x + 0.3), vb.x + vb.w - 0.3)
      const y = Math.min(Math.max(cameraPose.y, vb.y + 0.3), vb.y + vb.h - 0.3)
      marker.current?.setAttribute('transform', `translate(${x} ${y}) rotate(${(cameraPose.heading * 180) / Math.PI})`)
      raf = requestAnimationFrame(tick)
    }
    tick()
    return () => cancelAnimationFrame(raf)
  }, [vb.x, vb.y, vb.w, vb.h])

  return (
    <div className="glass absolute bottom-3 left-3 z-20 hidden w-56 p-2 lg:block">
      <div className="mb-1 flex items-center justify-between px-1 text-[10px] font-semibold uppercase tracking-wider text-muted">
        <span>Map</span>
        <span className="font-normal normal-case tracking-normal">Click a room</span>
      </div>
      <svg viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`} className="block h-auto w-full">
        {plan.rooms.map((room) => (
          <polygon
            key={room.id}
            points={points(room.polygon)}
            fill={KIND_COLOR[room.kind]}
            fillOpacity={room.id === selectedId ? 0.75 : room.id === hoveredId ? 0.5 : 0.28}
            className={clsx('cursor-pointer transition-[fill-opacity]', room.id === selectedId && 'stroke-accent')}
            strokeWidth={0.12}
            onClick={() => selectRoom(room.id === selectedId ? null : room.id)}
            onPointerEnter={() => setHovered(room.id)}
            onPointerLeave={() => setHovered(null)}
          >
            <title>{room.name}</title>
          </polygon>
        ))}
        {plan.walls
          .filter((w) => wallLength(w) > 0.005)
          .map((w) => (
            <polygon key={w.id} points={points(wallOutline(w))} className="fill-ink/70" pointerEvents="none" />
          ))}
        <g ref={marker} pointerEvents="none">
          <path d="M 0 0 L 1.6 -0.9 A 1.85 1.85 0 0 1 1.6 0.9 Z" className="fill-accent/30" />
          <circle r={0.28} className="fill-accent stroke-panel" strokeWidth={0.08} />
        </g>
      </svg>
    </div>
  )
}
