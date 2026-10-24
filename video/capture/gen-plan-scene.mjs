// Writes ../compositions/plan.html: the scanned HDB plan with the app's traced walls drawn over it in pencil.
// Wall coordinates are the app's own trace (src/data/redhillPeaks.ts), placed with the same calibration the app
// uses for its underlay, so they land on the drawing's walls and on the 3D walls the film dissolves into.
import { writeFileSync } from 'node:fs'

// Where plan metres land in the film frame at the dissolve, from the take's first frame
// (corners nw/se in page px, then the take scene's opening 1.6x punch-in about the centre).
const NW = [553.861, 231.057]
const SE = [1366.182, 848.976]
const S0 = 1.6
const k = ((SE[0] - NW[0]) / 11.7) * S0
const X0 = 960 + (NW[0] - 960) * S0
const Y0 = 540 + (NW[1] - 540) * S0
const px = (x) => +(X0 + x * k).toFixed(1)
const py = (y) => +(Y0 + y * k).toFixed(1)

// The app's underlay calibration for this drawing.
const U = { x: -2.035, y: -0.763, w: 14.893, h: 10.493 }

// Drawn in the order a hand would trace: the outline clockwise, then the rooms inside.
const walls = [
  ['facade-n', [0, 0], [11.7, 0]],
  ['wall-e', [11.7, 0], [11.7, 6.45]],
  ['ledge-e', [11.7, 6.45], [11.7, 7.7]],
  ['ledge-s', [11.7, 7.7], [8.75, 7.7]],
  ['sy-e', [8.75, 6.45], [8.75, 8.9]],
  ['kitchen-s', [8.75, 8.9], [3.6, 8.9]],
  ['kitchen-w', [3.6, 8.9], [3.6, 6.1]],
  ['entry', [3.6, 7.4], [1.85, 7.4]],
  ['hs-s', [1.85, 7.4], [0, 7.4]],
  ['hs-w', [0, 7.4], [0, 4.55]],
  ['facade-w', [0, 4.55], [0, 1.7]],
  ['col-w', [0, 1.7], [0, 0]],
  ['bed3-w', [3.05, 0], [3.05, 3.4]],
  ['bed23', [5.8, 0], [5.8, 3.4]],
  ['bed2-e', [8.6, 0], [8.6, 3.4]],
  ['bed3-s', [3.05, 3.4], [5.8, 3.4]],
  ['bed2-s', [5.8, 3.4], [8.6, 3.4]],
  ['master-w', [8.6, 3.4], [8.6, 4.55]],
  ['bath-n', [7.05, 4.55], [11.7, 4.55]],
  ['bath-mid', [9.05, 4.55], [9.05, 6.45]],
  ['bath2-w', [6.85, 4.55], [6.85, 6.45]],
  ['bath-s', [7.05, 6.45], [11.7, 6.45]],
  ['sy-w', [6.65, 6.45], [6.65, 8.9]],
  ['kitchen-beam', [3.6, 6.1], [6.85, 6.1]],
  ['hs-n', [0, 4.55], [1.85, 4.55]],
  ['hs-e', [1.85, 4.55], [1.85, 7.4]],
]

const lines = walls
  .map(([id, a, b]) => {
    const len = Math.hypot(px(b[0]) - px(a[0]), py(b[1]) - py(a[1]))
    return `        <line id="tr-${id}" class="trace" x1="${px(a[0])}" y1="${py(a[1])}" x2="${px(b[0])}" y2="${py(b[1])}" stroke-dasharray="${len.toFixed(1)}" stroke-dashoffset="${len.toFixed(1)}" data-len="${len.toFixed(1)}" />`
  })
  .join('\n')

const img = { left: px(U.x), top: py(U.y), width: +(U.w * k).toFixed(1), height: +(U.h * k).toFixed(1) }

const html = `<template>
  <style>
    #root {
      position: absolute;
      inset: 0;
      overflow: hidden;
      background: var(--paper, #f2f1ee);
      font-family: Inter, sans-serif;
    }
    #plan-paper {
      position: absolute;
      inset: 0;
      transform-origin: 960px 540px;
    }
    #plan-scan {
      position: absolute;
      left: ${img.left}px;
      top: ${img.top}px;
      width: ${img.width}px;
      height: ${img.height}px;
    }
    #plan-trace {
      position: absolute;
      inset: 0;
      width: 1920px;
      height: 1080px;
      overflow: visible;
    }
    .trace {
      stroke: var(--accent, #be6c3c);
      stroke-width: 5;
      stroke-linecap: round;
      fill: none;
    }
    #plan-chip {
      position: absolute;
      left: 96px;
      top: 884px;
      padding: 18px 26px 20px;
      background: #ffffff;
      border-radius: 14px;
      box-shadow: 0 10px 30px rgba(24, 26, 29, 0.14);
      color: var(--ink, #181a1d);
    }
    #plan-chip-kicker {
      font-size: 28px;
      font-weight: 500;
      color: #6c7179;
      letter-spacing: -0.01em;
    }
    #plan-chip-text {
      font-size: 40px;
      font-weight: 600;
      letter-spacing: -0.02em;
      margin-top: 2px;
    }
  </style>
  <div id="root" data-composition-id="plan" data-width="1920" data-height="1080">
    <div id="plan-paper">
      <img id="plan-scan" src="assets/plan/redhill-peaks-4rm-type1h.jpg" alt="HDB unit plan, 4-Room Type 1(H), Blk 147A Redhill Peaks" />
      <svg id="plan-trace" viewBox="0 0 1920 1080">
${lines}
      </svg>
    </div>
    <div id="plan-chip">
      <div id="plan-chip-kicker" data-var-text="chipKicker">Blk 147A Redhill Peaks · 4-Room</div>
      <div id="plan-chip-text" data-var-text="chipText">Key collection in 21 days</div>
    </div>
  </div>
  <script>
    const tl = gsap.timeline({ paused: true });

    // Slow push onto the drawing, landing exactly where the 3D take picks it up.
    tl.fromTo("#plan-paper", { scale: 1.06 }, { scale: 1, duration: 3, ease: "power2.out" }, 0);

    // The chip: whole card blurs in, holds, blurs out before the dissolve.
    tl.fromTo("#plan-chip", { opacity: 0, filter: "blur(8px)" }, { opacity: 1, filter: "blur(0px)", duration: 0.2, ease: "expo.out" }, 0.35);
    tl.to("#plan-chip", { opacity: 0, filter: "blur(6px)", duration: 0.18, ease: "power2.in" }, 2.75);

    // Pencil: one wall after another at a hand's constant speed, each overlapping the last.
    document.querySelectorAll("#plan-trace .trace").forEach((el, i) => {
      const len = parseFloat(el.dataset.len);
      tl.fromTo(el, { attr: { "stroke-dashoffset": len } }, { attr: { "stroke-dashoffset": 0 }, duration: 0.12 + len / 3400, ease: "none" }, 0.45 + i * 0.08);
    });

    // Dissolve to the render underneath (the take starts at 3.0 s in the same place).
    tl.to("#plan-scan", { opacity: 0, duration: 0.9, ease: "power1.inOut" }, 3.0);
    tl.to("#root", { backgroundColor: "rgba(242,241,238,0)", duration: 0.9, ease: "power1.inOut" }, 3.0);
    tl.to("#plan-trace", { opacity: 0, duration: 0.6, ease: "power1.in" }, 3.35);

    window.__timelines["plan"] = tl;
  </script>
</template>
`
writeFileSync('../compositions/plan.html', html)
console.log('wrote plan.html', img, 'k', k.toFixed(3))
