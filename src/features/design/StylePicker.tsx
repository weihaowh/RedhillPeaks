import { useState } from 'react'
import { Wand2 } from 'lucide-react'
import clsx from 'clsx'
import { STYLES, type DesignStyle } from '../../data/styles'
import { useDesignStore } from '../../store/useDesignStore'
import { usePlanStore } from '../../store/usePlanStore'
import { applyStyle } from '../../lib/styles'
import { finishById } from '../scene/finishes'
import { FABRICS, FURNITURE_FINISHES } from '../furniture/catalog'

const swatches = (s: DesignStyle) => [
  s.wall,
  finishById(s.floors.living.finish).swatch,
  FURNITURE_FINISHES.find((f) => f.id === s.cabinet)?.color ?? '#ccc',
  FABRICS.find((f) => f.id === s.fabric)?.color ?? '#ccc',
  FABRICS.find((f) => f.id === s.accent)?.color ?? '#ccc',
]

/** Style cards. With `roomId` the style only restyles that room. */
export function StylePicker({ roomId, compact }: { roomId?: string; compact?: boolean }) {
  const [applied, setApplied] = useState<string>()

  const apply = (style: DesignStyle) => {
    const plan = usePlanStore.getState().plan
    useDesignStore.getState().edit((d) => applyStyle(d, plan, style, roomId))
    setApplied(style.id)
  }

  return (
    <section className="space-y-2">
      <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted">
        <Wand2 size={13} /> {roomId ? 'Style this room' : 'Start from a style'}
      </div>
      <div className={clsx('grid gap-1.5', compact ? 'grid-cols-2' : 'grid-cols-1')}>
        {STYLES.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => apply(s)}
            title={s.blurb}
            className={clsx('rounded-xl p-2 text-left ring-1 transition hover:bg-ink/5', applied === s.id ? 'ring-2 ring-accent' : 'ring-line')}
          >
            <span className="flex h-4 overflow-hidden rounded-md ring-1 ring-inset ring-black/10">
              {swatches(s).map((c, i) => (
                <span key={i} className="flex-1" style={{ background: c }} />
              ))}
            </span>
            <span className="mt-1.5 block text-xs font-semibold">{s.name}</span>
            {!compact && <span className="block text-[11px] leading-snug text-muted">{s.blurb}</span>}
          </button>
        ))}
      </div>
      <p className="text-[11px] text-muted">
        {roomId ? 'Sets this room’s floor, paint and ceiling and restyles its furniture.' : 'Sets paint, floors, ceilings and furniture finishes. Feature walls stay.'} Ctrl+Z undoes it.
      </p>
    </section>
  )
}
