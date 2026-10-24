import puppeteer from 'puppeteer-core'
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new' })
const p = await b.newPage()
await p.goto('http://localhost:5173/', { waitUntil: 'networkidle0' })
console.log(await p.evaluate(async () => {
  const { LAYOUT_SCHEMES } = await import('/src/data/layouts.ts')
  const { applyScheme } = await import('/src/lib/layouts.ts')
  const { footprint } = await import('/src/lib/furnitureMath.ts')
  const items = applyScheme([], LAYOUT_SCHEMES.find((s) => s.id === 'couple'))
  const st = document.querySelector('button[title*="tructural"]')?.title
  const slider = document.querySelector('input[aria-label="Time of day"]')
  return 'structural title: ' + st + '\n' + items.map((i) => {
    const f = footprint(i); const xs = f.map((q) => q[0]); const ys = f.map((q) => q[1])
    return `${i.type.padEnd(22)} x ${Math.min(...xs).toFixed(2)}-${Math.max(...xs).toFixed(2)}  y ${Math.min(...ys).toFixed(2)}-${Math.max(...ys).toFixed(2)}`
  }).join('\n')
}))
await b.close()
