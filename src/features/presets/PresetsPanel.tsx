import { useEffect, useRef, useState } from 'react'
import { Bookmark, Check, Columns2, Copy, Download, FileUp, ImageOff, Pencil, Trash2 } from 'lucide-react'
import clsx from 'clsx'
import type { FloorPlan } from '../../types/plan'
import type { Preset } from '../../types/preset'
import { usePresetStore } from '../../store/usePresetStore'
import { useDesignStore } from '../../store/useDesignStore'
import { usePlanStore } from '../../store/usePlanStore'
import { useAppStore } from '../../store/useAppStore'
import { SCOPE_LABEL, applyPreset, replacesPlan } from '../../lib/presets'
import { downloadText, slug, usePresetUi } from './presetUi'
import type { CompareSide } from './CompareView'

const when = (t: number) =>
  new Date(t).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })

/** A preset rendered onto the current design, for the compare view. */
function presetSide(p: Preset, plan: FloorPlan, onApply: () => void): CompareSide {
  const sidePlan = replacesPlan(p, plan) ? p.plan! : plan
  return { name: p.name, plan: sidePlan, design: applyPreset(useDesignStore.getState().design, sidePlan, p), onApply }
}

export function PresetsPanel({ plan }: { plan: FloorPlan }) {
  const { presets, thumbs, loaded, error, load, importFile, exportJson } = usePresetStore()
  const openSave = usePresetUi((s) => s.openSave)
  const [picked, setPicked] = useState<string[]>([])
  const [notice, setNotice] = useState<string>()
  const fileInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!loaded) load()
  }, [loaded, load])

  useEffect(() => {
    if (!notice) return
    const t = setTimeout(() => setNotice(undefined), 4000)
    return () => clearTimeout(t)
  }, [notice])

  const apply = (p: Preset, roomId?: string) => {
    const replaced = usePresetStore.getState().apply(p.id, roomId)
    const app = useAppStore.getState()
    if (app.mode === 'plan') app.setMode('orbit')
    setNotice(`Applied "${p.name}"${replaced ? ' and its floor plan' : ''}. Ctrl+Z undoes it.`)
  }

  const compare = (sides: [CompareSide, CompareSide]) => usePresetUi.getState().openCompare(sides)
  const close = () => usePresetUi.getState().closeCompare()
  const current = (): CompareSide => ({ name: 'Current design', plan: usePlanStore.getState().plan, design: useDesignStore.getState().design })
  const sideFor = (p: Preset) =>
    presetSide(p, usePlanStore.getState().plan, () => {
      apply(p)
      close()
    })

  const onImport = async (file?: File) => {
    if (!file) return
    try {
      const n = await importFile(file)
      setNotice(n ? `Imported ${n} preset${n > 1 ? 's' : ''}.` : 'No presets found in that file.')
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'Could not import that file.')
    } finally {
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  const exportAll = async () => downloadText(`redhill-peaks-presets-${new Date().toISOString().slice(0, 10)}.json`, await exportJson())
  const pickedPresets = presets.filter((p) => picked.includes(p.id))

  return (
    <div className="space-y-3">
      <button type="button" onClick={openSave} className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-2.5 text-sm font-semibold text-white">
        <Bookmark size={15} /> Save current design
      </button>
      <div className="flex gap-2">
        <button type="button" onClick={() => fileInput.current?.click()} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-line py-2 text-xs font-medium hover:bg-ink/5">
          <FileUp size={13} /> Import
        </button>
        <button type="button" disabled={!presets.length} onClick={exportAll} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-line py-2 text-xs font-medium hover:bg-ink/5 disabled:opacity-40">
          <Download size={13} /> Export all
        </button>
        <input ref={fileInput} type="file" accept="application/json,.json" className="hidden" onChange={(e) => onImport(e.target.files?.[0])} />
      </div>

      {notice && <p className="rounded-xl bg-ink/5 px-3 py-2 text-xs">{notice}</p>}
      {error && <p className="rounded-xl bg-red-500/10 px-3 py-2 text-xs text-red-600 dark:text-red-300">{error}</p>}

      {picked.length === 2 && (
        <button
          type="button"
          onClick={() => compare([sideFor(pickedPresets[0]), sideFor(pickedPresets[1])])}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-ink py-2 text-xs font-semibold text-canvas"
        >
          <Columns2 size={14} /> Compare the 2 selected
        </button>
      )}

      {loaded && !presets.length && (
        <div className="flex flex-col items-center gap-2 px-3 py-8 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-ink/5 text-muted">
            <Bookmark size={20} />
          </div>
          <div className="text-sm font-semibold">No presets yet</div>
          <p className="text-xs leading-relaxed text-muted">Save the whole flat, one room or just a colour scheme, then compare versions side by side. Your current work is saved automatically as you go.</p>
        </div>
      )}

      <ul className="space-y-3">
        {presets.map((p) => (
          <PresetCard
            key={p.id}
            preset={p}
            plan={plan}
            thumb={thumbs[p.id]}
            picked={picked.includes(p.id)}
            onPick={(on) => setPicked((cur) => (on ? [...cur.filter((id) => id !== p.id), p.id].slice(-2) : cur.filter((id) => id !== p.id)))}
            onApply={(roomId) => apply(p, roomId)}
            onCompare={() => compare([current(), sideFor(p)])}
            onExport={async () => downloadText(`${slug(p.name)}.json`, await exportJson([p.id]))}
          />
        ))}
      </ul>
    </div>
  )
}

interface CardProps {
  preset: Preset
  plan: FloorPlan
  thumb?: string
  picked: boolean
  onPick: (on: boolean) => void
  onApply: (roomId?: string) => void
  onCompare: () => void
  onExport: () => void
}

function PresetCard({ preset: p, plan, thumb, picked, onPick, onApply, onCompare, onExport }: CardProps) {
  const { rename, duplicate, remove } = usePresetStore()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(p.name)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const sameKind = p.room ? plan.rooms.filter((r) => r.kind === p.room!.kind) : []
  const [target, setTarget] = useState(p.room && plan.rooms.some((r) => r.id === p.room!.id) ? p.room.id : (sameKind[0]?.id ?? plan.rooms[0]?.id))

  return (
    <li className={clsx('overflow-hidden rounded-2xl border bg-panel transition', picked ? 'border-accent ring-1 ring-accent' : 'border-line')}>
      <div className="relative aspect-[4/3] bg-ink/5">
        {thumb ? <img src={thumb} alt="" className="h-full w-full object-cover" /> : <ImageOff size={20} className="absolute inset-0 m-auto text-muted" />}
        <label className="absolute left-2 top-2 flex cursor-pointer items-center gap-1.5 rounded-full bg-panel/90 px-2 py-1 text-[10px] font-medium shadow backdrop-blur">
          <input type="checkbox" checked={picked} onChange={(e) => onPick(e.target.checked)} className="accent-[rgb(var(--accent))]" />
          Compare
        </label>
        <span className="absolute right-2 top-2 rounded-full bg-ink/75 px-2 py-0.5 text-[10px] font-medium text-canvas">{SCOPE_LABEL[p.scope]}</span>
      </div>

      <div className="space-y-2.5 p-3">
        {editing ? (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              rename(p.id, name)
              setEditing(false)
            }}
          >
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => {
                rename(p.id, name)
                setEditing(false)
              }}
              className="h-8 w-full rounded-lg border border-line bg-canvas/60 px-2 text-sm outline-none focus:ring-2 focus:ring-accent/40"
            />
          </form>
        ) : (
          <button type="button" onClick={() => setEditing(true)} className="group flex w-full items-center gap-1.5 text-left" title="Rename">
            <span className="truncate text-sm font-semibold">{p.name}</span>
            <Pencil size={12} className="shrink-0 text-muted opacity-0 transition group-hover:opacity-100" />
          </button>
        )}
        <div className="text-[11px] text-muted">
          {p.room ? `${p.room.name} · ` : ''}
          {(p.design.items?.length ?? 0) > 0 ? `${p.design.items!.length} pieces · ` : ''}
          {when(p.updatedAt)}
        </div>

        {p.scope === 'room' && (
          <label className="flex items-center gap-2 text-xs text-muted">
            Apply to
            <select value={target} onChange={(e) => setTarget(e.target.value)} className="h-7 flex-1 rounded-lg border border-line bg-canvas/60 px-1.5 text-xs text-ink outline-none">
              {plan.rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </label>
        )}
        {p.scope === 'room' && target !== p.room?.id && <p className="text-[11px] leading-relaxed text-muted">On a different room only the floor, paint and ceiling carry over.</p>}

        <div className="flex gap-1.5">
          <button type="button" onClick={() => onApply(p.scope === 'room' ? target : undefined)} className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-ink py-1.5 text-xs font-semibold text-canvas">
            <Check size={13} /> Apply
          </button>
          <button type="button" onClick={onCompare} className="flex flex-1 items-center justify-center gap-1 rounded-lg py-1.5 text-xs font-medium ring-1 ring-line hover:bg-ink/5" title="Compare with the current design">
            <Columns2 size={13} /> Compare
          </button>
        </div>
        <div className="flex items-center gap-1 border-t border-line/70 pt-2">
          <IconAction icon={Copy} label="Duplicate" onClick={() => duplicate(p.id)} />
          <IconAction icon={Download} label="Export" onClick={onExport} />
          {confirmDelete ? (
            <span className="ml-auto flex items-center gap-1 text-[11px]">
              Delete?
              <button type="button" onClick={() => remove(p.id)} className="rounded-md bg-red-500 px-2 py-0.5 font-semibold text-white">
                Delete
              </button>
              <button type="button" onClick={() => setConfirmDelete(false)} className="rounded-md px-1.5 py-0.5 text-muted hover:text-ink">
                Keep
              </button>
            </span>
          ) : (
            <IconAction icon={Trash2} label="Delete" onClick={() => setConfirmDelete(true)} className="ml-auto hover:text-red-500" />
          )}
        </div>
      </div>
    </li>
  )
}

function IconAction({ icon: Icon, label, onClick, className }: { icon: typeof Copy; label: string; onClick: () => void; className?: string }) {
  return (
    <button type="button" title={label} onClick={onClick} className={clsx('flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] text-muted hover:bg-ink/5 hover:text-ink', className)}>
      <Icon size={13} /> {label}
    </button>
  )
}
