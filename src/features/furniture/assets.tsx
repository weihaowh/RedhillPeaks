import { Component, Suspense, useMemo, type ReactNode } from 'react'
import * as THREE from 'three'
import { useGLTF } from '@react-three/drei'
import type { FurnitureItem } from '../../types/design'
import { FABRICS, FURNITURE_FINISHES, option } from './catalog'

// Detailed furniture models.
//
// - The wabi-sabi set (public/models/wabi/) was modelled in Blender for this app
//   (tools/blender/wabi/). One file per size variant, already at real size, so it's placed as-is.
//   Fabrics and woods carry neutral grey textures named `tint_fabric__*` / `tint_finish__*`; the
//   item's fabric and finish are multiplied in here, so every colour option still works.
// - A few Poly Haven scans (public/models/*.glb, CC0) fill in pieces with fixed materials.
//
// Pieces without a model, and every piece in Draft quality, use the procedural models.

export interface AssetDef {
  /** Path under public/models/. */
  file: string
  /**
   * 'natural': modelled at the variant's real size, placed as-is (wabi set).
   * 'stretch': scaled to fill the item's box (boxy pieces, free-size shelves).
   * 'uniform': scaled evenly to fit the footprint (organic pieces).
   */
  fit: 'natural' | 'stretch' | 'uniform'
  rotY?: number
  /** Mirror left-right (e.g. a right-hand chaise from the left-hand model). */
  mirror?: boolean
  /** Materials follow the item's finish / fabric choices. */
  recolor: boolean
}

const wabi = (name: string, extra: Partial<AssetDef> = {}): AssetDef => ({ file: `wabi/${name}.gltf`, fit: 'natural', recolor: true, ...extra })
const scan = (name: string, fit: AssetDef['fit'], rotY = 0): AssetDef => ({ file: `${name}.glb`, fit, rotY, recolor: false })

/** The variant whose label matches, or the one closest in width. */
function pick(item: FurnitureItem, files: Record<string, string>, widths: Record<string, number>): string {
  if (item.variant && files[item.variant]) return files[item.variant]
  const best = Object.entries(widths).sort((a, b) => Math.abs(a[1] - item.width) - Math.abs(b[1] - item.width))[0][0]
  return files[best]
}

const by = (entries: [label: string, file: string, width: number][]) => ({
  files: Object.fromEntries(entries.map(([l, f]) => [l, f])),
  widths: Object.fromEntries(entries.map(([l, , w]) => [l, w])),
})

const SOFA = by([['2-seater', 'sofa-2-seater', 1.6], ['3-seater', 'sofa-3-seater', 2.1], ['4-seater', 'sofa-4-seater', 2.5]])
const SOFA_L = by([['2.4 m', 'sofa-l-2.4m', 2.4], ['2.7 m', 'sofa-l-2.7m', 2.7], ['3.0 m', 'sofa-l-3.0m', 3.0]])
const COFFEE = by([['1.0 m', 'coffee-table-1.0m', 1.0], ['1.2 m', 'coffee-table-1.2m', 1.2]])
const TV = by([['55"', 'tv-55', 1.23], ['65"', 'tv-65', 1.45], ['75"', 'tv-75', 1.67]])
const CONSOLE = by([['1.5 m', 'tv-console-1.5m', 1.5], ['1.8 m', 'tv-console-1.8m', 1.8], ['2.1 m', 'tv-console-2.1m', 2.1]])
const RUG = by([['140×200', 'rug-140x200', 2.0], ['160×230', 'rug-160x230', 2.3], ['200×300', 'rug-200x300', 3.0]])
const TABLE = by([['1.4 m', 'dining-table-1.4m', 1.4], ['1.6 m', 'dining-table-1.6m', 1.6], ['1.8 m', 'dining-table-1.8m', 1.8]])
const BED = by([['Single', 'bed-single', 0.91], ['Super single', 'bed-super-single', 1.07], ['Queen', 'bed-queen', 1.52], ['King', 'bed-king', 1.83]])
const DESK = by([['1.0 m', 'desk-1.0m', 1.0], ['1.2 m', 'desk-1.2m', 1.2], ['1.6 m', 'desk-1.6m', 1.6]])
const FRIDGE = by([['2-door', 'fridge-2-door', 0.7], ['Side-by-side', 'fridge-side-by-side', 0.91]])
const VANITY = by([['600', 'vanity-600', 0.6], ['800', 'vanity-800', 0.8], ['1000', 'vanity-1000', 1.0]])
const SCREEN = by([['800', 'shower-screen-800', 0.8], ['900', 'shower-screen-900', 0.9], ['1200', 'shower-screen-1200', 1.2]])
const ART = by([['60×40', 'wall-art-60x40', 0.6], ['90×60', 'wall-art-90x60', 0.9], ['120×80', 'wall-art-120x80', 1.2]])

const isRound = (item: FurnitureItem) => option(item, 'shape') === 'round' || !!item.variant?.startsWith('Round')

/** The model for an item, if one suits its current variant and options. */
export function assetFor(item: FurnitureItem): AssetDef | null {
  switch (item.type) {
    case 'sofa':
      return wabi(pick(item, SOFA.files, SOFA.widths))
    case 'sofa-l':
      return wabi(pick(item, SOFA_L.files, SOFA_L.widths), { mirror: option(item, 'chaise') === 'right' })
    case 'armchair':
      return wabi('armchair')
    case 'coffee-table':
      return wabi(isRound(item) ? 'coffee-table-round' : pick(item, COFFEE.files, COFFEE.widths))
    case 'side-table':
      return wabi('side-table')
    case 'tv':
      return wabi(pick(item, TV.files, TV.widths))
    case 'tv-console':
      return wabi(pick(item, CONSOLE.files, CONSOLE.widths))
    case 'rug':
      return wabi(pick(item, RUG.files, RUG.widths))
    case 'floor-lamp':
      return wabi('floor-lamp')
    case 'dining-set':
      return wabi(isRound(item) ? 'dining-table-round' : pick(item, TABLE.files, TABLE.widths))
    case 'bar-stool':
      return wabi('bar-stool')
    case 'bed':
      return wabi(pick(item, BED.files, BED.widths))
    case 'bedside':
      return wabi('bedside')
    case 'dresser':
      return wabi('dresser')
    case 'desk':
      return wabi(pick(item, DESK.files, DESK.widths))
    case 'office-chair':
      return wabi('office-chair')
    case 'fridge':
      return wabi(pick(item, FRIDGE.files, FRIDGE.widths))
    case 'washer':
      return wabi(option(item, 'stacked') === 'yes' ? 'washer-stacked' : 'washer')
    case 'vanity':
      return wabi(pick(item, VANITY.files, VANITY.widths))
    case 'toilet':
      return wabi('toilet')
    case 'shower-screen':
      return wabi(pick(item, SCREEN.files, SCREEN.widths))
    case 'mirror':
      return wabi('mirror')
    case 'wall-art':
      return wabi(pick(item, ART.files, ART.widths))
    case 'wall-shelf':
      return wabi('wall-shelf', { fit: 'stretch' })
    case 'bookshelf':
      return scan('wooden_display_shelves_01', 'stretch', 90)
    case 'plant':
      return item.height < 1 ? scan('potted_plant_02', 'uniform') : scan('potted_plant_01', 'uniform')
    default:
      return null
  }
}

const DRACO = `${import.meta.env.BASE_URL}draco/`
export const assetUrl = (file: string) => `${import.meta.env.BASE_URL}models/${file}`

// ---------------------------------------------------------------------------------------------
// Colours

/** Tinted textures are 80% grey; dividing by its linear value gives the chosen colour back. */
const NEUTRAL = new THREE.Color(0.8, 0.8, 0.8).convertSRGBToLinear().r
const APPLIANCE: Record<string, { color: string; metalness: number; roughness: number }> = {
  white: { color: '#efece6', metalness: 0, roughness: 0.32 },
  steel: { color: '#c9cbcd', metalness: 0.85, roughness: 0.3 },
  black: { color: '#2b2b2d', metalness: 0.2, roughness: 0.35 },
}

interface Tints {
  finish: string
  fabric: string
  appliance: string
}

function tintsOf(item: FurnitureItem): Tints {
  return {
    finish: FURNITURE_FINISHES.find((f) => f.id === item.finish)?.color ?? FURNITURE_FINISHES[0].color,
    fabric: FABRICS.find((f) => f.id === item.fabric)?.color ?? FABRICS[0].color,
    appliance: String(option(item, 'color') ?? 'white'),
  }
}

/** A copy of the material with the item's colour applied, or the original if it isn't tintable. */
function tinted(m: THREE.MeshStandardMaterial, t: Tints): THREE.Material {
  const name = m.name
  let hex: string | null = null
  if (name.startsWith('tint_fabric')) hex = t.fabric
  else if (name.startsWith('tint_finish')) hex = t.finish
  else if (name.startsWith('tone_')) hex = `#${name.slice(5, 11)}`
  else if (name.startsWith('tint_appliance')) {
    const a = APPLIANCE[t.appliance] ?? APPLIANCE.white
    const c = m.clone()
    c.color.set(a.color)
    c.metalness = a.metalness
    c.roughness = a.roughness
    return c
  }
  if (!hex) return m
  const c = m.clone()
  c.color.set(hex).multiplyScalar(1 / NEUTRAL)
  return c
}

// ---------------------------------------------------------------------------------------------
// Rendering

function usePrepared(file: string) {
  const { scene } = useGLTF(assetUrl(file), DRACO)
  return useMemo(() => {
    scene.traverse((o) => {
      const mesh = o as THREE.Mesh
      if (!mesh.isMesh) return
      mesh.castShadow = true
      mesh.receiveShadow = true
      for (const m of [mesh.material].flat() as THREE.MeshStandardMaterial[]) {
        // Some scans give glass an opaque texture; make it clear so what's behind shows.
        if (/glass/i.test(m.name) && m.map) {
          m.map = null
          m.color.set('#e6eef2')
          m.transparent = true
          m.opacity = 0.12
          m.roughness = 0.05
          m.depthWrite = false
          m.needsUpdate = true
          mesh.castShadow = false
        }
        if (m.transparent) mesh.castShadow = false
        // The washi lantern glows softly.
        if (m.name === 'washi') m.emissiveIntensity = 0.9
      }
    })
    const box = new THREE.Box3().setFromObject(scene)
    return { scene, box, size: box.getSize(new THREE.Vector3()), centre: box.getCenter(new THREE.Vector3()) }
  }, [scene])
}

/** A model for one item, coloured and fitted into its w × h × d box (front facing +z). */
export function FittedAsset({ def, w, h, d, tints }: { def: AssetDef; w: number; h: number; d: number; tints?: Tints }) {
  const { scene, size, centre, box } = usePrepared(def.file)
  const key = tints ? `${tints.finish}|${tints.fabric}|${tints.appliance}` : ''
  const clone = useMemo(() => {
    const c = scene.clone(true)
    if (def.recolor && tints) {
      c.traverse((o) => {
        const mesh = o as THREE.Mesh
        if (!mesh.isMesh) return
        mesh.material = Array.isArray(mesh.material)
          ? mesh.material.map((m) => tinted(m as THREE.MeshStandardMaterial, tints))
          : tinted(mesh.material as THREE.MeshStandardMaterial, tints)
      })
    }
    return c
  }, [scene, key, def.recolor])

  if (def.fit === 'natural') {
    return <primitive object={clone} scale={def.mirror ? [-1, 1, 1] : [1, 1, 1]} />
  }
  const quarter = Math.round((def.rotY ?? 0) / 90) % 2 !== 0
  const nx = quarter ? size.z : size.x
  const nz = quarter ? size.x : size.z
  let scale: [number, number, number]
  if (def.fit === 'stretch') scale = [w / nx, h / size.y, d / nz]
  else {
    const k = Math.min(w / nx, d / nz, h / size.y)
    scale = [k, k, k]
  }
  const inner: [number, number, number] = quarter ? [scale[2], scale[1], scale[0]] : scale
  return (
    <group rotation-y={THREE.MathUtils.degToRad(def.rotY ?? 0)}>
      <group scale={inner}>
        <primitive object={clone} position={[-centre.x, -box.min.y, -centre.z]} />
      </group>
    </group>
  )
}

/** The model for an item, with its colours. */
export function ItemAsset({ item, def }: { item: FurnitureItem; def: AssetDef }) {
  const tints = tintsOf(item)
  if (item.type === 'dining-set') return <DiningAsset item={item} def={def} tints={tints} />
  return <FittedAsset def={def} w={item.width} h={item.height} d={item.depth} tints={tints} />
}

const CHAIR = wabi('dining-chair')

/** Dining set: the modelled table plus modelled chairs around it (4 or 6). */
function DiningAsset({ item, def, tints }: { item: FurnitureItem; def: AssetDef; tints: Tints }) {
  const { width: w, depth: d } = item
  const chairs = Number(option(item, 'chairs'))
  const seats: { x: number; z: number; rot: number }[] = []
  if (isRound(item)) {
    for (let i = 0; i < chairs; i++) {
      const a = (i / chairs) * Math.PI * 2
      const r = w / 2 + 0.12
      seats.push({ x: Math.sin(a) * r, z: Math.cos(a) * r, rot: a + Math.PI })
    }
  } else {
    const perSide = chairs / 2
    for (let i = 0; i < perSide; i++) {
      const x = -w / 2 + (w * (i + 0.5)) / perSide
      seats.push({ x, z: d / 2 + 0.16, rot: Math.PI }, { x, z: -d / 2 - 0.16, rot: 0 })
    }
  }
  return (
    <group>
      <FittedAsset def={def} w={w} h={item.height} d={d} tints={tints} />
      {seats.map((s, i) => (
        <group key={i} position={[s.x, 0, s.z]} rotation-y={s.rot}>
          <FittedAsset def={CHAIR} w={0.46} h={0.8} d={0.53} tints={tints} />
        </group>
      ))}
    </group>
  )
}

/** Shows the procedural model while a model loads, and keeps it if the file can't be loaded. */
export function WithFallback({ fallback, children }: { fallback: ReactNode; children: ReactNode }) {
  return (
    <AssetBoundary fallback={fallback}>
      <Suspense fallback={fallback}>{children}</Suspense>
    </AssetBoundary>
  )
}

class AssetBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}
