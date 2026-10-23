import { useEffect, useRef, useState } from 'react'
import { walkInput } from './Walkthrough'

const isTouch = () => typeof window !== 'undefined' && !!window.matchMedia?.('(pointer: coarse)').matches

/** Hint pill, plus a thumb joystick on touch screens. */
export function WalkOverlay() {
  const [touch] = useState(isTouch)
  return (
    <>
      <div className="pointer-events-none absolute left-1/2 top-20 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded-full bg-ink/75 px-4 py-2 text-xs text-canvas shadow-float backdrop-blur md:block">
        Drag to look · W A S D or arrow keys to move · Shift to hurry · Click the floor to walk there · Esc to leave
      </div>
      {touch && <Joystick />}
    </>
  )
}

const SIZE = 112
const KNOB = 44

function Joystick() {
  const base = useRef<HTMLDivElement>(null)
  const [knob, setKnob] = useState<[number, number]>([0, 0])

  useEffect(
    () => () => {
      walkInput.x = 0
      walkInput.y = 0
    },
    [],
  )

  const move = (e: React.PointerEvent) => {
    const rect = base.current!.getBoundingClientRect()
    const max = (SIZE - KNOB) / 2
    let dx = e.clientX - (rect.left + rect.width / 2)
    let dy = e.clientY - (rect.top + rect.height / 2)
    const d = Math.hypot(dx, dy)
    if (d > max) {
      dx = (dx / d) * max
      dy = (dy / d) * max
    }
    setKnob([dx, dy])
    walkInput.x = dx / max
    walkInput.y = -dy / max
  }
  const release = () => {
    setKnob([0, 0])
    walkInput.x = 0
    walkInput.y = 0
  }

  return (
    <div
      ref={base}
      className="absolute bottom-24 left-6 z-20 touch-none rounded-full border border-white/40 bg-ink/20 backdrop-blur"
      style={{ width: SIZE, height: SIZE }}
      onPointerDown={(e) => {
        e.stopPropagation()
        e.currentTarget.setPointerCapture(e.pointerId)
        move(e)
      }}
      onPointerMove={(e) => e.buttons && move(e)}
      onPointerUp={release}
      onPointerCancel={release}
    >
      <div
        className="absolute rounded-full bg-white/85 shadow"
        style={{ width: KNOB, height: KNOB, left: (SIZE - KNOB) / 2 + knob[0], top: (SIZE - KNOB) / 2 + knob[1] }}
      />
    </div>
  )
}
