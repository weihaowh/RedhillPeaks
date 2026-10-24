# Redhill Peaks Studio

A 3D interior design studio for our Redhill Peaks BTO flat: **Blk 147A, unit #48-171, 4-Room Type 1(H), about 90 m²**.

Trace the HDB floor plan, plan the renovation (hack and build walls), furnish every room, try materials and lighting, then walk through the result in a realistic 3D view. Save versions as presets, compare them side by side, and get a budget, shopping list, electrical plan and HDB rule checks to hand to a contractor.

Everything runs in the browser. No account or server is needed, and your work is saved automatically on your device.

> **Planning aid only.** Prices are indicative mid-range Singapore figures, and the HDB checks are guidance based on common renovation rules. Always confirm with HDB's renovation guidelines, an HDB-registered contractor and a licensed electrician.

See [MASTER_PROMPT.md](MASTER_PROMPT.md) for the original brief and phase plan.

---

## Contents

1. [Quick start](#quick-start)
2. [The screen at a glance](#the-screen-at-a-glance)
3. [Views and camera controls](#views-and-camera-controls)
4. [Tracing and editing the floor plan](#tracing-and-editing-the-floor-plan)
5. [Renovation: building and hacking walls](#renovation-building-and-hacking-walls)
6. [Furniture](#furniture)
7. [Layout ideas](#layout-ideas)
8. [Materials, colours and styles](#materials-colours-and-styles)
9. [Electrical and lighting plan](#electrical-and-lighting-plan)
10. [Sunlight, lights, quality and screenshots](#sunlight-lights-quality-and-screenshots)
11. [Presets, autosave and comparing designs](#presets-autosave-and-comparing-designs)
12. [Project report](#project-report)
13. [Keyboard and mouse reference](#keyboard-and-mouse-reference)
14. [Where your work is saved](#where-your-work-is-saved)
15. [Tips and good practice](#tips-and-good-practice)
16. [Troubleshooting](#troubleshooting)
17. [For developers](#for-developers)

---

## Quick start

You need [Node.js](https://nodejs.org) 20 or newer.

```bash
npm install
```

```bash
npm run dev
```

Then open http://localhost:5173. The Redhill Peaks plan is already traced, so you can start designing straight away.

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server with hot reload at http://localhost:5173 |
| `npm run build` | Type-checks, then builds the site into `dist/` |
| `npm run preview` | Serves the built site at http://localhost:4173/RedhillPeaks/, just like GitHub Pages |
| `npm run typecheck` | Type-checks only |

### Publishing to GitHub Pages

The site deploys automatically from `.github/workflows/deploy.yml` on every push to `main`.

1. On GitHub, open the repository's **Settings → Pages** and set **Source** to **GitHub Actions** (one-time).
2. Push to `main`. The **Actions** tab shows the build. When it finishes, the site is live at **https://weihaowh.github.io/RedhillPeaks/**.
3. You can also re-run it by hand from **Actions → Deploy to GitHub Pages → Run workflow**.

The build uses the base path `/RedhillPeaks/` (set in `vite.config.ts`). If you rename the repository, change that path to match.

> Work you do on the published site is saved in *that* browser, separately from your local `localhost` copy. Use preset **Export** / **Import** to move designs between them (see [Presets](#presets-autosave-and-comparing-designs)).

---

## The screen at a glance

```
┌──────────────────────────── Top bar ─────────────────────────────┐
│ Logo · 2D Plan | 3D Orbit | Walkthrough · theme · budget · Save   │
├──────────────┬────────────────────────────────────┬──────────────┤
│ Left panel   │                                    │ Right panel  │
│ Rooms        │          2D plan or 3D view        │ Inspector for│
│ Library      │                                    │ whatever is  │
│ Layouts      │                                    │ selected, or │
│ Presets      │  Minimap (3D, bottom-left)         │ whole-flat   │
│ Electrical   │                                    │ design       │
├──────────────┴──────────── Bottom toolbar ─────────┴──────────────┤
│ 2D: drawing tools · 3D: view, camera, Build/Hack, sun, quality…   │
└───────────────────────────────────────────────────────────────────┘
```

### Top bar

| Control | What it does |
| --- | --- |
| **2D Plan / 3D Orbit / Walkthrough** | Switch views (see [Views](#views-and-camera-controls)). |
| Moon / sun icon | Light or dark theme. |
| **Budget pill** (e.g. `S$36.2k / 60k`) | Live estimate against your budget. Click to open the [Project report](#project-report). |
| **Saved / Saving…** | Autosave status. Your work saves automatically. |
| **Save preset** | Save the current design as a named preset (also **Ctrl+S**). |

### Left panel tabs

The active tab shows its name; the others show only an icon. Hover to see names. The panel-close button on the right of the tab row hides the panel; the button at the top-left brings it back.

| Tab | Use it for |
| --- | --- |
| **Rooms** | List of rooms with areas. Click to select and frame a room; hover to highlight it. |
| **Library** | Furniture catalogue: search, drag onto the plan or 3D view, or click **+**. |
| **Layouts** | Ready-made furniture layouts per room and for the whole flat. |
| **Presets** | Save, load, compare, import and export design versions. |
| **Electrical** | Pick lights, switches, sockets, aircon and data points; auto-suggest a full layout. |

### Right panel

Shows the inspector for whatever is selected: a room, wall, door/window, hacked wall, new wall, furniture piece or electrical point. With nothing selected it shows **whole-flat design** (base wall paint and the **Start from a style** cards), and in 2D also the **Floor plan drawing** settings. Close it with the **×** or by pressing **Esc**.

### Bottom toolbar

- **In 2D:** the drawing tools, undo/redo, tool options, **Fit to screen** and **Upload**.
- **In 3D:** undo/redo, **Labels**, **Structural**, **Full walls / Cutaway**, **Orbit / Fly** (desktop), **Build / Hack**, time of day, quality, screenshot, and **Reset camera**.

### Minimap (3D)

The small plan in the bottom-left corner shows where the camera is and which way it faces. **Click a room** on it to select the room and fly the camera there (in the walkthrough it moves you into that room).

---

## Views and camera controls

There are four ways to look at the flat. The 3D overview has two camera styles, and you can switch any time without losing your view.

### 2D Plan

A top-down drawing over the HDB plan. Use it for tracing, precise furniture placement, building/hacking walls and the electrical layout.

| Action | Mouse / trackpad | Touch |
| --- | --- | --- |
| Pan | Drag empty space | Drag with one finger |
| Zoom | Scroll wheel (zooms around the cursor) | Not supported (use **Fit to screen**) |
| Fit the whole plan | **Fit to screen** button | Same |
| Select | Click a room, wall, door/window, piece of furniture or electrical point | Tap |

### 3D Orbit (default)

Circle around the flat like a model on a table.

| Action | Mouse | Touch |
| --- | --- | --- |
| Rotate around | Left-drag | One-finger drag |
| Pan | Right-drag | Two-finger drag |
| Zoom | Scroll wheel | Pinch |
| Select a room | Click its floor (click again to deselect) | Tap |
| Select / move furniture | Click / drag the piece | Tap / drag |
| Frame a room | Select it (from the floor, Rooms tab or minimap) | Same |
| Reset | **Reset camera** button (↺) | Same |

The camera can't go below the floor, and stays between 1.5 m and 60 m from what it's looking at.

### 3D Fly (desktop, Unreal Engine style)

Choose **Fly** next to **Orbit** in the bottom bar. It only appears on devices with a mouse; phones and tablets keep Orbit. Fly moves the camera freely through the flat like the Unreal Engine editor viewport, while the **left button still selects** rooms and furniture.

| Action | Control |
| --- | --- |
| Look around | **Hold the right mouse button** and move the mouse (the cursor hides while you look) |
| Fly forward / back / left / right | Hold right mouse + **W / S / A / D** |
| Go down / up | Hold right mouse + **Q / E** |
| Move faster | Also hold **Shift** (2.5× speed) |
| Change flying speed | Hold right mouse + **scroll** (0.25–30 m/s, default 3 m/s; shown briefly on screen) |
| Move without holding | **Arrow keys** (forward/back/strafe), **Page Up / Page Down** (up/down) |
| Move forward/back in steps | Scroll wheel (without holding right mouse) |
| Pan | **Middle-drag** |
| Frame the selection | **F**: glides to the selected furniture piece or room |
| Select / drag furniture, select rooms | Left-click / left-drag, as normal |
| Back to the overview | **Reset camera** button |

Movement eases in and out, and you can fly through walls. The speed and the Orbit/Fly choice are remembered. A one-line hint explains the controls until you first look around.

Switching between Fly and Orbit keeps the exact same view: Orbit starts circling around whatever Fly was looking at.

### Walkthrough

Explore at eye height (1.6 m) as if you were standing in the flat. Ceilings and ceiling lights are shown, walls are always full height, and you can't walk through walls or floor furniture.

| Action | Desktop | Touch |
| --- | --- | --- |
| Look around | Left-drag | One-finger drag |
| Walk | **W A S D** or arrow keys | On-screen joystick (bottom-left) |
| Walk faster | Hold **Shift** (2×) | n/a |
| Walk to a spot | Click the floor | Tap the floor |
| Jump to a room | Click it on the minimap or in the Rooms tab | Same |
| Leave | **Esc** or **Exit** | **Exit** |

You start in the selected room (or the living room) facing the middle of the flat. The normal walking speed is a relaxed 1.4 m/s.

### Display options (3D)

| Control | What it does |
| --- | --- |
| **Labels** | Room name and area labels on the floors. |
| **Structural** | Colours structural walls (the black ones on the HDB plan) terracotta so you can see what can't be hacked. |
| **Full walls / Cutaway** | Cutaway trims walls to 1.1 m so you can see into every room from above. Ceiling details hide in cutaway. |

---

## Tracing and editing the floor plan

The Redhill Peaks plan comes pre-traced. You only need this section to fix the trace, adjust it, or start from a different floor plan.

All of this happens in **2D Plan**. Walls, doors, windows and rooms you change here form the **trace**: the flat as HDB hands it over. To plan renovation changes, use **Build** and **Hack** instead (see [Renovation](#renovation-building-and-hacking-walls)), which keep the original trace intact.

### Uploading a floor plan

1. Click **Upload** in the 2D toolbar (or **Upload floor plan** in the right panel).
2. Pick a **PNG, JPG, WebP or PDF**. For PDFs, the first page is used.
3. Choose **Start a new trace** (clears walls and rooms) or **Keep my trace** (only replaces the drawing underneath).
4. Adjust the drawing's visibility with the **Opacity** slider in the right panel (when nothing is selected).

The uploaded image is stored in your browser, so it's still there next time.

### Calibrating the scale (C)

Do this first on a new plan so everything is in real metres.

1. Pick **Calibrate** (C).
2. Click one end of a dimension you know, e.g. a wall marked *3050* on the drawing.
3. Click the other end.
4. Type the real length in millimetres and click **Apply scale**. Tick **Also rescale the walls and rooms already traced** if you've traced anything already.

### Drawing walls (W)

1. Pick **Wall** (W) and choose a thickness in the toolbar: **100, 150, 200 or 300 mm**.
2. Click to start, then click each corner. Walls snap to existing corners, 45° angles, other walls and a 50 mm grid. A live dimension label shows the length.
3. Finish by clicking the same point again, pressing **Enter**, or right-clicking. **Esc** cancels the current wall.
4. Hold **Alt** while clicking to turn snapping off.

### Doors (D) and windows (N)

1. Pick **Door** (D) or **Window** (N) and set the **Width** in the toolbar (default 900 mm for doors, 1,200 mm for windows).
2. Move over a wall. A preview shows where it goes; **red** means it would overlap another opening.
3. Click to place it. Doors get a standard 2.1 m height; windows a 900 mm sill and 1.35 m height.

Select a door or window to edit it in the right panel:

- Switch between **Door / Window / Opening** (a doorless gap).
- Set **Width**, **From wall start**, **Sill** and **Height**.
- For doors, **Flip hinge** and **Flip side** to change which way the leaf swings. The swing arc is drawn on the plan.
- Drag the highlighted opening along its wall with the Select tool.

### Rooms (R)

1. Pick **Room** (R) and click each corner of the room. It snaps to your wall corners.
2. Close it by clicking the first point or pressing **Enter**.
3. In the right panel, set the room's **Name** and **Type** (Living/Dining, Bedroom/Study, Kitchen, Bathroom, Service yard, Household shelter, Ledge/outdoor). The type drives floor suggestions, lighting suggestions and HDB checks.

### Editing with the Select tool (V)

| Selection | You can |
| --- | --- |
| **Wall** | Edit **Length**, **Thickness**, **Height**; mark **Structural** or **External**; see its doors/windows; drag the round handles at its ends to move corners (connected walls follow); hack it (see below). |
| **Room** | Rename, change type, drag its corner handles. |
| **Door / window** | See above. |

- **Delete** removes the selected item.
- **Ctrl+Z / Ctrl+Shift+Z** (or Ctrl+Y) undo and redo. The toolbar's undo buttons follow the same rules.
- **Restore the original Redhill Peaks trace** (right panel, nothing selected) puts the bundled trace back. It's undoable.

> **Undo has two histories.** The trace has its own; furniture, finishes, electrical and renovation share the design history. In 2D, undo acts on the design while you're using the Electrical, Build or Hack tool, or have a furniture piece, electrical point, new wall or hacked wall selected. Otherwise it acts on the trace.

---

## Renovation: building and hacking walls

Plan new walls and wall demolition ("hacking") on top of the traced flat. These changes are kept in your **design**, not the trace, so:

- the original flat is never lost: remove a hack and the wall comes back;
- they undo with **Ctrl+Z** and save with presets;
- the 3D view, furniture checks, electrical placement, budget and HDB checks all see the renovated flat.

Both tools work in **2D** (toolbar, or **B** / **H**) and in **3D Orbit/Fly** (bottom bar **Build** / **Hack**, or **B** / **H**). Press the button or key again, or **Esc**, to go back to selecting.

### Build new walls (B)

1. Choose the material in the toolbar:

   | Material | Thickness | Indicative cost | Good for |
   | --- | --- | --- | --- |
   | **Board** partition | 100 mm | S$95/m² | Quick, light, paintable dry walls. Not for wet areas. |
   | **Brick** wall | 130 mm | S$140/m² | Solid, quieter; use next to wet areas. |
   | **Glass** partition | 60 mm | S$450/m² | Clear glass in slim black frames, e.g. a glass-walled study. |

2. Click to start the wall, then click each corner. Points snap to existing walls and corners (and to a grid in 2D). Hold **Alt** to turn snapping off.
3. Finish with **Esc** or **Enter**; also right-click in 2D or double-click in 3D. Clicking the first point again closes a loop.

In 2D new walls show **hatched in the accent colour** (glass in blue). Select one to:

- change its **material**, **length** or **height** (e.g. a half-height wall);
- drag its end handles to reshape it;
- add a **door** or **window** to it with the Door/Window tool (each adds about S$550 / S$320 to the budget);
- delete it.

### Hack walls (H)

- **2D:** **click a wall to hack all of it**, or **press and drag along a wall to hack just part of it**. The span snaps to 50 mm and to the wall ends. Hacked stretches show **red and hatched**. Hovering shows a preview first.
- **3D:** hover a wall: **red** means it can be hacked, **dark grey** means it can't. **Click** to hack the whole wall. The hacked wall turns into a **red ghost**; **click the ghost to keep the wall** after all.
- Clicking one of **your new walls** with Hack removes it.

**Refused walls.** Structural walls (shaded black on the HDB plan), external walls and household shelter walls can't be hacked. The reason appears on screen.

Select a hacked stretch (click the red area in 2D) to:

- adjust **From wall start** and **Width**, or expand it to the **Whole wall**;
- see its area and cost: about **S$95/m² plus S$180** per hack for making good (plastering the cut ends, patching floor and ceiling). Doors already in the span aren't charged;
- **Keep this wall** (removes the hack);
- read warnings, e.g. it borders a bathroom, or electrical points sit on it.

A normal wall's inspector also has **Hack this wall** / **Keep wall** buttons.

Any door or window inside a hacked stretch goes with the wall. Electrical points on a hacked wall aren't moved; the HDB checks list them so you can relocate them.

### Rules to know

- Hacking non-structural walls and building new ones need an **HDB renovation permit**, applied for by an **HDB-registered contractor**.
- Removing reinforced-concrete walls also needs a **Professional Engineer's** supervision.
- In a new flat, **bathroom walls can't be hacked or relocated within 3 years** of key collection (waterproofing).
- The HDB checks in the [Project report](#project-report) flag all of these.

---

## Furniture

### Adding pieces

Open **Library** in the left panel. Search ("sofa", "bed", "wardrobe"…) or browse by category: Living, Dining, Bedroom, Study, Kitchen, Bathroom, Utility, Décor and Carpentry (built-ins).

- **Drag** a piece onto the 2D plan or the 3D view to drop it exactly there.
- Or click **+** to add it in the middle of the current view.

Every piece is at real-world size, shown as width × depth × height in mm. "Made to measure" pieces (wardrobes, kitchen cabinets, shoe cabinets, TV feature walls, platform beds, kitchen islands, floating shelves) can be any size within sensible limits.

### Moving and rotating

| Action | 2D Plan | 3D |
| --- | --- | --- |
| Select | Click the piece | Click the piece |
| Move | Drag it | Drag it along the floor |
| Rotate | Drag the round handle in front of it (snaps to 15°; **Alt** for 1°), or **Q / E** | **Q / E** (±15°), or the inspector buttons |
| Place freely | Hold **Alt** while dragging | Hold **Alt** while dragging |
| Duplicate | **Ctrl+D** | **Ctrl+D** |
| Delete | **Delete** / Backspace | **Delete** / Backspace |
| Deselect | **Esc** or click empty space | **Esc** or click empty space |

Pieces **snap flush against nearby walls** (within 150 mm) as you drag, and can tuck neatly into corners. Rugs never snap. The small tick on a piece's edge in 2D shows which way it faces.

### The furniture inspector

Select a piece to see, in the right panel:

- **Rotate −15° / +15° / 90°** and **Lock**. Locked pieces can't be moved by accident.
- **Size** presets (e.g. Single, Super single, Queen, King for beds; 55"/65"/75" for TVs) or free **Dimensions** for made-to-measure pieces.
- **Height above floor** for wall-mounted items (TV, wall art, shelves).
- **Finish** (Oak, Walnut, Matte white, Greige, Sage, Navy, Black) and **Fabric** (Oat, Cream, Stone grey, Charcoal, Olive, Terracotta, Navy, Blush).
- Model options, e.g. wardrobe doors (swing/sliding/open), kitchen sink/hob/wall cabinets/countertop, dining table shape and 4 or 6 chairs, sofa chaise side, stacked washer-dryer.
- A **Designer tip** with sizing and spacing advice.
- **Duplicate** and **Delete**.

### Clearances and warnings

- With a piece selected, both views show **measured gaps** to the nearest walls and furniture. Gaps of 800 mm or more are comfortable; amber is tight.
- The inspector lists problems:
  - **Overlaps** another piece *(red)*
  - **Goes into a wall** *(red)*
  - **Blocks a door** from opening fully *(red)*
  - **Tight walkway** under 600 mm *(amber; 800 mm is comfortable)*
- Problem pieces also show red in 2D and 3D.
- Gaps under 300 mm count as deliberate (against a wall), small pieces like lamps and chairs aren't walkway-checked, and the gap between a sofa and its coffee table isn't treated as a walkway.

---

## Layout ideas

Don't want to start from scratch? Open the **Layouts** tab, or select a room and open its **Layout** tab in the right panel.

### Whole-flat schemes (one click furnishes everything)

| Scheme | Living | Dining | Bedroom 3 | Bedroom 2 | Main bedroom |
| --- | --- | --- | --- | --- | --- |
| **Designer starter** | Sofa facing the TV | Table for four | Study | Guest room | Queen by the window |
| **Couple working from home** | L-sofa lounge | Breakfast island | Study | Home office for two | Bed facing a TV |
| **Family with two kids** | Sofa facing the TV | Six-seater | Kid's room | Kid's room | King + reading chair |
| **Hosts** | Conversation set | Six-seater | Guest room | Home office for two | Queen by the window |

Every scheme also fits out the kitchen, bathrooms, service yard and shoe cabinet.

### Room-by-room options (mix and match)

- **Living room:** Sofa facing the TV · L-sofa lounge with fluted TV wall · Conversation set (sofa, two armchairs, coffee table)
- **Dining:** Table for four · Round table · Six-seater · Breakfast island with bar stools
- **Bedroom 3:** Study · Guest room (queen) · Kid's room
- **Bedroom 2:** Guest room · Kid's room · Home office for two
- **Main bedroom:** Queen by the window · Bed facing a wall TV · King + reading chair

### How they work

- Each card has a **plan thumbnail** and a status: **In use**, **Fits cleanly**, or **N clashes with the current flat**. Hover the status to see the clashes, e.g. with a wall you've built.
- Picking a room option **replaces only that room's furniture**; the rest of the flat stays. Applying a scheme replaces furniture in every room.
- Every option was checked against the walls, door swings and the 600 mm walkway rule.
- **Ctrl+Z** undoes a pick.
- Layout ideas are drawn for the Redhill Peaks trace only. On an uploaded plan, furnish from the Library.

---

## Materials, colours and styles

Select a room (click its floor, or use the Rooms tab) and use the **Floor / Walls / Ceiling / Layout** tabs in the right panel. With nothing selected, the right panel sets the **whole-flat wall paint** and shows the style cards.

### Floors

| Group | Finishes | Options |
| --- | --- | --- |
| Wood | Natural Oak, Whitewashed Ash, Walnut, Oak Herringbone | Plank width 120 / 180 / 240 mm |
| Tile | Grey Porcelain, Warm White, Charcoal, Terracotta | Tile size 30×30, 60×60, 80×80, 60×120, 75×150, 90×180 cm |
| Stone | Marble-look, Terrazzo | |
| Soft | Loop Carpet | |
| Other | Cement Screed (microcement) | |

- Set the **Direction** (left–right or front–back) for planks and tiles.
- Use the button to **apply the same floor to all living areas and bedrooms**.
- Each group has a short designer note on where it works best.

### Walls

- **Paint:** pick from curated palettes (whites and neutrals, earthy tones, cool and deep colours) for the room, or **Use flat default** to follow the whole-flat colour.
- **Feature walls:** pick a finish, then **click a wall in the 3D view** to apply it. **Esc** or **Cancel** stops picking.
  - Paint effect: Limewash
  - Panelling: Fluted panel, Fluted oak, Oak slats, Walnut slats
  - Wallpaper: Linen, Arch
  - Tile: Subway, Zellige
  - Tintable finishes (limewash, painted flutes, wallpapers) take a colour.

### Ceilings

| Style | What it is |
| --- | --- |
| **Flat** | Plain slab. Simplest, and gives the most height. |
| **L-box** | A 350 mm drop around the edges that hides aircon piping and trunking. |
| **Cove light** | A false-ceiling band with a hidden LED strip. Choose the **light colour** (warm to cool white). |

Ceiling details show with **Full walls** (hidden in Cutaway) and in the walkthrough.

### Styles

**Start from a style** applies a complete look in one click: Japandi, Scandinavian, Muji, Modern Minimalist, Industrial, Modern Luxe, Wabi-sabi or Mid-century.

- **From the whole-flat panel:** sets paint, floors, ceilings and furniture finishes everywhere; feature walls stay.
- **From a room (Style this room):** restyles just that room's floor, paint, ceiling and furniture.

**Ctrl+Z** undoes either.

---

## Electrical and lighting plan

Open the **Electrical** tab (or pick the **Electrical** tool, **E**, in 2D).

### Suggest points for me

One click places a complete starting layout from your rooms and furniture: ceiling lights and their switches, bedside and desk sockets, TV and data points, kitchen appliance points, aircon fan coils and a condenser. It **replaces only earlier suggestions**; points you placed by hand stay. **Ctrl+Z** undoes it.

### Placing points by hand

1. Pick a point type from the Electrical tab. Each shows its plan code; hover for tips.

   | Group | Points (plan code) |
   | --- | --- |
   | Power | 13A socket (P1), 13A twin socket (P2), Twin socket with USB (PU) |
   | Appliance points | Hob (HB), Oven (OV), Cooker hood (CH), Fridge (FR), Washer/dryer (WM), Water heater + isolator (WH) |
   | Switches | 1-gang (S1), 2-gang (S2), 3-gang (S3), 2-way (2W) |
   | Lighting | Downlight (DL), Pendant (PL), Ceiling fan with light (CF), LED strip (LS) |
   | Aircon | Fan coil (AC), Condenser (CU) |
   | Data | LAN (LAN), TV (TV), Wi-Fi router spot (WF) |

2. In 2D, click a wall to mount wall points (they sit on the wall face, facing into the room) or anywhere in a room for ceiling lights. A ghost previews the spot.
3. **Esc** finishes. Use **Shown / Hidden** in the tab to toggle the symbols.

Select a point to:

- set its **height above floor**;
- read its **setting out** (distance from the nearest corner, for the electrician);
- link a **light to its switch**, or tick which lights a switch controls;
- add a **note for the electrician**.

Drag points to move them; wall points slide along walls. **Delete** removes a point (lights on a deleted switch become unswitched). Points show in 3D too.

The **Electrical** tab of the Project report turns this into a printable contractor plan (see below).

---

## Sunlight, lights, quality and screenshots

### Time of day (sun button in the 3D bar)

- Drag the **time slider** to see real Singapore sunlight move through the flat.
- Pick a **Date**: Today, March, June, September or December.
- Set **North on the plan** (±15° steps) to match your block plan or a map. The HDB unit plan has no compass, so copy the north arrow from the block plan.
- **Ceiling lights:** **Auto** (on around sunset), **On** or **Off**.

### Quality

| Mode | Use it for |
| --- | --- |
| **Draft** | Fastest. Phones and older laptops. |
| **High** | Soft ambient shading and smooth edges (default on most computers). |
| **Ultra** | Soft shadows and light glow. Needs a strong graphics card. |

The view automatically lowers its resolution if the frame rate struggles, and raises it again when things recover.

### Screenshots (camera button)

Saves the current 3D view as a PNG, without selection outlines or measurements:

- **Screen size:** quick share
- **High-res (2×):** sharp on any screen
- **4K (3840 px wide):** for printing or a big screen

---

## Presets, autosave and comparing designs

### Autosave

Everything you do is saved automatically in your browser as you go: the trace, design, furniture, renovation, electrical, presets and view settings. The **Saved** indicator in the top bar confirms it. Closing the tab loses nothing.

### Saving a preset

Click **Save preset** (or **Ctrl+S**), give it a name and choose what to save:

| Scope | Saves | Loading it |
| --- | --- | --- |
| **Whole flat** | The entire design (and the trace) | Replaces your current design |
| **Single room** | One room's floor, paint, ceiling, feature walls, furniture and electrical points | Applies to that room, or to another room you pick (on a different room only floor, paint and ceiling carry over) |
| **Materials & colours** | Paint, floors and feature walls only | Re-skins the flat, keeping furniture |

A snapshot of the current 3D view becomes the preset's thumbnail.

### Managing presets (Presets tab)

- **Load** a preset (undoable with Ctrl+Z).
- **Rename** it by clicking its name.
- **Duplicate**, **Export** (one preset as a `.json` file) or **Delete** it.
- **Export all** downloads every preset in one file; **Import** loads presets from a file. Use these to back up, to move designs between computers or browsers, or to share a design with someone else.

### Comparing

- Click **Compare** on a preset to see it **side by side with your current design**.
- Or tick two presets and click **Compare the 2 selected**.
- Both 3D views move together, so you look at the same spot in each.
- Each side shows its own furniture, finishes and renovation.

---

## Project report

Open it by clicking the **budget pill** in the top bar. **Esc** or **×** closes it. **Print** prints the open tab, or saves it as PDF.

| Tab | What's in it |
| --- | --- |
| **Budget** | Estimated total against **your budget** (editable; default S$60,000), a bar per category, and every line item by room. Categories: Hacking & new walls, Flooring, Painting & feature walls, Ceilings, Electrical & aircon, Carpentry, Furniture, Appliances, Bathroom fittings. A 10% contingency is added. |
| **Shopping list** | Everything per room, with material quantities including 10% spare and furniture prices. **CSV** downloads it for a spreadsheet. |
| **Electrical** | A contractor-ready plan: a scaled drawing with every point's code, a point schedule by room with heights and setting-out, and electrical checks (rooms without lights, unswitched lights, beds and desks without sockets, points near water, aircon blocked by tall furniture, condenser count, living-room sockets). |
| **HDB checks** | Pass / warning / fail checks: structural walls untouched, hacking and new walls (permit needed), bathroom walls hacked, electrical points on hacked walls, household shelter (no finishes or fixed carpentry on its walls), doors blocked, A/C ledge kept clear, wet-area flooring, the new-flat bathroom-tiles rule, and furniture overlapping walls. **Show** jumps to the problem. |
| **Room boards** | A mood board per room: swatches of its floor, paint, feature walls and furniture finishes and fabrics, with their names. Handy to share with a designer or contractor. |

How costs are worked out:

- Flooring is charged only for rooms you've changed.
- Repainting covers the whole flat if you change the base colour, otherwise just the rooms you repainted.
- Carpentry is priced per foot run, as Singapore contractors quote it.

---

## Keyboard and mouse reference

### Everywhere

| Keys | Action |
| --- | --- |
| **Ctrl+S** | Save a preset |
| **Ctrl+Z** | Undo |
| **Ctrl+Shift+Z** / **Ctrl+Y** | Redo |
| **Esc** | Cancel the current action, leave the tool, then clear the selection (also closes the report) |

On a Mac, use **Cmd** instead of **Ctrl**.

### 2D Plan

| Key | Tool / action |
| --- | --- |
| **V** | Select |
| **W** | Wall (trace) |
| **D** | Door |
| **N** | Window |
| **R** | Room |
| **E** | Electrical |
| **C** | Calibrate |
| **B** | Build new wall (renovation) |
| **H** | Hack wall (renovation) |
| **Enter** | Finish the wall / room you're drawing |
| Right-click | Finish drawing |
| **Alt** (hold) | Turn snapping off while drawing or dragging |
| **Delete** / Backspace | Delete the selection |
| **Q / E** | Rotate the selected furniture −15° / +15° (instead of picking tools) |
| **Ctrl+D** | Duplicate the selected furniture |
| Scroll | Zoom around the cursor |
| Drag empty space | Pan |

### 3D Orbit

| Input | Action |
| --- | --- |
| Left-drag | Rotate around |
| Right-drag | Pan |
| Scroll / pinch | Zoom |
| Click floor / furniture | Select |
| **B / H** | Build / Hack tool on or off |
| **Q / E** | Rotate the selected furniture |
| **Ctrl+D** | Duplicate the selected furniture |
| **Delete** | Delete the selected furniture |
| **Enter** / double-click | Finish the wall you're building |

### 3D Fly

| Input | Action |
| --- | --- |
| Hold right mouse + move | Look around |
| Hold right mouse + **W A S D** | Fly forward, left, back, right |
| Hold right mouse + **Q / E** | Down / up |
| **Shift** | 2.5× faster |
| Hold right mouse + scroll | Change flying speed |
| Arrow keys, Page Up / Down | Move without holding the right button |
| Scroll | Step forward / back |
| Middle-drag | Pan |
| **F** | Frame the selected furniture or room |
| Left-click / drag | Select / move furniture, select rooms |

### Walkthrough

| Input | Action |
| --- | --- |
| Drag | Look around |
| **W A S D** / arrows | Walk |
| **Shift** | Walk faster |
| Click the floor | Walk there |
| **Esc** | Back to the overview |

---

## Where your work is saved

Everything stays in **this browser on this device**. Nothing is uploaded.

| What | Where |
| --- | --- |
| Floor plan trace | `localStorage` → `redhill-peaks-plan` |
| Design: finishes, furniture, electrical, renovation | `localStorage` → `redhill-peaks-design` |
| View settings: theme, quality, sun, budget, camera mode, fly speed… | `localStorage` → `redhill-peaks-studio` |
| Presets and uploaded floor-plan images | IndexedDB → `redhill-peaks-studio` |

Things to know:

- **Private / incognito windows** forget everything when closed, and some block storage entirely. Presets show a warning when storage is unavailable.
- **Clearing site data** for the site deletes your work. Export your presets first.
- **Different browsers, devices and the published site** each have their own separate storage. Move work between them with preset **Export** / **Import**.

---

## Tips and good practice

- **Save a preset before big experiments** (applying a style or layout scheme, hacking walls). Then compare the before and after side by side.
- **Turn on Structural** in 3D before planning hacks to see which walls are off-limits.
- **Check the budget pill as you go.** Hacking, glass partitions and carpentry add up quickly.
- **Run Suggest points after the furniture is placed**, so beds, desks and the TV get sockets where they actually are.
- **Use Cutaway** to see every room at once, and **Walkthrough** to judge how a space really feels.
- **Use Fly** to get into tight spots, such as behind a sofa or into a corner, that Orbit can't reach.
- **Print the Electrical and HDB checks tabs** for your contractor and electrician meetings.

---

## Troubleshooting

| Problem | Try |
| --- | --- |
| The 3D view is slow or choppy | Switch quality to **Draft**, turn off **Labels**, or close other heavy tabs. |
| The 3D view is blank or shows "Preparing 3D view…" for a long time | Refresh. Make sure hardware acceleration / WebGL is enabled in your browser. |
| **Fly** isn't in the bottom bar | It only appears on devices with a mouse. On touch screens use Orbit and the Walkthrough. |
| Right mouse in Fly opens a menu or doesn't look around | Click inside the 3D view first so it has focus, then hold the right button. |
| WASD does nothing in Fly | Hold the **right mouse button** while pressing the keys (or use the arrow keys). |
| Ctrl+Z undid the wrong thing in 2D | Undo follows the trace or the design depending on what's selected (see the note in [Editing](#editing-with-the-select-tool-v)). Select a piece of furniture first to undo design changes. |
| A wall won't hack | It's structural, external or a household shelter wall. These can't be hacked. |
| A layout option shows clashes | Something you've changed (a new wall, a moved piece in a neighbouring zone) is in the way. Hover the status to see what. |
| My work is gone | Check you're in the same browser and not in a private window. Restore from an exported preset file if you have one. |
| The published site shows a blank page | Make sure **Settings → Pages → Source** is **GitHub Actions** and the latest workflow run succeeded. |

---

## For developers

### Tech stack

| Package | Version |
| --- | --- |
| Vite | 5.4 |
| React | 18.3 |
| TypeScript | 5.6 |
| Tailwind CSS | 3.4 (colour tokens as CSS variables, light and dark) |
| Zustand | 4.5 (state, with `persist` to localStorage) |
| three.js | 0.169 |
| @react-three/fiber | 8 |
| @react-three/drei | 9 |
| @react-three/postprocessing | 2 (N8AO, SMAA, bloom, neutral tone mapping) |
| pdf.js | 4.4 (PDF floor plans) |
| lucide-react | 0.453 (icons) |

All 3D models and textures are procedural (generated in code), so there are no 3D asset downloads.

### Coordinates

- Plan space is in **metres**: x runs left→right on the drawing, y runs top→bottom.
- In 3D, plan `(x, y)` maps to world `(x, 0, y)`, with the flat centred on the origin.
- Furniture rotation is in degrees clockwise on the plan. At 0° the front faces down the drawing (+y); at 90° it faces left, 180° up and 270° right.

### Data model

| Piece | Where | What it holds |
| --- | --- | --- |
| **FloorPlan** (the trace) | `src/types/plan.ts` | Walls (with openings), rooms and the underlay image, in `usePlanStore`. |
| **Design** | `src/types/design.ts` | Paint, floors, feature walls, ceilings, furniture items, electrical fixtures and the renovation, in `useDesignStore`. |
| **Renovation** | `design.renovation` | `hacks` (spans of traced walls, in metres along the wall) and `walls` (new walls with `built: 'drywall' \| 'brick' \| 'glass'`). |

`applyRenovation()` in `src/lib/renovation.ts` turns the trace plus the renovation into the **renovated plan**:

- hacks become full-height openings with ids prefixed `hack:`;
- new walls are appended.

`App.tsx` passes this renovated plan to everything except the 2D editor, which edits the trace and draws the renovation as an overlay.

### Project structure

| Path | Contents |
| --- | --- |
| `src/data/` | Bundled data: `redhillPeaks.ts` (the traced flat), `layouts.ts` (layout ideas), `styles.ts`, `pricing.ts`, `designerNotes.ts` |
| `src/types/` | `plan.ts` and `design.ts` |
| `src/store/` | Zustand stores: plan (trace + undo), design (+ undo), app (UI and view settings), editor (2D tools), presets |
| `src/lib/` | Pure logic: plan maths and edits, snapping, furniture maths (footprints, clearances, warnings), renovation, layouts, electrical suggestions and checks, estimate, HDB checks, shopping list, presets, styles, sun position, PDF/image import, IndexedDB |
| `src/components/` | App shell: `TopBar`, `LeftPanel`, `RightPanel`, `ViewControls` |
| `src/features/floorplan/` | 2D plan editor: `PlanView`, toolbar, inspectors, upload, calibration, hints |
| `src/features/scene/` | 3D: `Scene3D` (canvas, orbit camera), `FlyCamera`, `Walkthrough`, `FlatModel` (walls, floors, ceilings), lighting/daylight, finishes, minimap, screenshots |
| `src/features/renovation/` | Build/Hack: actions, inspectors, 3D tools (hover, ghosts, glass walls, build preview) |
| `src/features/furniture/` | Catalogue, procedural models, 2D/3D layers, inspector, library |
| `src/features/layouts/` | Layout ideas panel |
| `src/features/design/` | Room design panels (floor, walls, ceiling, layout) and style picker |
| `src/features/electrical/` | Fixture catalogue, symbols, 3D points, panel and inspector |
| `src/features/presets/` | Presets panel, save dialog, compare view, autosave indicator |
| `src/features/report/` | Project report: budget, shopping list, electrical plan, HDB checks, room boards |
| `public/plans/` | Floor plan image used as the underlay |
| `Image/` | Source HDB floor plan PDF (git-ignored) |

### Changing things

| To change | Edit |
| --- | --- |
| Prices | `src/data/pricing.ts` (flooring, paint, feature walls, ceilings, hacking/new walls, furniture and carpentry) |
| The furniture catalogue | `src/features/furniture/catalog.ts` (sizes, variants, options, designer tips) and `models.tsx` (the 3D shapes) |
| Layout ideas | `src/data/layouts.ts`. Positions are plan metres; keep each option inside its zone's region and check it has no warnings. |
| Styles | `src/data/styles.ts` |
| Floor and wall finishes | `src/features/scene/finishes.ts` and `wallFinishes.ts` |
| Electrical points | `src/features/electrical/fixtures.ts` |
| HDB rules | `src/lib/hdbChecks.ts` and `hackBlocker()` in `src/lib/renovation.ts` |
