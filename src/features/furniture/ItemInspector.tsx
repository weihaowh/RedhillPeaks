import { useEffect, useMemo, useState } from 'react'
import { Copy, Lightbulb, Lock, LockOpen, RotateCcw, RotateCw, Trash2, TriangleAlert, X } from 'lucide-react'
import clsx from 'clsx'
import type { FloorPlan } from '../../types/plan'
import type { FurnitureItem } from '../../types/design'
import { useAppStore } from '../../store/useAppStore'
import { useDesignStore } from '../../store/useDesignStore'
import { itemWarnings } from '../../lib/furnitureMath'
import { FABRICS, FURNITURE_FINISHES, catalogEntry, option } from './catalog'
import { duplicateItem, removeItem, rotateItem, updateItem } from './itemActions'

export function ItemInspector({ item, plan }: { item: FurnitureItem; plan: FloorPlan }) {
  const entry = catalogEntry(item.type)
  const items = useDesignStore((s) => s.design.items)
  const warnings = useMemo(() => itemWarnings(item, items, plan), [item, items, plan])
  if (!entry) return null
  const set = (patch: Partial<FurnitureItem>) => updateItem(item.id, patch)

  return (
    <>
      <div className="flex items-start gap-2 border-b border-line/80 p-4">
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold">{entry.name}</div>
          <div className="text-xs text-muted">
            {entry.category}
            {item.variant ? ` · ${item.variant}` : ''}
            {item.locked ? ' · locked' : ''}
          </div>
        </div>
        <button type="button" className="icon-btn -mr-1 -mt-1 h-8 w-8" title="Close" onClick={() => useAppStore.getState().selectItem(null)}>
          <X size={16} />
        </button>
      </div>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4">
        {warnings.length > 0 && (
          <ul className="space-y-1.5">
            {warnings.map((w, i) => (
              <li key={i} className={clsx('flex gap-2 rounded-xl p-2.5 text-xs', w.kind === 'walkway' ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300' : 'bg-red-500/10 text-red-600 dark:text-red-300')}>
                <TriangleAlert size={14} className="mt-px shrink-0" /> {w.message}
              </li>
            ))}
          </ul>
        )}

        <div className="grid grid-cols-4 gap-1.5">
          <Action icon={RotateCcw} label="−15°" onClick={() => rotateItem(item.id, -15)} disabled={item.locked} />
          <Action icon={RotateCw} label="+15°" onClick={() => rotateItem(item.id, 15)} disabled={item.locked} />
          <Action icon={RotateCw} label="90°" onClick={() => rotateItem(item.id, 90)} disabled={item.locked} />
          <Action icon={item.locked ? Lock : LockOpen} label={item.locked ? 'Locked' : 'Lock'} onClick={() => set({ locked: !item.locked })} active={item.locked} />
        </div>

        {entry.variants && (
          <Section label="Size">
            <div className="flex flex-wrap gap-1">
              {entry.variants.map((v) => (
                <button
                  key={v.label}
                  type="button"
                  onClick={() => set({ width: v.w, depth: v.d, height: v.h, variant: v.label })}
                  className={clsx('chip ring-1 ring-line', item.variant === v.label && 'chip-on ring-accent')}
                >
                  {v.label}
                </button>
              ))}
            </div>
          </Section>
        )}

        {entry.resizable && (
          <Section label="Dimensions">
            <div className="grid grid-cols-3 gap-2">
              {(['w', 'd', 'h'] as const).map((k) => {
                const range = entry.resizable?.[k]
                const key = k === 'w' ? 'width' : k === 'd' ? 'depth' : 'height'
                return (
                  <div key={k}>
                    <div className="mb-1 text-[10px] uppercase text-muted">{key}</div>
                    <MmInput
                      value={item[key]}
                      disabled={!range}
                      onCommit={(v) => range && set({ [key]: Math.min(Math.max(v, range[0]), range[1]), variant: undefined })}
                    />
                  </div>
                )
              })}
            </div>
          </Section>
        )}

        {entry.layer === 'wall' && (
          <Section label="Height above floor">
            <MmInput value={item.elevation ?? 0} onCommit={(elevation) => set({ elevation: Math.min(Math.max(elevation, 0), 2.4) })} />
          </Section>
        )}

        {entry.finish && (
          <Section label="Finish">
            <div className="flex flex-wrap gap-1.5">
              {FURNITURE_FINISHES.map((f) => (
                <Dot key={f.id} color={f.color} label={f.label} active={item.finish === f.id} onClick={() => set({ finish: f.id })} />
              ))}
            </div>
          </Section>
        )}

        {entry.fabric && (
          <Section label="Fabric">
            <div className="flex flex-wrap gap-1.5">
              {FABRICS.map((f) => (
                <Dot key={f.id} color={f.color} label={f.label} active={item.fabric === f.id} onClick={() => set({ fabric: f.id })} />
              ))}
            </div>
          </Section>
        )}

        {entry.options?.map((o) => (
          <Section key={o.key} label={o.label}>
            <div className="flex flex-wrap gap-1">
              {o.choices.map(([value, label]) => (
                <button
                  key={String(value)}
                  type="button"
                  onClick={() => set({ options: { ...item.options, [o.key]: value } })}
                  className={clsx('chip ring-1 ring-line', option(item, o.key) === value && 'chip-on ring-accent')}
                >
                  {label}
                </button>
              ))}
            </div>
          </Section>
        ))}

        {entry.hint && (
          <section className="rounded-xl bg-accent/10 p-3">
            <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-accent">
              <Lightbulb size={14} /> Designer tip
            </div>
            <p className="text-xs leading-relaxed">{entry.hint}</p>
          </section>
        )}

        <div className="flex gap-2">
          <button type="button" onClick={() => duplicateItem(item.id)} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-line py-2 text-xs font-medium hover:bg-ink/5">
            <Copy size={13} /> Duplicate
          </button>
          <button type="button" onClick={() => removeItem(item.id)} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-line py-2 text-xs font-medium text-red-500 hover:bg-red-500/10">
            <Trash2 size={13} /> Delete
          </button>
        </div>
        <p className="text-[11px] leading-relaxed text-muted">Drag to move. Pieces snap flush to nearby walls; hold Alt to place freely. Keys: Q/E rotate, Ctrl+D duplicate, Delete removes.</p>
      </div>
    </>
  )
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">{label}</div>
      {children}
    </section>
  )
}

function Action({ icon: Icon, label, onClick, disabled, active }: { icon: typeof Copy; label: string; onClick: () => void; disabled?: boolean; active?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={clsx('flex flex-col items-center gap-1 rounded-xl py-2 text-[11px] font-medium ring-1 ring-line transition hover:bg-ink/5 disabled:opacity-40', active && 'bg-accent/10 text-accent ring-accent')}
    >
      <Icon size={15} />
      {label}
    </button>
  )
}

function Dot({ color, label, active, onClick }: { color: string; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      title={label}
      onClick={onClick}
      className={clsx('h-7 w-7 rounded-full ring-1 ring-inset ring-black/10 transition hover:scale-110', active && 'outline outline-2 outline-offset-2 outline-accent')}
      style={{ background: color }}
    />
  )
}

function MmInput({ value, onCommit, disabled }: { value: number; onCommit: (m: number) => void; disabled?: boolean }) {
  const shown = String(Math.round(value * 1000))
  const [text, setText] = useState(shown)
  useEffect(() => setText(shown), [shown])
  const commit = () => {
    const v = Number(text) / 1000
    if (Number.isFinite(v) && v > 0 && text !== shown) onCommit(v)
    else setText(shown)
  }
  return (
    <input
      inputMode="numeric"
      disabled={disabled}
      value={text}
      onChange={(e) => setText(e.target.value.replace(/[^\d]/g, ''))}
      onBlur={commit}
      onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
      className="h-9 w-full rounded-xl border border-line bg-canvas/60 px-2.5 text-sm tabular-nums outline-none focus:ring-2 focus:ring-accent/40 disabled:opacity-50"
    />
  )
}
