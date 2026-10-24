import type { FloorPlan } from '../../types/plan'
import { useEditorStore, type Tool } from '../../store/useEditorStore'
import { useRenoNotice } from '../renovation/renoActions'

const HINTS: Record<Tool, [idle: string, drawing?: string]> = {
  select: ['Click a wall, door, window, room or piece of furniture to edit it. Drag furniture to move it, and the round handle to rotate it. Drag empty space to pan, scroll to zoom.'],
  wall: [
    'Traces the flat as handed over. To plan a new wall, use Build (B) instead. Click to start a wall. It snaps to corners, 45° angles, other walls and a 50 mm grid.',
    'Click to add the next corner. Click the same point again, or press Enter, to finish. Hold Alt to turn snapping off.',
  ],
  door: ['Move over a wall and click to add a door. Red means it would overlap another opening.'],
  window: ['Move over a wall and click to add a window. Red means it would overlap another opening.'],
  room: ['Click the corners of a room. It snaps to your wall corners.', 'Keep clicking corners. Click the first point or press Enter to close the room.'],
  build: [
    'Click to start a new wall. It snaps to existing walls and corners. Pick board, brick or glass in the toolbar.',
    'Click to add the next corner. Click the same point again, Enter or right-click to finish. Hold Alt to turn snapping off.',
  ],
  hack: ['Click a wall to hack all of it, or drag along it to hack part. Structural, external and shelter walls are refused. Click a new wall to remove it.'],
  electrical: ['Click a wall to mount the point (or anywhere in a room for lights). Pick other points from the Electrical tab. Esc to finish.'],
  calibrate: ['Click one end of a dimension you know, for example a wall marked 3050 on the drawing.', 'Now click the other end of that dimension.'],
}

export function EditorHint({ plan }: { plan: FloorPlan }) {
  const tool = useEditorStore((s) => s.tool)
  const drawing = useEditorStore((s) => s.draft.length > 0)
  const notice = useRenoNotice((s) => s.text)
  const fresh = plan.walls.length === 0 && tool === 'select'
  const [idle, active] = HINTS[tool]
  const text = notice
    ? notice
    : fresh
    ? 'New plan: first use Calibrate (C) on a known dimension to set the scale, then trace the walls with the Wall tool (W).'
    : drawing && active
      ? active
      : idle

  return (
    <div className="pointer-events-none absolute bottom-[4.5rem] left-3 right-3 z-10 rounded-2xl bg-ink/80 px-4 py-2 text-center text-xs text-canvas shadow-float backdrop-blur lg:bottom-auto lg:left-1/2 lg:right-auto lg:top-20 lg:w-max lg:max-w-[min(34rem,calc(100vw-40rem))] lg:-translate-x-1/2 lg:rounded-full">
      {text}
    </div>
  )
}
