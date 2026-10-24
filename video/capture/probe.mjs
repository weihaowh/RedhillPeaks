// Probe: can we step the app's 3D view frame by frame and grab 1920x1080 frames quickly?
import puppeteer from 'puppeteer-core'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--window-size=1920,1080'],
  defaultViewport: { width: 1920, height: 1080, deviceScaleFactor: 1 },
})
const page = await browser.newPage()
page.on('console', (m) => m.type() === 'error' && console.log('page error:', m.text()))
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0' })
await page.waitForFunction(() => document.querySelector('canvas'), { timeout: 60000 })
await new Promise((r) => setTimeout(r, 4000))
const info = await page.evaluate(async () => {
  const gl = document.querySelector('canvas').getContext('webgl2')
  const dbg = gl && gl.getExtension('WEBGL_debug_renderer_info')
  const { sceneBridge } = await import('/src/features/scene/sceneBridge.ts')
  const st = sceneBridge.getState()
  return { renderer: dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : 'n/a', dpr: st.viewport.dpr, size: st.size, subs: st.internal.subscribers.map((s) => s.priority) }
})
console.log(info)
const t0 = Date.now()
for (let i = 0; i < 10; i++) {
  await page.evaluate(async (i) => {
    const { sceneBridge } = await import('/src/features/scene/sceneBridge.ts')
    const st = sceneBridge.getState()
    st.setFrameloop('never')
    st.advance(10000 + i * 33.333)
  }, i)
  await page.screenshot({ path: `probe-${i}.jpg`, type: 'jpeg', quality: 92 })
}
console.log('ms per frame', (Date.now() - t0) / 10)
await browser.close()
