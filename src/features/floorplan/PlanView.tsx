import { useEffect, useMemo, useRef, useState } from 'react'
import clsx from 'clsx'
import type { FloorPlan, Vec2 } from '../../types/plan'
import { useAppStore } from '../../store/useAppStore'
import { planBounds, polygonArea, roomAnchor, wallOutline } from '../../lib/planMath'
import { KIND_COLOR } from '../../components/LeftPanel'

interface ViewBox {
  x: number
  y: number
  w: number
  h: number
}

const points = (pts: Vec2[]) => pts.map(([x, y]) => `${x},${y}`).join(' ')

function fitBox(plan: FloorPlan): ViewBox {
  const b = planBounds(plan)
  const pad = 1.6
  return { x: b.minX - pad, y: b.minY - pad, w: b.maxX - b.minX + pad * 2, h: b.maxY - b.minY + pad * 2 }
}

export function PlanView({ plan }: { plan: FloorPlan }) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [vb, setVb] = useState<ViewBox>(() => fitBox(plan))
  const drag = useRef<{ start: DOMPoint; inverse: DOMMatrix; vb: ViewBox; moved: boolean } | null>(null)

  const opacity = useAppStore((s) => s.underlayOpacity)
  const resetNonce = useAppStore((s) => s.viewResetNonce)
  const selectedId = useAppStore((s) => s.selectedRoomId)
  const hoveredId = useAppStore((s) => s.hoveredRoomId)
  const select = useAppStore((s) => s.selectRoom)
  const setHovered = useAppStore((s) => s.setHoveredRoom)

  useEffect(() => setVb(fitBox(plan)), [plan, resetNonce])

  // Wheel zoom around the cursor; registered natively so we can preventDefault.
  useEffect(() => {
    const el = svgRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const ctm = el.getScreenCTM()
      if (!ctm) return
      const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse())
      const k = Math.min(Math.max(Math.exp(e.deltaY * 0.0015), 0.5), 2)
      setVb((v) => {
        const w = Math.min(Math.max(v.w * k, 2), 60)
        const s = w / v.w
        return { x: p.x - (p.x - v.x) * s, y: p.y - (p.y - v.y) * s, w, h: v.h * s }
      })
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    const ctm = e.currentTarget.getScreenCTM()
    if (!ctm) return
    const inverse = ctm.inverse()
    drag.current = { start: new DOMPoint(e.clientX, e.clientY).matrixTransform(inverse), inverse, vb, moved: false }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const d = drag.current
    if (!d) return
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(d.inverse)
    const dx = p.x - d.start.x
    const dy = p.y - d.start.y
    if (!d.moved && Math.hypot(dx, dy) < d.vb.w * 0.004) return
    d.moved = true
    setVb({ ...d.vb, x: d.vb.x - dx, y: d.vb.y - dy })
  }

  const onPointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    const d = drag.current
    drag.current = null
    if (d && !d.moved) {
      // Pointer capture retargets the event to the <svg>, so hit-test the click position instead.
      const hit = document.elementFromPoint(e.clientX, e.clientY)
      const roomId = hit?.closest('[data-room]')?.getAttribute('data-room') ?? null
      select(roomId && roomId !== selectedId ? roomId : null)
    }
  }

  const walls = useMemo(
    () =>
      plan.walls.map((w) => ({
        wall: w,
        outline: wallOutline(w),
        gaps: (w.openings ?? []).map((o) => ({ opening: o, outline: wallOutline({ ...w, thickness: w.thickness + 0.02 }, o.offset, o.offset + o.width) })),
      })),
    [plan],
  )

  return (
    <svg
      ref={svgRef}
      viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
      className="h-full w-full cursor-grab touch-none select-none active:cursor-grabbing"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      <defs>
        <pattern id="grid" width={0.5} height={0.5} patternUnits="userSpaceOnUse">
          <path d="M 0.5 0 L 0 0 0 0.5" fill="none" className="stroke-ink/[0.06]" strokeWidth={0.01} />
        </pattern>
      </defs>
      <rect x={-50} y={-50} width={120} height={120} fill="url(#grid)" />

      {plan.underlay && (
        <image
          href={plan.underlay.src}
          x={plan.underlay.x}
          y={plan.underlay.y}
          width={plan.underlay.width}
          height={plan.underlay.height}
          preserveAspectRatio="none"
          opacity={opacity}
          className="dark:[filter:invert(0.9)_hue-rotate(180deg)]"
        />
      )}

      {plan.rooms.map((room) => {
        const active = room.id === selectedId
        const hover = room.id === hoveredId
        return (
          <polygon
            key={room.id}
            data-room={room.id}
            points={points(room.polygon)}
            fill={KIND_COLOR[room.kind]}
            fillOpacity={active ? 0.45 : hover ? 0.32 : 0.18}
            className={clsx('cursor-pointer transition-[fill-opacity]', active && 'stroke-accent')}
            strokeWidth={active ? 0.05 : 0}
            onPointerEnter={() => setHovered(room.id)}
            onPointerLeave={() => setHovered(null)}
          />
        )
      })}

      {walls.map(({ wall, outline }) => (
        <polygon
          key={wall.id}
          points={points(outline)}
          className={wall.structural ? 'fill-ink/85' : 'fill-ink/40'}
          pointerEvents="none"
        />
      ))}

      {walls.flatMap(({ wall, gaps }) =>
        gaps.map(({ opening, outline }) => (
          <g key={`${wall.id}-${opening.id}`} pointerEvents="none">
            <polygon points={points(outline)} className="fill-canvas" />
            <polygon
              points={points(outline)}
              fill="none"
              strokeWidth={0.025}
              strokeDasharray={opening.kind === 'door' ? '0.08 0.05' : undefined}
              className={opening.kind === 'window' ? 'stroke-sky-500' : opening.kind === 'door' ? 'stroke-accent' : 'stroke-ink/20'}
            />
          </g>
        )),
      )}

      {plan.rooms.map((room) => {
        const [x, y] = roomAnchor(room)
        return (
          <g key={room.id} pointerEvents="none" className="fill-ink">
            <text x={x} y={y} fontSize={0.24} fontWeight={600} textAnchor="middle">
              {room.name}
            </text>
            <text x={x} y={y + 0.3} fontSize={0.18} textAnchor="middle" className="fill-muted">
              {polygonArea(room.polygon).toFixed(1)} m²
            </text>
          </g>
        )
      })}
    </svg>
  )
}
