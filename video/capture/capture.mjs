// Records the "one take" footage for the Redhill Peaks film from the real app.
//
// The app runs in headless Chrome on the GPU. Its 3D view is stepped one frame at a time
// (R3F frameloop "never" + advance), the camera follows a scripted path, and the mouse makes
// real clicks on the real controls, so every frame is the product as it actually behaves.
//
//   npm run dev              (in the repo root, serves http://localhost:5173)
//   node capture.mjs         full take  -> ../assets/footage/app-take.mp4 + ../assets/footage/take.js
//   node capture.mjs --stills 0,5,12   only those footage seconds, as JPEGs in ./stills
//
// Footage time F starts when the film dissolves from the paper plan (film time = F + 3.0).

import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import puppeteer from 'puppeteer-core'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = 'http://localhost:5173/'
const FPS = 30
const DURATION = 37.4
const OUT_DIR = '../assets/footage'

const args = process.argv.slice(2)
const stillsArg = args.includes('--stills') ? args[args.indexOf('--stills') + 1] : null
const stills = stillsArg ? stillsArg.split(',').map(Number) : null

// ---------------------------------------------------------------- easing and maths
const clamp01 = (x) => Math.max(0, Math.min(1, x))
const smooth = (x) => {
  x = clamp01(x)
  return x * x * x * (x * (x * 6 - 15) + 10) // smootherstep
}
const lerp = (a, b, k) => a + (b - a) * k
const lerpArr = (a, b, k) => a.map((v, i) => lerp(v, b[i], k))
const DEG = Math.PI / 180

// Plan metres -> world (the flat is centred on the origin; north, plan y = 0, is world -z).
const OFFSET = [5.85, 4.45]
const world = (px, py, h = 0) => [px - OFFSET[0], h, py - OFFSET[1]]

// ---------------------------------------------------------------- camera
// Orbit poses: target (world), radius, polar (from straight down... i.e. from +y), azimuth (from +z towards +x), fov.
const orbit = (o) => {
  const sp = Math.sin(o.polar * DEG)
  const pos = [
    o.target[0] + o.radius * sp * Math.sin(o.azimuth * DEG),
    o.target[1] + o.radius * Math.cos(o.polar * DEG),
    o.target[2] + o.radius * sp * Math.cos(o.azimuth * DEG),
  ]
  return { pos, look: o.target, fov: o.fov }
}
const mixOrbit = (a, b, k) => ({
  target: lerpArr(a.target, b.target, k),
  radius: lerp(a.radius, b.radius, k),
  polar: lerp(a.polar, b.polar, k),
  azimuth: lerp(a.azimuth, b.azimuth, k),
  fov: lerp(a.fov, b.fov, k),
})

const TOP = { target: [0, 0, 0], radius: 74, polar: 0.05, azimuth: 0, fov: 12 }
const TOP_END = { ...TOP, radius: 71 }
const A = { target: [0, 0, 0], radius: 20.5, polar: 50.6, azimuth: 34.7, fov: 38 }
const B = { target: [-0.9, 0, -0.5], radius: 18.2, polar: 48, azimuth: 24, fov: 38 }
const C = { target: [-2.4, 0, -1.0], radius: 12.5, polar: 52, azimuth: 30, fov: 38 }

// From top-down to the 3/4 view: keep the flat about the same size while the lens widens,
// so the walls seem to rise out of the drawing.
function tilt(k) {
  const e = smooth(k)
  const fov = lerp(TOP_END.fov, A.fov, e)
  const size = lerp(TOP_END.radius * Math.tan((TOP_END.fov / 2) * DEG), A.radius * Math.tan((A.fov / 2) * DEG), e)
  return { target: [0, 0, 0], radius: size / Math.tan((fov / 2) * DEG), polar: lerp(TOP_END.polar, A.polar, e), azimuth: lerp(TOP_END.azimuth, A.azimuth, e), fov }
}

// Walkthrough: plan position, yaw (0 = facing north, -90° = east), pitch, at footage times.
const EYE = 1.6
const WALK = [
  { t: 23.0, p: [1.1, 4.12], yaw: -25, pitch: -6 },
  { t: 24.6, p: [1.45, 4.02], yaw: -42, pitch: -5 },
  { t: 25.8, p: [2.6, 3.97], yaw: -86, pitch: -4 },
  { t: 29.4, p: [8.0, 3.97], yaw: -90, pitch: -4 },
  { t: 29.95, p: [9.0, 3.97], yaw: -62, pitch: -5 },
  { t: 30.75, p: [9.6, 3.9], yaw: 4, pitch: -7 },
  { t: 32.0, p: [9.9, 3.85], yaw: 22, pitch: -9 },
]
// Catmull-Rom through the keys, easing in at the first and out at the last, so the walk never stops mid-way.
const cr = (p0, p1, p2, p3, u) => {
  const u2 = u * u
  const u3 = u2 * u
  return 0.5 * (2 * p1 + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u2 + (-p0 + 3 * p1 - 3 * p2 + p3) * u3)
}
function walkPose(t) {
  const n = WALK.length
  if (t <= WALK[0].t) return { ...WALK[0] }
  if (t >= WALK[n - 1].t) return { ...WALK[n - 1] }
  const i = WALK.findIndex((k) => k.t > t) - 1
  let u = (t - WALK[i].t) / (WALK[i + 1].t - WALK[i].t)
  // v²(2 − v): zero speed at one end, unit speed at the other.
  if (i === 0) u = u * u * (2 - u)
  if (i === n - 2) u = 1 - (1 - u) * (1 - u) * (1 + u)
  const k = (j) => WALK[Math.max(0, Math.min(n - 1, j))]
  const val = (f) => cr(f(k(i - 1)), f(k(i)), f(k(i + 1)), f(k(i + 2)), u)
  return { p: [val((w) => w.p[0]), val((w) => w.p[1])], yaw: val((w) => w.yaw), pitch: val((w) => w.pitch) }
}
const walkCam = (w) => {
  const pos = world(w.p[0], w.p[1], EYE)
  const yaw = w.yaw * DEG
  const pitch = w.pitch * DEG
  const dir = [-Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch)]
  return { pos, look: [pos[0] + dir[0] * 4, pos[1] + dir[1] * 4, pos[2] + dir[2] * 4], fov: 70 }
}

function cameraAt(F) {
  if (F < 1.0) return orbit(mixOrbit(TOP, TOP_END, smooth(F / 1.0)))
  if (F < 3.8) return orbit(tilt((F - 1.0) / 2.8))
  if (F < 13.8) return orbit(mixOrbit(A, B, smooth((F - 3.8) / 10.0)))
  if (F < 20.85) return orbit(mixOrbit(B, C, smooth((F - 13.8) / 7.05)))
  if (F < 23.0) {
    // Dive from the overview to eye height in the living room.
    // Glide over the living room, then sink straight down through the (one-sided) ceiling to eye height.
    const k = (F - 20.85) / 2.15
    const from = orbit(C)
    const to = walkCam(walkPose(23.0))
    // Over the open floor north-east of the standing spot, clear of the shelter wall behind it.
    const over = [to.pos[0] + 0.3, 4.6, to.pos[2] - 0.55]
    const overLook = [to.look[0], 0.2, to.look[2]]
    if (k < 0.5) {
      const e = smooth(k / 0.5)
      return { pos: lerpArr(from.pos, over, e), look: lerpArr(from.look, overLook, e), fov: lerp(from.fov, 52, e) }
    }
    const e = smooth((k - 0.5) / 0.5)
    return { pos: lerpArr(over, to.pos, e), look: lerpArr(overLook, to.look, e), fov: lerp(52, to.fov, e) }
  }
  return walkCam(walkPose(F))
}

// ---------------------------------------------------------------- mouse script
// Targets resolve in the page: a CSS selector, text on a button, or a plan point in 3D.
const T = {
  structural: { text: 'Structural', within: 'button', minY: 950 },
  hack: { selector: 'button[title="Hack walls (H)"]' },
  build: { selector: 'button[title="Build new walls (B)"]' },
  glass: { text: 'Glass', within: 'button' },
  layoutsTab: { selector: 'button[title="Layouts"]' },
  couple: { text: 'Couple working from home', within: 'button', card: true },
  japandi: { text: 'Japandi', within: 'button', card: true },
  sun: { selector: 'button[title="Time of day and lighting"]' },
  walkthrough: { text: 'Walkthrough', within: 'button' },
  budget: { selector: 'button[title^="Project report"]' },
  hdbTab: { text: 'HDB checks', within: 'button' },
  wallMid: { plan: [3.05, 1.9, 1.4] },
  glassStart: { plan: [3.05, 0.0, 0] },
  glassEnd: { plan: [3.05, 3.4, 0] },
}
const SLIDER_FROM = 15
const SLIDER_TO = +(process.env.SUN_TO || 18.5)

// moves: arrive at `t` after travelling for `dur` seconds. clicks happen at their own times.
const MOVES = [
  { t: 0, dur: 0, to: { xy: [1980, 1150] } }, // parked off-screen
  { t: 5.2, dur: 1.2, to: T.structural },
  { t: 6.5, dur: 0.7, to: T.hack },
  { t: 7.4, dur: 0.7, to: T.wallMid },
  { t: 9.1, dur: 0.8, to: T.build },
  { t: 9.8, dur: 0.5, to: T.glass },
  { t: 10.6, dur: 0.6, to: T.glassStart },
  { t: 11.3, dur: 0.55, to: T.glassEnd },
  { t: 12.3, dur: 0.7, to: T.structural },
  { t: 13.2, dur: 0.7, to: T.layoutsTab },
  { t: 13.9, dur: 0.55, to: T.couple },
  { t: 15.4, dur: 1.0, to: T.japandi },
  { t: 17.0, dur: 1.0, to: T.sun },
  { t: 17.7, dur: 0.5, to: { slider: SLIDER_FROM } },
  { t: 20.0, dur: 2.0, to: { slider: SLIDER_TO }, ease: 'inout' },
  { t: 20.75, dur: 0.55, to: T.walkthrough },
  { t: 21.6, dur: 0.6, to: { xy: [1200, 140] } },
  { t: 33.4, dur: 0.9, to: T.budget },
  { t: 35.4, dur: 0.8, to: T.hdbTab },
  { t: 37.2, dur: 1.2, to: { xy: [1150, 640] } },
]

// Actions: real clicks where a person would click; `fallback` covers 3D clicks the app may not register headless.
const ACTIONS = [
  { t: 5.3, click: true, label: 'structural' },
  { t: 6.6, click: true, label: 'hack-tool' },
  { t: 7.9, click: true, label: 'hack-wall', settle: 300, after: 'ensureHack' },
  { t: 9.2, click: true, label: 'build-tool' },
  { t: 9.9, click: true, label: 'glass' },
  { t: 10.7, click: true, label: 'glass-start' },
  { t: 11.4, click: true, label: 'glass-end' },
  { t: 11.75, key: 'Escape', label: 'build-done', after: 'ensureGlass' },
  { t: 12.0, key: 'Escape', label: 'tool-off' },
  { t: 12.4, click: true, label: 'structural-off', after: 'ensureStructuralOff' },
  { t: 13.3, click: true, label: 'layouts-tab' },
  { t: 14.0, click: true, label: 'scheme', settle: 1500 },
  { t: 15.5, click: true, label: 'japandi', settle: 2500 },
  { t: 17.1, click: true, label: 'sun' },
  { t: 17.75, down: true, label: 'slider-grab' },
  { t: 20.05, up: true, label: 'slider-drop' },
  { t: 20.25, key: 'Escape', label: 'sun-close' },
  { t: 20.85, click: true, label: 'walkthrough', settle: 800 },
  { t: 33.5, click: true, label: 'report', settle: 800 },
  { t: 35.5, click: true, label: 'hdb', settle: 500 },
]

// Where the cursor is drawn in the film (hidden over the paper plan and inside the walkthrough).
const CURSOR_VISIBLE = [
  [4.3, 21.5],
  [32.7, 37.4],
]

// ---------------------------------------------------------------- browser
const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--window-size=1920,1080', '--hide-scrollbars'],
  defaultViewport: { width: 1920, height: 1080, deviceScaleFactor: 2 },
})
const page = await browser.newPage()
page.on('pageerror', (e) => console.log('pageerror', e.message))
await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }])
await page.goto(URL, { waitUntil: 'networkidle0' })
await page.waitForFunction(() => document.querySelector('canvas'), { timeout: 60000 })
await new Promise((r) => setTimeout(r, 3000))

const idle = () => page.waitForNetworkIdle({ idleTime: 400, timeout: 8000 }).catch(() => {})

// Load every texture and shader the take needs, then put the flat back to bare.
await page.evaluate(async (quality) => {
  const app = (await import('/src/store/useAppStore.ts')).useAppStore
  const design = (await import('/src/store/useDesignStore.ts')).useDesignStore
  const plan = (await import('/src/store/usePlanStore.ts')).usePlanStore
  const { applyScheme } = await import('/src/lib/layouts.ts')
  const { applyStyle } = await import('/src/lib/styles.ts')
  const layoutsData = await import('/src/data/layouts.ts')
  const stylesData = await import('/src/data/styles.ts')
  const schemes = Object.values(layoutsData).find((v) => Array.isArray(v) && v.some((s) => s?.id === 'couple'))
  const styles = Object.values(stylesData).find((v) => Array.isArray(v) && v.some((s) => s?.id === 'japandi'))
  const wait = (ms) => new Promise((r) => setTimeout(r, ms))
  app.setState({ quality, theme: 'light', showLabels: false })
  design.getState().edit((d) => ({ ...d, items: applyScheme(d.items, schemes.find((s) => s.id === 'couple')) }))
  await wait(1500)
  design.getState().edit((d) => applyStyle(d, plan.getState().plan, styles.find((s) => s.id === 'japandi')))
  await wait(2500)
  app.getState().setSun({ hour: 19.25 })
  await wait(1200)
  app.getState().setMode('walk')
  await wait(2000)
  app.getState().setMode('orbit')
  app.getState().openReport('budget')
  await wait(800)
  app.getState().openReport('hdb')
  await wait(800)
  app.getState().openReport(null)
  const { EMPTY_DESIGN } = await import('/src/store/useDesignStore.ts')
  design.setState({ design: EMPTY_DESIGN, past: [], future: [] })
  app.setState({ sun: { hour: 15, date: 'today', north: 0 }, lights: 'auto', leftTab: 'rooms', showStructural: false })
  app.getState().clearSelection()
  await wait(1500)
}, process.env.QUALITY || 'high')
await idle()

// Take over the clock and the camera.
await page.evaluate(async () => {
  const { sceneBridge } = await import('/src/features/scene/sceneBridge.ts')
  const st = sceneBridge.getState()
  const real = performance.now.bind(performance)
  let virt = null
  performance.now = () => (virt === null ? real() : (virt += 0.0001))
  window.__setVirt = (ms) => (virt = ms)
  window.__cam = null
  const store = st.internal.subscribers[0].store
  const ref = {
    current: (state) => {
      const c = window.__cam
      if (!c) return
      const cam = state.camera
      cam.position.set(c.pos[0], c.pos[1], c.pos[2])
      cam.up.set(0, 1, 0)
      cam.lookAt(c.look[0], c.look[1], c.look[2])
      if (Math.abs(cam.fov - c.fov) > 1e-4) {
        cam.fov = c.fov
        cam.updateProjectionMatrix()
      }
      cam.updateMatrixWorld()
    },
  }
  st.internal.subscribe(ref, 0.5, store)
  st.setFrameloop('never')

  // Screen position (CSS px) of a plan point, with the camera as last rendered.
  window.__project = (px, py, h) => {
    const cam = sceneBridge.camera
    const v = cam.position.clone().set(px - sceneBridge.offset[0], h, py - sceneBridge.offset[1]).project(cam)
    const r = sceneBridge.canvas.getBoundingClientRect()
    return [r.left + ((v.x + 1) / 2) * r.width, r.top + ((1 - v.y) / 2) * r.height]
  }
  window.__find = (t) => {
    if (t.selector) {
      const el = document.querySelector(t.selector)
      if (!el) return null
      const b = el.getBoundingClientRect()
      return [b.left + b.width / 2, b.top + b.height / 2]
    }
    const all = [...document.querySelectorAll(t.within || '*')].filter((e) => e.offsetParent && (!t.minY || e.getBoundingClientRect().top > t.minY))
    const exact = all.filter((e) => e.textContent.trim() === t.text)
    const els = exact.length ? exact : all.filter((e) => e.textContent.trim().startsWith(t.text))
    // The innermost match is the control itself.
    const el = els.sort((a, b) => a.textContent.length - b.textContent.length)[0]
    if (!el) return null
    const b = el.getBoundingClientRect()
    // Cards: aim at the title line, not the middle of the card.
    return t.card ? [b.left + Math.min(110, b.width / 2), b.top + Math.min(34, b.height / 2)] : [b.left + b.width / 2, b.top + b.height / 2]
  }
  window.__slider = (hour) => {
    const el = document.querySelector('input[aria-label="Time of day"]')
    if (!el) return null
    const b = el.getBoundingClientRect()
    const min = +el.min
    const max = +el.max
    const thumb = 16
    return [b.left + thumb / 2 + ((hour - min) / (max - min)) * (b.width - thumb), b.top + b.height / 2]
  }
  window.__step = async (seconds, frame) => {
    // "High" quality (Ultra's soft shadows leave see-through ghost rectangles at a low sun), at the full 2x canvas.
    if (sceneBridge.getState().viewport.dpr !== 2) sceneBridge.getState().setDpr(2)
    window.__setVirt(1e6 + frame * (1000 / 60))
    await new Promise((r) => requestAnimationFrame(() => r()))
    sceneBridge.getState().advance(seconds)
  }
})

async function resolve(target) {
  if (target.xy) return target.xy
  if (target.plan) return page.evaluate((p) => window.__project(p[0], p[1], p[2]), target.plan)
  if (target.slider !== undefined) return page.evaluate((h) => window.__slider(h), target.slider)
  return page.evaluate((t) => window.__find(t), target)
}

// ---------------------------------------------------------------- run
mkdirSync(OUT_DIR, { recursive: true })
mkdirSync('stills', { recursive: true })
let ffmpeg = null
if (!stills) {
  ffmpeg = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '15', '-pix_fmt', 'yuv420p', '-g', '15', '-movflags', '+faststart', `${OUT_DIR}/app-take.mp4`], { stdio: ['pipe', 'inherit', 'inherit'] })
}

const total = Math.round(DURATION * FPS)
const wanted = stills ? new Set(stills.map((s) => Math.round(s * FPS))) : null
const last = stills ? Math.max(...wanted) : total - 1
const track = []
const events = []
let mouse = [1980, 1150]
let moveIdx = -1
let moveFrom = mouse
let actionIdx = 0
let pressed = false
let sunHour = SLIDER_FROM
let corners = null
const t0 = Date.now()

for (let f = 0; f <= last; f++) {
  const F = f / FPS

  // Mouse: which move is active?
  while (moveIdx + 1 < MOVES.length && F >= MOVES[moveIdx + 1].t - MOVES[moveIdx + 1].dur) {
    moveIdx++
    moveFrom = mouse
  }
  const mv = MOVES[moveIdx]
  if (mv) {
    const to = await resolve(mv.to)
    if (to) {
      const k = mv.dur ? clamp01((F - (mv.t - mv.dur)) / mv.dur) : 1
      const e = mv.ease === 'inout' ? smooth(k) : 1 - Math.pow(1 - k, 3)
      mouse = [lerp(moveFrom[0], to[0], e), lerp(moveFrom[1], to[1], e)]
    }
  }
  await page.mouse.move(mouse[0], mouse[1])

  // The sun follows the slider while it's held.
  if (pressed) {
    const s = MOVES.find((m) => m.to.slider === SLIDER_TO)
    sunHour = lerp(SLIDER_FROM, SLIDER_TO, smooth((F - (s.t - s.dur)) / s.dur))
  }

  while (actionIdx < ACTIONS.length && F >= ACTIONS[actionIdx].t) {
    const a = ACTIONS[actionIdx++]
    if (a.click) {
      await page.mouse.down()
      await page.mouse.up()
    }
    if (a.down) {
      await page.mouse.down()
      pressed = true
    }
    if (a.up) {
      await page.mouse.up()
      pressed = false
    }
    if (a.key) await page.keyboard.press(a.key)
    if (a.after === 'ensureHack') {
      const n = await page.evaluate(async () => {
        const { useDesignStore } = await import('/src/store/useDesignStore.ts')
        const hacks = useDesignStore.getState().design.renovation.hacks
        if (!hacks.length) {
          const { addHack } = await import('/src/features/renovation/renoActions.ts')
          addHack('bed3-w', 0, 3.4)
          return 'fallback'
        }
        return hacks.length
      })
      console.log('hack:', n)
    }
    if (a.after === 'ensureStructuralOff') {
      const was = await page.evaluate(async () => {
        const { useAppStore } = await import('/src/store/useAppStore.ts')
        const on = useAppStore.getState().showStructural
        if (on) useAppStore.setState({ showStructural: false })
        return on
      })
      console.log('structural was still on after click:', was)
    }
    if (a.after === 'ensureGlass') {
      const n = await page.evaluate(async () => {
        const { useDesignStore } = await import('/src/store/useDesignStore.ts')
        const walls = useDesignStore.getState().design.renovation.walls
        if (!walls.length) {
          const { addBuiltWall } = await import('/src/features/renovation/renoActions.ts')
          addBuiltWall({ start: [3.05, 0], end: [3.05, 3.4], thickness: 0.06, built: 'glass' })
          return 'fallback'
        }
        return walls.map((w) => `${w.built} ${w.start}->${w.end}`).join('; ')
      })
      console.log('glass:', n)
    }
    if (a.settle) {
      await new Promise((r) => setTimeout(r, a.settle))
      await idle()
    }
    events.push({ t: +F.toFixed(3), label: a.label, x: Math.round(mouse[0]), y: Math.round(mouse[1]), click: !!a.click || !!a.down })
  }
  if (pressed) {
    // Real drag on the range input drives the store; keep the hour exact for a smooth sweep.
    await page.evaluate(async (h) => {
      const { useAppStore } = await import('/src/store/useAppStore.ts')
      useAppStore.getState().setSun({ hour: h })
    }, sunHour)
  }

  const cam = cameraAt(F)
  await page.evaluate((c) => (window.__cam = c), cam)
  await new Promise((r) => setTimeout(r, 0))
  await page.evaluate((s, fr) => window.__step(s, fr), 100 + F, f)

  if (f === 0) corners = await page.evaluate(() => ({ nw: window.__project(0, 0, 0), se: window.__project(11.7, 8.9, 0) }))

  const visible = CURSOR_VISIBLE.some(([a, b]) => F >= a && F < b)
  track.push([Math.round(mouse[0] * 10) / 10, Math.round(mouse[1] * 10) / 10, visible ? 1 : 0, pressed ? 1 : 0])

  if (stills) {
    if (wanted.has(f)) await page.screenshot({ path: `stills/F${F.toFixed(2)}.jpg`, type: 'jpeg', quality: 88 })
  } else {
    const buf = await page.screenshot({ type: 'jpeg', quality: 94 })
    if (!ffmpeg.stdin.write(buf)) await new Promise((r) => ffmpeg.stdin.once('drain', r))
  }
  if (f % 60 === 0) console.log(`frame ${f}/${last} F=${F.toFixed(1)}s  ${((Date.now() - t0) / (f + 1)).toFixed(0)} ms/frame`)
}

console.log('corners', JSON.stringify(corners))
if (!stills) {
  ffmpeg.stdin.end()
  await new Promise((r) => ffmpeg.on('close', r))
  // `corners`: where plan points (0,0) and (11.7,8.9) sat on screen in the first frame, so the paper plan can be matched to it.
  writeFileSync(`${OUT_DIR}/take.js`, `// Generated by capture/capture.mjs. Cursor track per frame: [x, y, visible, pressed] in 1920x1080 page px.\nwindow.__take = ${JSON.stringify({ fps: FPS, duration: DURATION, corners, events, track })};\n`)
}
console.log('events', JSON.stringify(events))
await browser.close()
