# HyperFrames master prompt: Redhill Peaks Studio showcase film

Paste everything below the line into Claude Code, run from this repository's folder. Before you do, either start the app (`npm run dev`) or make sure the live site is up, because the film should be built from real screens.

---

Using `/hyperframes`, make a 40-second launch film (1920×1080, 30 fps) that showcases **Redhill Peaks Studio**, the browser-based 3D interior design studio in this repository. Read `README.md` first, and the code where you need to confirm a label. Every screen, button and number in the film must match the real app.

## What the product is

A 3D design studio for one real home: our Redhill Peaks BTO flat (Blk 147A, #48-171, 4-Room Type 1(H), about 90 m²). You start from the traced HDB floor plan, plan the renovation (hack and build walls), furnish every room, try materials and lighting, and then walk through the result in realistic 3D. The design then becomes a budget, a shopping list, an electrical plan and HDB rule checks to hand to a contractor. It all runs in the browser, with no account and no server, and saves itself on your device.

**The one idea the film must land:** a flat floor plan PDF becomes a home you can walk through and a renovation plan a contractor can quote from.

## Audience and tone

New HDB flat owners in Singapore who are about to renovate, plus people who are curious about the build. The tone is calm, warm and confident, like a good interior design studio, not a tech demo. Use Singapore context (S$, HDB, BTO) without explaining it.

## Source material (real UI only)

- The app runs at http://localhost:5173 (`npm run dev`), and the published site is https://weihaowh.github.io/RedhillPeaks/. Use `npx hyperframes capture` and walk the real flows to get screens. No sign-in is needed.
- The real floor plan image is `public/plans/redhill-peaks-4rm-type1h.png`.
- The UI font is Inter. Take colours from the app's own CSS in `src/`, in both light and dark themes.
- The app's own **Screenshot → 4K** button exports clean 3D renders with no selection outlines. Use it for hero shots of furnished rooms.
- If a beat needs a screen you can't capture, use a labelled placeholder (for example, "Screenshot: Walkthrough, living room at 6 pm") and list it in your reply. Never invent UI.

## Story beats (suggested; propose your own three storylines first, as the skill says)

1. **Hook (0–4 s):** The flat black-and-white HDB plan image fills the frame. The traced walls draw themselves over it, then the camera tilts up and the plan extrudes into the 3D Orbit model.
2. **Tension (4–8 s):** Real renovation questions: "Can this wall go? Will a queen bed fit? What will it cost?"
3. **Renovate (8–14 s):** Turn on **Structural** (terracotta walls that can't be hacked). Hover a wall to show red (hackable) and dark grey (refused), click to **Hack** it into a red ghost, then **Build** a glass partition for a study. Show the budget pill tick up in the top bar.
4. **Furnish and style (14–22 s):** Apply a whole-flat layout scheme ("Couple working from home"), then go through the **Start from a style** cards: Japandi, then Industrial, then Modern Luxe, each re-skinning the same room on a matched cut. Show one feature wall (fluted oak) and a cove-light ceiling.
5. **Light (22–27 s):** Drag the time-of-day slider so real Singapore sunlight moves across the living room floor, and the ceiling lights come on at sunset.
6. **Walk in (27–33 s):** Cut to **Walkthrough** at eye height (1.6 m) and walk from the living room into the main bedroom. This is the emotional peak, so let it breathe.
7. **Proof (33–37 s):** The Project report in quick cuts: the Budget tab against S$60k, the Electrical plan drawing with point codes, and HDB checks with green passes. Then **Compare**: two presets side by side, with both cameras moving together.
8. **End card (37–40 s):** The "Redhill Peaks Studio" wordmark, then "Plan it. Walk it. Build it." and the URL weihaowh.github.io/RedhillPeaks. Hold for 2–3 seconds.

## Craft notes

- Show the real UI at 1.6–2× size, punched in on the control being used. Use a large cursor whose click causes the next thing on the same frame. Never tilt the product UI in 3D, and never put a small window in an empty canvas.
- Prefer morphs and transitions that have a cause (the plan extrudes into 3D, the style card expands into the room) over plain cuts. Use 3–5 kinds of transition.
- Keep on-screen text short (no more than 6 words per card) and at least 26 px. Keep everything inside the title-safe area.
- Use soft, warm music (piano, light percussion) with gentle sound effects on clicks, wall hacks and the light switching on (`/media-use`). No voiceover or captions unless I ask.
- Check the registry (`/hyperframes-registry`) for title, transition and chart blocks before building them by hand.
- Avoid the clichés: no typing into a prompt box, no three-card feature list, no title over a dimmed screenshot, no logo docked in a corner.

## Deliverables

1. Three storylines in words, and wait for me to pick one.
2. `SPEC.md` for the chosen storyline, then the project in `video/`.
3. Run `npx hyperframes check` and a snapshot review, and open the preview for me to look at before rendering.
4. After I approve, render the MP4. Also offer a 20-second vertical (1080×1920) cut for social.

Small print to keep in the end card or the description: prices are indicative and the HDB checks are guidance only.
