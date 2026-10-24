// Replaces single-frame brightness spikes in the take (a frame rendered mid shader-recompile when the
// ceiling lights switch on) with the frame before it. Run after capture.mjs; rewrites app-take.mp4 in place.
import { execFileSync } from 'node:child_process'
import { renameSync } from 'node:fs'

const SRC = '../assets/footage/app-take.mp4'
const log = execFileSync('ffmpeg', ['-loglevel', 'error', '-i', SRC, '-vf', 'scale=96:-1,signalstats,metadata=print:key=lavfi.signalstats.YAVG:file=-', '-f', 'null', '-'], { encoding: 'utf8', maxBuffer: 1 << 26 })
const y = [...log.matchAll(/YAVG=([0-9.]+)/g)].map((m) => +m[1])
const bad = []
for (let i = 1; i < y.length - 1; i++) {
  const a = y[i] - y[i - 1]
  const b = y[i] - y[i + 1]
  if ((a > 4 && b > 4) || (a < -4 && b < -4)) bad.push(i)
}
console.log('flicker frames:', bad.map((i) => `${i} (F=${(i / 30).toFixed(2)})`).join(', ') || 'none')
if (!bad.length) process.exit(0)
// Each bad frame takes the previous good one (a run of alternating spikes all take the frame before the run).
const filters = []
let label = '0:v'
bad.forEach((i, n) => {
  let r = i - 1
  while (bad.includes(r)) r--
  const out = `v${n}`
  filters.push(`[${label}][1:v]freezeframes=first=${i}:last=${i}:replace=${r}[${out}]`)
  label = out
})
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', SRC, '-i', SRC, '-filter_complex', filters.join(';'), '-map', `[${label}]`,
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '15', '-pix_fmt', 'yuv420p', '-g', '15', '-movflags', '+faststart', '../assets/footage/app-take.fixed.mp4'], { stdio: 'inherit' })
renameSync('../assets/footage/app-take.fixed.mp4', SRC)
console.log('patched', bad.length, 'frames')
