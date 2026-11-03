# Wabi-sabi furniture: Blender build pipeline

These scripts build the detailed furniture models in `public/models/wabi/`. Each piece is modelled in code at real-world size, rendered for review, and exported as Draco-compressed glTF.

## Requirements

- **Blender 5.2** (tested with 5.2.3 LTS). The scripts run it headless; the MCP add-on isn't needed.
- **Python 3** with **Pillow**, for the texture and art scripts.
- A CUDA GPU makes preview renders fast; it falls back to the CPU.

## Rebuilding

From the repository root:

```bash
python tools/blender/fetch_assets.py
```

```bash
python tools/blender/prep_textures.py
```

```bash
python tools/blender/make_art.py
```

```bash
"C:/Program Files/Blender Foundation/Blender 5.2/blender.exe" -b --factory-startup --python tools/blender/wabi/build.py -- --export
```

| Script | What it does |
| --- | --- |
| `fetch_assets.py` | Downloads the CC0 Poly Haven textures and studio HDRI into `cache/` (git-ignored). |
| `prep_textures.py` | Builds the shared texture set in `cache/prepared/`. Wood and fabric become neutral 80% grey detail maps (luminance only, large blotches flattened) so the app can tint them. Roughness is packed into ORM maps. |
| `make_art.py` | Paints the ensō wall-art texture. |
| `wabi/build.py` | Builds every variant. See the options below. |
| `contact_sheet.py` | Tiles preview renders into one image for review. |

`wabi/build.py` options:

- `--only sofa,bed-king` builds just those piece types or files.
- `--preview` renders studio previews (Cycles) into `cache/previews/`.
- `--views three_quarter,detail,front,side,top` picks the preview angles.
- `--samples 128` and `--res 1100x800` set render quality and size.
- `--export` writes `public/models/wabi/<file>.gltf` and `.bin`, plus the shared `textures/`.

Review loop: build with `--preview`, tile the renders with `python tools/blender/contact_sheet.py sheet.jpg three_quarter`, look, fix `wabi/pieces.py`, repeat.

## Conventions

- **Units and orientation.** Metres. Origin on the floor at the centre of the footprint. Width along +X, **front facing −Y** (glTF +Z, the app's front), up +Z.
- **One file per size variant**, already at real size. The app places them as-is, with no stretching. The wall shelf is the exception: it's free-size, so the app stretches it.
- **Material names drive colour in the app.** The app multiplies the chosen colour into the neutral texture, in linear space.

  | Material name | Coloured by |
  | --- | --- |
  | `tint_fabric__<texture>` | The item's fabric |
  | `tint_finish__<texture>` | The item's finish |
  | `tone_<hex>__<texture>` | A fixed colour (e.g. white bedding) |
  | `tint_appliance__paint` | The appliance colour option (white, stainless or black) |

- **Previews show the default colours.** The preview tint is stripped before export, so the exported files keep neutral textures.

## Building blocks (`wabi/lib.py`)

| Helper | Use |
| --- | --- |
| `soft_box` | Upholstery. A subdivided cube remapped onto an exact rounded box, with puff, sag, taper and two-octave noise creasing. |
| `welts` | Piping that sits on a cushion's rounded edges. |
| `box` | Hard parts (wood, stone): bevelled with hardened normals. UVs box-projected in metres, with wood grain running along the part. |
| `cylinder`, `wobbly_drum` | Turned and hand-made round forms: plaster drums, ceramic basins. |
| `bend_ring` | Exact horseshoes and curved rails. |
| `cut` | Boolean cut-outs, so cases have no seams. |
| `drape` | Cloth simulation for duvets. |
| `outline_solid` + `arch_outline` | Extruded arch shapes. |
| `preview` | Studio render: HDRI, area key light, plaster wall, AgX. |
| `export` | GLTF_SEPARATE export with shared textures and Draco compression. |

## The set

The variant names match the app's size options.

| Piece | Variants (files) | Triangles | Notes |
| --- | --- | --- | --- |
| Sofa | `sofa-2-seater`, `-3-seater`, `-4-seater` | 82k–130k | Linen slipcover, loose cushions with piping, oak plinth |
| L-shaped sofa | `sofa-l-2.4m`, `-2.7m`, `-3.0m` | ~130k | Chaise modelled on the left; the app mirrors it for a right-hand chaise |
| Armchair | `armchair` | ~70k | Bouclé tub chair |
| Coffee table | `coffee-table-1.0m`, `-1.2m`, `coffee-table-round` | | Oak slab table; limewash plaster drum |
| Side table | `side-table` | | Plaster pedestal with an oak top |
| TV | `tv-55`, `tv-65`, `tv-75` | | Wall-mounted |
| TV console | `tv-console-1.5m`, `-1.8m`, `-2.1m` | | Reeded oak doors |
| Rug | `rug-140x200`, `-160x230`, `-200x300` | ~50k | Jute with a linen-bound edge |
| Floor lamp | `floor-lamp` | | Washi lantern, glows softly |
| Dining | `dining-table-1.4m`, `-1.6m`, `-1.8m`, `-round`, `dining-chair` | | The app places 4 or 6 chairs |
| Bar stool | `bar-stool` | | Oak, woven seat |
| Bed | `bed-single`, `-super-single`, `-queen`, `-king` | ~95k (queen) | Oak platform, linen headboard, cloth-simulated duvet |
| Bedside, dresser | `bedside`, `dresser` | | Solid oak; finger-pull cut-outs |
| Desk | `desk-1.0m`, `-1.2m`, `-1.6m` | | |
| Study chair | `office-chair` | | Oak frame, padded linen seat |
| Fridge | `fridge-2-door`, `fridge-side-by-side` | | |
| Washer | `washer`, `washer-stacked` | | |
| Vanity | `vanity-600`, `-800`, `-1000` | | Floating oak cabinet, hollow ceramic vessel, round mirror |
| Toilet | `toilet` | ~68k | Close-coupled |
| Shower screen | `shower-screen-800`, `-900`, `-1200` | | |
| Standing mirror | `mirror` | | Arched, oak frame |
| Wall art | `wall-art-60x40`, `-90x60`, `-120x80` | | Ensō on rice paper |
| Wall shelf | `wall-shelf` | | |

Total: 53 files and about 16 MB, of which about 13 MB is the shared textures.

## Quality notes

Every piece type was rendered in Cycles and reviewed for geometry, materials and realism over 2–4 passes. Fixes made along the way:

- Piping moved onto the cushions' rounded edges.
- Linear-space tinting.
- Arm and base junction on the sofa.
- Horseshoe back on the armchair, rebuilt with an exact bend.
- Curved chair rail.
- Seamless boolean cases for the bedside table and TV console.
- Mirror glass position and flat shading.
- A hollow vessel basin.
- A slimmer toilet seat and lid.

Fitting to the app's footprints: every model stays within its catalogue width and depth. To keep it that way:

- **Bed duvets** are tucked in at the sides.
- **Fridge and washer bodies** are shallower, so their handles and door rings fit within the depth.
- **The standing mirror** is centred on its leaning footprint, which is 180 mm deep.

So the app's clearance and walkway checks match what you see.

Known limits:

- **Hand-modelled.** Appliances are simplified and carry no branding.
- **Rugs** read fairly flat from far away.
- **Fixed scale.** Fabric weave scale is the same on every piece.
- **Built-in carpentry isn't in this set.** The wardrobe, kitchen cabinets, shoe cabinet, TV feature wall, island and platform bed stay as the app's procedural models, because they're made to measure to any size.
