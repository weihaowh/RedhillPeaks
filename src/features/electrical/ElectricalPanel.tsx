import { useState } from 'react'
import { Eye, EyeOff, Sparkles } from 'lucide-react'
import clsx from 'clsx'
import type { FloorPlan } from '../../types/plan'
import { useAppStore } from '../../store/useAppStore'
import { useDesignStore } from '../../store/useDesignStore'
import { useEditorStore } from '../../store/useEditorStore'
import { suggestFixtures } from '../../lib/electricalSuggest'
import { FIXTURES, FIXTURE_GROUPS, GROUP_COLOR } from './fixtures'

/** Left-panel tab: fixture palette, "suggest points" and a quick count. */
export function ElectricalPanel({ plan }: { plan: FloorPlan }) {
  const fixtures = useDesignStore((s) => s.design.fixtures)
  const show = useAppStore((s) => s.showElectrical)
  const toggle = useAppStore((s) => s.toggleElectrical)
  const tool = useEditorStore((s) => s.tool)
  const active = useEditorStore((s) => s.fixtureType)
  const [notice, setNotice] = useState<string>()

  const pick = (type: string) => {
    const app = useAppStore.getState()
    if (app.mode !== 'plan') app.setMode('plan')
    if (!app.showElectrical) app.toggleElectrical()
    useEditorStore.getState().placeFixture(type)
  }

  const suggest = () => {
    const design = useDesignStore.getState().design
    const fresh = suggestFixtures(plan, design)
    const kept = design.fixtures.filter((f) => !f.suggested)
    useDesignStore.getState().edit((d) => ({ ...d, fixtures: [...kept, ...fresh] }))
    const app = useAppStore.getState()
    if (!app.showElectrical) app.toggleElectrical()
    if (app.mode !== 'plan') app.setMode('plan')
    setNotice(`Placed ${fresh.length} points${kept.length ? ` and kept your ${kept.length} hand-placed ones` : ''}. Ctrl+Z undoes it.`)
  }

  const count = (group: string) => fixtures.filter((f) => FIXTURES.find((d) => d.id === f.type)?.group === group).length

  return (
    <div className="space-y-4">
      <button type="button" onClick={suggest} className="flex w-full items-start gap-3 rounded-xl bg-accent/10 p-3 text-left ring-1 ring-accent/30 transition hover:bg-accent/15">
        <Sparkles size={18} className="mt-0.5 shrink-0 text-accent" />
        <span>
          <span className="block text-sm font-semibold">Suggest points for me</span>
          <span className="block text-xs leading-relaxed text-muted">Lights, switches, sockets, aircon and data from your rooms and furniture. Replaces earlier suggestions only.</span>
        </span>
      </button>
      {notice && <p className="rounded-xl bg-ink/5 px-3 py-2 text-xs">{notice}</p>}

      <div className="flex items-center justify-between px-1">
        <span className="text-xs text-muted">{fixtures.length} points placed</span>
        <button type="button" onClick={toggle} className="chip h-7 ring-1 ring-line">
          {show ? <Eye size={13} /> : <EyeOff size={13} />} {show ? 'Shown' : 'Hidden'}
        </button>
      </div>

      {FIXTURE_GROUPS.map((group) => (
        <section key={group}>
          <div className="mb-1.5 flex items-center gap-1.5 px-1 text-xs font-semibold uppercase tracking-wider text-muted">
            <span className="h-2 w-2 rounded-full" style={{ background: GROUP_COLOR[group] }} /> {group}
            <span className="ml-auto font-normal normal-case tracking-normal">{count(group) || ''}</span>
          </div>
          <ul className="space-y-0.5">
            {FIXTURES.filter((f) => f.group === group).map((f) => (
              <li key={f.id}>
                <button
                  type="button"
                  onClick={() => pick(f.id)}
                  title={f.hint}
                  className={clsx('flex w-full items-center gap-2.5 rounded-xl px-2 py-1.5 text-left text-sm transition hover:bg-ink/5', tool === 'electrical' && active === f.id && 'bg-accent/10 ring-1 ring-accent/40')}
                >
                  <span className="flex h-7 w-9 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold text-white" style={{ background: GROUP_COLOR[group] }}>
                    {f.code}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{f.name}</span>
                  <span className="text-[11px] tabular-nums text-muted">{f.mount === 'ceiling' ? 'ceiling' : f.mount === 'floor' ? 'ledge' : `${Math.round(f.height * 1000)} mm`}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
      <p className="px-1 text-[11px] leading-relaxed text-muted">Pick a point, then click a wall in 2D Plan to place it. Heights are typical defaults; confirm them with your licensed electrician (LEW).</p>
    </div>
  )
}
