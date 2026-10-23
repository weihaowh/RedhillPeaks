import { useState } from 'react'
import { Ruler } from 'lucide-react'
import type { Vec2 } from '../../types/plan'
import { usePlanStore } from '../../store/usePlanStore'
import { useAppStore } from '../../store/useAppStore'
import { distance } from '../../lib/planMath'
import { scalePlan } from '../../lib/planEdits'

export function CalibrateDialog({ a, b, hasTrace, onClose }: { a: Vec2; b: Vec2; hasTrace: boolean; onClose: () => void }) {
  const measured = distance(a, b)
  const [value, setValue] = useState(String(Math.round(measured * 1000)))
  const [includeTrace, setIncludeTrace] = useState(true)
  const real = Number(value) / 1000
  const valid = Number.isFinite(real) && real > 0.05

  const apply = () => {
    if (!valid) return
    usePlanStore.getState().edit((p) => scalePlan(p, a, real / measured, hasTrace && includeTrace))
    useAppStore.getState().resetView()
    onClose()
  }

  return (
    <div className="glass absolute left-1/2 top-24 z-30 w-[min(22rem,calc(100vw-1.5rem))] -translate-x-1/2 p-4">
      <div className="mb-1 flex items-center gap-2 text-sm font-semibold">
        <Ruler size={16} className="text-accent" /> Set the scale
      </div>
      <p className="mb-3 text-xs leading-relaxed text-muted">
        That line measures {Math.round(measured * 1000).toLocaleString()} mm at the current scale. Enter its real length from the drawing.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          apply()
        }}
        className="space-y-3"
      >
        <label className="flex items-center gap-2 rounded-xl border border-line bg-canvas/60 px-3 focus-within:ring-2 focus-within:ring-accent/40">
          <input
            autoFocus
            inputMode="numeric"
            value={value}
            onChange={(e) => setValue(e.target.value.replace(/[^\d.]/g, ''))}
            onFocus={(e) => e.target.select()}
            className="h-10 flex-1 bg-transparent text-sm tabular-nums outline-none"
          />
          <span className="text-xs text-muted">mm</span>
        </label>
        {hasTrace && (
          <label className="flex items-center gap-2 text-xs text-muted">
            <input type="checkbox" checked={includeTrace} onChange={(e) => setIncludeTrace(e.target.checked)} className="accent-[rgb(var(--accent))]" />
            Also rescale the walls and rooms already traced
          </label>
        )}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="h-9 rounded-xl px-3 text-xs font-medium text-muted hover:bg-ink/5 hover:text-ink">
            Cancel
          </button>
          <button type="submit" disabled={!valid} className="h-9 rounded-xl bg-accent px-4 text-xs font-semibold text-white disabled:opacity-40">
            Apply scale
          </button>
        </div>
      </form>
    </div>
  )
}
