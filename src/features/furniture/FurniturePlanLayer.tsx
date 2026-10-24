import { useMemo } from 'react'
import clsx from 'clsx'
import type { FloorPlan, Vec2 } from '../../types/plan'
import type { FurnitureItem } from '../../types/design'
import { WALKWAY_COMFORT, WALKWAY_GAP, WALKWAY_MIN, clearances, footprint, itemAxes, itemWarnings } from '../../lib/furnitureMath'
import { catalogEntry, footprintOf } from './catalog'

// Furniture on the 2D plan: footprints you can select and drag, a rotate handle on the selected
// piece, its walkway gaps, and red footprints for pieces with problems (like the 3D view).

const points = (pts: Vec2[]) => pts.map(([x, y]) => `${x},${y}`).join(' ')
const PROBLEM = '#e5484d'

/** Where the rotate handle sits: in front of the piece, past its front edge. */
export function rotateHandleAt(item: FurnitureItem, px: (n: number) => number): Vec2 {
  const { n } = itemAxes(item)
  const reach = footprintOf(item).depth / 2 + px(22)
  return [item.x + n[0] * reach, item.y + n[1] * reach]
}

interface Props {
  plan: FloorPlan
  items: FurnitureItem[]
  selectedId: string | null
  /** Pieces can be picked and dragged (Select tool). */
  interactive: boolean
  px: (n: number) => number
}

export function FurniturePlanLayer({ plan, items, selectedId, interactive, px }: Props) {
  const problems = useMemo(() => new Set(items.filter((it) => itemWarnings(it, items, plan).some((w) => w.kind !== 'walkway')).map((it) => it.id)), [items, plan])
  const selected = items.find((it) => it.id === selectedId)
  const gaps = useMemo(() => (selected ? clearances(selected, items, plan).filter((c) => c.distance >= 0.05) : []), [selected, items, plan])

  return (
    <g>
      {items.map((it) => {
        const entry = catalogEntry(it.type)
        const isSel = it.id === selectedId
        const bad = problems.has(it.id)
        const [cx, cy] = [it.x, it.y]
        const { n } = itemAxes(it)
        const d = footprintOf(it).depth
        return (
          <g key={it.id} data-item={interactive ? it.id : undefined} className={clsx(interactive && (it.locked ? 'cursor-pointer' : 'cursor-move'))} pointerEvents={interactive ? undefined : 'none'}>
            <polygon
              points={points(footprint(it))}
              fill={bad ? PROBLEM : isSel ? 'rgb(var(--accent))' : 'rgb(var(--ink))'}
              fillOpacity={bad ? 0.22 : isSel ? 0.18 : 0.06}
              stroke={bad ? PROBLEM : isSel ? 'rgb(var(--accent))' : 'rgb(var(--ink))'}
              strokeOpacity={isSel || bad ? 1 : 0.4}
              strokeWidth={px(isSel ? 2 : 1)}
              strokeDasharray={entry?.layer === 'floor' ? undefined : `${px(4)} ${px(3)}`}
            />
            {/* Front edge marker, so you can tell which way a piece faces. */}
            <line
              x1={cx + n[0] * (d / 2 - px(4))}
              y1={cy + n[1] * (d / 2 - px(4))}
              x2={cx + n[0] * (d / 2 - px(10))}
              y2={cy + n[1] * (d / 2 - px(10))}
              stroke={isSel ? 'rgb(var(--accent))' : 'rgb(var(--ink))'}
              strokeOpacity={0.5}
              strokeWidth={px(2)}
              pointerEvents="none"
            />
            <text x={cx} y={cy + px(3)} fontSize={px(9)} textAnchor="middle" className="fill-ink/60" pointerEvents="none">
              {entry?.name}
            </text>
          </g>
        )
      })}

      {selected && (
        <g pointerEvents="none">
          {gaps.map((g) => {
            const color = g.distance < WALKWAY_GAP ? '#8b8d91' : g.distance < WALKWAY_MIN ? PROBLEM : g.distance < WALKWAY_COMFORT ? '#e3a008' : '#2f9e6b'
            const mx = (g.from[0] + g.to[0]) / 2
            const my = (g.from[1] + g.to[1]) / 2
            const label = String(Math.round(g.distance * 1000))
            const w = px(label.length * 6 + 10)
            return (
              <g key={g.side}>
                <line x1={g.from[0]} y1={g.from[1]} x2={g.to[0]} y2={g.to[1]} stroke={color} strokeWidth={px(1.5)} strokeDasharray={`${px(4)} ${px(3)}`} />
                <rect x={mx - w / 2} y={my - px(8)} width={w} height={px(16)} rx={px(8)} fill={color} />
                <text x={mx} y={my + px(3.5)} fontSize={px(10)} fontWeight={700} textAnchor="middle" fill="#fff">
                  {label}
                </text>
              </g>
            )
          })}
        </g>
      )}

      {selected && interactive && !selected.locked && (() => {
        const [hx, hy] = rotateHandleAt(selected, px)
        const { n } = itemAxes(selected)
        const d = footprintOf(selected).depth
        return (
          <g>
            <line x1={selected.x + n[0] * (d / 2)} y1={selected.y + n[1] * (d / 2)} x2={hx} y2={hy} stroke="rgb(var(--accent))" strokeWidth={px(1.5)} pointerEvents="none" />
            <circle data-rotate={selected.id} cx={hx} cy={hy} r={px(7)} fill="rgb(var(--panel))" stroke="rgb(var(--accent))" strokeWidth={px(2)} className="cursor-grab" />
          </g>
        )
      })()}
    </g>
  )
}
