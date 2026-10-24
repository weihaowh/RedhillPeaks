import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import clsx from 'clsx'
import type { FloorPlan, Opening, Vec2, Wall } from '../../types/plan'
import { useAppStore } from '../../store/useAppStore'
import { usePlanStore } from '../../store/usePlanStore'
import { useEditorStore } from '../../store/useEditorStore'
import { useAssetUrl } from '../../lib/assets'
import { useDesignStore } from '../../store/useDesignStore'
import { snapToWalls } from '../../lib/furnitureMath'
import { FurniturePlanLayer } from '../furniture/FurniturePlanLayer'
import { addItem, duplicateItem, removeItem, rotateItem, updateItem } from '../furniture/itemActions'
import { FURNITURE_MIME, sceneBridge } from '../scene/sceneBridge'
import { catalogEntry } from '../furniture/catalog'
import type { Fixture } from '../../types/design'
import { placeFixtureAt } from '../../lib/electrical'
import { FixtureSymbols } from '../electrical/FixtureSymbols'
import { closestOnSegment, distance, doorSwing, planBounds, polygonArea, roomAnchor, wallLength, wallOutline } from '../../lib/planMath'
import { addOpening, addRoom, addWall, deleteOpening, deleteRoom, deleteWall, movePoint, newId, updateOpening } from '../../lib/planEdits'
import { snapPoint, type Snap } from '../../lib/snapping'
import { KIND_COLOR } from '../../components/LeftPanel'
import { CalibrateDialog } from './CalibrateDialog'
import { EditorHint } from './EditorHint'
import { builtKind, hackBlocker, hackSpan, isHackOpening, hackIdOf, renovationOf, spanExtent } from '../../lib/renovation'
import { addBuiltWall, addHack, builtPlan, designHistoryActive, editWalls, isBuiltId, removeBuiltWall, removeHack, useRenoNotice, useRenovatedPlan } from '../renovation/renoActions'

interface ViewBox {
  x: number
  y: number
  w: number
  h: number
}

type Gesture =
  | { kind: 'pan'; start: DOMPoint; inverse: DOMMatrix; vb: ViewBox; moved: boolean }
  | { kind: 'vertex'; from: Vec2; base: FloorPlan; built: boolean; moved: boolean }
  | { kind: 'opening'; wallId: string; openingId: string; grab: number; base: FloorPlan; built: boolean; moved: boolean }
  | { kind: 'hack'; wall: Wall; a: number; b: number }
  | { kind: 'fixture'; id: string; moved: boolean }
  | { kind: 'item'; id: string; grab: Vec2; moved: boolean }
  | { kind: 'rotate'; id: string; moved: boolean }

interface HackPreview {
  wall: Wall
  from: number
  to: number
  /** Why it can't be hacked, if it can't. */
  blocked: string | null
}

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
  const [fixtureGhost, setFixtureGhost] = useState<Fixture | null>(null)
  const [hackPreview, setHackPreview] = useState<HackPreview | null>(null)
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
  const fixtures = useDesignStore((s) => s.design.fixtures)
  const showElectrical = useAppStore((s) => s.showElectrical)
  const selectedFixtureId = useAppStore((s) => s.selectedFixtureId)
  const selectedItemId = useAppStore((s) => s.selectedItemId)
  const fixtureType = useEditorStore((s) => s.fixtureType)
  const buildKind = useEditorStore((s) => s.buildKind)
  const reno = renovationOf(useDesignStore((s) => s.design))
  // Furniture, electrical points and new doors work on the flat as renovated.
  const effective = useRenovatedPlan(plan)
  const underlayUrl = useAssetUrl(plan.underlay?.assetId) ?? plan.underlay?.src

  const pxPerM = Math.min(size.w / vb.w, size.h / vb.h) || 50
  const tolerance = 10 / pxPerM
  const px = (n: number) => n / pxPerM

  useEffect(() => setVb(fitBox(usePlanStore.getState().plan)), [resetNonce])

  // Lets "add from library" drop pieces in the middle of what you're looking at.
  const vbRef = useRef(vb)
  vbRef.current = vb
  useEffect(() => {
    sceneBridge.planCentre = () => [vbRef.current.x + vbRef.current.w / 2, vbRef.current.y + vbRef.current.h / 2]
    return () => {
      sceneBridge.planCentre = undefined
    }
  }, [])

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
    setFixtureGhost(null)
    setHackPreview(null)
  }, [tool, fixtureType])

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
        const itemId = hit?.closest('[data-item]')?.getAttribute('data-item')
        if (itemId) return app.selectItem(itemId)
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
      case 'build': {
        const p = snapPoint(raw, effective, tolerance, { from: last, extra: draft, disabled: e.altKey }).point
        if (!last) return setDraft([p])
        if (distance(p, last) < 0.01) return setDraft([])
        const kind = builtKind(buildKind)
        addBuiltWall({ start: last, end: p, thickness: kind.thickness, built: kind.id })
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
        const pv = previewOpening(raw, effective, tolerance, tool === 'door' ? doorWidth : windowWidth)
        if (!pv?.valid) return
        const opening: Opening = { id: newId(tool), kind: tool, offset: pv.offset, width: pv.width, ...(tool === 'door' ? DOOR : WINDOW) }
        editWalls(!!pv.wall.built, (pl) => addOpening(pl, pv.wall.id, opening))
        app.selectOpening({ wallId: pv.wall.id, openingId: opening.id })
        return
      }
      case 'electrical': {
        const fx = placeFixtureAt(fixtureType, raw, effective, tolerance * 1.5)
        if (!fx) return
        useDesignStore.getState().edit((d) => ({ ...d, fixtures: [...d.fixtures, fx] }))
        app.selectFixture(fx.id)
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
    const svg = e.currentTarget
    // Electrical points: select, and drag to move (along walls for wall points).
    // Furniture: the rotate handle, then the piece itself (Select tool only).
    if (tool === 'select' && e.button === 0) {
      const rotateId = (e.target as Element).closest('[data-rotate]')?.getAttribute('data-rotate')
      const itemId = rotateId ?? (e.target as Element).closest('[data-item]')?.getAttribute('data-item')
      const item = itemId ? useDesignStore.getState().design.items.find((it) => it.id === itemId) : undefined
      if (item) {
        useAppStore.getState().selectItem(item.id)
        if (!item.locked) {
          useDesignStore.getState().checkpoint()
          const p = toPlan(e)
          gesture.current = rotateId ? { kind: 'rotate', id: item.id, moved: false } : { kind: 'item', id: item.id, grab: [item.x - p[0], item.y - p[1]], moved: false }
        }
        svg.setPointerCapture(e.pointerId)
        return
      }
    }
    const fixtureId = (e.target as Element).closest('[data-fixture]')?.getAttribute('data-fixture')
    if (fixtureId && e.button === 0 && (tool === 'select' || tool === 'electrical')) {
      useAppStore.getState().selectFixture(fixtureId)
      useDesignStore.getState().checkpoint()
      gesture.current = { kind: 'fixture', id: fixtureId, moved: false }
      svg.setPointerCapture(e.pointerId)
      return
    }
    // Hack tool: press on a wall, then release (whole wall) or drag along it (part of it).
    if (tool === 'hack' && e.button === 0) {
      const hit = wallUnder(toPlan(e))
      if (hit) {
        if (hit.wall.built) {
          removeBuiltWall(hit.wall.id)
          useRenoNotice.getState().show('New wall removed.')
          return
        }
        const blocked = hackBlocker(plan, hit.wall)
        if (blocked) {
          useRenoNotice.getState().show(blocked)
          return
        }
        gesture.current = { kind: 'hack', wall: hit.wall, a: hit.t, b: hit.t }
        svg.setPointerCapture(e.pointerId)
        return
      }
    }
    const handle = (e.target as Element).closest('[data-handle]')
    if (handle && e.button === 0) {
      const opening = handle.getAttribute('data-opening')
      const built = handle.getAttribute('data-handle') === 'vertex' ? isBuiltId(effective, selectedWallId) : isBuiltId(effective, opening?.split('|')[0])
      // New walls live in the design; traced walls in the plan.
      const base = built ? builtPlan() : usePlanStore.getState().plan
      if (built) useDesignStore.getState().checkpoint()
      else usePlanStore.getState().checkpoint()
      if (handle.getAttribute('data-handle') === 'vertex') {
        gesture.current = { kind: 'vertex', from: [Number(handle.getAttribute('data-x')), Number(handle.getAttribute('data-y'))], base, built, moved: false }
      } else {
        const [wallId, openingId] = opening!.split('|')
        const wall = base.walls.find((w) => w.id === wallId)!
        const o = wall.openings!.find((op) => op.id === openingId)!
        gesture.current = { kind: 'opening', wallId, openingId, grab: closestOnSegment(toPlan(e), wall.start, wall.end).t - o.offset, base, built, moved: false }
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
      // New walls snap to the traced walls too; traced walls only to each other.
      const snap = snapPoint(raw, g.built ? { ...effective, walls: [...plan.walls, ...g.base.walls] } : g.base, tolerance, { exclude: g.from, disabled: e.altKey })
      g.moved = true
      setCursor(snap)
      editWalls(g.built, () => movePoint(g.base, g.from, snap.point), { history: false })
      return
    }
    if (g?.kind === 'opening') {
      const wall = g.base.walls.find((w) => w.id === g.wallId)!
      const t = closestOnSegment(raw, wall.start, wall.end).t
      g.moved = true
      editWalls(g.built, () => updateOpening(g.base, g.wallId, g.openingId, { offset: Math.round((t - g.grab) * 100) / 100 }), { history: false })
      return
    }
    if (g?.kind === 'hack') {
      g.b = closestOnSegment(raw, g.wall.start, g.wall.end).t
      const [from, to] = hackSpan(g.wall, g.a, g.b)
      setHackPreview({ wall: g.wall, from, to, blocked: null })
      return
    }

    if (g?.kind === 'item' || g?.kind === 'rotate') {
      const item = useDesignStore.getState().design.items.find((it) => it.id === g.id)
      if (!item) return
      g.moved = true
      if (g.kind === 'item') {
        const next = { ...item, x: raw[0] + g.grab[0], y: raw[1] + g.grab[1] }
        // Hold Alt to place freely; otherwise pieces tuck flush against nearby walls.
        const free = e.altKey || catalogEntry(item.type)?.layer === 'rug'
        const [x, y] = free ? [next.x, next.y] : snapToWalls(next, effective)
        updateItem(item.id, { x: Math.round(x * 1000) / 1000, y: Math.round(y * 1000) / 1000 }, false)
      } else {
        // Face the cursor: front (-sin θ, cos θ) points from the centre to the pointer.
        const deg = (Math.atan2(-(raw[0] - item.x), raw[1] - item.y) * 180) / Math.PI
        const step = e.altKey ? 1 : 15
        updateItem(item.id, { rotation: ((Math.round(deg / step) * step) % 360 + 360) % 360 }, false)
      }
      return
    }
    if (g?.kind === 'fixture') {
      const f = useDesignStore.getState().design.fixtures.find((x) => x.id === g.id)
      if (!f) return
      const moved = placeFixtureAt(f.type, raw, effective, tolerance * 2)
      if (!moved) return
      g.moved = true
      const patch = { x: moved.x, y: moved.y, rotation: moved.rotation, wallId: moved.wallId, side: moved.side }
      useDesignStore.getState().edit((d) => ({ ...d, fixtures: d.fixtures.map((x) => (x.id === g.id ? { ...x, ...patch } : x)) }), { history: false })
      return
    }

    if (tool === 'electrical') {
      setFixtureGhost(placeFixtureAt(fixtureType, raw, effective, tolerance * 1.5))
    } else if (tool === 'wall' || tool === 'room' || tool === 'calibrate') {
      setCursor(snapPoint(raw, plan, tolerance, { from: draft[draft.length - 1], extra: draft, disabled: e.altKey }))
    } else if (tool === 'build') {
      setCursor(snapPoint(raw, effective, tolerance, { from: draft[draft.length - 1], extra: draft, disabled: e.altKey }))
    } else if (tool === 'door' || tool === 'window') {
      setPreview(previewOpening(raw, effective, tolerance, tool === 'door' ? doorWidth : windowWidth))
    } else if (tool === 'hack') {
      const hit = wallUnder(raw)
      setHackPreview(hit ? { wall: hit.wall, from: 0, to: wallLength(hit.wall), blocked: hit.wall.built ? null : hackBlocker(plan, hit.wall) } : null)
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
    if (g.kind === 'hack') {
      const [from, to] = hackSpan(g.wall, g.a, g.b)
      const hack = addHack(g.wall.id, from, to)
      useAppStore.getState().selectOpening({ wallId: g.wall.id, openingId: `hack:${hack.id}` })
      setHackPreview(null)
      return
    }
    if (g.kind === 'fixture' || g.kind === 'item' || g.kind === 'rotate') {
      if (!g.moved) useDesignStore.getState().dropCheckpoint()
      return
    }
    setCursor(null)
    // A click on a handle without dragging shouldn't leave an empty undo step.
    if (!g.moved) {
      if (g.built) useDesignStore.getState().dropCheckpoint()
      else usePlanStore.setState((s) => ({ past: s.past.slice(0, -1) }))
    }
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

      // Furniture, electrical points and renovation live in the design; the trace in the plan.
      const history = designHistoryActive() ? useDesignStore.getState() : planStore
      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        if (e.shiftKey) history.redo()
        else history.undo()
        return
      }
      if (mod && e.key.toLowerCase() === 'd' && app.selectedItemId) {
        e.preventDefault()
        duplicateItem(app.selectedItemId)
        return
      }
      if (mod && e.key.toLowerCase() === 'y') {
        e.preventDefault()
        history.redo()
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
        if (app.selectedItemId) {
          removeItem(app.selectedItemId)
        } else if (app.selectedFixtureId) {
          const id = app.selectedFixtureId
          // Lights controlled by a deleted switch become unswitched rather than dangling.
          useDesignStore.getState().edit((d) => ({
            ...d,
            fixtures: d.fixtures.filter((f) => f.id !== id).map((f) => (f.switchId === id ? { ...f, switchId: undefined } : f)),
          }))
        } else if (app.selectedOpening) {
          const { wallId, openingId } = app.selectedOpening
          if (isHackOpening(openingId)) removeHack(hackIdOf(openingId))
          else editWalls(isBuiltId(builtPlan(), wallId), (p) => deleteOpening(p, wallId, openingId))
        } else if (app.selectedWallId) {
          const id = app.selectedWallId
          if (isBuiltId(builtPlan(), id)) removeBuiltWall(id)
          else planStore.edit((p) => deleteWall(p, id))
        } else if (app.selectedRoomId) {
          const id = app.selectedRoomId
          planStore.edit((p) => deleteRoom(p, id))
        } else return
        e.preventDefault()
        app.clearSelection()
        return
      }
      if (app.selectedItemId) {
        // With a piece selected, Q/E rotate it (instead of picking tools) and Ctrl+D copies it.
        const k = e.key.toLowerCase()
        if (k === 'q' || k === 'e') {
          e.preventDefault()
          rotateItem(app.selectedItemId, k === 'q' ? -15 : 15)
          return
        }
      }
      const tools: Record<string, typeof editor.tool> = { v: 'select', w: 'wall', d: 'door', n: 'window', r: 'room', c: 'calibrate', e: 'electrical', b: 'build', h: 'hack' }
      const next = tools[e.key.toLowerCase()]
      if (next) editor.setTool(next)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [finishRoom])

  /** The wall under a plan point (traced or new), with the distance along it. */
  const wallUnder = (p: Vec2) => {
    let best: { wall: Wall; t: number; dist: number } | null = null
    for (const wall of [...plan.walls, ...reno.walls]) {
      const hit = closestOnSegment(p, wall.start, wall.end)
      if (hit.dist <= wall.thickness / 2 + tolerance && (!best || hit.dist < best.dist)) best = { wall, t: hit.t, dist: hit.dist }
    }
    return best
  }

  const walls = useMemo(
    () =>
      [...plan.walls, ...reno.walls]
        .filter((w) => wallLength(w) > 0.005)
        .map((w) => ({
          wall: w,
          outline: wallOutline(w),
          gaps: (w.openings ?? []).map((o) => ({ opening: o, outline: wallOutline({ ...w, thickness: w.thickness + 0.02 }, o.offset, o.offset + o.width) })),
        })),
    [plan, reno.walls],
  )

  const selectedWall = plan.walls.find((w) => w.id === selectedWallId) ?? reno.walls.find((w) => w.id === selectedWallId)
  const selectedRoom = plan.rooms.find((r) => r.id === selectedRoomId)
  const last = draft[draft.length - 1]
  const drawing = tool !== 'select'

  return (
    <div
      className="relative h-full w-full"
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes(FURNITURE_MIME)) e.preventDefault()
      }}
      onDrop={(e) => {
        const type = e.dataTransfer.getData(FURNITURE_MIME)
        if (!type) return
        e.preventDefault()
        useEditorStore.getState().setTool('select')
        addItem(type, ...toPlan(e))
      }}
    >
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
          {/* Hatching for renovation: red for walls to hack, accent for new walls. */}
          <pattern id="hatch-hack" width={0.08} height={0.08} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width={0.08} height={0.08} fill="#e5484d" fillOpacity={0.18} />
            <line x1={0} y1={0} x2={0} y2={0.08} stroke="#e5484d" strokeWidth={0.025} />
          </pattern>
          <pattern id="hatch-new" width={0.06} height={0.06} patternUnits="userSpaceOnUse" patternTransform="rotate(-45)">
            <rect width={0.06} height={0.06} fill="rgb(var(--accent))" fillOpacity={0.35} />
            <line x1={0} y1={0} x2={0} y2={0.06} stroke="rgb(var(--accent))" strokeWidth={0.02} />
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
            fill={wall.id === selectedWallId ? undefined : wall.built === 'glass' ? 'rgb(56 189 248 / 0.35)' : wall.built ? 'url(#hatch-new)' : undefined}
            className={clsx(
              wall.built ? (wall.built === 'glass' ? 'stroke-sky-500' : 'stroke-accent') : wall.structural ? 'fill-ink/85' : 'fill-ink/40',
              wall.id === selectedWallId && 'fill-accent stroke-accent',
              !drawing && 'cursor-pointer hover:fill-accent/70',
            )}
            strokeWidth={wall.id === selectedWallId ? px(1.5) : wall.built ? px(1) : 0}
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

        {/* Stretches of wall to be hacked. */}
        {reno.hacks.map((h) => {
          const wall = plan.walls.find((w) => w.id === h.wallId)
          if (!wall) return null
          const key = `${wall.id}|hack:${h.id}`
          const active = selectedOpening?.wallId === wall.id && selectedOpening.openingId === `hack:${h.id}`
          const [a, b] = spanExtent(wall, h.from, h.to)
          return (
            <polygon
              key={key}
              data-opening={key}
              points={points(wallOutline({ ...wall, thickness: wall.thickness + px(4) }, a, b))}
              fill="url(#hatch-hack)"
              stroke="#e5484d"
              strokeWidth={px(active ? 2 : 1)}
              strokeDasharray={active ? undefined : `${px(5)} ${px(3)}`}
              className={clsx(!drawing && 'cursor-pointer')}
            />
          )
        })}

        <FurniturePlanLayer plan={effective} items={items} selectedId={selectedItemId} interactive={tool === 'select'} px={px} />

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

        {showElectrical && <FixtureSymbols fixtures={fixtures} selectedId={selectedFixtureId} px={px} ghost={tool === 'electrical' ? fixtureGhost : null} />}

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
        {tool === 'build' && last && cursor && distance(last, cursor.point) > 0.005 && (
          <>
            <polygon
              points={points(wallOutline({ id: 'preview', start: last, end: cursor.point, thickness: builtKind(buildKind).thickness }))}
              className={buildKind === 'glass' ? 'fill-sky-400/40 stroke-sky-500' : 'fill-accent/50 stroke-accent'}
              strokeWidth={px(1)}
              pointerEvents="none"
            />
            <DimensionLabel a={last} b={cursor.point} px={px} />
          </>
        )}
        {tool === 'hack' && hackPreview && (
          <polygon
            points={points(wallOutline({ ...hackPreview.wall, thickness: hackPreview.wall.thickness + px(6) }, ...spanExtent(hackPreview.wall, hackPreview.from, hackPreview.to)))}
            fill={hackPreview.blocked ? 'rgb(var(--ink))' : 'url(#hatch-hack)'}
            fillOpacity={hackPreview.blocked ? 0.25 : 1}
            stroke={hackPreview.blocked ? 'rgb(var(--ink))' : '#e5484d'}
            strokeWidth={px(1.5)}
            pointerEvents="none"
          />
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
        {(tool === 'wall' || tool === 'build' || tool === 'room' || tool === 'calibrate') &&
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
