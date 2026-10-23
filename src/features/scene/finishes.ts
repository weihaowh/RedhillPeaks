import * as THREE from 'three'
import type { RoomKind } from '../../types/plan'

// Procedural PBR-ish floor finishes, painted to a canvas so the app works offline.
// Floor UVs are in metres, so each texture declares how many metres one tile covers.

type Painter = (ctx: CanvasRenderingContext2D, size: number, rand: () => number) => void

export interface FloorFinish {
  id: string
  label: string
  group: 'Wood' | 'Tile' | 'Stone' | 'Other'
  swatch: string
  /** Real-world size of one texture repeat (m). */
  repeat: number
  roughness: number
  paint: Painter
}

const seeded = (seed: number) => () => {
  seed = (seed * 16807) % 2147483647
  return (seed - 1) / 2147483646
}

function shade(hex: string, rand: () => number, light = 0.05, sat = 0.03) {
  return new THREE.Color(hex).offsetHSL(0, (rand() - 0.5) * sat, (rand() - 0.5) * light).getStyle()
}

const planks =
  (base: string, rows = 8): Painter =>
  (ctx, size, rand) => {
    const rowH = size / rows
    for (let r = 0; r < rows; r++) {
      let x = -rand() * size
      while (x < size) {
        const len = size * (0.35 + rand() * 0.45)
        for (const dx of [0, size]) {
          const px = x + dx
          ctx.fillStyle = shade(base, rand, 0.09, 0.05)
          ctx.fillRect(px, r * rowH, len, rowH)
          for (let g = 0; g < 26; g++) {
            const gy = r * rowH + rand() * rowH
            ctx.strokeStyle = `rgba(60,35,15,${0.03 + rand() * 0.06})`
            ctx.lineWidth = 0.6 + rand() * 1.4
            ctx.beginPath()
            ctx.moveTo(px, gy)
            ctx.bezierCurveTo(px + len * 0.33, gy + (rand() - 0.5) * 6, px + len * 0.66, gy + (rand() - 0.5) * 6, px + len, gy)
            ctx.stroke()
          }
          ctx.fillStyle = 'rgba(40,25,10,0.35)'
          ctx.fillRect(px, r * rowH, 1.5, rowH)
        }
        x += len
      }
      ctx.fillStyle = 'rgba(40,25,10,0.3)'
      ctx.fillRect(0, r * rowH, size, 1.5)
    }
  }

const tiles =
  (base: string, grout: string, count = 2): Painter =>
  (ctx, size, rand) => {
    const t = size / count
    for (let i = 0; i < count; i++) {
      for (let j = 0; j < count; j++) {
        ctx.fillStyle = shade(base, rand, 0.025, 0.01)
        ctx.fillRect(i * t, j * t, t, t)
      }
    }
    for (let k = 0; k < 2500; k++) {
      ctx.fillStyle = `rgba(0,0,0,${rand() * 0.04})`
      ctx.fillRect(rand() * size, rand() * size, 2, 2)
    }
    ctx.fillStyle = grout
    for (let i = 0; i < count; i++) {
      ctx.fillRect(i * t, 0, 3, size)
      ctx.fillRect(0, i * t, size, 3)
    }
  }

const marble: Painter = (ctx, size, rand) => {
  ctx.fillStyle = '#f1efeb'
  ctx.fillRect(0, 0, size, size)
  ctx.filter = 'blur(1.5px)'
  for (let v = 0; v < 14; v++) {
    ctx.strokeStyle = `rgba(110,110,118,${0.12 + rand() * 0.25})`
    ctx.lineWidth = 0.6 + rand() * 2.4
    ctx.beginPath()
    let x = rand() * size
    let y = 0
    ctx.moveTo(x, y)
    while (y < size) {
      const nx = x + (rand() - 0.5) * 140
      const ny = y + 40 + rand() * 90
      ctx.quadraticCurveTo(x + (rand() - 0.5) * 80, (y + ny) / 2, nx, ny)
      x = nx
      y = ny
    }
    ctx.stroke()
  }
  ctx.filter = 'none'
  ctx.fillStyle = 'rgba(160,160,160,0.6)'
  ctx.fillRect(0, 0, size, 2)
  ctx.fillRect(0, 0, 2, size)
  ctx.fillRect(size / 2, 0, 2, size)
}

const terrazzo: Painter = (ctx, size, rand) => {
  ctx.fillStyle = '#e8e3da'
  ctx.fillRect(0, 0, size, size)
  const chips = ['#b9b2a6', '#8d8a85', '#d7a98c', '#6f6a64', '#f7f5f0', '#a9b4ad']
  for (let i = 0; i < 1800; i++) {
    ctx.fillStyle = chips[Math.floor(rand() * chips.length)]
    const cx = rand() * size
    const cy = rand() * size
    const r = 1.5 + rand() * rand() * 9
    ctx.beginPath()
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2 + rand()
      const rr = r * (0.6 + rand() * 0.5)
      ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr)
    }
    ctx.fill()
  }
}

const screed =
  (base: string): Painter =>
  (ctx, size, rand) => {
    ctx.fillStyle = base
    ctx.fillRect(0, 0, size, size)
    for (let i = 0; i < 400; i++) {
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 20 + rand() * 60)
      const a = rand() * 0.05
      g.addColorStop(0, rand() > 0.5 ? `rgba(255,255,255,${a})` : `rgba(0,0,0,${a})`)
      g.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.save()
      ctx.translate(rand() * size, rand() * size)
      ctx.fillStyle = g
      ctx.fillRect(-80, -80, 160, 160)
      ctx.restore()
    }
  }

export const FLOOR_FINISHES: FloorFinish[] = [
  { id: 'oak', label: 'Natural Oak', group: 'Wood', swatch: '#c8a27a', repeat: 1.44, roughness: 0.62, paint: planks('#c39b70') },
  { id: 'ash', label: 'Whitewashed Ash', group: 'Wood', swatch: '#dccbb1', repeat: 1.44, roughness: 0.66, paint: planks('#d8c6aa') },
  { id: 'walnut', label: 'Walnut', group: 'Wood', swatch: '#6e4b33', repeat: 1.44, roughness: 0.55, paint: planks('#6b4930') },
  { id: 'tile-grey', label: 'Grey Porcelain 60×60', group: 'Tile', swatch: '#b5b3ae', repeat: 1.2, roughness: 0.5, paint: tiles('#b8b6b1', '#9c9a95') },
  { id: 'tile-warm', label: 'Warm White 60×60', group: 'Tile', swatch: '#e8e2d8', repeat: 1.2, roughness: 0.45, paint: tiles('#e8e2d8', '#cfc8bc') },
  { id: 'tile-charcoal', label: 'Charcoal 60×60', group: 'Tile', swatch: '#55555a', repeat: 1.2, roughness: 0.55, paint: tiles('#58585c', '#47474a') },
  { id: 'marble', label: 'Marble-look 60×120', group: 'Stone', swatch: '#efede9', repeat: 1.2, roughness: 0.25, paint: marble },
  { id: 'terrazzo', label: 'Terrazzo', group: 'Stone', swatch: '#e2dbcf', repeat: 1.0, roughness: 0.4, paint: terrazzo },
  { id: 'screed', label: 'Cement Screed', group: 'Other', swatch: '#a8a49e', repeat: 2.0, roughness: 0.8, paint: screed('#aaa69f') },
]

export const WALL_PAINTS = [
  { label: 'Cloud White', hex: '#f4f1ea' },
  { label: 'Warm Linen', hex: '#ece3d3' },
  { label: 'Greige', hex: '#d6cfc4' },
  { label: 'Sage', hex: '#bcc5b0' },
  { label: 'Mist Blue', hex: '#c9d3da' },
  { label: 'Clay', hex: '#dcbba3' },
  { label: 'Charcoal', hex: '#55565a' },
]

const DEFAULT_FINISH: Record<RoomKind, string> = {
  living: 'oak',
  bedroom: 'oak',
  kitchen: 'tile-grey',
  bath: 'tile-grey',
  service: 'tile-grey',
  shelter: 'screed',
  ledge: 'screed',
}

export const defaultFinish = (kind: RoomKind) => DEFAULT_FINISH[kind]

export const finishById = (id: string) => FLOOR_FINISHES.find((f) => f.id === id) ?? FLOOR_FINISHES[0]

const materialCache = new Map<string, THREE.MeshStandardMaterial>()

export function finishMaterial(id: string): THREE.MeshStandardMaterial {
  const cached = materialCache.get(id)
  if (cached) return cached

  const finish = finishById(id)
  const size = 1024
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')!
  finish.paint(ctx, size, seeded(finish.id.length * 7919 + 17))

  const map = new THREE.CanvasTexture(canvas)
  map.colorSpace = THREE.SRGBColorSpace
  map.wrapS = map.wrapT = THREE.RepeatWrapping
  map.repeat.set(1 / finish.repeat, 1 / finish.repeat)
  map.anisotropy = 8

  const material = new THREE.MeshStandardMaterial({ map, roughness: finish.roughness, metalness: 0 })
  materialCache.set(id, material)
  return material
}
