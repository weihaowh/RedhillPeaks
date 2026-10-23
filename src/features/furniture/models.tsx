import { memo, useMemo, type ReactNode } from 'react'
import * as THREE from 'three'
import { RoundedBox } from '@react-three/drei'
import type { FurnitureItem } from '../../types/design'
import { seeded } from '../scene/finishes'
import { featureMaterial } from '../scene/wallFinishes'
import { FABRICS, FURNITURE_FINISHES, option } from './catalog'

// Procedural furniture. Each model is drawn in the item's local frame: origin at the centre of
// its footprint on the floor, width along x, depth along z with the front facing +z.

// ---------------------------------------------------------------------------------------------
// Materials

const cache = new Map<string, THREE.Material>()
function cached<T extends THREE.Material>(key: string, make: () => T): T {
  let m = cache.get(key) as T | undefined
  if (!m) {
    m = make()
    cache.set(key, m)
  }
  return m
}

export const solid = (color: string, roughness = 0.5, metalness = 0) =>
  cached(`s|${color}|${roughness}|${metalness}`, () => new THREE.MeshStandardMaterial({ color, roughness, metalness }))

const fabricMat = (color: string) =>
  cached(`f|${color}`, () => {
    const sheen = new THREE.Color(color).lerp(new THREE.Color('#ffffff'), 0.4)
    return new THREE.MeshPhysicalMaterial({ color, roughness: 0.95, sheen: 1, sheenRoughness: 0.75, sheenColor: sheen })
  })

const M = {
  metal: () => solid('#2a2a2c', 0.4, 0.7),
  chrome: () => solid('#d2d5d8', 0.18, 1),
  ceramic: () => solid('#f7f7f5', 0.12),
  linen: () => fabricMat('#f4f2ee'),
  screen: () => solid('#0b0d10', 0.08, 0.3),
  // A little roughness so the mirror reads as glass rather than a black hole in a dim environment.
  mirror: () => solid('#cfd8de', 0.12, 0.85),
  glass: () =>
    cached('glass', () => new THREE.MeshPhysicalMaterial({ color: '#e3eef3', roughness: 0.02, transparent: true, opacity: 0.22, depthWrite: false })),
  shade: () => cached('shade', () => new THREE.MeshStandardMaterial({ color: '#f3ede2', roughness: 0.9, emissive: '#ffd9a0', emissiveIntensity: 0.35 })),
  groove: () => solid('#1b1a19', 0.9),
  leaf: (i: number) => solid(['#4f6b3c', '#5e7d45', '#43603a', '#6a8a4c'][i % 4], 0.65),
}

const COUNTER = { white: '#f1efea', grey: '#a9a8a4', black: '#29292b' } as const

function finishMat(item: FurnitureItem) {
  const f = FURNITURE_FINISHES.find((x) => x.id === item.finish) ?? FURNITURE_FINISHES[0]
  return solid(f.color, f.roughness)
}
function fabricOf(item: FurnitureItem) {
  return fabricMat(FABRICS.find((f) => f.id === item.fabric)?.color ?? FABRICS[0].color)
}

const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7)

/** Box whose faces carry UVs in metres, so tiling textures (fluting, slats) keep their real scale. */
function metricBox(w: number, h: number, d: number) {
  const geo = new THREE.BoxGeometry(w, h, d)
  const pos = geo.getAttribute('position')
  const uv = geo.getAttribute('uv')
  for (let f = 0; f < 6; f++) {
    for (let i = f * 4; i < f * 4 + 4; i++) {
      const x = pos.getX(i)
      const y = pos.getY(i)
      const z = pos.getZ(i)
      if (f < 2) uv.setXY(i, f === 0 ? -z : z, y)
      else if (f < 4) uv.setXY(i, x, z)
      else uv.setXY(i, f === 4 ? x : -x, y)
    }
  }
  return geo
}

// ---------------------------------------------------------------------------------------------
// Primitives

type V3 = [number, number, number]

function B({ size, at, m, rot }: { size: V3; at: V3; m: THREE.Material; rot?: V3 }) {
  return (
    <mesh position={at} rotation={rot} material={m} castShadow receiveShadow>
      <boxGeometry args={size} />
    </mesh>
  )
}

function R({ size, at, m, r = 0.04 }: { size: V3; at: V3; m: THREE.Material; r?: number }) {
  const radius = Math.min(r, size[0] / 2 - 0.001, size[1] / 2 - 0.001, size[2] / 2 - 0.001)
  return <RoundedBox args={size} radius={Math.max(radius, 0.002)} smoothness={3} position={at} material={m} castShadow receiveShadow />
}

function Cyl({ r, h, at, m, rTop, seg = 24, rot }: { r: number; h: number; at: V3; m: THREE.Material; rTop?: number; seg?: number; rot?: V3 }) {
  return (
    <mesh position={at} rotation={rot} material={m} castShadow receiveShadow>
      <cylinderGeometry args={[rTop ?? r, r, h, seg]} />
    </mesh>
  )
}

/** Four legs inset from the corners of a w × d rectangle. */
function Legs({ w, d, h, inset = 0.06, r = 0.018, m, y = 0 }: { w: number; d: number; h: number; inset?: number; r?: number; m: THREE.Material; y?: number }) {
  const xs = [-w / 2 + inset, w / 2 - inset]
  const zs = [-d / 2 + inset, d / 2 - inset]
  return (
    <>
      {xs.flatMap((x) => zs.map((z) => <Cyl key={`${x}${z}`} r={r} h={h} at={[x, y + h / 2, z]} m={m} seg={10} />))}
    </>
  )
}

/** Thin dark lines on a front face: door and drawer gaps. */
function Grooves({ xs = [], ys = [], w, h, z, y0 = 0 }: { xs?: number[]; ys?: number[]; w: number; h: number; z: number; y0?: number }) {
  const g = M.groove()
  return (
    <>
      {xs.map((x, i) => (
        <B key={`x${i}`} size={[0.004, h - 0.01, 0.004]} at={[x, y0 + h / 2, z]} m={g} />
      ))}
      {ys.map((y, i) => (
        <B key={`y${i}`} size={[w - 0.01, 0.004, 0.004]} at={[0, y0 + y, z]} m={g} />
      ))}
    </>
  )
}

const evenly = (w: number, n: number) => Array.from({ length: n - 1 }, (_, i) => -w / 2 + (w * (i + 1)) / n)

// ---------------------------------------------------------------------------------------------
// Models

type ModelProps = { item: FurnitureItem }

function Sofa({ item, armLeft = true, armRight = true, w = item.width, d = item.depth, z0 = 0 }: ModelProps & { armLeft?: boolean; armRight?: boolean; w?: number; d?: number; z0?: number }) {
  const fab = fabricOf(item)
  const h = item.height
  const legH = 0.1
  const armW = 0.16
  const backD = 0.2
  const innerL = -w / 2 + (armLeft ? armW : 0)
  const innerR = w / 2 - (armRight ? armW : 0)
  const innerW = innerR - innerL
  const seats = Math.max(1, Math.round(innerW / 0.65))
  const cw = innerW / seats
  const seatTop = legH + 0.2
  return (
    <group position-z={z0}>
      <R size={[w, 0.2, d]} at={[0, legH + 0.1, 0]} m={fab} r={0.03} />
      {Array.from({ length: seats }, (_, i) => (
        <R key={i} size={[cw - 0.012, 0.16, d - backD - 0.03]} at={[innerL + cw * (i + 0.5), seatTop + 0.08, backD / 2 + 0.01]} m={fab} r={0.05} />
      ))}
      <R size={[innerW, h - seatTop, backD]} at={[(innerL + innerR) / 2, seatTop + (h - seatTop) / 2, -d / 2 + backD / 2]} m={fab} r={0.05} />
      {Array.from({ length: seats }, (_, i) => (
        <R key={`b${i}`} size={[cw - 0.03, 0.38, 0.13]} at={[innerL + cw * (i + 0.5), seatTop + 0.33, -d / 2 + backD + 0.06]} m={fab} r={0.06} />
      ))}
      {armLeft && <R size={[armW, 0.62 - legH, d]} at={[-w / 2 + armW / 2, legH + (0.62 - legH) / 2, 0]} m={fab} r={0.05} />}
      {armRight && <R size={[armW, 0.62 - legH, d]} at={[w / 2 - armW / 2, legH + (0.62 - legH) / 2, 0]} m={fab} r={0.05} />}
      <Legs w={w} d={d} h={legH} inset={0.08} m={M.metal()} />
    </group>
  )
}

function LSofa({ item }: ModelProps) {
  const fab = fabricOf(item)
  const w = item.width
  const d = item.depth
  const mainD = 0.95
  const chaiseW = 0.9
  const left = option<string>(item, 'chaise') === 'left'
  const sx = left ? -1 : 1
  const chaiseD = d - mainD
  const cx = sx * (w / 2 - chaiseW / 2)
  return (
    <group>
      <Sofa item={item} w={w} d={mainD} z0={-d / 2 + mainD / 2} />
      <R size={[chaiseW, 0.2, chaiseD + 0.02]} at={[cx, 0.2, d / 2 - chaiseD / 2]} m={fab} r={0.03} />
      <R size={[chaiseW - (0.16 + 0.012), 0.16, chaiseD]} at={[cx - sx * 0.08, 0.38, d / 2 - chaiseD / 2]} m={fab} r={0.05} />
      <R size={[0.16, 0.52, chaiseD]} at={[sx * (w / 2 - 0.08), 0.36, d / 2 - chaiseD / 2]} m={fab} r={0.05} />
      <Legs w={chaiseW} d={chaiseD} h={0.1} inset={0.08} m={M.metal()} y={0} />
    </group>
  )
}

function CoffeeTable({ item }: ModelProps) {
  const m = finishMat(item)
  const { width: w, depth: d, height: h } = item
  if (option(item, 'shape') === 'round') {
    return (
      <group>
        <Cyl r={w / 2} h={0.035} at={[0, h - 0.0175, 0]} m={m} seg={48} />
        <Cyl r={0.09} rTop={0.06} h={h - 0.035} at={[0, (h - 0.035) / 2, 0]} m={m} />
        <Cyl r={w / 4} h={0.02} at={[0, 0.01, 0]} m={m} seg={32} />
      </group>
    )
  }
  return (
    <group>
      <R size={[w, 0.035, d]} at={[0, h - 0.0175, 0]} m={m} r={0.01} />
      <B size={[w - 0.12, 0.02, d - 0.12]} at={[0, 0.12, 0]} m={m} />
      <Legs w={w} d={d} h={h - 0.035} inset={0.05} r={0.02} m={m} />
    </group>
  )
}

function SideTable({ item }: ModelProps) {
  const m = finishMat(item)
  return (
    <group>
      <Cyl r={item.width / 2} h={0.03} at={[0, item.height - 0.015, 0]} m={m} seg={32} />
      <Cyl r={0.025} h={item.height - 0.03} at={[0, (item.height - 0.03) / 2, 0]} m={M.metal()} />
      <Cyl r={item.width / 3} h={0.015} at={[0, 0.0075, 0]} m={M.metal()} seg={32} />
    </group>
  )
}

function Cabinet({ item, drawers = 1, doors = 3, legH = 0.1, floating = false }: ModelProps & { drawers?: number; doors?: number; legH?: number; floating?: boolean }) {
  const m = finishMat(item)
  const { width: w, depth: d, height: h } = item
  const base = floating ? 0.15 : legH
  const bodyH = h - base
  return (
    <group>
      <B size={[w, bodyH, d]} at={[0, base + bodyH / 2, 0]} m={m} />
      <Grooves xs={evenly(w, doors)} ys={evenly(bodyH, drawers).map((y) => y + bodyH / 2)} w={w} h={bodyH} z={d / 2 + 0.001} y0={base} />
      {!floating && legH > 0 && <Legs w={w} d={d} h={legH} inset={0.05} r={0.015} m={M.metal()} />}
    </group>
  )
}

function Tv({ item }: ModelProps) {
  return (
    <group>
      <B size={[item.width, item.height, 0.035]} at={[0, item.height / 2, 0]} m={M.screen()} />
      <B size={[item.width * 0.4, item.height * 0.4, 0.02]} at={[0, item.height / 2, -0.025]} m={M.metal()} />
    </group>
  )
}

function Rug({ item }: ModelProps) {
  const fab = fabricOf(item)
  const border = fabricMat(new THREE.Color(FABRICS.find((f) => f.id === item.fabric)?.color ?? '#ccc').multiplyScalar(0.8).getStyle())
  return (
    <group>
      <B size={[item.width, item.height, item.depth]} at={[0, item.height / 2, 0]} m={border} />
      <B size={[item.width - 0.12, item.height + 0.002, item.depth - 0.12]} at={[0, item.height / 2 + 0.001, 0]} m={fab} />
    </group>
  )
}

function FloorLamp({ item }: ModelProps) {
  const m = finishMat(item)
  const h = item.height
  return (
    <group>
      <Cyl r={0.15} h={0.03} at={[0, 0.015, 0]} m={m} seg={32} />
      <Cyl r={0.012} h={h - 0.3} at={[0, (h - 0.3) / 2, 0]} m={m} seg={8} />
      <Cyl r={0.2} rTop={0.16} h={0.3} at={[0, h - 0.15, 0]} m={M.shade()} seg={32} />
    </group>
  )
}

function Bookshelf({ item }: ModelProps) {
  const m = finishMat(item)
  const { width: w, depth: d, height: h } = item
  const shelves = Math.max(3, Math.round(h / 0.38))
  const rand = seeded(hash(item.id))
  const books: ReactNode[] = []
  const colors = ['#8a5a44', '#3e4a5a', '#c9b79c', '#6d7a5c', '#b5643f', '#e7e1d5']
  for (let s = 0; s < shelves; s++) {
    const y = 0.02 + (s * (h - 0.04)) / shelves
    let x = -w / 2 + 0.04
    while (x < w / 2 - 0.12 && rand() > 0.12) {
      const bw = 0.025 + rand() * 0.03
      const bh = 0.18 + rand() * 0.1
      books.push(<B key={`${s}-${x}`} size={[bw, bh, d * 0.7]} at={[x + bw / 2, y + 0.02 + bh / 2, 0]} m={solid(colors[Math.floor(rand() * colors.length)], 0.8)} />)
      x += bw + 0.003
    }
  }
  return (
    <group>
      {[-1, 1].map((s) => (
        <B key={s} size={[0.02, h, d]} at={[s * (w / 2 - 0.01), h / 2, 0]} m={m} />
      ))}
      {Array.from({ length: shelves + 1 }, (_, i) => (
        <B key={i} size={[w, 0.02, d]} at={[0, 0.01 + (i * (h - 0.02)) / shelves, 0]} m={m} />
      ))}
      <B size={[w, h, 0.01]} at={[0, h / 2, -d / 2 + 0.005]} m={m} />
      {books}
    </group>
  )
}

function Chair({ item, at, rot }: ModelProps & { at: V3; rot: number }) {
  const frame = finishMat(item)
  return (
    <group position={at} rotation-y={rot}>
      <R size={[0.44, 0.05, 0.44]} at={[0, 0.46, 0]} m={fabricOf(item)} r={0.02} />
      <R size={[0.42, 0.36, 0.03]} at={[0, 0.7, -0.2]} m={frame} r={0.012} />
      <Legs w={0.44} d={0.44} h={0.44} inset={0.03} r={0.014} m={frame} />
    </group>
  )
}

function DiningSet({ item }: ModelProps) {
  const m = finishMat(item)
  const { width: w, depth: d, height: h } = item
  const round = option(item, 'shape') === 'round'
  const chairs = Number(option(item, 'chairs'))
  const seats: { at: V3; rot: number }[] = []
  if (round) {
    for (let i = 0; i < chairs; i++) {
      const a = (i / chairs) * Math.PI * 2
      const r = w / 2 + 0.18
      seats.push({ at: [Math.sin(a) * r, 0, Math.cos(a) * r], rot: a + Math.PI })
    }
  } else {
    const perSide = chairs / 2
    for (let i = 0; i < perSide; i++) {
      const x = -w / 2 + (w * (i + 0.5)) / perSide
      seats.push({ at: [x, 0, d / 2 + 0.18], rot: Math.PI }, { at: [x, 0, -d / 2 - 0.18], rot: 0 })
    }
  }
  return (
    <group>
      {round ? (
        <>
          <Cyl r={w / 2} h={0.04} at={[0, h - 0.02, 0]} m={m} seg={48} />
          <Cyl r={0.08} h={h - 0.04} at={[0, (h - 0.04) / 2, 0]} m={m} />
          <Cyl r={0.3} h={0.03} at={[0, 0.015, 0]} m={m} seg={32} />
        </>
      ) : (
        <>
          <R size={[w, 0.04, d]} at={[0, h - 0.02, 0]} m={m} r={0.01} />
          <Legs w={w} d={d} h={h - 0.04} inset={0.06} r={0.025} m={m} />
        </>
      )}
      {seats.map((s, i) => (
        <Chair key={i} item={item} at={s.at} rot={s.rot} />
      ))}
    </group>
  )
}

function BarStool({ item }: ModelProps) {
  const h = item.height
  return (
    <group>
      <Cyl r={0.19} h={0.05} at={[0, h - 0.025, 0]} m={fabricOf(item)} seg={32} />
      <Cyl r={0.022} h={h - 0.05} at={[0, (h - 0.05) / 2, 0]} m={finishMat(item)} seg={10} />
      <Cyl r={0.2} h={0.015} at={[0, 0.0075, 0]} m={finishMat(item)} seg={32} />
      <mesh position-y={0.3} rotation-x={Math.PI / 2} material={finishMat(item)} castShadow>
        <torusGeometry args={[0.15, 0.01, 8, 32]} />
      </mesh>
    </group>
  )
}

function Mattress({ w, d, z, y, item, pillows }: { w: number; d: number; z: number; y: number; item: FurnitureItem; pillows: number }) {
  const duvetD = d * 0.66
  return (
    <group>
      <R size={[w, 0.22, d]} at={[0, y + 0.11, z]} m={M.linen()} r={0.05} />
      <R size={[w + 0.02, 0.05, duvetD]} at={[0, y + 0.235, z + d / 2 - duvetD / 2]} m={fabricOf(item)} r={0.025} />
      {Array.from({ length: pillows }, (_, i) => {
        const pw = (w - 0.16) / pillows - 0.04
        return <R key={i} size={[pw, 0.12, 0.36]} at={[-w / 2 + 0.08 + (pw + 0.04) * (i + 0.5) + 0.02, y + 0.27, z - d / 2 + 0.26]} m={M.linen()} r={0.05} />
      })}
    </group>
  )
}

function Bed({ item }: ModelProps) {
  const { width: w, depth: d, height: h } = item
  const frame = finishMat(item)
  const headD = 0.08
  return (
    <group>
      <B size={[w, 0.26, d - headD]} at={[0, 0.17, headD / 2]} m={frame} />
      <Legs w={w} d={d - headD} h={0.04} inset={0.05} r={0.02} m={frame} y={0} />
      <Mattress w={w - 0.04} d={d - headD - 0.04} z={headD / 2} y={0.3} item={item} pillows={w > 1.2 ? 2 : 1} />
      <R size={[w + 0.04, h, headD]} at={[0, h / 2, -d / 2 + headD / 2]} m={fabricOf(item)} r={0.03} />
    </group>
  )
}

function PlatformBed({ item }: ModelProps) {
  const { width: w, depth: d, height: h } = item
  const m = finishMat(item)
  const mw = Math.min(1.52, w - 0.1)
  return (
    <group>
      <B size={[w, h, d]} at={[0, h / 2, 0]} m={m} />
      <Grooves xs={evenly(w, 3)} w={w} h={h - 0.06} z={d / 2 + 0.001} y0={0.03} />
      <Mattress w={mw} d={1.9} z={-d / 2 + 0.95 + 0.05} y={h} item={item} pillows={2} />
    </group>
  )
}

function Desk({ item }: ModelProps) {
  const m = finishMat(item)
  const { width: w, depth: d, height: h } = item
  return (
    <group>
      <R size={[w, 0.03, d]} at={[0, h - 0.015, 0]} m={m} r={0.008} />
      {[-1, 1].map((s) => (
        <B key={s} size={[0.03, h - 0.03, d - 0.06]} at={[s * (w / 2 - 0.05), (h - 0.03) / 2, 0]} m={M.metal()} />
      ))}
      <B size={[w - 0.1, 0.12, 0.015]} at={[0, h - 0.1, -d / 2 + 0.05]} m={M.metal()} />
    </group>
  )
}

function OfficeChair({ item }: ModelProps) {
  const fab = fabricOf(item)
  return (
    <group>
      {Array.from({ length: 5 }, (_, i) => (
        <B key={i} size={[0.3, 0.025, 0.04]} at={[Math.cos((i * 2 * Math.PI) / 5) * 0.15, 0.06, Math.sin((i * 2 * Math.PI) / 5) * 0.15]} rot={[0, (-i * 2 * Math.PI) / 5, 0]} m={M.metal()} />
      ))}
      <Cyl r={0.025} h={0.36} at={[0, 0.24, 0]} m={M.chrome()} seg={12} />
      <R size={[0.5, 0.08, 0.48]} at={[0, 0.46, 0.02]} m={fab} r={0.035} />
      <R size={[0.46, 0.55, 0.06]} at={[0, 0.82, -0.22]} m={fab} r={0.03} />
    </group>
  )
}

function Fridge({ item }: ModelProps) {
  const { width: w, depth: d, height: h } = item
  const color = option<string>(item, 'color')
  const m = color === 'white' ? solid('#f2f2f0', 0.3) : color === 'black' ? solid('#232325', 0.3, 0.3) : solid('#c9cbcd', 0.32, 0.65)
  const sideBySide = w > 0.85
  return (
    <group>
      <R size={[w, h, d]} at={[0, h / 2, 0]} m={m} r={0.02} />
      {sideBySide ? (
        <Grooves xs={[0]} w={w} h={h - 0.02} z={d / 2 + 0.001} y0={0.01} />
      ) : (
        <Grooves ys={[h * 0.32]} w={w} h={h} z={d / 2 + 0.001} />
      )}
      {(sideBySide ? [-0.04, 0.04] : [w / 2 - 0.06]).map((x, i) => (
        <B key={i} size={[0.02, 0.5, 0.03]} at={[x, h * 0.62, d / 2 + 0.02]} m={M.chrome()} />
      ))}
    </group>
  )
}

function Counter({ w, d, y, color }: { w: number; d: number; y: number; color: keyof typeof COUNTER }) {
  return <B size={[w, 0.03, d]} at={[0, y + 0.015, 0]} m={solid(COUNTER[color] ?? COUNTER.white, 0.25)} />
}

function Island({ item }: ModelProps) {
  const { width: w, depth: d, height: h } = item
  const m = finishMat(item)
  const overhang = Math.min(0.3, d / 3)
  const bodyD = d - overhang
  return (
    <group>
      <B size={[w, 0.08, bodyD - 0.05]} at={[0, 0.04, -overhang / 2 - 0.025]} m={M.groove()} />
      <B size={[w, h - 0.11, bodyD]} at={[0, 0.08 + (h - 0.11) / 2, -overhang / 2]} m={m} />
      <Grooves xs={evenly(w, Math.max(2, Math.round(w / 0.6)))} w={w} h={h - 0.11} z={-overhang / 2 - bodyD / 2 - 0.001} y0={0.08} />
      <Counter w={w + 0.02} d={d} y={h - 0.03} color={option(item, 'counter')} />
    </group>
  )
}

function KitchenRun({ item }: ModelProps) {
  const { width: w, depth: d, height: h } = item
  const m = finishMat(item)
  const doors = Math.max(1, Math.round(w / 0.6))
  const sink = option(item, 'sink') === 'yes'
  const hob = option(item, 'hob') === 'yes'
  const uppers = option(item, 'uppers') === 'yes'
  const top = h
  return (
    <group>
      <B size={[w, 0.1, d - 0.06]} at={[0, 0.05, -0.03]} m={M.groove()} />
      <B size={[w, h - 0.13, d - 0.02]} at={[0, 0.1 + (h - 0.13) / 2, -0.01]} m={m} />
      <Grooves xs={evenly(w, doors)} ys={[(h - 0.13) * 0.8]} w={w} h={h - 0.13} z={d / 2 - 0.02 + 0.001} y0={0.1} />
      <Counter w={w} d={d + 0.02} y={top - 0.03} color={option(item, 'counter')} />
      {sink && w >= 1.2 && (
        <group position={[w / 2 - 0.55, top, 0.02]}>
          <B size={[0.7, 0.004, 0.42]} at={[0, 0.002, 0]} m={solid('#7c7f82', 0.25, 0.8)} />
          <Cyl r={0.015} h={0.28} at={[0, 0.14, -0.24]} m={M.chrome()} seg={10} />
          <B size={[0.02, 0.02, 0.2]} at={[0, 0.27, -0.15]} m={M.chrome()} />
        </group>
      )}
      {hob && w >= 1.8 && <B size={[0.6, 0.006, 0.5]} at={[-w / 2 + 0.6, top + 0.003, 0.02]} m={M.screen()} />}
      {uppers && (
        <group position={[0, 1.5, -d / 2 + 0.175]}>
          <B size={[w, 0.7, 0.35]} at={[0, 0.35, 0]} m={m} />
          <Grooves xs={evenly(w, doors)} w={w} h={0.7} z={0.176} />
        </group>
      )}
    </group>
  )
}

function Vanity({ item }: ModelProps) {
  const { width: w, depth: d } = item
  const m = finishMat(item)
  return (
    <group>
      <B size={[w, 0.45, d]} at={[0, 0.35 + 0.225, 0]} m={m} />
      <Grooves xs={evenly(w, w > 0.7 ? 2 : 1)} w={w} h={0.45} z={d / 2 + 0.001} y0={0.35} />
      <B size={[w + 0.01, 0.02, d]} at={[0, 0.81, 0]} m={M.ceramic()} />
      <R size={[Math.min(0.5, w * 0.6), 0.12, d * 0.62]} at={[0, 0.88, 0.02]} m={M.ceramic()} r={0.05} />
      <Cyl r={0.014} h={0.22} at={[0, 0.93, -d / 2 + 0.06]} m={M.chrome()} seg={10} />
      <B size={[w * 0.9, 0.8, 0.02]} at={[0, 1.55, -d / 2 + 0.01]} m={M.mirror()} />
    </group>
  )
}

function Toilet() {
  const c = M.ceramic()
  return (
    <group>
      <B size={[0.36, 0.38, 0.16]} at={[0, 0.6, -0.26]} m={c} />
      <mesh position={[0, 0.2, 0.04]} scale={[1, 1, 1.35]} material={c} castShadow receiveShadow>
        <cylinderGeometry args={[0.18, 0.13, 0.4, 32]} />
      </mesh>
      <R size={[0.36, 0.03, 0.46]} at={[0, 0.415, 0.04]} m={c} r={0.012} />
    </group>
  )
}

function ShowerScreen({ item }: ModelProps) {
  const { width: w, height: h } = item
  return (
    <group>
      <B size={[w, h, 0.008]} at={[0, h / 2, 0]} m={M.glass()} />
      <B size={[w, 0.02, 0.02]} at={[0, h, 0]} m={M.metal()} />
      <B size={[0.02, h, 0.02]} at={[-w / 2, h / 2, 0]} m={M.metal()} />
    </group>
  )
}

function Washer({ item }: ModelProps) {
  const { width: w, depth: d, height: h } = item
  const stacked = option(item, 'stacked') === 'yes'
  const unit = (y: number, key: string) => (
    <group key={key} position-y={y}>
      <R size={[w, h, d]} at={[0, h / 2, 0]} m={solid('#f2f2f0', 0.35)} r={0.02} />
      <mesh position={[0, h * 0.45, d / 2 + 0.005]} material={M.chrome()}>
        <torusGeometry args={[0.17, 0.02, 12, 40]} />
      </mesh>
      <mesh position={[0, h * 0.45, d / 2 + 0.004]} material={solid('#2c3338', 0.1, 0.3)}>
        <circleGeometry args={[0.16, 40]} />
      </mesh>
      <B size={[w - 0.04, 0.08, 0.005]} at={[0, h - 0.06, d / 2 + 0.002]} m={solid('#d9dadb', 0.4)} />
    </group>
  )
  return <group>{[unit(0, 'w'), stacked && unit(h + 0.01, 'd')]}</group>
}

function Plant({ item }: ModelProps) {
  const h = item.height
  const potR = item.width * 0.32
  const potH = Math.min(0.35, h * 0.3)
  const rand = seeded(hash(item.id))
  const pot = finishMat(item)
  const leaves = useMemo(
    () =>
      Array.from({ length: h > 1 ? 14 : 8 }, (_, i) => {
        const t = h > 1 ? 0.35 + (i / 14) * 0.6 : 0.6 + rand() * 0.3
        const a = rand() * Math.PI * 2
        const spread = h > 1 ? 0.12 + rand() * 0.14 : item.width * 0.3
        return { at: [Math.cos(a) * spread, h * t, Math.sin(a) * spread] as V3, s: (h > 1 ? 0.13 : 0.1) + rand() * 0.06, rot: [rand(), a, rand()] as V3, i }
      }),
    [item.id, h, item.width],
  )
  return (
    <group>
      <Cyl r={potR * 0.8} rTop={potR} h={potH} at={[0, potH / 2, 0]} m={pot} />
      <Cyl r={potR * 0.95} h={0.01} at={[0, potH, 0]} m={solid('#3b2d22', 1)} />
      {h > 1 && <Cyl r={0.012} h={h * 0.75} at={[0, potH + h * 0.35, 0]} m={solid('#5a4632', 0.8)} seg={6} />}
      {leaves.map((l) => (
        <mesh key={l.i} position={l.at} rotation={l.rot} scale={[l.s, l.s * 0.25, l.s * 0.7]} material={M.leaf(l.i)} castShadow>
          <sphereGeometry args={[1, 10, 8]} />
        </mesh>
      ))}
    </group>
  )
}

function WallArt({ item }: ModelProps) {
  const { width: w, height: h } = item
  const rand = seeded(hash(item.id))
  const palette = ['#c98e6f', '#e2d2b6', '#5f7287', '#8fa394', '#2f3440', '#d8b2a8']
  return (
    <group position-y={h / 2}>
      <B size={[w, h, 0.03]} at={[0, 0, 0]} m={finishMat(item)} />
      <B size={[w - 0.06, h - 0.06, 0.005]} at={[0, 0, 0.016]} m={solid('#f3efe6', 0.9)} />
      {Array.from({ length: 3 }, (_, i) => {
        const bw = (w - 0.12) * (0.25 + rand() * 0.35)
        const bh = (h - 0.12) * (0.3 + rand() * 0.5)
        const x = (rand() - 0.5) * (w - 0.12 - bw)
        const y = (rand() - 0.5) * (h - 0.12 - bh)
        return <B key={i} size={[bw, bh, 0.002]} at={[x, y, 0.02 + i * 0.001]} m={solid(palette[Math.floor(rand() * palette.length)], 0.9)} />
      })}
    </group>
  )
}

function WallShelf({ item }: ModelProps) {
  const { width: w, depth: d, height: h } = item
  return (
    <group>
      <B size={[w, h, d]} at={[0, h / 2, 0]} m={finishMat(item)} />
      <Cyl r={0.05} rTop={0.035} h={0.2} at={[-w / 4, h + 0.1, 0]} m={solid('#e9e4da', 0.3)} />
      <B size={[0.04, 0.22, 0.16]} at={[w / 4, h + 0.11, 0]} m={solid('#3e4a5a', 0.8)} />
      <B size={[0.035, 0.2, 0.15]} at={[w / 4 + 0.04, h + 0.1, 0]} m={solid('#b5643f', 0.8)} />
    </group>
  )
}

function Mirror({ item }: ModelProps) {
  const { width: w, height: h } = item
  return (
    <group rotation-x={-0.08} position-z={0.03}>
      <B size={[w, h, 0.03]} at={[0, h / 2, 0]} m={finishMat(item)} />
      <B size={[w - 0.05, h - 0.05, 0.005]} at={[0, h / 2, 0.016]} m={M.mirror()} />
    </group>
  )
}

function Wardrobe({ item }: ModelProps) {
  const { width: w, depth: d, height: h } = item
  const m = finishMat(item)
  const doors = option<string>(item, 'doors')
  const plinth = 0.08
  const bodyH = h - plinth
  if (doors === 'open') {
    const rand = seeded(hash(item.id))
    const clothes = ['#3e4a5a', '#e7e1d5', '#8a5a44', '#9aa58f', '#2c2c2e', '#d8b2a8']
    return (
      <group>
        <B size={[w, plinth, d - 0.04]} at={[0, plinth / 2, -0.02]} m={M.groove()} />
        <B size={[w, bodyH, 0.02]} at={[0, plinth + bodyH / 2, -d / 2 + 0.01]} m={solid('#e9e4da', 0.6)} />
        {[-1, 1].map((s) => (
          <B key={s} size={[0.02, bodyH, d]} at={[s * (w / 2 - 0.01), plinth + bodyH / 2, 0]} m={m} />
        ))}
        <B size={[w, 0.02, d]} at={[0, h - 0.01, 0]} m={m} />
        <B size={[w, 0.02, d]} at={[0, h - 0.4, 0]} m={m} />
        <Cyl r={0.012} h={w - 0.04} at={[0, h - 0.48, 0]} rot={[0, 0, Math.PI / 2]} m={M.chrome()} seg={8} />
        {Array.from({ length: Math.floor((w - 0.1) / 0.07) }, (_, i) => (
          <B key={i} size={[0.03, 0.75 + rand() * 0.3, d * 0.75]} at={[-w / 2 + 0.08 + i * 0.07, h - 0.5 - 0.45, 0]} m={solid(clothes[Math.floor(rand() * clothes.length)], 0.9)} />
        ))}
      </group>
    )
  }
  const panels = doors === 'sliding' ? Math.max(2, Math.round(w / 1.0)) : Math.max(1, Math.round(w / 0.5))
  const pw = w / panels
  return (
    <group>
      <B size={[w, plinth, d - 0.04]} at={[0, plinth / 2, -0.02]} m={M.groove()} />
      <B size={[w, bodyH, d - 0.04]} at={[0, plinth + bodyH / 2, -0.02]} m={m} />
      {Array.from({ length: panels }, (_, i) => {
        const x = -w / 2 + pw * (i + 0.5)
        const z = doors === 'sliding' ? d / 2 - 0.035 + (i % 2) * 0.025 : d / 2 - 0.01
        return (
          <group key={i}>
            <B size={[pw - 0.004, bodyH - 0.004, 0.02]} at={[x, plinth + bodyH / 2, z]} m={m} />
            {doors === 'swing' && <B size={[0.012, 0.3, 0.02]} at={[x + (i % 2 ? -1 : 1) * (pw / 2 - 0.04), plinth + bodyH * 0.5, z + 0.02]} m={M.metal()} />}
          </group>
        )
      })}
    </group>
  )
}

function ShoeCabinet({ item }: ModelProps) {
  return <Cabinet item={item} doors={Math.max(1, Math.round(item.width / 0.45))} floating={option(item, 'floating') === 'yes'} legH={0} />
}

function TvWall({ item }: ModelProps) {
  const { width: w, depth: d, height: h } = item
  const panel = option<string>(item, 'panel')
  const dark = item.finish === 'walnut' || item.finish === 'black' || item.finish === 'navy'
  const face = useMemo(() => {
    if (panel === 'fluted') return item.finish === 'oak' || item.finish === 'walnut' ? featureMaterial({ feature: 'fluted-oak' }) : featureMaterial({ feature: 'fluted', color: FURNITURE_FINISHES.find((f) => f.id === item.finish)?.color })
    if (panel === 'slats') return featureMaterial({ feature: dark ? 'slats-walnut' : 'slats-oak' })
    return null
  }, [panel, item.finish, dark])
  const geometry = useMemo(() => metricBox(w, h, 0.03), [w, h])
  const consoleW = Math.min(w - 0.2, 2.0)
  return (
    <group>
      <mesh geometry={geometry} position={[0, h / 2, -d / 2 + 0.015]} material={face ?? finishMat(item)} castShadow receiveShadow />
      <B size={[consoleW, 0.3, 0.35]} at={[0, 0.35 + 0.15, -d / 2 + 0.03 + 0.175]} m={finishMat(item)} />
      <Grooves xs={evenly(consoleW, 3)} w={consoleW} h={0.3} z={-d / 2 + 0.03 + 0.35 + 0.001} y0={0.35} />
    </group>
  )
}

function Generic({ item }: ModelProps) {
  return <B size={[item.width, item.height, item.depth]} at={[0, item.height / 2, 0]} m={finishMat(item)} />
}

const MODELS: Record<string, (p: ModelProps) => ReactNode> = {
  sofa: Sofa,
  'sofa-l': LSofa,
  armchair: (p) => <Sofa {...p} />,
  'coffee-table': CoffeeTable,
  'side-table': SideTable,
  'tv-console': (p) => <Cabinet {...p} doors={3} />,
  tv: Tv,
  rug: Rug,
  'floor-lamp': FloorLamp,
  bookshelf: Bookshelf,
  'dining-set': DiningSet,
  'bar-stool': BarStool,
  bed: Bed,
  bedside: (p) => <Cabinet {...p} doors={1} drawers={2} legH={0.12} />,
  dresser: (p) => <Cabinet {...p} doors={2} drawers={3} legH={0.1} />,
  desk: Desk,
  'office-chair': OfficeChair,
  fridge: Fridge,
  island: Island,
  vanity: Vanity,
  toilet: Toilet,
  'shower-screen': ShowerScreen,
  washer: Washer,
  plant: Plant,
  'wall-art': WallArt,
  'wall-shelf': WallShelf,
  mirror: Mirror,
  wardrobe: Wardrobe,
  'shoe-cabinet': ShoeCabinet,
  'tv-wall': TvWall,
  'platform-bed': PlatformBed,
  'kitchen-run': KitchenRun,
}

/** Renders an item's model; memoised so dragging one piece doesn't rebuild the others. */
export const ItemModel = memo(function ItemModel({ item }: ModelProps) {
  const Model = MODELS[item.type] ?? Generic
  return <Model item={item} />
})
