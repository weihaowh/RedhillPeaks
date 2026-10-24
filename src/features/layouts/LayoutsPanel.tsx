import { useMemo } from 'react'
import { AlertTriangle, Check, Info, Sparkles } from 'lucide-react'
import clsx from 'clsx'
import type { FloorPlan, Vec2 } from '../../types/plan'
import type { FurnitureItem } from '../../types/design'
import { useDesignStore } from '../../store/useDesignStore'
import { useAppStore } from '../../store/useAppStore'
import { redhillPeaks } from '../../data/redhillPeaks'
import { LAYOUT_SCHEMES, LAYOUT_ZONES, type LayoutOption, type LayoutScheme, type LayoutZone } from '../../data/layouts'
import { activeOption, applyOption, applyScheme, optionWarnings } from '../../lib/layouts'
import { footprint, wallBlocks } from '../../lib/furnitureMath'
import { catalogEntry } from '../furniture/catalog'

// Layout ideas: whole-flat schemes for different households, and alternative arrangements per
// room that can be mixed and matched. Each card shows a plan thumbnail and whether it fits
// cleanly around what's already in the rest of the flat.

const points = (pts: Vec2[]) => pts.map(([x, y]) => `${x},${y}`).join(' ')

function commit(next: (items: FurnitureItem[]) => FurnitureItem[]) {
  useDesignStore.getState().edit((d) => ({ ...d, items: next(d.items) }))
  useAppStore.getState().clearSelection()
}

export function LayoutsPanel({ plan }: { plan: FloorPlan }) {
  const items = useDesignStore((s) => s.design.items)

  if (plan.id !== redhillPeaks.id) {
    return (
      <div className="flex gap-2 rounded-xl bg-ink/5 p-3 text-xs leading-relaxed text-muted">
        <Info size={14} className="mt-0.5 shrink-0" />
        <p>Layout ideas are drawn for the Redhill Peaks trace, so they don't fit an uploaded plan. Furnish this plan from the Library tab instead.</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <section className="space-y-2">
        <Heading>Whole-flat schemes</Heading>
        {LAYOUT_SCHEMES.map((s) => (
          <SchemeCard key={s.id} scheme={s} items={items} />
        ))}
      </section>

      {LAYOUT_ZONES.filter((z) => z.options.length > 1).map((zone) => (
        <ZoneSection key={zone.id} plan={plan} zone={zone} items={items} />
      ))}

      <p className="px-1 text-xs leading-relaxed text-muted">
        Picking a room layout replaces only the furniture in that room. Everything is checked against walls, door swings and the 600 mm walkway rule. Ctrl+Z undoes.
      </p>
    </div>
  )
}

/** Layout options for the zones in one room (shown in the room's design panel). */
export function RoomLayouts({ plan, roomId }: { plan: FloorPlan; roomId: string }) {
  const items = useDesignStore((s) => s.design.items)
  return (
    <div className="space-y-4">
      {roomLayoutZones(plan, roomId).map((zone) => (
        <ZoneSection key={zone.id} plan={plan} zone={zone} items={items} />
      ))}
    </div>
  )
}

/** Zones with a choice of layouts in this room, on the Redhill trace only. */
export const roomLayoutZones = (plan: FloorPlan, roomId: string) =>
  plan.id === redhillPeaks.id ? LAYOUT_ZONES.filter((z) => z.options.length > 1 && z.rooms.includes(roomId)) : []

function Heading({ children }: { children: React.ReactNode }) {
  return <div className="px-1 text-xs font-semibold uppercase tracking-wider text-muted">{children}</div>
}

function SchemeCard({ scheme, items }: { scheme: LayoutScheme; items: FurnitureItem[] }) {
  const active = LAYOUT_ZONES.every((z) => activeOption(z, items)?.id === scheme.picks[z.id])
  const rooms = LAYOUT_ZONES.filter((z) => z.options.length > 1).map((z) => z.options.find((o) => o.id === scheme.picks[z.id])?.name)
  return (
    <button
      type="button"
      onClick={() => commit((its) => applyScheme(its, scheme))}
      className={clsx(
        'flex w-full items-start gap-3 rounded-xl p-3 text-left ring-1 transition',
        active ? 'bg-accent/10 ring-accent/40' : 'ring-line hover:bg-ink/5',
      )}
    >
      {active ? <Check size={18} className="mt-0.5 shrink-0 text-accent" /> : <Sparkles size={18} className="mt-0.5 shrink-0 text-accent" />}
      <span className="min-w-0">
        <span className="block text-sm font-semibold">{scheme.name}</span>
        <span className="block text-xs leading-relaxed text-muted">{scheme.blurb}</span>
        <span className="mt-1 block text-[11px] leading-relaxed text-muted/80">{rooms.join(' · ')}</span>
      </span>
    </button>
  )
}

function ZoneSection({ plan, zone, items }: { plan: FloorPlan; zone: LayoutZone; items: FurnitureItem[] }) {
  const current = activeOption(zone, items)
  const warnings = useMemo(() => new Map(zone.options.map((o) => [o.id, optionWarnings(plan, items, zone, o)])), [plan, items, zone])
  return (
    <section className="space-y-1.5">
      <Heading>{zone.name}</Heading>
      <ul className="space-y-1">
        {zone.options.map((o) => {
          const on = current?.id === o.id
          const clashes = warnings.get(o.id) ?? []
          return (
            <li key={o.id}>
              <button
                type="button"
                onClick={() => commit((its) => applyOption(its, zone, o))}
                title={clashes.map((w) => w.message).join('\n') || undefined}
                className={clsx('flex w-full items-start gap-3 rounded-xl p-2 text-left ring-1 transition', on ? 'bg-accent/10 ring-accent/40' : 'ring-transparent hover:bg-ink/5')}
              >
                <Thumb plan={plan} zone={zone} option={o} />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{o.name}</span>
                  <span className="line-clamp-3 block text-xs leading-relaxed text-muted">{o.blurb}</span>
                  <span className={clsx('mt-1 inline-flex items-center gap-1 text-[11px]', on ? 'text-accent' : clashes.length ? 'text-amber-600' : 'text-muted')}>
                    {on ? (
                      <>
                        <Check size={11} /> In use
                      </>
                    ) : clashes.length ? (
                      <>
                        <AlertTriangle size={11} /> {clashes.length} {clashes.length === 1 ? 'clash' : 'clashes'} with the current flat
                      </>
                    ) : (
                      'Fits cleanly'
                    )}
                  </span>
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

/** Small plan of the zone with the option's footprints. */
function Thumb({ plan, zone, option }: { plan: FloorPlan; zone: LayoutZone; option: LayoutOption }) {
  const { box, walls, pieces } = useMemo(() => {
    const pts = zone.region.flat()
    const xs = pts.map((p) => p[0])
    const ys = pts.map((p) => p[1])
    const pad = 0.2
    const box = [Math.min(...xs) - pad, Math.min(...ys) - pad, Math.max(...xs) - Math.min(...xs) + pad * 2, Math.max(...ys) - Math.min(...ys) + pad * 2]
    const pieces = applyOption([], zone, option)
      .filter((it) => catalogEntry(it.type)?.layer !== 'wall')
      .map((it) => ({ id: it.id, rug: catalogEntry(it.type)?.layer === 'rug', pts: footprint(it) }))
    return { box, walls: wallBlocks(plan), pieces }
  }, [plan, zone, option])

  return (
    <svg viewBox={box.join(' ')} className="h-20 w-20 shrink-0 rounded-lg bg-canvas/70 ring-1 ring-line" preserveAspectRatio="xMidYMid meet">
      {zone.region.map((poly, i) => (
        <polygon key={i} points={points(poly)} fill="rgb(var(--ink))" fillOpacity={0.04} />
      ))}
      {walls.map((poly, i) => (
        <polygon key={i} points={points(poly)} fill="rgb(var(--ink))" fillOpacity={0.55} />
      ))}
      {pieces.map((p) => (
        <polygon
          key={p.id}
          points={points(p.pts)}
          fill="rgb(var(--accent))"
          fillOpacity={p.rug ? 0.1 : 0.35}
          stroke="rgb(var(--accent))"
          strokeWidth={1}
          strokeDasharray={p.rug ? '2 2' : undefined}
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </svg>
  )
}
