import { useRef, useState } from 'react'
import { FileUp, Loader2 } from 'lucide-react'
import clsx from 'clsx'
import type { FloorPlan } from '../../types/plan'
import { importPlanFile, type ImportedImage } from '../../lib/importPlan'
import { putAsset } from '../../lib/assets'
import { newId } from '../../lib/planEdits'
import { usePlanStore } from '../../store/usePlanStore'
import { useAppStore } from '../../store/useAppStore'
import { useEditorStore } from '../../store/useEditorStore'

/** Starting width for an uncalibrated drawing; the Calibrate tool fixes the real scale. */
const DEFAULT_WIDTH = 15

export function UploadPlanButton({ className, compact }: { className?: string; compact?: boolean }) {
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()
  const [pending, setPending] = useState<{ name: string; assetId: string; image: ImportedImage }>()

  const onFile = async (file?: File) => {
    if (!file) return
    setBusy(true)
    setError(undefined)
    try {
      const image = await importPlanFile(file)
      const assetId = await putAsset(image.blob)
      setPending({ name: file.name.replace(/\.[^.]+$/, ''), assetId, image })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not read that file.')
    } finally {
      setBusy(false)
      if (input.current) input.current.value = ''
    }
  }

  const apply = (fresh: boolean) => {
    if (!pending) return
    const { plan, replacePlan } = usePlanStore.getState()
    const current = plan.underlay
    // Keep the trace's scale when swapping the drawing: match the old underlay's width.
    const width = !fresh && current ? current.width : DEFAULT_WIDTH
    const underlay = {
      assetId: pending.assetId,
      x: !fresh && current ? current.x : 0,
      y: !fresh && current ? current.y : 0,
      width,
      height: (width * pending.image.height) / pending.image.width,
    }
    const next: FloorPlan = fresh
      ? { id: newId('plan'), name: pending.name, subtitle: 'Uploaded floor plan', ceilingHeight: plan.ceilingHeight, rooms: [], walls: [], underlay }
      : { ...plan, underlay }
    replacePlan(next)
    useAppStore.getState().clearSelection()
    useAppStore.getState().setMode('plan')
    useAppStore.getState().resetView()
    useEditorStore.getState().setTool(fresh ? 'calibrate' : 'select')
    setPending(undefined)
  }

  return (
    <>
      <button
        type="button"
        disabled={busy}
        onClick={() => input.current?.click()}
        className={clsx(compact ? 'chip whitespace-nowrap' : 'flex h-9 w-full items-center justify-center gap-2 rounded-xl border border-line text-xs font-medium hover:bg-ink/5', className)}
        title="Upload a floor plan (PNG, JPG or PDF)"
      >
        {busy ? <Loader2 size={14} className="animate-spin" /> : <FileUp size={14} />}
        {compact ? <span className="hidden sm:inline">Upload</span> : 'Upload floor plan'}
      </button>
      <input ref={input} type="file" accept="image/png,image/jpeg,image/webp,application/pdf,.pdf" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />

      {(pending || error) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm">
          <div className="glass w-full max-w-sm p-5">
            {error ? (
              <>
                <div className="mb-2 text-sm font-semibold">Couldn't open that file</div>
                <p className="mb-4 text-xs text-muted">{error}</p>
                <div className="flex justify-end">
                  <button type="button" onClick={() => setError(undefined)} className="h-9 rounded-xl bg-ink px-4 text-xs font-semibold text-canvas">
                    OK
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="mb-1 text-sm font-semibold">Use "{pending!.name}" how?</div>
                <p className="mb-4 text-xs leading-relaxed text-muted">
                  Start fresh to trace a new flat on this drawing. Or keep your current walls and rooms and only swap the drawing underneath. You can undo either choice.
                </p>
                <div className="space-y-2">
                  <button type="button" onClick={() => apply(true)} className="w-full rounded-xl bg-accent px-4 py-2.5 text-left text-white">
                    <div className="text-sm font-semibold">Start a new trace</div>
                    <div className="text-xs opacity-80">Clears walls and rooms, then asks you to set the scale</div>
                  </button>
                  <button type="button" onClick={() => apply(false)} className="w-full rounded-xl border border-line px-4 py-2.5 text-left hover:bg-ink/5">
                    <div className="text-sm font-semibold">Keep my trace</div>
                    <div className="text-xs text-muted">Only replaces the drawing underneath</div>
                  </button>
                  <button type="button" onClick={() => setPending(undefined)} className="w-full py-1.5 text-xs text-muted hover:text-ink">
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
