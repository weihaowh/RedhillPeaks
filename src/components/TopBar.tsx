import { Box, Footprints, House, Map, Moon, Save, Sun } from 'lucide-react'
import clsx from 'clsx'
import type { FloorPlan } from '../types/plan'
import { useAppStore, type ViewMode } from '../store/useAppStore'

const MODES: { id: ViewMode; label: string; icon: typeof Box; disabled?: string }[] = [
  { id: 'plan', label: '2D Plan', icon: Map },
  { id: 'orbit', label: '3D Orbit', icon: Box },
  { id: 'walk', label: 'Walkthrough', icon: Footprints, disabled: 'Walkthrough arrives in Phase 7' },
]

export function TopBar({ plan }: { plan: FloorPlan }) {
  const mode = useAppStore((s) => s.mode)
  const setMode = useAppStore((s) => s.setMode)
  const theme = useAppStore((s) => s.theme)
  const toggleTheme = useAppStore((s) => s.toggleTheme)

  return (
    <header className="glass absolute left-3 right-3 top-3 z-20 flex h-14 items-center gap-3 px-3">
      <div className="flex min-w-0 items-center gap-2.5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent text-white">
          <House size={18} strokeWidth={2.2} />
        </div>
        <div className="min-w-0 leading-tight">
          <div className="truncate text-sm font-semibold">{plan.name} Studio</div>
          <div className="hidden truncate text-xs text-muted sm:block">{plan.subtitle}</div>
        </div>
      </div>

      <nav className="mx-auto flex items-center gap-0.5 rounded-xl bg-ink/5 p-1">
        {MODES.map(({ id, label, icon: Icon, disabled }) => (
          <button
            key={id}
            type="button"
            title={disabled ?? label}
            disabled={!!disabled}
            onClick={() => setMode(id)}
            className={clsx('chip disabled:cursor-not-allowed disabled:opacity-40', mode === id && 'chip-on')}
          >
            <Icon size={15} />
            <span className="hidden md:inline">{label}</span>
          </button>
        ))}
      </nav>

      <div className="flex items-center gap-1">
        <button type="button" className="icon-btn" title="Toggle light/dark" onClick={toggleTheme}>
          {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
        </button>
        <button
          type="button"
          disabled
          title="Saving presets arrives in Phase 6"
          className="hidden h-9 items-center gap-1.5 rounded-xl bg-ink px-3 text-xs font-medium text-canvas disabled:opacity-40 sm:inline-flex"
        >
          <Save size={14} /> Save preset
        </button>
      </div>
    </header>
  )
}
