import { useEffect, useState } from 'react'
import { useAppStore } from '../../store/useAppStore'
import { useEditorStore } from '../../store/useEditorStore'
import { useRenoNotice } from '../renovation/renoActions'
import { useFlyUi } from './FlyCamera'

// One-line help over the 3D overview: what the Build/Hack tool does, how to drive the fly
// camera (until you've tried it), the fly speed when it changes, and refused actions.

const BUILD = 'Build: click the floor to start a wall, click again for each corner. Double-click or Esc to finish.'
const HACK = 'Hack: click a wall to hack all of it (drag along it in 2D to hack part). Click a red ghost to keep that wall. Esc to stop.'
const FLY = 'Hold right mouse to look, then WASD to fly and Q/E to go down/up. Scroll while holding to change speed. Middle-drag pans, F frames the selection, left-click selects.'

export function SceneHint({ flying }: { flying: boolean }) {
  const tool = useEditorStore((s) => s.tool)
  const notice = useRenoNotice((s) => s.text)
  const tried = useFlyUi((s) => s.tried)
  const flash = useFlyUi((s) => s.speedFlash)
  const speed = useAppStore((s) => s.flySpeed)
  const [showSpeed, setShowSpeed] = useState(false)

  useEffect(() => {
    if (!flash) return
    setShowSpeed(true)
    const t = setTimeout(() => setShowSpeed(false), 1200)
    return () => clearTimeout(t)
  }, [flash])

  const text =
    notice ??
    (showSpeed ? `Fly speed ${speed.toFixed(speed < 1 ? 2 : 1)} m/s` : tool === 'build' ? BUILD : tool === 'hack' ? HACK : flying && !tried ? FLY : null)
  if (!text) return null

  return (
    <div className="pointer-events-none absolute bottom-[4.5rem] left-3 right-3 z-10 rounded-2xl bg-ink/80 px-4 py-2 text-center text-xs text-canvas shadow-float backdrop-blur lg:bottom-auto lg:left-1/2 lg:right-auto lg:top-20 lg:w-max lg:max-w-[min(36rem,calc(100vw-40rem))] lg:-translate-x-1/2 lg:rounded-full">
      {text}
    </div>
  )
}
