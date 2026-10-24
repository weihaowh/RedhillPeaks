import { useMemo, useState } from 'react'
import { CircleAlert, CircleCheck, CircleX, Download, Info, Palette, Printer, ShieldCheck, ShoppingCart, Wallet, X } from 'lucide-react'
import clsx from 'clsx'
import type { FloorPlan } from '../../types/plan'
import { useAppStore, type ReportTab } from '../../store/useAppStore'
import { useDesignStore } from '../../store/useDesignStore'
import { CATEGORIES, estimate, sgd, type Estimate } from '../../lib/estimate'
import { CHECK_ORDER, runChecks, type Check, type CheckStatus } from '../../lib/hdbChecks'
import { shoppingCsv, shoppingList, type RoomList } from '../../lib/shopping'
import { downloadText } from '../presets/presetUi'

const TABS: { id: ReportTab; label: string; icon: typeof Wallet }[] = [
  { id: 'budget', label: 'Budget', icon: Wallet },
  { id: 'list', label: 'Shopping list', icon: ShoppingCart },
  { id: 'hdb', label: 'HDB checks', icon: ShieldCheck },
  { id: 'boards', label: 'Room boards', icon: Palette },
]

/** Full-screen project report: budget, shopping list, HDB checks and per-room mood boards. */
export function ReportView({ plan }: { plan: FloorPlan }) {
  const tab = useAppStore((s) => s.report)
  const open = useAppStore((s) => s.openReport)
  const design = useDesignStore((s) => s.design)
  const est = useMemo(() => estimate(plan, design), [plan, design])
  const lists = useMemo(() => shoppingList(plan, design), [plan, design])
  const checks = useMemo(() => runChecks(plan, design).sort((a, b) => CHECK_ORDER[a.status] - CHECK_ORDER[b.status]), [plan, design])
  if (!tab) return null

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-canvas print:static">
      <header className="flex shrink-0 flex-wrap items-center gap-2 border-b border-line px-4 py-2.5 print:hidden">
        <div className="mr-2 text-sm font-semibold">Project report</div>
        <nav className="flex gap-0.5 overflow-x-auto rounded-xl bg-ink/5 p-1">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} type="button" onClick={() => open(id)} className={clsx('chip whitespace-nowrap', tab === id && 'chip-on')}>
              <Icon size={14} /> {label}
              {id === 'hdb' && checks.some((c) => c.status === 'fail' || c.status === 'warn') && <span className="h-1.5 w-1.5 rounded-full bg-red-500" />}
            </button>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-1">
          {tab === 'list' && (
            <button
              type="button"
              className="chip ring-1 ring-line"
              onClick={() => downloadText(`redhill-peaks-shopping-list-${new Date().toISOString().slice(0, 10)}.csv`, shoppingCsv(lists), 'text/csv')}
            >
              <Download size={14} /> CSV
            </button>
          )}
          <button type="button" className="chip ring-1 ring-line" onClick={() => window.print()} title="Print or save as PDF">
            <Printer size={14} /> Print
          </button>
          <button type="button" className="icon-btn" title="Close (Esc)" onClick={() => open(null)}>
            <X size={18} />
          </button>
        </div>
      </header>
      <div className="print-area min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-8">
          {tab === 'budget' && <BudgetTab est={est} />}
          {tab === 'list' && <ListTab lists={lists} />}
          {tab === 'hdb' && <HdbTab checks={checks} />}
          {tab === 'boards' && <BoardsTab lists={lists} />}
        </div>
      </div>
    </div>
  )
}

function BudgetTab({ est }: { est: Estimate }) {
  const budget = useAppStore((s) => s.budget)
  const setBudget = useAppStore((s) => s.setBudget)
  const [text, setText] = useState(String(budget))
  const pct = budget > 0 ? est.total / budget : 0
  const over = est.total > budget
  const max = Math.max(...CATEGORIES.map((c) => est.byCategory[c]), 1)

  return (
    <>
      <section className="glass space-y-4 p-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-xs font-medium uppercase tracking-wider text-muted">Estimated total</div>
            <div className="text-3xl font-semibold tabular-nums">{sgd(est.total)}</div>
            <div className="text-xs text-muted">
              {sgd(est.subtotal)} + {sgd(est.contingency)} contingency (10%)
            </div>
          </div>
          <label className="text-right">
            <span className="block text-xs font-medium text-muted">Your budget</span>
            <span className="mt-1 flex items-center gap-1 rounded-xl border border-line bg-canvas/60 px-3 focus-within:ring-2 focus-within:ring-accent/40">
              <span className="text-sm text-muted">S$</span>
              <input
                inputMode="numeric"
                value={text}
                onChange={(e) => setText(e.target.value.replace(/[^\d]/g, ''))}
                onBlur={() => setBudget(Number(text) || 0)}
                onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                className="h-10 w-28 bg-transparent text-right text-sm tabular-nums outline-none"
              />
            </span>
          </label>
        </div>
        <div>
          <div className="h-3 overflow-hidden rounded-full bg-ink/10">
            <div className={clsx('h-full rounded-full transition-all', over ? 'bg-red-500' : pct > 0.85 ? 'bg-amber-500' : 'bg-emerald-500')} style={{ width: `${Math.min(pct, 1) * 100}%` }} />
          </div>
          <div className={clsx('mt-1.5 text-xs', over ? 'text-red-500' : 'text-muted')}>
            {budget > 0 ? (over ? `${sgd(est.total - budget)} over budget` : `${sgd(budget - est.total)} left (${Math.round(pct * 100)}% used)`) : 'Set a budget to track against.'}
          </div>
        </div>
      </section>

      <section className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">By category</h3>
        {CATEGORIES.map((c) => (
          <div key={c} className="flex items-center gap-3 text-sm">
            <span className="w-44 shrink-0 truncate">{c}</span>
            <span className="h-2 flex-1 overflow-hidden rounded-full bg-ink/5">
              <span className="block h-full rounded-full bg-accent" style={{ width: `${(est.byCategory[c] / max) * 100}%` }} />
            </span>
            <span className="w-24 text-right tabular-nums">{sgd(est.byCategory[c])}</span>
          </div>
        ))}
      </section>

      <section className="space-y-4">
        {CATEGORIES.filter((c) => est.lines.some((l) => l.category === c)).map((c) => (
          <div key={c}>
            <h3 className="mb-1 text-sm font-semibold">{c}</h3>
            <table className="w-full text-sm">
              <tbody>
                {est.lines
                  .filter((l) => l.category === c)
                  .map((l, i) => (
                    <tr key={i} className="border-b border-line/60 last:border-0">
                      <td className="py-1.5 pr-2">{l.label}</td>
                      <td className="py-1.5 pr-2 text-muted">{l.room ?? ''}</td>
                      <td className="py-1.5 pr-2 text-right text-muted tabular-nums">{l.quantity}</td>
                      <td className="py-1.5 text-right tabular-nums">{sgd(l.amount)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        ))}
        {!est.lines.length && <p className="text-sm text-muted">Nothing to cost yet. Change some finishes or add furniture and the estimate fills in.</p>}
      </section>

      <p className="text-xs leading-relaxed text-muted">
        Rough guide using typical mid-range Singapore prices, including installation. Rooms left on their default floor are treated as handed-over flooring. Excludes
        electrical works, plumbing, haulage, aircon and design fees. Get itemised quotes from your ID or contractor before committing.
      </p>
    </>
  )
}

function ListTab({ lists }: { lists: RoomList[] }) {
  const withContent = lists.filter((l) => l.items.length || l.materials.length > 1)
  const total = lists.reduce((s, l) => s + l.items.reduce((t, i) => t + i.price, 0), 0)
  return (
    <>
      <p className="text-sm text-muted">
        Everything per room, with material quantities including 10% spare. Furniture comes to about <span className="font-semibold text-ink">{sgd(total)}</span>. Download it as a CSV to share or open in a spreadsheet.
      </p>
      {(withContent.length ? withContent : lists).map((l) => (
        <section key={l.room.id} className="glass break-inside-avoid p-4">
          <h3 className="mb-2 font-semibold">{l.room.name}</h3>
          {l.materials.length > 0 && (
            <ul className="mb-3 space-y-1 text-sm">
              {l.materials.map((m, i) => (
                <li key={i} className="flex justify-between gap-3">
                  <span>{m.label}</span>
                  <span className="shrink-0 text-muted tabular-nums">{m.quantity}</span>
                </li>
              ))}
            </ul>
          )}
          {l.items.length > 0 && (
            <table className="w-full text-sm">
              <tbody>
                {l.items.map((it, i) => (
                  <tr key={i} className="border-t border-line/60 align-top">
                    <td className="py-1.5 pr-3 font-medium">{it.name}</td>
                    <td className="py-1.5 pr-3 text-xs text-muted">{it.detail}</td>
                    <td className="py-1.5 text-right tabular-nums">{it.price ? sgd(it.price) : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      ))}
    </>
  )
}

const STATUS: Record<CheckStatus, { icon: typeof Info; tone: string; word: string }> = {
  fail: { icon: CircleX, tone: 'text-red-500', word: 'Not allowed' },
  warn: { icon: CircleAlert, tone: 'text-amber-500', word: 'Check' },
  info: { icon: Info, tone: 'text-sky-500', word: 'Good to know' },
  ok: { icon: CircleCheck, tone: 'text-emerald-500', word: 'OK' },
}

function HdbTab({ checks }: { checks: Check[] }) {
  const show = (c: Check) => {
    const app = useAppStore.getState()
    app.openReport(null)
    if (app.mode !== 'orbit') app.setMode('orbit')
    if (c.itemIds?.length) app.selectItem(c.itemIds[0])
    else if (c.roomId) app.selectRoom(c.roomId)
  }
  return (
    <>
      <ul className="space-y-2">
        {checks.map((c) => {
          const s = STATUS[c.status]
          return (
            <li key={c.id} className="glass flex gap-3 p-4">
              <s.icon size={20} className={clsx('mt-0.5 shrink-0', s.tone)} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="font-semibold">{c.title}</span>
                  <span className={clsx('text-xs font-medium', s.tone)}>{s.word}</span>
                </div>
                <p className="mt-0.5 text-sm leading-relaxed text-muted">{c.detail}</p>
              </div>
              {(c.itemIds?.length || c.roomId) && c.status !== 'ok' && (
                <button type="button" onClick={() => show(c)} className="chip h-8 shrink-0 self-start ring-1 ring-line print:hidden">
                  Show
                </button>
              )}
            </li>
          )
        })}
      </ul>
      <p className="text-xs leading-relaxed text-muted">
        Guidance based on common HDB renovation rules, not an official assessment. Check HDB's renovation guidelines and use an HDB-registered renovation contractor;
        works such as hacking walls need a permit.
      </p>
    </>
  )
}

function BoardsTab({ lists }: { lists: RoomList[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {lists.map((l) => (
        <section key={l.room.id} className="glass break-inside-avoid overflow-hidden">
          <div className="grid h-28 grid-cols-6 grid-rows-2">
            {l.swatches.slice(0, 7).map((s, i) => (
              <div key={i} className={clsx(i === 0 ? 'col-span-3 row-span-2' : i === 1 ? 'col-span-3' : '')} style={{ background: s.color }} title={s.label} />
            ))}
          </div>
          <div className="space-y-1 p-3">
            <div className="font-semibold">{l.room.name}</div>
            <ul className="text-xs leading-relaxed text-muted">
              {l.swatches.map((s, i) => (
                <li key={i} className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-inset ring-black/10" style={{ background: s.color }} /> {s.label}
                </li>
              ))}
            </ul>
          </div>
        </section>
      ))}
    </div>
  )
}
