import { useState } from 'react'
import { Bath, BedDouble, BookOpen, CookingPot, Flower2, Hammer, Plus, Search, Sofa, Sparkles, UtensilsCrossed, WashingMachine } from 'lucide-react'
import type { FloorPlan } from '../../types/plan'
import { useAppStore } from '../../store/useAppStore'
import { useDesignStore } from '../../store/useDesignStore'
import { planBounds } from '../../lib/planMath'
import { redhillPeaks } from '../../data/redhillPeaks'
import { starterLayout } from '../../data/starterLayout'
import { CATALOG, CATEGORIES, type Category } from './catalog'
import { addItem } from './itemActions'
import { FURNITURE_MIME, viewCentre } from '../scene/sceneBridge'

const ICONS: Record<Category, typeof Sofa> = {
  Living: Sofa,
  Dining: UtensilsCrossed,
  Bedroom: BedDouble,
  Study: BookOpen,
  Kitchen: CookingPot,
  Bathroom: Bath,
  Utility: WashingMachine,
  Décor: Flower2,
  Carpentry: Hammer,
}

const mm = (m: number) => Math.round(m * 1000)

export function LibraryPanel({ plan }: { plan: FloorPlan }) {
  const [query, setQuery] = useState('')
  const itemCount = useDesignStore((s) => s.design.items.length)
  const q = query.trim().toLowerCase()
  const matches = CATALOG.filter((e) => !q || e.name.toLowerCase().includes(q) || e.category.toLowerCase().includes(q))

  const add = (type: string) => {
    const app = useAppStore.getState()
    if (app.mode === 'plan') app.setMode('orbit')
    const b = planBounds(plan)
    const [x, y] = viewCentre() ?? [b.cx, b.cy]
    addItem(type, x, y)
  }

  const furnish = () => {
    useDesignStore.getState().edit((d) => ({ ...d, items: starterLayout() }))
    const app = useAppStore.getState()
    if (app.mode === 'plan') app.setMode('orbit')
    app.resetView()
  }

  return (
    <div className="space-y-4">
      {plan.id === redhillPeaks.id && (
        <button type="button" onClick={furnish} className="flex w-full items-start gap-3 rounded-xl bg-accent/10 p-3 text-left ring-1 ring-accent/30 transition hover:bg-accent/15">
          <Sparkles size={18} className="mt-0.5 shrink-0 text-accent" />
          <span>
            <span className="block text-sm font-semibold">{itemCount ? 'Replace with starter layout' : 'Furnish with a starter layout'}</span>
            <span className="block text-xs leading-relaxed text-muted">A designer layout for every room, checked against doors and walkways. Rearrange it freely; Ctrl+Z undoes.</span>
          </span>
        </button>
      )}

      <label className="flex items-center gap-2 rounded-xl border border-line bg-canvas/60 px-3 focus-within:ring-2 focus-within:ring-accent/40">
        <Search size={14} className="text-muted" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search sofas, beds, wardrobes…" className="h-9 flex-1 bg-transparent text-sm outline-none placeholder:text-muted" />
      </label>

      <p className="px-1 text-xs text-muted">Drag a piece onto the 3D view, or click + to add it in the middle of the view.</p>

      {CATEGORIES.map((cat) => {
        const entries = matches.filter((e) => e.category === cat)
        if (!entries.length) return null
        const Icon = ICONS[cat]
        return (
          <section key={cat}>
            <div className="mb-1.5 flex items-center gap-1.5 px-1 text-xs font-semibold uppercase tracking-wider text-muted">
              <Icon size={13} /> {cat}
            </div>
            <ul className="space-y-0.5">
              {entries.map((e) => (
                <li key={e.id}>
                  <div
                    draggable
                    onDragStart={(ev) => {
                      ev.dataTransfer.setData(FURNITURE_MIME, e.id)
                      ev.dataTransfer.effectAllowed = 'copy'
                    }}
                    className="group flex cursor-grab items-center gap-2.5 rounded-xl px-2 py-1.5 hover:bg-ink/5 active:cursor-grabbing"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-ink/5 text-muted group-hover:text-accent">
                      <Icon size={15} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm">{e.name}</span>
                      <span className="block text-[11px] tabular-nums text-muted">
                        {mm(e.size.w)} × {mm(e.size.d)} × {mm(e.size.h)} mm{e.resizable ? ' · made to measure' : ''}
                      </span>
                    </span>
                    <button type="button" title={`Add ${e.name.toLowerCase()}`} onClick={() => add(e.id)} className="icon-btn h-8 w-8 shrink-0">
                      <Plus size={16} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )
      })}
    </div>
  )
}
