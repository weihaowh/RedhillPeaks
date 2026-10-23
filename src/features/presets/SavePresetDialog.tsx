import { useEffect, useState } from 'react'
import { Bookmark, Loader2 } from 'lucide-react'
import clsx from 'clsx'
import type { PresetScope } from '../../types/preset'
import { usePlanStore } from '../../store/usePlanStore'
import { useAppStore } from '../../store/useAppStore'
import { usePresetStore } from '../../store/usePresetStore'
import { SCOPE_LABEL } from '../../lib/presets'
import { captureThumbnail } from '../scene/sceneBridge'
import { usePresetUi } from './presetUi'

const SCOPE_HINT: Record<PresetScope, string> = {
  flat: 'Everything: finishes, ceilings and furniture, plus the floor plan trace.',
  room: "One room's floor, paint, ceiling, feature walls and the furniture inside it.",
  palette: 'Paint, floors and feature walls only. Good for trying a colour scheme on any layout.',
}

export function SavePresetDialog() {
  const open = usePresetUi((s) => s.saveOpen)
  const close = usePresetUi((s) => s.closeSave)
  const plan = usePlanStore((s) => s.plan)
  const selectedRoomId = useAppStore((s) => s.selectedRoomId)
  const count = usePresetStore((s) => s.presets.length)
  const save = usePresetStore((s) => s.save)

  const [name, setName] = useState('')
  const [scope, setScope] = useState<PresetScope>('flat')
  const [roomId, setRoomId] = useState<string>('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()

  useEffect(() => {
    if (!open) return
    setName(`Design ${count + 1}`)
    setScope(selectedRoomId ? 'room' : 'flat')
    setRoomId(selectedRoomId ?? plan.rooms[0]?.id ?? '')
    setError(undefined)
  }, [open])

  if (!open) return null

  const submit = async () => {
    if (!name.trim()) return
    setBusy(true)
    try {
      await save({ name: name.trim(), scope, roomId: scope === 'room' ? roomId : undefined, thumbnail: await captureThumbnail() })
      useAppStore.getState().setLeftTab('presets')
      close()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save the preset.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm" onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <form
        className="glass w-full max-w-md space-y-4 p-5"
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
      >
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Bookmark size={16} className="text-accent" /> Save preset
        </div>
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-muted">Name</span>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onFocus={(e) => e.target.select()}
            placeholder="e.g. Japandi v2 – warm oak"
            className="h-10 w-full rounded-xl border border-line bg-canvas/60 px-3 text-sm outline-none focus:ring-2 focus:ring-accent/40"
          />
        </label>
        <div className="space-y-2">
          <span className="text-xs font-medium text-muted">What to save</span>
          {(['flat', 'room', 'palette'] as PresetScope[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setScope(s)}
              className={clsx('w-full rounded-xl px-3 py-2.5 text-left transition', scope === s ? 'bg-accent/10 ring-2 ring-accent' : 'ring-1 ring-line hover:bg-ink/5')}
            >
              <div className="text-sm font-medium">{SCOPE_LABEL[s]}</div>
              <div className="text-xs leading-relaxed text-muted">{SCOPE_HINT[s]}</div>
            </button>
          ))}
          {scope === 'room' && (
            <select
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              className="h-10 w-full rounded-xl border border-line bg-canvas/60 px-2 text-sm outline-none focus:ring-2 focus:ring-accent/40"
            >
              {plan.rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          )}
        </div>
        <p className="text-xs text-muted">A snapshot of the current 3D view becomes the preset's thumbnail.</p>
        {error && <p className="text-xs text-red-500">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={close} className="h-9 rounded-xl px-3 text-xs font-medium text-muted hover:bg-ink/5 hover:text-ink">
            Cancel
          </button>
          <button type="submit" disabled={busy || !name.trim()} className="flex h-9 items-center gap-1.5 rounded-xl bg-accent px-4 text-xs font-semibold text-white disabled:opacity-40">
            {busy && <Loader2 size={13} className="animate-spin" />} Save preset
          </button>
        </div>
      </form>
    </div>
  )
}
