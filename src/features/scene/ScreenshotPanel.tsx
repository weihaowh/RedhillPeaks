import { useState } from 'react'
import { Camera, Loader2 } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import { captureScreenshot, type ShotScale } from './sceneBridge'

const OPTIONS: [ShotScale, string, string][] = [
  [1, 'Screen size', 'Quick share'],
  [2, 'High-res (2×)', 'Sharp on any screen'],
  ['4k', '4K (3840 px wide)', 'For printing or a big screen'],
]

/** Saves the current 3D view as a PNG, without selection outlines or measurements. */
export function ScreenshotPanel({ onDone }: { onDone: () => void }) {
  const [busy, setBusy] = useState<ShotScale | null>(null)
  const [error, setError] = useState<string>()

  const shoot = async (scale: ShotScale) => {
    setBusy(scale)
    setError(undefined)
    const app = useAppStore.getState()
    const selection = { selectedItemId: app.selectedItemId, selectedRoomId: app.selectedRoomId, hoveredRoomId: app.hoveredRoomId }
    // Clear highlights for the shot without moving the camera (setState skips the room fly-to).
    useAppStore.setState({ selectedItemId: null, selectedRoomId: null, hoveredRoomId: null })
    try {
      const blob = await captureScreenshot(scale)
      if (!blob) throw new Error('Switch to the 3D view to take a picture.')
      const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `redhill-peaks-${stamp}.png`
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      onDone()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save the picture.')
    } finally {
      useAppStore.setState(selection)
      setBusy(null)
    }
  }

  return (
    <div className="w-64 space-y-1 p-2">
      <div className="flex items-center gap-1.5 px-2 pb-1 pt-1 text-xs font-semibold uppercase tracking-wider text-muted">
        <Camera size={13} /> Save picture
      </div>
      {OPTIONS.map(([scale, label, hint]) => (
        <button
          key={String(scale)}
          type="button"
          disabled={busy !== null}
          onClick={() => shoot(scale)}
          className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left hover:bg-ink/5 disabled:opacity-50"
        >
          <span className="flex-1">
            <span className="block text-sm">{label}</span>
            <span className="block text-[11px] text-muted">{hint}</span>
          </span>
          {busy === scale && <Loader2 size={14} className="animate-spin text-muted" />}
        </button>
      ))}
      {error && <p className="px-3 pb-1 text-xs text-red-500">{error}</p>}
    </div>
  )
}
