import * as THREE from 'three'
import type { FeatureSpec } from '../../types/design'
import { seeded, shade } from './finishes'

// Wall paint and feature-wall finishes. Wall faces get metre-based UVs (see FlatModel), so
// each texture declares how many metres one repeat covers.

export const PAINT_PALETTES: { name: string; colors: { label: string; hex: string }[] }[] = [
  {
    name: 'Whites & neutrals',
    colors: [
      { label: 'Cloud White', hex: '#f4f1ea' },
      { label: 'Chalk', hex: '#efece6' },
      { label: 'Rice Paper', hex: '#efe9df' },
      { label: 'Warm Linen', hex: '#ece3d3' },
      { label: 'Greige', hex: '#d6cfc4' },
      { label: 'Mushroom', hex: '#bfb4a6' },
      { label: 'Pebble Grey', hex: '#c9c9c4' },
    ],
  },
  {
    name: 'Earthy',
    colors: [
      { label: 'Clay', hex: '#dcbba3' },
      { label: 'Terracotta', hex: '#c98e6f' },
      { label: 'Sand', hex: '#e2d2b6' },
      { label: 'Limewash Sand', hex: '#d9cbb8' },
      { label: 'Olive', hex: '#a9a487' },
      { label: 'Sage', hex: '#bcc5b0' },
      { label: 'Eucalyptus', hex: '#8fa394' },
    ],
  },
  {
    name: 'Cool & deep',
    colors: [
      { label: 'Mist Blue', hex: '#c9d3da' },
      { label: 'Powder Blue', hex: '#b3c4d1' },
      { label: 'Denim', hex: '#5f7287' },
      { label: 'Forest', hex: '#4c5e52' },
      { label: 'Charcoal', hex: '#55565a' },
      { label: 'Ink', hex: '#2f3440' },
    ],
  },
]

type TintPainter = (ctx: CanvasRenderingContext2D, size: number, rand: () => number, color: string) => void

export interface FeatureFinish {
  id: string
  label: string
  group: 'Paint effect' | 'Panelling' | 'Wallpaper' | 'Tile'
  swatch: string
  /** Default tint; finishes with `tintable` let the user pick another. */
  color: string
  tintable?: boolean
  /** Metres covered by one texture repeat. */
  repeat: number
  roughness: number
  /** How strongly the texture's light/dark reads as relief. */
  bump: number
  paint: TintPainter
}

const limewash: TintPainter = (ctx, size, rand, color) => {
  ctx.fillStyle = color
  ctx.fillRect(0, 0, size, size)
  // Soft brush clouds, repeated in the eight neighbouring tiles so the texture wraps.
  const shifts = [-size, 0, size].flatMap((dx) => [-size, 0, size].map((dy) => [dx, dy]))
  for (let i = 0; i < 260; i++) {
    const x = rand() * size
    const y = rand() * size
    const r = 40 + rand() * 140
    const light = rand() > 0.5
    for (const [dx, dy] of shifts) {
      const g = ctx.createRadialGradient(x + dx, y + dy, 0, x + dx, y + dy, r)
      g.addColorStop(0, light ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.06)')
      g.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = g
      ctx.fillRect(x + dx - r, y + dy - r, r * 2, r * 2)
    }
  }
}

const flutes =
  (count: number, wood = false): TintPainter =>
  (ctx, size, rand, color) => {
    const w = size / count
    for (let i = 0; i < count; i++) {
      // Each flute is a half-round: shade across its width like a cylinder.
      const g = ctx.createLinearGradient(i * w, 0, (i + 1) * w, 0)
      const base = wood ? shade(color, rand, 0.06, 0.03) : color
      g.addColorStop(0, new THREE.Color(base).multiplyScalar(0.72).getStyle())
      g.addColorStop(0.35, new THREE.Color(base).multiplyScalar(1.04).getStyle())
      g.addColorStop(0.65, base)
      g.addColorStop(1, new THREE.Color(base).multiplyScalar(0.7).getStyle())
      ctx.fillStyle = g
      ctx.fillRect(i * w, 0, w, size)
      if (wood) {
        for (let k = 0; k < 6; k++) {
          ctx.strokeStyle = `rgba(60,35,15,${0.05 + rand() * 0.06})`
          ctx.beginPath()
          const gx = i * w + rand() * w
          ctx.moveTo(gx, 0)
          ctx.lineTo(gx + (rand() - 0.5) * 4, size)
          ctx.stroke()
        }
      }
    }
  }

const slats: TintPainter = (ctx, size, rand, color) => {
  // 40 mm battens with 20 mm dark shadow gaps (texture spans 0.48 m → 8 battens).
  const pitch = size / 8
  ctx.fillStyle = '#1d1a17'
  ctx.fillRect(0, 0, size, size)
  for (let i = 0; i < 8; i++) {
    const x = i * pitch
    ctx.fillStyle = shade(color, rand, 0.08, 0.04)
    ctx.fillRect(x, 0, pitch * 0.67, size)
    for (let k = 0; k < 10; k++) {
      ctx.strokeStyle = `rgba(50,30,12,${0.05 + rand() * 0.07})`
      ctx.beginPath()
      const gx = x + rand() * pitch * 0.67
      ctx.moveTo(gx, 0)
      ctx.bezierCurveTo(gx + (rand() - 0.5) * 6, size / 3, gx + (rand() - 0.5) * 6, (size * 2) / 3, gx, size)
      ctx.stroke()
    }
  }
}

const linenPaper: TintPainter = (ctx, size, rand, color) => {
  ctx.fillStyle = color
  ctx.fillRect(0, 0, size, size)
  for (let i = 0; i < 2200; i++) {
    const horizontal = rand() > 0.5
    ctx.strokeStyle = rand() > 0.5 ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'
    ctx.beginPath()
    const a = rand() * size
    const b = rand() * size
    const len = 20 + rand() * 120
    if (horizontal) {
      ctx.moveTo(b, a)
      ctx.lineTo(b + len, a)
    } else {
      ctx.moveTo(a, b)
      ctx.lineTo(a, b + len)
    }
    ctx.stroke()
  }
}

const archPaper: TintPainter = (ctx, size, _rand, color) => {
  ctx.fillStyle = color
  ctx.fillRect(0, 0, size, size)
  const cell = size / 4
  ctx.strokeStyle = new THREE.Color(color).multiplyScalar(0.78).getStyle()
  ctx.lineWidth = size / 140
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      const x = i * cell + (j % 2 ? cell / 2 : 0)
      const y = j * cell
      for (const dx of [0, -size]) {
        ctx.beginPath()
        ctx.moveTo(x + dx + cell * 0.2, y + cell * 0.95)
        ctx.lineTo(x + dx + cell * 0.2, y + cell * 0.5)
        ctx.arc(x + dx + cell * 0.5, y + cell * 0.5, cell * 0.3, Math.PI, 0)
        ctx.lineTo(x + dx + cell * 0.8, y + cell * 0.95)
        ctx.stroke()
      }
    }
  }
}

const tileGrid =
  (cols: number, rows: number, grout: string, offsetRows: boolean, variation: number): TintPainter =>
  (ctx, size, rand, color) => {
    const w = size / cols
    const h = size / rows
    ctx.fillStyle = grout
    ctx.fillRect(0, 0, size, size)
    for (let r = 0; r < rows; r++) {
      const shift = offsetRows && r % 2 ? w / 2 : 0
      for (let c = -1; c < cols; c++) {
        const x = c * w + shift
        const g = ctx.createLinearGradient(x, r * h, x + w, (r + 1) * h)
        const base = shade(color, rand, variation, variation / 2)
        g.addColorStop(0, new THREE.Color(base).multiplyScalar(1.05).getStyle())
        g.addColorStop(1, new THREE.Color(base).multiplyScalar(0.95).getStyle())
        ctx.fillStyle = g
        ctx.fillRect(x + 2, r * h + 2, w - 4, h - 4)
      }
    }
  }

export const FEATURE_FINISHES: FeatureFinish[] = [
  { id: 'limewash', label: 'Limewash', group: 'Paint effect', swatch: '#d9cbb8', color: '#d9cbb8', tintable: true, repeat: 2.4, roughness: 0.95, bump: 0.6, paint: limewash },
  { id: 'fluted', label: 'Fluted panel', group: 'Panelling', swatch: '#efebe4', color: '#efebe4', tintable: true, repeat: 0.48, roughness: 0.6, bump: 3, paint: flutes(16) },
  { id: 'fluted-oak', label: 'Fluted oak', group: 'Panelling', swatch: '#b88f64', color: '#b88f64', repeat: 0.48, roughness: 0.55, bump: 3, paint: flutes(16, true) },
  { id: 'slats-oak', label: 'Oak slats', group: 'Panelling', swatch: '#c09a6d', color: '#c09a6d', repeat: 0.48, roughness: 0.6, bump: 4, paint: slats },
  { id: 'slats-walnut', label: 'Walnut slats', group: 'Panelling', swatch: '#6b4a32', color: '#6b4a32', repeat: 0.48, roughness: 0.55, bump: 4, paint: slats },
  { id: 'paper-linen', label: 'Linen wallpaper', group: 'Wallpaper', swatch: '#d8d2c6', color: '#d8d2c6', tintable: true, repeat: 1.0, roughness: 0.9, bump: 0.4, paint: linenPaper },
  { id: 'paper-arch', label: 'Arch wallpaper', group: 'Wallpaper', swatch: '#cdd5c6', color: '#cdd5c6', tintable: true, repeat: 1.0, roughness: 0.85, bump: 0.3, paint: archPaper },
  { id: 'tile-subway', label: 'Subway tile', group: 'Tile', swatch: '#f2f0ec', color: '#f2f0ec', repeat: 0.6, roughness: 0.15, bump: 1.5, paint: tileGrid(4, 8, '#cfcac2', true, 0.03) },
  { id: 'tile-zellige', label: 'Zellige tile', group: 'Tile', swatch: '#5f8a77', color: '#5f8a77', tintable: true, repeat: 0.4, roughness: 0.12, bump: 1.5, paint: tileGrid(4, 4, '#d8d3c8', false, 0.14) },
]

export const featureById = (id: string) => FEATURE_FINISHES.find((f) => f.id === id)

const paintCache = new Map<string, THREE.MeshStandardMaterial>()
const featureCache = new Map<string, THREE.MeshStandardMaterial>()

export function paintMaterial(hex: string): THREE.MeshStandardMaterial {
  let m = paintCache.get(hex)
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color: hex, roughness: 0.92 })
    paintCache.set(hex, m)
  }
  return m
}

export function featureMaterial(spec: FeatureSpec): THREE.MeshStandardMaterial | null {
  const finish = featureById(spec.feature)
  if (!finish) return null
  const color = finish.tintable ? (spec.color ?? finish.color) : finish.color
  const key = `${finish.id}|${color}`
  const cached = featureCache.get(key)
  if (cached) return cached

  const size = 1024
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  finish.paint(canvas.getContext('2d')!, size, seeded(finish.id.length * 104729 + 11), color)

  const map = new THREE.CanvasTexture(canvas)
  map.colorSpace = THREE.SRGBColorSpace
  map.wrapS = map.wrapT = THREE.RepeatWrapping
  map.repeat.set(1 / finish.repeat, 1 / finish.repeat)
  map.anisotropy = 8
  // The same canvas doubles as a bump map: darker texels read as recessed.
  const bumpMap = map.clone()
  bumpMap.colorSpace = THREE.NoColorSpace
  bumpMap.needsUpdate = true

  const material = new THREE.MeshStandardMaterial({ map, bumpMap, bumpScale: finish.bump, roughness: finish.roughness })
  featureCache.set(key, material)
  return material
}
