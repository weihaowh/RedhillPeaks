import { useEffect, useState } from 'react'
import { Check, Loader2, TriangleAlert } from 'lucide-react'
import { useDesignStore } from '../../store/useDesignStore'
import { usePlanStore } from '../../store/usePlanStore'

type Status = 'saved' | 'saving' | 'blocked'

/**
 * The plan and design persist to this browser on every change (zustand persist). This shows
 * that it happened, and warns when the browser refuses to store anything.
 */
export function AutosaveStatus() {
  const [status, setStatus] = useState<Status>('saved')
  const [savedAt, setSavedAt] = useState(() => Date.now())

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    const onChange = () => {
      try {
        localStorage.setItem('redhill-peaks-probe', String(Date.now()))
        localStorage.removeItem('redhill-peaks-probe')
      } catch {
        setStatus('blocked')
        return
      }
      setStatus('saving')
      clearTimeout(timer)
      timer = setTimeout(() => {
        setStatus('saved')
        setSavedAt(Date.now())
      }, 500)
    }
    const unsubDesign = useDesignStore.subscribe((s, prev) => s.design !== prev.design && onChange())
    const unsubPlan = usePlanStore.subscribe((s, prev) => s.plan !== prev.plan && onChange())
    return () => {
      clearTimeout(timer)
      unsubDesign()
      unsubPlan()
    }
  }, [])

  const time = new Date(savedAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  if (status === 'blocked') {
    return (
      <span className="hidden items-center gap-1 px-2 text-xs text-red-500 sm:flex" title="This browser window is blocking storage (private mode?). Export presets to keep your work.">
        <TriangleAlert size={13} /> Not saving
      </span>
    )
  }
  return (
    <span className="hidden items-center gap-1 px-2 text-xs text-muted sm:flex" title={`Your plan and design are saved in this browser automatically. Last saved ${time}.`}>
      {status === 'saving' ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
      {status === 'saving' ? 'Saving…' : 'Saved'}
    </span>
  )
}
