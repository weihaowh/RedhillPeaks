import type { Fixture } from '../../types/design'
import { GROUP_COLOR, fixtureDef } from './fixtures'

// Plan symbols for electrical points, drawn in plan metres. `px` converts screen pixels to
// metres so symbols stay a readable size at any zoom; aircon units are drawn at true size.

interface Props {
  fixtures: Fixture[]
  selectedId: string | null
  px: (n: number) => number
  /** Placement preview under the cursor. */
  ghost?: Fixture | null
  /** Contractor plan: no hit targets, slightly larger labels. */
  print?: boolean
}

export function FixtureSymbols({ fixtures, selectedId, px, ghost, print }: Props) {
  const byId = new Map(fixtures.map((f) => [f.id, f]))
  return (
    <g>
      {/* Switch → light links, the usual dashed arcs on an electrical layout. */}
      {fixtures
        .filter((f) => f.switchId && byId.has(f.switchId))
        .map((light) => {
          const sw = byId.get(light.switchId!)!
          const mx = (sw.x + light.x) / 2
          const my = (sw.y + light.y) / 2
          const dx = light.x - sw.x
          const dy = light.y - sw.y
          const cx = mx - dy * 0.25
          const cy = my + dx * 0.25
          return (
            <path
              key={`link-${light.id}`}
              d={`M ${sw.x} ${sw.y} Q ${cx} ${cy} ${light.x} ${light.y}`}
              fill="none"
              stroke={GROUP_COLOR.Switches}
              strokeOpacity={0.55}
              strokeWidth={px(1.2)}
              strokeDasharray={`${px(4)} ${px(3)}`}
              pointerEvents="none"
            />
          )
        })}
      {fixtures.map((f) => (
        <Symbol key={f.id} f={f} px={px} selected={f.id === selectedId} print={print} />
      ))}
      {ghost && (
        <g opacity={0.55} pointerEvents="none">
          <Symbol f={ghost} px={px} selected={false} print />
        </g>
      )}
    </g>
  )
}

function Symbol({ f, px, selected, print }: { f: Fixture; px: (n: number) => number; selected: boolean; print?: boolean }) {
  const def = fixtureDef(f.type)
  if (!def) return null
  const color = GROUP_COLOR[def.group]
  const r = px(print ? 9 : 8)
  const stroke = px(1.5)
  const font = px(print ? 7 : 6.5)
  const label = (
    <text y={font * 0.35} fontSize={font} fontWeight={700} textAnchor="middle" fill={def.group === 'Switches' ? '#fff' : color} pointerEvents="none">
      {def.code}
    </text>
  )

  let shape
  if (def.group === 'Aircon') {
    const [w, , d] = def.body
    shape = (
      <>
        <rect x={-w / 2} y={def.mount === 'wall' ? 0 : -d / 2} width={w} height={d} rx={px(2)} fill="#e3fafc" stroke={color} strokeWidth={stroke} />
        <g transform={`translate(0 ${def.mount === 'wall' ? d / 2 : 0}) rotate(${-f.rotation})`}>{label}</g>
      </>
    )
  } else if (def.group === 'Lighting') {
    const k = r * 0.7
    shape = (
      <>
        <circle r={f.type === 'light-fan' ? r * 1.35 : r} fill="#fff8e1" stroke={color} strokeWidth={stroke} />
        <path d={`M ${-k} ${-k} L ${k} ${k} M ${-k} ${k} L ${k} ${-k}`} stroke={color} strokeWidth={stroke} />
      </>
    )
  } else if (def.group === 'Switches') {
    shape = (
      <>
        <rect x={-r} y={-r * 0.8} width={r * 2} height={r * 1.6} rx={px(2)} fill={color} />
        <g transform={`rotate(${-f.rotation})`}>{label}</g>
      </>
    )
  } else if (def.group === 'Data') {
    shape = (
      <>
        <path d={`M 0 ${-r} L ${r} ${r * 0.8} L ${-r} ${r * 0.8} Z`} fill="#f3f0ff" stroke={color} strokeWidth={stroke} />
        <g transform={`translate(0 ${r * 0.25}) rotate(${-f.rotation})`}>
          <text y={font * 0.35} fontSize={font * 0.8} fontWeight={700} textAnchor="middle" fill={color} pointerEvents="none">
            {def.code}
          </text>
        </g>
      </>
    )
  } else {
    // Power and appliance points.
    shape = (
      <>
        {def.group === 'Power' ? (
          <circle r={r} fill="#fff4e6" stroke={color} strokeWidth={stroke} />
        ) : (
          <rect x={-r} y={-r} width={r * 2} height={r * 2} rx={px(3)} fill="#fff0f6" stroke={color} strokeWidth={stroke} />
        )}
        <g transform={`rotate(${-f.rotation})`}>{label}</g>
      </>
    )
  }

  return (
    <g transform={`translate(${f.x} ${f.y}) rotate(${f.rotation})`} data-fixture={print ? undefined : f.id} className={print ? undefined : 'cursor-move'}>
      {selected && <circle r={r * 1.9} fill="none" className="stroke-accent" strokeWidth={px(2)} />}
      {shape}
      {!print && <circle r={r * 1.5} fill="transparent" />}
    </g>
  )
}
