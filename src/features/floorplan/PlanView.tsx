import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import clsx from 'clsx'
import type { FloorPlan, Opening, Vec2, Wall } from '../../types/plan'
import { useAppStore } from '../../store/useAppStore'
import { usePlanStore } from '../../store/usePlanStore'
import { useEditorStore } from '../../store/useEditorStore'
import { useAssetUrl } from '../../lib/assets'
import { useDesignStore } from '../../store/useDesignStore'
import { footprint } from '../../lib/furnitureMath'
import { catalogEntry } from '../furniture/catalog'
import { closestOnSegment, distance, doorSwing, planBounds, polygonArea, roomAnchor, wallLength, wallOutline } from '../../lib/planMath'
import { addOpening, addRoom, addWall, deleteOpening, deleteRoom, deleteWall, movePoint, newId, updateOpening } from '../../lib/planEdits'
import { snapPoint, type Snap } from '../../lib/snapping'
import { KIND_COLOR } from '../../components/LeftPanel'
import { CalibrateDialog } from './CalibrateDialog'
import { EditorHint } from './EditorHint'

interface ViewBox {
  x: number
  y: number
  w: number
  h: number
}

type Gesture =
  | { kind: 'pan'; start: DOMPoint; inverse: DOMMatrix; vb: ViewBox; moved: boolean }
  | { kind: 'vertex'; from: Vec2; base: FloorPlan; moved: boolean }
  | { kind: 'opening'; wallId: string; openingId: string; grab: number; base: FloorPlan; moved: boolean }

interface OpeningPreview {
  wall: Wall
  offset: number
  width: number
  valid: boolean
}

const DOOR = { sill: 0, height: 2.1 }
const WINDOW = { sill: 0.9, height: 1.35 }

const points = (pts: Vec2[]) => pts.map(([x, y]) => `${x},${y}`).join(' ')
const mm = (m: number) => `${Math.round(m * 1000).toLocaleString()} mm`

function fitBox(plan: FloorPlan): ViewBox {
  const b = planBounds(plan)
  const pad = 1.6
  return { x: b.minX - pad, y: b.minY - pad, w: b.maxX - b.minX + pad * 2, h: b.maxY - b.minY + pad * 2 }
}

function previewOpening(p: Vec2, plan: FloorPlan, tolerance: number, width: number): OpeningPreview | null {
  let best: { wall: Wall; t: number; dist: number } | null = null
  for (const wall of plan.walls) {
    const hit = closestOnSegment(p, wall.start, wall.end)
    if (hit.dist <= wall.thickness / 2 + tolerance && (!best || hit.dist < best.dist)) best = { wall, t: hit.t, dist: hit.dist }
  }
  if (!best) return null
  const len = wallLength(best.wall)
  const w = Math.min(width, len)
  const offset = Math.round(Math.min(Math.max(best.t - w / 2, 0), len - w) * 100) / 100
  const valid = !(best.wall.openings ?? []).some((o) => offset < o.offset + o.width && o.offset < offset + w)
  return { wall: best.wall, offset, width: w, valid }
}

export function PlanView({ plan }: { plan: FloorPlan }) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [vb, setVb] = useState<ViewBox>(() => fitBox(plan))
  const [size, setSize] = useState({ w: 1, h: 1 })
  const [cursor, setCursor] = useState<Snap | null>(null)
  const [preview, setPreview] = useState<OpeningPreview | null>(null)
  const [calibration, setCalibration] = useState<{ a: Vec2; b: Vec2 } | null>(null)
  const gesture = useRef<Gesture | null>(null)

  const opacity = useAppStore((s) => s.underlayOpacity)
  const resetNonce = useAppStore((s) => s.viewResetNonce)
  const selectedRoomId = useAppStore((s) => s.selectedRoomId)
  const selectedWallId = useAppStore((s) => s.selectedWallId)
  const selectedOpening = useAppStore((s) => s.selectedOpening)
  const hoveredId = useAppStore((s) => s.hoveredRoomId)
  const setHovered = useAppStore((s) => s.setHoveredRoom)

  const tool = useEditorStore((s) => s.tool)
  const draft = useEditorStore((s) => s.draft)
  const doorWidth = useEditorStore((s) => s.doorWidth)
  const windowWidth = useEditorStore((s) => s.windowWidth)

  const edit = usePlanStore((s) => s.edit)
  const items = useDesignStore((s) => s.design.items)
  const underlayUrl = useAssetUrl(plan.underlay?.assetId) ?? plan.underlay?.src

  const pxPerM = Math.min(size.w / vb.w, size.h / vb.h) || 50
  const tolerance = 10 / pxPerM
  const px = (n: number) => n / pxPerM

  useEffect(() => setVb(fitBox(usePlanStore.getState().plan)), [resetNonce])

  useEffect(() => {
    const el = svgRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => setSize({ w: entry.contentRect.width, h: entry.contentRect.height }))
    ro.observe(el)
    // Wheel zoom around the cursor; registered natively so we can preventDefault.
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const ctm = el.getScreenCTM()
      if (!ctm) return
      const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse())
      const k = Math.min(Math.max(Math.exp(e.deltaY * 0.0015), 0.5), 2)
      setVb((v) => {
        const w = Math.min(Math.max(v.w * k, 1), 80)
        const s = w / v.w
        return { x: p.x - (p.x - v.x) * s, y: p.y - (p.y - v.y) * s, w, h: v.h * s }
      })
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      ro.disconnect()
      el.removeEventListener('wheel', onWheel)
    }
  }, [])

  // Clear transient previews when the tool changes.
  useEffect(() => {
    setCursor(null)
    setPreview(null)
  }, [tool])

  const toPlan = (e: { clientX: number; clientY: number }): Vec2 => {
    const ctm = svgRef.current!.getScreenCTM()!
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse())
    return [p.x, p.y]
  }

  const finishRoom = useCallback((pts: Vec2[]) => {
    const id = newId('room')
    const count = usePlanStore.getState().plan.rooms.length
    usePlanStore.getState().edit((p) => addRoom(p, { id, name: `Room ${count + 1}`, kind: 'bedroom', polygon: pts }))
    useEditorStore.getState().setDraft([])
    useAppStore.getState().selectRoom(id)
  }, [])

  const handleClick = (raw: Vec2, e: React.PointerEvent) => {
    const { setDraft, wallThickness } = useEditorStore.getState()
    const app = useAppStore.getState()
    const last = draft[draft.length - 1]
    const snap = () => snapPoint(raw, plan, tolerance, { from: last, extra: draft, disabled: e.altKey }).point

    switch (tool) {
      case 'select': {
        const hit = document.elementFromPoint(e.clientX, e.clientY)
        const opening = hit?.closest('[data-opening]')?.getAttribute('data-opening')
        const wall = hit?.closest('[data-wall]')?.getAttribute('data-wall')
        const room = hit?.closest('[data-room]')?.getAttribute('data-room')
        if (opening) {
          const [wallId, openingId] = opening.split('|')
          app.selectOpening({ wallId, openingId })
        } else if (wall) app.selectWall(wall)
        else if (room) app.selectRoom(room === selectedRoomId ? null : room)
        else app.clearSelection()
        return
      }
      case 'wall': {
        const p = snap()
        if (!last) return setDraft([p])
        if (distance(p, last) < 0.01) return setDraft([])
        edit((pl) => addWall(pl, { id: newId('wall'), start: last, end: p, thickness: wallThickness }))
        setDraft(draft.length >= 2 && distance(p, draft[0]) < 1e-3 ? [] : [...draft, p])
        return
      }
      case 'room': {
        const p = snap()
        const closes = draft.length >= 3 && (distance(p, draft[0]) < 1e-3 || distance(p, last) < 0.01)
        if (closes) return finishRoom(draft)
        if (last && distance(p, last) < 0.01) return
        setDraft([...draft, p])
        return
      }
      case 'door':
      case 'window': {
        const pv = previewOpening(raw, plan, tolerance, tool === 'door' ? doorWidth : windowWidth)
        if (!pv?.valid) return
        const opening: Opening = { id: newId(tool), kind: tool, offset: pv.offset, width: pv.width, ...(tool === 'door' ? DOOR : WINDOW) }
        edit((pl) => addOpening(pl, pv.wall.id, opening))
        app.selectOpening({ wallId: pv.wall.id, openingId: opening.id })
        return
      }
      case 'calibrate': {
        const p = snap()
        if (!last) return setDraft([p])
        if (distance(p, last) < 0.05) return
        setCalibration({ a: last, b: p })
        setDraft([])
        return
      }
    }
  }

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (e.button === 2) return
    const handle = (e.target as Element).closest('[data-handle]')
    const svg = e.currentTarget
    if (handle && e.button === 0) {
      const base = usePlanStore.getState().plan
      usePlanStore.getState().checkpoint()
      if (handle.getAttribute('data-handle') === 'vertex') {
        gesture.current = { kind: 'vertex', from: [Number(handle.getAttribute('data-x')), Number(handle.getAttribute('data-y'))], base, moved: false }
      } else {
        const [wallId, openingId] = handle.getAttribute('data-opening')!.split('|')
        const wall = base.walls.find((w) => w.id === wallId)!
        const o = wall.openings!.find((op) => op.id === openingId)!
        gesture.current = { kind: 'opening', wallId, openingId, grab: closestOnSegment(toPlan(e), wall.start, wall.end).t - o.offset, base, moved: false }
      }
    } else {
      const ctm = svg.getScreenCTM()
      if (!ctm) return
      const inverse = ctm.inverse()
      gesture.current = { kind: 'pan', start: new DOMPoint(e.clientX, e.clientY).matrixTransform(inverse), inverse, vb, moved: false }
    }
    svg.setPointerCapture(e.pointerId)
  }

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const g = gesture.current
    const raw = toPlan(e)

    if (g?.kind === 'pan') {
      const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(g.inverse)
      const dx = p.x - g.start.x
      const dy = p.y - g.start.y
      if (!g.moved && Math.hypot(dx, dy) * pxPerM < 4) return
      g.moved = true
      setVb({ ...g.vb, x: g.vb.x - dx, y: g.vb.y - dy })
      return
    }
    if (g?.kind === 'vertex') {
      const snap = snapPoint(raw, g.base, tolerance, { exclude: g.from, disabled: e.altKey })
      g.moved = true
      setCursor(snap)
      edit(() => movePoint(g.base, g.from, snap.point), { history: false })
      return
    }
    if (g?.kind === 'opening') {
      const wall = g.base.walls.find((w) => w.id === g.wallId)!
      const t = closestOnSegment(raw, wall.start, wall.end).t
      g.moved = true
      edit(() => updateOpening(g.base, g.wallId, g.openingId, { offset: Math.round((t - g.grab) * 100) / 100 }), { history: false })
      return
    }

    if (tool === 'wall' || tool === 'room' || tool === 'calibrate') {
      setCursor(snapPoint(raw, plan, tolerance, { from: draft[draft.length - 1], extra: draft, disabled: e.altKey }))
    } else if (tool === 'door' || tool === 'window') {
      setPreview(previewOpening(raw, plan, tolerance, tool === 'door' ? doorWidth : windowWidth))
    }
  }

  const onPointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    const g = gesture.current
    gesture.current = null
    if (!g) return
    if (g.kind === 'pan') {
      if (!g.moved) handleClick(toPlan(e), e)
      return
    }
    setCursor(null)
    // A click on a handle without dragging shouldn't leave an empty undo step.
    if (!g.moved) usePlanStore.setState((s) => ({ past: s.past.slice(0, -1) }))
  }

  // Keyboard shortcuts while the plan editor is open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target instanceof Element ? e.target : null
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return
      const editor = useEditorStore.getState()
      const app = useAppStore.getState()
      const planStore = usePlanStore.getState()
      const mod = e.ctrlKey || e.metaKey

      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        if (e.shiftKey) planStore.redo()
        else planStore.undo()
        return
      }
      if (mod && e.key.toLowerCase() === 'y') {
        e.preventDefault()
        planStore.redo()
        return
      }
      if (mod || e.altKey) return

      if (e.key === 'Escape') {
        setCalibration(null)
        if (editor.draft.length) editor.setDraft([])
        else if (editor.tool !== 'select') editor.setTool('select')
        else app.clearSelection()
        return
      }
      if (e.key === 'Enter') {
        if (editor.tool === 'room' && editor.draft.length >= 3) finishRoom(editor.draft)
        else editor.setDraft([])
        return
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (app.selectedOpening) {
          const { wallId, openingId } = app.selectedOpening
          planStore.edit((p) => deleteOpening(p, wallId, openingId))
        } else if (app.selectedWallId) {
          const id = app.selectedWallId
          planStore.edit((p) => deleteWall(p, id))
        } else if (app.selectedRoomId) {
          const id = app.selectedRoomId
          planStore.edit((p) => deleteRoom(p, id))
        } else return
        e.preventDefault()
        app.clearSelection()
        return
      }
      const tools: Record<string, typeof editor.tool> = { v: 'select', w: 'wall', d: 'door', n: 'window', r: 'room', c: 'calibrate' }
      const next = tools[e.key.toLowerCase()]
      if (next) editor.setTool(next)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [finishRoom])

  const walls = useMemo(
    () =>
      plan.walls
        .filter((w) => wallLength(w) > 0.005)
        .map((w) => ({
          wall: w,
          outline: wallOutline(w),
          gaps: (w.openings ?? []).map((o) => ({ opening: o, outline: wallOutline({ ...w, thickness: w.thickness + 0.02 }, o.offset, o.offset + o.width) })),
        })),
    [plan],
  )

  const selectedWall = plan.walls.find((w) => w.id === selectedWallId)
  const selectedRoom = plan.rooms.find((r) => r.id === selectedRoomId)
  const last = draft[draft.length - 1]
  const drawing = tool !== 'select'

  return (
    <div className="relative h-full w-full">
      <svg
        ref={svgRef}
        viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
        className={clsx('h-full w-full touch-none select-none', drawing ? 'cursor-crosshair' : 'cursor-grab active:cursor-grabbing')}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={() => {
          setCursor(null)
          setPreview(null)
        }}
        onContextMenu={(e) => {
          e.preventDefault()
          useEditorStore.getState().setDraft([])
        }}
      >
        <defs>
          <pattern id="grid" width={0.5} height={0.5} patternUnits="userSpaceOnUse">
            <path d="M 0.5 0 L 0 0 0 0.5" fill="none" className="stroke-ink/[0.06]" strokeWidth={0.01} />
          </pattern>
        </defs>
        <rect x={-100} y={-100} width={250} height={250} fill="url(#grid)" />

        {plan.underlay && underlayUrl && (
          <image
            href={underlayUrl}
            x={plan.underlay.x}
            y={plan.underlay.y}
            width={plan.underlay.width}
            height={plan.underlay.height}
            preserveAspectRatio="none"
            opacity={opacity}
            pointerEvents="none"
            className="dark:[filter:invert(0.9)_hue-rotate(180deg)]"
          />
        )}

        {plan.rooms.map((room) => {
          const active = room.id === selectedRoomId
          const hover = room.id === hoveredId
          return (
            <polygon
              key={room.id}
              data-room={room.id}
              points={points(room.polygon)}
              fill={KIND_COLOR[room.kind]}
              fillOpacity={active ? 0.45 : hover ? 0.32 : 0.18}
              className={clsx('transition-[fill-opacity]', !drawing && 'cursor-pointer', active && 'stroke-accent')}
              strokeWidth={active ? px(2) : 0}
              onPointerEnter={() => setHovered(room.id)}
              onPointerLeave={() => setHovered(null)}
            />
          )
        })}

        {walls.map(({ wall, outline }) => (
          <polygon
            key={wall.id}
            data-wall={wall.id}
            points={points(outline)}
            className={clsx(
              wall.structural ? 'fill-ink/85' : 'fill-ink/40',
              wall.id === selectedWallId && 'fill-accent stroke-accent',
              !drawing && 'cursor-pointer hover:fill-accent/70',
            )}
            strokeWidth={wall.id === selectedWallId ? px(1.5) : 0}
          />
        ))}

        {walls.flatMap(({ wall, gaps }) =>
          gaps.map(({ opening, outline }) => {
            const key = `${wall.id}|${opening.id}`
            const active = selectedOpening?.wallId === wall.id && selectedOpening.openingId === opening.id
            return (
              <g key={key} data-opening={key} className={clsx(!drawing && 'cursor-pointer')}>
                <polygon points={points(outline)} className={active ? 'fill-accent/40' : 'fill-canvas'} />
                <polygon
                  points={points(outline)}
                  fill="none"
                  strokeWidth={px(opening.kind === 'door' ? 1 : 1.5)}
                  className={opening.kind === 'window' ? 'stroke-sky-500' : opening.kind === 'door' ? 'stroke-accent/60' : 'stroke-ink/25'}
                />
                {opening.kind === 'door' && <DoorSwingMark wall={wall} opening={opening} px={px} />}
                {active && tool === 'select' && (
                  <polygon data-handle="opening" data-opening={key} points={points(outline)} fill="transparent" className="cursor-ew-resize" />
                )}
              </g>
            )
          }),
        )}

        {/* Furniture footprints for reference; they're moved in the 3D view. */}
        {items.map((it) => (
          <polygon
            key={it.id}
            points={points(footprint(it))}
            pointerEvents="none"
            className="fill-ink/[0.06] stroke-ink/40"
            strokeWidth={px(1)}
            strokeDasharray={catalogEntry(it.type)?.layer === 'floor' ? undefined : `${px(4)} ${px(3)}`}
          />
        ))}

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

        {/* Selection handles */}
        {tool === 'select' && selectedWall && (
          <>
            <DimensionLabel a={selectedWall.start} b={selectedWall.end} px={px} />
            {[selectedWall.start, selectedWall.end].map((p, i) => (
              <Handle key={i} p={p} px={px} />
            ))}
          </>
        )}
        {tool === 'select' && selectedRoom && selectedRoom.polygon.map((p, i) => <Handle key={i} p={p} px={px} />)}

        {/* Drawing previews */}
        {tool === 'wall' && last && cursor && distance(last, cursor.point) > 0.005 && (
          <>
            <polygon
              points={points(wallOutline({ id: 'preview', start: last, end: cursor.point, thickness: useEditorStore.getState().wallThickness }))}
              className="fill-accent/50 stroke-accent"
              strokeWidth={px(1)}
              pointerEvents="none"
            />
            <DimensionLabel a={last} b={cursor.point} px={px} />
          </>
        )}
        {tool === 'room' && draft.length > 0 && (
          <polygon
            points={points(cursor ? [...draft, cursor.point] : draft)}
            className="fill-accent/15 stroke-accent"
            strokeWidth={px(1.5)}
            strokeDasharray={`${px(6)} ${px(4)}`}
            pointerEvents="none"
          />
        )}
        {tool === 'calibrate' && (last || calibration) && (
          <CalibrationLine a={calibration?.a ?? last!} b={calibration?.b ?? cursor?.point ?? last!} px={px} />
        )}
        {(tool === 'wall' || tool === 'room' || tool === 'calibrate') &&
          draft.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r={px(3.5)} className="fill-accent" pointerEvents="none" />)}
        {(tool === 'door' || tool === 'window') && preview && (
          <polygon
            points={points(wallOutline({ ...preview.wall, thickness: preview.wall.thickness + px(6) }, preview.offset, preview.offset + preview.width))}
            className={preview.valid ? 'fill-accent/60 stroke-accent' : 'fill-red-500/50 stroke-red-500'}
            strokeWidth={px(1.5)}
            pointerEvents="none"
          />
        )}
        {cursor && <SnapIndicator snap={cursor} px={px} />}
      </svg>

      <EditorHint plan={plan} />
      {calibration && (
        <CalibrateDialog
          a={calibration.a}
          b={calibration.b}
          hasTrace={plan.walls.length > 0 || plan.rooms.length > 0}
          onClose={() => {
            setCalibration(null)
            useEditorStore.getState().setTool('select')
          }}
        />
      )}
    </div>
  )
}

function Handle({ p, px }: { p: Vec2; px: (n: number) => number }) {
  return (
    <circle
      data-handle="vertex"
      data-x={p[0]}
      data-y={p[1]}
      cx={p[0]}
      cy={p[1]}
      r={px(6)}
      strokeWidth={px(2)}
      className="cursor-move fill-panel stroke-accent"
    />
  )
}

function SnapIndicator({ snap, px }: { snap: Snap; px: (n: number) => number }) {
  const [x, y] = snap.point
  const r = px(6)
  if (snap.kind === 'point') return <circle cx={x} cy={y} r={r} fill="none" strokeWidth={px(2)} className="stroke-accent" pointerEvents="none" />
  if (snap.kind === 'wall')
    return <rect x={x - r} y={y - r} width={r * 2} height={r * 2} transform={`rotate(45 ${x} ${y})`} fill="none" strokeWidth={px(2)} className="stroke-accent" pointerEvents="none" />
  return (
    <g strokeWidth={px(1.5)} className="stroke-accent" pointerEvents="none">
      <line x1={x - r} y1={y} x2={x + r} y2={y} />
      <line x1={x} y1={y - r} x2={x} y2={y + r} />
    </g>
  )
}

function DimensionLabel({ a, b, px }: { a: Vec2; b: Vec2; px: (n: number) => number }) {
  const len = distance(a, b)
  if (len < 0.01) return null
  const mx = (a[0] + b[0]) / 2
  const my = (a[1] + b[1]) / 2
  const nx = -(b[1] - a[1]) / len
  const ny = (b[0] - a[0]) / len
  const x = mx + nx * px(18)
  const y = my + ny * px(18)
  const text = mm(len)
  const w = px(text.length * 6.6 + 10)
  const h = px(18)
  return (
    <g pointerEvents="none">
      <rect x={x - w / 2} y={y - h / 2} width={w} height={h} rx={h / 2} className="fill-ink" />
      <text x={x} y={y + px(4)} fontSize={px(11)} fontWeight={600} textAnchor="middle" className="fill-canvas">
        {text}
      </text>
    </g>
  )
}

function CalibrationLine({ a, b, px }: { a: Vec2; b: Vec2; px: (n: number) => number }) {
  return (
    <g pointerEvents="none">
      <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} strokeWidth={px(2)} strokeDasharray={`${px(6)} ${px(4)}`} className="stroke-accent" />
      <DimensionLabel a={a} b={b} px={px} />
    </g>
  )
}

/** Plan-drawing door symbol: the open leaf plus its quarter-circle swing. */
function DoorSwingMark({ wall, opening, px }: { wall: Wall; opening: Opening; px: (n: number) => number }) {
  const { hinge, jamb, toward } = doorSwing(wall, opening)
  const r = opening.width
  const tip: Vec2 = [hinge[0] + toward[0] * r, hinge[1] + toward[1] * r]
  const a1 = Math.atan2(tip[1] - hinge[1], tip[0] - hinge[0])
  const a2 = Math.atan2(jamb[1] - hinge[1], jamb[0] - hinge[0])
  const delta = Math.atan2(Math.sin(a2 - a1), Math.cos(a2 - a1))
  return (
    <g pointerEvents="none" fill="none" className="stroke-accent">
      <line x1={hinge[0]} y1={hinge[1]} x2={tip[0]} y2={tip[1]} strokeWidth={px(2)} />
      <path d={`M ${tip[0]} ${tip[1]} A ${r} ${r} 0 0 ${delta > 0 ? 1 : 0} ${jamb[0]} ${jamb[1]}`} strokeWidth={px(1)} strokeDasharray={`${px(4)} ${px(3)}`} />
    </g>
  )
}
