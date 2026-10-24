import { useMemo } from 'react'
import { ClipboardList } from 'lucide-react'
import clsx from 'clsx'
import type { FloorPlan } from '../../types/plan'
import { useAppStore } from '../../store/useAppStore'
import { useDesignStore } from '../../store/useDesignStore'
import { estimate } from '../../lib/estimate'

const short = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 100000 ? 0 : 1).replace(/\.0$/, '')}k` : String(Math.round(n)))

/** Running cost vs budget in the top bar; opens the project report. */
export function BudgetPill({ plan }: { plan: FloorPlan }) {
  const design = useDesignStore((s) => s.design)
  const budget = useAppStore((s) => s.budget)
  const openReport = useAppStore((s) => s.openReport)
  const total = useMemo(() => estimate(plan, design).total, [plan, design])
  const over = budget > 0 && total > budget

  return (
    <button
      type="button"
      onClick={() => openReport('budget')}
      title="Project report: budget, shopping list, HDB checks and room boards"
      className={clsx('chip h-9 gap-1.5 whitespace-nowrap ring-1 ring-line', over && 'text-red-500 ring-red-500/40')}
    >
      <ClipboardList size={15} />
      <span className="hidden tabular-nums lg:inline">
        S${short(total)}
        {budget > 0 && <span className="text-muted"> / {short(budget)}</span>}
      </span>
    </button>
  )
}
