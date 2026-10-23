import { Lightbulb, Moon, RotateCcw, RotateCw, Sunrise } from 'lucide-react'
import clsx from 'clsx'
import { useAppStore, type LightsMode } from '../../store/useAppStore'
import { compassName, formatHour, type SunDate } from '../../lib/sun'
import { useDaylight } from './daylight'

const DATES: [SunDate, string][] = [
  ['today', 'Today'],
  ['mar', 'Mar'],
  ['jun', 'Jun'],
  ['sep', 'Sep'],
  ['dec', 'Dec'],
]
const LIGHTS: [LightsMode, string][] = [
  ['auto', 'Auto'],
  ['on', 'On'],
  ['off', 'Off'],
]

/** Time-of-day, date, compass and ceiling-light controls. */
export function SunPanel() {
  const sun = useAppStore((s) => s.sun)
  const setSun = useAppStore((s) => s.setSun)
  const lights = useAppStore((s) => s.lights)
  const setLights = useAppStore((s) => s.setLights)
  const light = useDaylight()
  const up = light.elevation > 0

  return (
    <div className="w-[min(20rem,calc(100vw-1.5rem))] space-y-4 p-4">
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-semibold">{formatHour(sun.hour)}</span>
        <span className="text-xs text-muted">
          {up ? `Sun ${Math.round(light.elevation)}° up, from the ${compassName(light.azimuth)}` : 'After dark'}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Sunrise size={15} className="text-muted" />
        <input
          type="range"
          min={6}
          max={21}
          step={0.25}
          value={sun.hour}
          onChange={(e) => setSun({ hour: Number(e.target.value) })}
          className="flex-1 accent-[rgb(var(--accent))]"
          aria-label="Time of day"
        />
        <Moon size={15} className="text-muted" />
      </div>

      <Row label="Date">
        {DATES.map(([d, label]) => (
          <button key={d} type="button" onClick={() => setSun({ date: d })} className={clsx('chip flex-1 justify-center ring-1 ring-line', sun.date === d && 'chip-on ring-accent')}>
            {label}
          </button>
        ))}
      </Row>

      <div>
        <div className="mb-1.5 text-xs font-medium text-muted">North on the plan</div>
        <div className="flex items-center gap-3">
          <Compass north={sun.north} />
          <div className="flex flex-1 items-center gap-1">
            <button type="button" className="chip ring-1 ring-line" title="Rotate north 15° anticlockwise" onClick={() => setSun({ north: (sun.north + 345) % 360 })}>
              <RotateCcw size={13} />
            </button>
            <span className="w-12 text-center text-sm tabular-nums">{sun.north}°</span>
            <button type="button" className="chip ring-1 ring-line" title="Rotate north 15° clockwise" onClick={() => setSun({ north: (sun.north + 15) % 360 })}>
              <RotateCw size={13} />
            </button>
          </div>
        </div>
        <p className="mt-1.5 text-[11px] leading-relaxed text-muted">The HDB unit plan has no compass. Copy the north arrow from your block plan (or a map) so the sunlight matches real life.</p>
      </div>

      <Row label={<><Lightbulb size={12} /> Ceiling lights</>}>
        {LIGHTS.map(([m, label]) => (
          <button key={m} type="button" onClick={() => setLights(m)} className={clsx('chip flex-1 justify-center ring-1 ring-line', lights === m && 'chip-on ring-accent')}>
            {label}
          </button>
        ))}
      </Row>
    </div>
  )
}

function Row({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center gap-1 text-xs font-medium text-muted">{label}</div>
      <div className="flex gap-1">{children}</div>
    </div>
  )
}

/** Small compass rose showing where north points relative to the top of the plan. */
function Compass({ north }: { north: number }) {
  return (
    <svg viewBox="-20 -20 40 40" className="h-11 w-11 shrink-0">
      <circle r={18} className="fill-ink/5 stroke-line" strokeWidth={1} />
      <g transform={`rotate(${north})`}>
        <path d="M 0 -15 L 4 0 L -4 0 Z" className="fill-accent" />
        <path d="M 0 15 L 4 0 L -4 0 Z" className="fill-ink/25" />
        <text y={-6} textAnchor="middle" fontSize={6} fontWeight={700} className="fill-canvas" transform="translate(0 -1)">
          N
        </text>
      </g>
    </svg>
  )
}
