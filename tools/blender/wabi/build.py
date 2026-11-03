"""Build, preview and export the wabi-sabi furniture set.

blender -b --factory-startup --python tools/blender/wabi/build.py -- [--only sofa,bed] [--preview] [--export] [--views three_quarter,detail]

Each entry in VARIANTS becomes public/models/wabi/<file>.gltf. Previews go to
tools/blender/cache/previews/. A summary (triangles, size) is printed per file.
"""
import argparse
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import lib  # noqa: E402
import pieces as P  # noqa: E402

# file name -> (piece type, builder)
VARIANTS = {
    # Living
    'sofa-2-seater': ('sofa', lambda: P.sofa(1.6, 0.9, 0.82, 2)),
    'sofa-3-seater': ('sofa', lambda: P.sofa(2.1, 0.92, 0.82, 3)),
    'sofa-4-seater': ('sofa', lambda: P.sofa(2.5, 0.95, 0.82, 4)),
    'sofa-l-2.4m': ('sofa-l', lambda: P.l_sofa(2.4, 1.55)),
    'sofa-l-2.7m': ('sofa-l', lambda: P.l_sofa(2.7, 1.65)),
    'sofa-l-3.0m': ('sofa-l', lambda: P.l_sofa(3.0, 1.7)),
    'armchair': ('armchair', lambda: P.armchair()),
    'coffee-table-1.0m': ('coffee-table', lambda: P.coffee_table_rect(1.0, 0.55)),
    'coffee-table-1.2m': ('coffee-table', lambda: P.coffee_table_rect(1.2, 0.6)),
    'coffee-table-round': ('coffee-table', lambda: P.coffee_table_round(0.9, 0.38)),
    'side-table': ('side-table', lambda: P.side_table()),
    'tv-55': ('tv', lambda: P.tv(1.23, 0.71)),
    'tv-65': ('tv', lambda: P.tv(1.45, 0.83)),
    'tv-75': ('tv', lambda: P.tv(1.67, 0.96)),
    'tv-console-1.5m': ('tv-console', lambda: P.tv_console(1.5, 0.4)),
    'tv-console-1.8m': ('tv-console', lambda: P.tv_console(1.8, 0.4)),
    'tv-console-2.1m': ('tv-console', lambda: P.tv_console(2.1, 0.42)),
    'rug-140x200': ('rug', lambda: P.rug(2.0, 1.4)),
    'rug-160x230': ('rug', lambda: P.rug(2.3, 1.6)),
    'rug-200x300': ('rug', lambda: P.rug(3.0, 2.0)),
    'floor-lamp': ('floor-lamp', lambda: P.floor_lamp()),
    # Dining
    'dining-table-1.4m': ('dining', lambda: P.dining_table(1.4, 0.8)),
    'dining-table-1.6m': ('dining', lambda: P.dining_table(1.6, 0.9)),
    'dining-table-1.8m': ('dining', lambda: P.dining_table(1.8, 0.9)),
    'dining-table-round': ('dining', lambda: P.dining_table(1.1, 1.1, round_top=True)),
    'dining-chair': ('dining', lambda: P.dining_chair()),
    'bar-stool': ('bar-stool', lambda: P.bar_stool()),
    # Bedroom and study
    'bed-single': ('bed', lambda: P.bed(0.91, 2.0, 1.0)),
    'bed-super-single': ('bed', lambda: P.bed(1.07, 2.0, 1.0)),
    'bed-queen': ('bed', lambda: P.bed(1.52, 2.02, 1.05)),
    'bed-king': ('bed', lambda: P.bed(1.83, 2.02, 1.05)),
    'bedside': ('bedside', lambda: P.bedside()),
    'dresser': ('dresser', lambda: P.dresser()),
    'desk-1.0m': ('desk', lambda: P.desk(1.0, 0.55)),
    'desk-1.2m': ('desk', lambda: P.desk(1.2, 0.6)),
    'desk-1.6m': ('desk', lambda: P.desk(1.6, 0.7)),
    'office-chair': ('office-chair', lambda: P.office_chair()),
    # Kitchen, utility, bathroom
    'fridge-2-door': ('fridge', lambda: P.fridge(0.7, 0.72, 1.8)),
    'fridge-side-by-side': ('fridge', lambda: P.fridge(0.91, 0.75, 1.79, side_by_side=True)),
    'washer': ('washer', lambda: P.washer()),
    'washer-stacked': ('washer', lambda: P.washer(stacked=True)),
    'vanity-600': ('vanity', lambda: P.vanity(0.6, 0.45)),
    'vanity-800': ('vanity', lambda: P.vanity(0.8, 0.48)),
    'vanity-1000': ('vanity', lambda: P.vanity(1.0, 0.5)),
    'toilet': ('toilet', lambda: P.toilet()),
    'shower-screen-800': ('shower-screen', lambda: P.shower_screen(0.8)),
    'shower-screen-900': ('shower-screen', lambda: P.shower_screen(0.9)),
    'shower-screen-1200': ('shower-screen', lambda: P.shower_screen(1.2)),
    # Decor
    'mirror': ('mirror', lambda: P.standing_mirror()),
    'wall-art-60x40': ('wall-art', lambda: P.wall_art(0.6, 0.4)),
    'wall-art-90x60': ('wall-art', lambda: P.wall_art(0.9, 0.6)),
    'wall-art-120x80': ('wall-art', lambda: P.wall_art(1.2, 0.8)),
    'wall-shelf': ('wall-shelf', lambda: P.wall_shelf()),
}


def main():
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    ap = argparse.ArgumentParser()
    ap.add_argument('--only', default='')
    ap.add_argument('--preview', action='store_true')
    ap.add_argument('--export', action='store_true')
    ap.add_argument('--views', default='three_quarter')
    ap.add_argument('--samples', type=int, default=128)
    ap.add_argument('--res', default='1100x800')
    a = ap.parse_args(argv)
    only = [s for s in a.only.split(',') if s]
    for file, (kind, build) in VARIANTS.items():
        if only and not any(file == o or kind == o for o in only):
            continue
        lib.reset()
        lib._mats.clear()
        try:
            ob = build()
        except Exception:
            import traceback
            print(f'FAILED {file}')
            traceback.print_exc()
            continue
        tris, size, _ = lib.stats(ob)
        print(f'BUILT {file}: {tris:,} tris, {size.x:.3f} x {size.y:.3f} x {size.z:.3f} m')
        if a.preview:
            for p in lib.preview(file, ob, views=a.views.split(','), samples=a.samples, res=tuple(int(v) for v in a.res.split('x'))):
                print('PREVIEW', p)
        if a.export:
            lib.export(file, ob)
            print('EXPORTED', file)


main()
