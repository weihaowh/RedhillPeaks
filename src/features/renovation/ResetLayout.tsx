import { useMemo, useState } from 'react'
import { RotateCcw } from 'lucide-react'
import clsx from 'clsx'
import { useDesignStore } from '../../store/useDesignStore'
import { usePlanStore } from '../../store/usePlanStore'
import { useAppStore } from '../../store/useAppStore'
import { useEditorStore } from '../../store/useEditorStore'
import { redhillPeaks } from '../../data/redhillPeaks'
import { EMPTY_RENOVATION, renovationOf } from '../../lib/renovation'

// Resets the layout (furniture) and walls (renovation, and optionally the trace) in one go.
// Paint, floors, ceilings and electrical points are left alone.

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

export function ResetLayoutPanel({ onDone }: { onDone: () => void }) {
  const items = useDesignStore((s) => s.design.items.length)
  const reno = renovationOf(useDesignStore((s) => s.design))
  const plan = usePlanStore((s) => s.plan)
  const traceEdited = useMemo(
    () => plan.id === redhillPeaks.id && (JSON.stringify(plan.walls) !== JSON.stringify(redhillPeaks.walls) || JSON.stringify(plan.rooms) !== JSON.stringify(redhillPeaks.rooms)),
    [plan],
  )
  const renoCount = reno.walls.length + reno.hacks.length

  const [furniture, setFurniture] = useState(items > 0)
  const [renovation, setRenovation] = useState(renoCount > 0)
  const [trace, setTrace] = useState(false)
  const nothing = !(furniture && items) && !(renovation && renoCount) && !(trace && traceEdited)

  const reset = () => {
    if (furniture || renovation) {
      // One design step, so a single Ctrl+Z brings both back.
      useDesignStore.getState().edit((d) => ({ ...d, items: furniture ? [] : d.items, renovation: renovation ? EMPTY_RENOVATION : d.renovation }))
    }
    if (trace && traceEdited) usePlanStore.getState().resetToTraced()
    useEditorStore.getState().setDraft([])
    useAppStore.getState().clearSelection()
    onDone()
  }

  return (
    <div className="w-[min(20rem,calc(100vw-2rem))] space-y-3 p-4">
      <div>
        <div className="text-sm font-semibold">Reset layout and walls</div>
        <p className="text-xs leading-relaxed text-muted">Start the flat over. Paint, floors, ceilings and electrical points stay as they are.</p>
      </div>
      <div className="space-y-1">
        <Option checked={furniture} onChange={setFurniture} disabled={!items} label="Remove all furniture" detail={items ? plural(items, 'piece') : 'No furniture placed'} />
        <Option
          checked={renovation}
          onChange={setRenovation}
          disabled={!renoCount}
          label="Undo hacking and new walls"
          detail={renoCount ? [reno.walls.length && plural(reno.walls.length, 'new wall'), reno.hacks.length && plural(reno.hacks.length, 'hack')].filter(Boolean).join(', ') : 'No renovation planned'}
        />
        <Option
          checked={trace}
          onChange={setTrace}
          disabled={!traceEdited}
          label="Restore the original traced walls"
          detail={traceEdited ? 'Puts back the walls, doors, windows and rooms as traced from the HDB plan' : plan.id === redhillPeaks.id ? 'Trace unchanged' : 'Not available for an uploaded plan'}
        />
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onDone} className="h-9 rounded-xl px-3 text-xs font-medium text-muted hover:bg-ink/5 hover:text-ink">
          Cancel
        </button>
        <button type="button" disabled={nothing} onClick={reset} className="flex h-9 items-center gap-1.5 rounded-xl bg-red-500 px-4 text-xs font-semibold text-white hover:bg-red-600 disabled:opacity-40">
          <RotateCcw size={13} /> Reset
        </button>
      </div>
      <p className="text-[11px] leading-relaxed text-muted">Ctrl+Z brings the furniture and walls back. Restored trace walls undo in the 2D Plan view.</p>
    </div>
  )
}

function Option({ checked, onChange, disabled, label, detail }: { checked: boolean; onChange: (v: boolean) => void; disabled: boolean; label: string; detail: string }) {
  return (
    <label className={clsx('flex items-start gap-2.5 rounded-xl p-2', disabled ? 'opacity-50' : 'cursor-pointer hover:bg-ink/5')}>
      <input type="checkbox" checked={checked && !disabled} disabled={disabled} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 accent-[rgb(var(--accent))]" />
      <span>
        <span className="block text-sm">{label}</span>
        <span className="block text-xs text-muted">{detail}</span>
      </span>
    </label>
  )
}
