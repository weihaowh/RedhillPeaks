# SPEC: Redhill Peaks Studio, "One take, plan to home"

GOAL:    a BTO owner sees their flat go from the paper HDB plan to a home they can walk through and a budget a contractor can quote from, and remembers "I could see my flat before the renovation started."
OUTPUT:  HyperFrames, 1920 x 1080, 30 fps
TIME:    43.6 s x 30 = 1308 frames. Music clock TBD (no music source yet; see Sound).

LOOK:    the product's own world, not a film look laid over it.
         ground: the app's warm off-white 3D stage #F6F3EE (sampled from the capture) and its canvas #ECEDEF; no texture, no grain, no vignette.
         ink #181A1D (the app's --ink); muted #6C7179.
         accent #BE6C3C (the app's --accent, its logo tile). It may appear only on: the pencil trace over the paper plan,
         one word in a title, the end-card mark. Nothing else is tinted.
         display: Inter 600, 64 px (5.9% of height), tracking -2%; quiet line Inter 500, 30 px, tracking -1%.
         end-card wordmark Inter 600 72 px; URL Inter 500 30 px.
         medium: real product UI captured at 2x (3840 x 2160) from the running app; the paper plan is the real scanned HDB brochure page.
         light and depth: the app's own at its High quality (AO, shadows; Ultra's soft shadows ghost at a low sun). Overlay titles sit on no card; where a title crosses busy 3D it gets a 0 0 24px rgba(246,243,238,.9) halo, nothing else.

OBJECTS: the HDB unit plan (scanned, dimension strings legible); the 3D flat (real render); the app's chrome (top bar, panels,
         bottom bar, budget pill, report); a macOS-style arrow cursor, black with a 2 px white edge, 46 px tall (4.3% of frame),
         drawn from a vector; the app's logo: rounded square #BE6C3C, radius 22%, white lucide "House" glyph at stroke 2.2.

MOTION:  enter: expo.out (titles 0.5 s per line, blur 8 -> 0 px); camera: power2.inOut 0.6-1.2 s; zoom-through: power3.in 0.8 s;
         exit: power2.in, 55% of the entrance; the cursor travels on the capture's own cubic ease-out (it is the real mouse path).
         Pencil trace: each wall a stroke-dashoffset draw, 0.18-0.45 s by length, 0.045 s stagger, linear inside each wall (a hand at constant speed).
         Springs: the end-card mark only, damping 0.8 (back.out(1.4)).

SHOTS (film time; F = footage time = film - 3.0):
  1  0.00-3.00  paper plan fills the frame, slow push 1.06 -> 1.00 (power2.out, 3 s). Chip "Key collection in 21 days" lands 0.35 s (blur in).
                Terracotta pencil traces every traced wall 0.45-2.85. Sound: pencil on paper. Hands off: the trace now sits exactly on the 3D walls below.
  2  3.00-4.00  dissolve paper -> footage (top-down 3D, matched to the paper within 1 px at floor level). Trace fades 3.4-4.0.
  3  4.00-6.60  the lens widens and tilts; walls rise out of the drawing (in-app camera). Our camera pulls 1.6 -> 1.0 (power2.inOut, 2.6 s), revealing the app around it. Sound: soft whoosh at 4.0.
  4  6.60-8.40  "Can this wall go?" (top-left of the stage, 64 px, the word "wall" in accent) while the cursor arrives. Holds 1.8 s.
  5  8.30-11.00 real clicks: Structural (terracotta = can't hack), Hack, the Bedroom 3 wall turns into a red ghost. Budget pill S$0 -> S$759.
  6  11.00-12.10 punch-in on the budget pill (1.0 -> 1.9, 0.5 s power2.inOut), hold 0.4 s, back by 12.1. Sound: pop on the number.
  7  12.10-15.50 Build -> Glass -> two clicks: a glass study wall where the brick one was. Structural off.
  8  15.50-18.60 Layouts -> "Couple working from home": the whole flat furnishes in one click. Japandi card: floors, paint and finishes change.
  9  19.60-23.10 sun chip, the time slider dragged from 3:00 pm to 6:30 pm: real Singapore light swings across the floors.
  10 23.85-26.00 cursor clicks Walkthrough; zoom through the stage (1.0 -> 1.5, power3.in 0.9 s) as the camera glides over the living room and sinks through the ceiling to eye height.
                "Now walk in." (centre, lower third) 24.6-26.2.
  11 26.00-35.00 PAYOFF: walkthrough at 1.6 m, living room -> corridor -> main bedroom at dusk, at walking speed. No titles. Sound: soft footsteps.
  12 35.10-36.10 pull back 1.5 -> 1.0 revealing the chrome; cursor clicks the budget pill (36.5); the Project report opens.
  13 36.80-38.30 punch-in on "Estimated total S$50,392 ... S$9,608 left (84% used)" (1.0 -> 1.55); back for the HDB checks tab click (38.5).
  14 38.80-40.40 HDB checks: one permit flag, the rest OK. Push 1.0 -> 1.3 on the list.
  15 39.70-43.60 END CARD: colour flood to #F6F3EE while the report shrinks 1 -> 0.6 with 6 px blur; the logo tile springs in (centre),
                 the House glyph draws, the wordmark wipes in beside it, "Plan it. Walk it. Build it." per word, URL under it.
                 Holds 2.4 s. Small print: "Prices indicative. HDB checks are guidance, not approval." 20 px muted.

BANNED:  dark void grounds; glow, bloom overlays, particles, lens flares; purple/blue gradients; glass cards; cream-paper-serif-mono look;
         every element fading and sliding up; titles moving after they land; three cards in a row; KPI grids; title over a dimmed screenshot;
         the logo docked in a corner; click rings or ripples around the cursor; any invented UI or number (every figure on screen comes from the capture).
QA:      0.2 (plan + chip legible), 2.8 (trace complete, on the walls), 3.5 (dissolve: paper and render aligned), 5.5 (walls rising),
         7.5 (question readable, not over the flat's walls), 11.6 (pill legible at 1.9x), 17.5 (furniture landed), 22.0 (dusk light),
         25.4 (zoom-through, no chrome), 29.0 (walk mid-corridor), 34.6 (bedroom hold), 37.6 (total legible), 40.0 (checks), 42.6 (end card).
