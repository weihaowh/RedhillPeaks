# REVIEW: Redhill Peaks Studio, "One take, plan to home"

44.3 s, 1920 x 1080, 30 fps. Storyline A from `STORYLINES.md`; the spec is `SPEC.md`.

## How it was made

- **Every product frame is the real app.** `capture/capture.mjs` runs the dev server's app in headless Chrome on the GPU, steps the 3D view one frame at a time (R3F `frameloop: never` + `advance`), flies the camera on a scripted path, and moves and clicks the real mouse on the real controls (Structural, Hack, Build, Glass, Layouts, the scheme card, Japandi, the sun slider, Walkthrough, the budget pill, HDB checks). It records 3840 x 2160 frames to `assets/footage/app-take.mp4` and the mouse path to `assets/footage/take.js`, which draws the film's cursor.
- Two 3D actions fall back to the app's own functions if a headless click does not register (`ensureHack`, `ensureGlass`). In the final take both clicks registered (`hack: 1`, `glass: glass 3.05,0->3.05,3.4` in `capture/capture.log`). Structural-off is guarded the same way.
- The paper plan is the scanned HDB plan from `public/plans/`. The pencil trace is the app's traced walls (`src/data/redhillPeaks.ts`), placed with the app's own underlay calibration and the take's first-frame projection, so it lands on the 3D walls at the dissolve.
- Every number on screen comes from the capture: S$759 after the hack, S$50,392 estimated against S$60,000 (84% used), and the HDB checks with one permit flag.
- The take is recorded at the app's **High** quality with the canvas forced to 2x. At Ultra, its soft shadows (PCSS) leave large see-through "ghost" rectangles over the walls at the low 6:30 pm sun, so the walkthrough looked like two layers of footage. No object in the scene is transparent there (checked by raycast); the artifact disappears at High.
- `capture/deflicker.mjs` replaces single-frame brightness spikes (a frame rendered while shaders recompile as the ceiling lights switch on) with the frame before.

## Creative calls

- The cursor is drawn from the recorded mouse path, not the OS cursor. Headless screenshots don't include one.
- Our camera punches into the footage only to hide chrome (opening, walkthrough) or to read a number (budget pill, report total). The flight itself is the app's own 3D camera.
- Titles kept to two ("Can this wall go?", "Now walk in.") plus the end card. Everything else is told by the UI acting.
- The light is 6:30 pm. At 7:00 pm the interior went sepia-flat; 6:30 keeps the sun on the floor with the lights on.
- Not built: B "The wall" (Compare view, split to one) and C "Same room, eight lives".

## Measured vs looked at

- Measured: `check` (lint, runtime, layout, contrast, craft) with 0 errors; flicker scan on every frame; SFX hit points (`hyperframes audio`) for placement.
- Looked at: QA frames from `SPEC.md`, the review sheets (beats, seams, phone), and the motion through the three hero moves.
- **Not checked: the sound has been measured, not heard.**

## Music and the final mix

- The bed is generated locally with MusicGen (`facebook/musicgen-medium`, fp16 on the RTX 3060 Ti): `capture/music.py` makes the soft felt-piano first half (seed 7, 26 s). `capture/music_b.py` tried six continuations of its last 8 s with a fuller strings-and-pads prompt. It kept seed 5, scored on loudness against the first half (−0.8 dB) and pitch-class match (0.92, same key). The packages live in `C:/Users/Public/redhill-musicgen/site` (pip `--target`), not in the repo.
- The bed builds through the renovation, holds back from about 22–27 s, and the full arrangement enters at 28.08 s in the file. The clip starts 2.08 s into the file, so that entrance lands at film 26.0 s, when the dive touches down and the walk begins.
- Final file `renders/redhill-peaks-studio.mp4`: 44.3 s, 1920 x 1080 30 fps H.264, AAC 256k stereo. Measured −15.0 LUFS integrated, −1.0 dBTP true peak, LRA 8.1 LU, no clipping.
- **The loudness step runs after the HyperFrames render** (two-pass ffmpeg `loudnorm`, linear, I −15, TP −1). The raw HyperFrames render measures about −23 LUFS. Re-run that step after any re-render.

## Weakest shot

The doorway into the main bedroom (about 32.6–33.2 s): for half a second at 70° the frame is mostly wall and door frame. With more time, I'd widen the doorway approach or enter from the corridor at an angle. Next is the end hand-off: the report softens under the end card's ground but barely shrinks before it's covered.

## Warnings kept on purpose

- `#end-small` is marked `data-layout-ignore`: the small print is 24 px by design (a disclaimer, not reading text).
- `#take-cam` allows overflow: the punch-ins scale the footage past the frame on purpose.
