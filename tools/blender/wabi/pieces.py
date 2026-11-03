"""The wabi-sabi furniture pieces. Each builder takes the variant's size and returns one joined
object in the app's furniture frame (see lib.py): origin on the floor at the footprint centre,
width along X, front facing -Y, up +Z."""
import math
import os
import random

from lib import (PREPARED, appliance_mat, arch_outline, bend, bend_ring, bevel, cut, box, box_uv, cylinder, drape, grid, image_mat, join,
                 mesh_object, outline_solid, plain_mat, soft_box, solidify, srgb_to_linear, tex_mat, transform, tube_path, welts)


def linen():
    return tex_mat('fabric', 'linen', normal=1.5)


def boucle():
    return tex_mat('fabric', 'boucle', normal=1.2)


def jute():
    return tex_mat('fabric', 'jute', normal=2.2)


def oak():
    return tex_mat('finish', 'oak', normal=0.6)


def white_linen():
    return tex_mat('tone', 'linen', normal=1.3, tone='f1ede6')


def cotton_white():
    return tex_mat('tone', 'cotton', normal=0.8, tone='f6f4f0')


def plaster():
    return tex_mat('fixed', 'plaster', normal=1.0, tinted=False)


def lin(*rgb):
    return tuple(srgb_to_linear(c) for c in rgb)


def ceramic():
    return plain_mat('ceramic', lin(0.95, 0.94, 0.92), 0.08, coat=0.6)


def black_steel():
    return plain_mat('black_steel', lin(0.11, 0.11, 0.115), 0.42, 0.6)


def brushed_steel():
    return plain_mat('brushed_steel', lin(0.78, 0.78, 0.77), 0.28, 1.0)


def dark_glass():
    return plain_mat('dark_glass', lin(0.02, 0.022, 0.025), 0.04, coat=1.0)


def clear_glass():
    # Low-iron glass: faintly green, a little more present than 18% so panels read as glass.
    return plain_mat('glass', lin(0.82, 0.9, 0.87), 0.02, alpha=0.24)


def mirror_mat():
    return plain_mat('mirror', lin(0.9, 0.92, 0.93), 0.02, 1.0)


def rubber():
    return plain_mat('rubber', lin(0.12, 0.12, 0.12), 0.7)


def shadow_gap():
    return plain_mat('shadow_gap', lin(0.09, 0.075, 0.06), 0.9)


def washi():
    return plain_mat('washi', lin(0.95, 0.91, 0.84), 0.85, emission=lin(1.0, 0.82, 0.58), emission_strength=1.6)


# ---------------------------------------------------------------------------------------------
# Living


def sofa(w, d, h, seats, name='sofa', chaise_w=0.0, main_d=None):
    """Low, deep slipcover sofa in linen on a recessed oak plinth, loose seat and back cushions.
    With `chaise_w`, a chaise runs forward on the left (-X) and the main body is `main_d` deep."""
    fab, wood = linen(), oak()
    main_d = main_d or d
    my = d / 2 - main_d / 2  # main body centre (back-aligned)
    plinth_h, base_h, arm_w, back_t, seat_t = 0.07, 0.2, 0.19, 0.18, 0.17
    base_top = plinth_h + base_h
    parts = [box('plinth', (w - 0.1, main_d - 0.1, plinth_h), (0, my, plinth_h / 2), r=0.006, mat=wood, grain='x')]
    parts.append(soft_box('base', (w - 0.03, main_d - 0.02, base_h), (0, my + 0.005, plinth_h + base_h / 2), r=0.035, cuts=24, wrinkle=0.0015, seed=1, mat=fab))
    arm_h = 0.6 - plinth_h
    # Right arm along the main body; the left arm runs the full depth when there's a chaise.
    parts.append(soft_box('armR', (arm_w, main_d, arm_h), (w / 2 - arm_w / 2, my, plinth_h + arm_h / 2), r=0.085, cuts=26, puff=0.008, wrinkle=0.002, seed=11, mat=fab))
    left_d = d if chaise_w else main_d
    parts.append(soft_box('armL', (arm_w, left_d, arm_h), (-w / 2 + arm_w / 2, d / 2 - left_d / 2, plinth_h + arm_h / 2), r=0.085, cuts=32 if chaise_w else 26, puff=0.008, wrinkle=0.002, seed=10, mat=fab))
    back_h = 0.62 - plinth_h
    parts.append(soft_box('backframe', (w - 2 * arm_w + 0.02, back_t, back_h), (0, d / 2 - back_t / 2, plinth_h + back_h / 2), r=0.06, cuts=24, wrinkle=0.0015, seed=3, mat=fab))
    inner = w - 2 * arm_w
    seat_d = main_d - back_t - 0.01
    cushions = []  # (x, width, depth)
    if chaise_w:
        front_d = d - main_d
        parts.append(box('plinthC', (chaise_w - 0.1, front_d, plinth_h), (-w / 2 + chaise_w / 2, -d / 2 + front_d / 2 + 0.05, plinth_h / 2), r=0.006, mat=wood, grain='y'))
        parts.append(soft_box('baseC', (chaise_w - 0.03, front_d + 0.04, base_h), (-w / 2 + chaise_w / 2 + 0.01, -d / 2 + front_d / 2 + 0.01, plinth_h + base_h / 2), r=0.035, cuts=24, wrinkle=0.0015, seed=2, mat=fab))
        cw = chaise_w - arm_w
        cushions.append((-w / 2 + arm_w + cw / 2, cw, d - back_t - 0.01))
        rest = inner - cw
        n = max(1, round(rest / 0.72))
        for i in range(n):
            cushions.append((-w / 2 + arm_w + cw + rest / n * (i + 0.5), rest / n, seat_d))
    else:
        for i in range(seats):
            cushions.append((-inner / 2 + inner / seats * (i + 0.5), inner / seats, seat_d))
    for i, (x, cw, cd) in enumerate(cushions):
        size = (cw - 0.006, cd, seat_t)
        at = (x, d / 2 - back_t - 0.01 - cd / 2, base_top + seat_t / 2)
        parts.append(soft_box(f'seat{i}', size, at, r=0.05, cuts=30 if cd < 1.2 else 42, puff=0.014, sag=0.01, wrinkle=0.005, seed=20 + i, mat=fab))
        parts += welts(f'pipe{i}', size, at, 0.05, 0.0028, fab)
    nb = seats if not chaise_w else max(2, round(inner / 0.7))
    bw = inner / nb
    for i in range(nb):
        x = -inner / 2 + bw * (i + 0.5)
        rnd = random.Random(40 + i)
        bh = h - base_top - seat_t - 0.03
        back = soft_box(f'back{i}', (bw - 0.012, 0.19, bh), (0, 0, 0), r=0.085, cuts=30, puff=0.024, sag=0.016, wrinkle=0.0065, seed=40 + i, mat=fab)
        transform(back, (x + rnd.uniform(-0.01, 0.01), d / 2 - back_t - 0.08, base_top + seat_t + bh / 2 - 0.02),
                  (math.radians(-10 + rnd.uniform(-2, 2)), math.radians(rnd.uniform(-1.5, 1.5)), math.radians(rnd.uniform(-1.5, 1.5))))
        parts.append(back)
    return join(name, parts)


def l_sofa(w, d, h=0.82):
    return sofa(w, d, h, 0, 'sofa-l', chaise_w=0.9, main_d=0.95)


def armchair(w=0.82, d=0.82, h=0.78):
    """Low bouclé tub chair: a horseshoe back bent around a deep round seat, on a recessed oak disc."""
    fab, wood = boucle(), oak()
    parts = [cylinder('foot', w * 0.32, 0.06, (0, 0, 0), segments=96, r=0.008, mat=wood)]
    parts.append(soft_box('base', (w * 0.9, d * 0.9, 0.3), (0, 0, 0.06 + 0.15), r=0.3, cuts=34, puff=0.004, wrinkle=0.002, seed=2, mat=fab))
    # Horseshoe back: a long soft bar bent ~230 degrees around the seat.
    ring_r = w * 0.36
    length = 2 * math.pi * ring_r * (230 / 360)
    back_h = h - 0.26
    back = soft_box('back', (length, 0.17, back_h), (0, 0, 0.26 + back_h / 2 - 0.01), r=0.08, cuts=56, puff=0.01, wrinkle=0.003, seed=4, mat=fab)
    bend_ring(back, ring_r, 0.0)
    parts.append(back)
    parts.append(soft_box('seat', (w * 0.62, d * 0.62, 0.14), (0, -0.03, 0.36 + 0.07), r=0.22, cuts=34, puff=0.02, sag=0.01, wrinkle=0.004, seed=6, mat=fab))
    return join('armchair', parts)


def coffee_table_rect(w, d, h=0.4):
    """Solid oak low table: thick softened top on two slab legs, chabudai-like."""
    wood = oak()
    top_t = 0.055
    parts = [box('top', (w, d, top_t), (0, 0, h - top_t / 2), r=0.018, segments=5, mat=wood, grain='x')]
    for s in (-1, 1):
        parts.append(box(f'leg{s}', (0.06, d - 0.12, h - top_t), (s * (w / 2 - 0.13), 0, (h - top_t) / 2), r=0.012, segments=4, mat=wood, grain='z'))
    parts.append(box('rail', (w - 0.32, 0.04, 0.05), (0, 0, 0.07), r=0.008, mat=wood, grain='x'))
    return join('coffee-table', parts)


def wobbly_drum(name, r, hgt, mat, seed, segments=128, rings=24, wobble=0.004):
    """A hand-made drum: the radius wavers slightly around and up the height (plaster, clay)."""
    import bmesh
    from mathutils import Vector
    from mathutils import noise as mnoise
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=segments, radius1=r, radius2=r, depth=hgt)
    side = [e for e in bm.edges if abs(e.verts[0].co.z - e.verts[1].co.z) > 1e-6]
    bmesh.ops.subdivide_edges(bm, edges=side, cuts=rings, use_grid_fill=False)
    off = Vector((seed * 3.1, seed * 1.7, 0))
    for v in bm.verts:
        if Vector((v.co.x, v.co.y)).length > r * 0.6:
            k = 1 + mnoise.noise(Vector((v.co.x * 6, v.co.y * 6, v.co.z * 4)) + off) * wobble / r
            v.co.x *= k
            v.co.y *= k
    ob = mesh_object(name, bm, mat)
    bevel(ob, min(0.012, hgt * 0.2), 4, 30)
    transform(ob, (0, 0, hgt / 2))
    box_uv(ob, 0.8, None)
    return ob


def coffee_table_round(dia=0.9, h=0.38):
    """Limewash plaster drum table with a recessed shadow-gap toe."""
    p = plaster()
    toe = 0.05
    parts = [cylinder('toe', dia / 2 - 0.06, toe, (0, 0, 0), segments=96, r=0.004, mat=p)]
    drum = wobbly_drum('drum', dia / 2, h - toe, p, 3)
    transform(drum, (0, 0, toe))
    parts.append(drum)
    return join('coffee-table-round', parts)


def side_table(w=0.45, d=0.45, h=0.55):
    """Plaster pedestal with a thick round oak top."""
    p, wood = plaster(), oak()
    ped = wobbly_drum('ped', w * 0.3, h - 0.035, p, 5, segments=96, rings=18)
    return join('side-table', [ped, cylinder('top', w / 2, 0.035, (0, 0, h - 0.035), segments=96, r=0.01, mat=wood, grain='x')])


def tv(w, h, d=0.05):
    """Slim wall-mounted TV: hairline bezel, glossy panel, thicker rear housing."""
    frame = plain_mat('tv_frame', lin(0.07, 0.07, 0.075), 0.35, 0.8)
    parts = [box('frame', (w, 0.012, h), (0, -d / 2 + 0.006, h / 2), r=0.002, mat=frame)]
    parts.append(box('screen', (w - 0.012, 0.002, h - 0.012), (0, -d / 2 - 0.0005, h / 2), r=0, mat=dark_glass()))
    parts.append(box('rear', (w * 0.7, d - 0.012, h * 0.55), (0, 0.006, h * 0.45), r=0.01, mat=frame))
    parts.append(box('logo', (0.04, 0.001, 0.006), (0, -d / 2 - 0.0012, 0.012), r=0, mat=brushed_steel()))
    return join('tv', parts)


def tv_console(w, d=0.4, h=0.45):
    """Low oak console with reeded (tambour) sliding doors on a recessed plinth."""
    wood = oak()
    plinth = 0.06
    parts = [box('plinth', (w - 0.08, d - 0.08, plinth), (0, 0.02, plinth / 2), r=0.004, mat=wood, grain='x')]
    body_h = h - plinth
    case = box('case', (w, d, body_h), (0, 0, plinth + body_h / 2), r=0.008, segments=4, mat=wood, grain='x')
    cut(case, box('front', (w - 0.05, 0.08, body_h - 0.055), (0, -d / 2, plinth + 0.025 + (body_h - 0.055) / 2), r=0))
    box_uv(case, 0.6, 'x')
    parts.append(case)
    reed = 0.018
    n = int((w - 0.06) / reed)
    reed_h = body_h - 0.06
    for i in range(n):
        x = -(n * reed) / 2 + reed * (i + 0.5)
        parts.append(cylinder(f'reed{i}', reed / 2, reed_h, (x, -d / 2 + 0.03, plinth + 0.03), segments=16, r=0, mat=wood, grain='z'))
    parts.append(box('doorback', (w - 0.06, 0.012, reed_h), (0, -d / 2 + 0.042, plinth + 0.03 + reed_h / 2), r=0, mat=wood, grain='z'))
    return join('tv-console', parts)


def rug(w, d):
    """Hand-loomed jute rug with a linen-bound edge."""
    fab, edge = jute(), linen()
    t = 0.012
    parts = [soft_box('rug', (w - 0.06, d - 0.06, t), (0, 0, t / 2), r=0.005, cuts=48, wrinkle=0.0015, seed=9, mat=fab, tile=0.22)]
    for s in (-1, 1):
        parts.append(soft_box(f'bx{s}', (w, 0.035, t + 0.002), (0, s * (d / 2 - 0.0175), (t + 0.002) / 2), r=0.006, cuts=20, mat=edge))
        parts.append(soft_box(f'by{s}', (0.035, d - 0.07, t + 0.002), (s * (w / 2 - 0.0175), 0, (t + 0.002) / 2), r=0.006, cuts=20, mat=edge))
    return join('rug', parts)


def floor_lamp(h=1.6):
    """Washi-paper column lantern with bamboo-like ribs on a slim black rod and oak foot."""
    paper, steel, wood = washi(), black_steel(), oak()
    rib = plain_mat('rib', lin(0.86, 0.8, 0.68), 0.6)
    shade_h, shade_r = 0.62, 0.19
    parts = [cylinder('foot', 0.16, 0.025, (0, 0, 0), segments=96, r=0.008, mat=wood, grain='x')]
    parts.append(cylinder('rod', 0.009, h - shade_h + 0.04, (0, 0, 0.025), segments=24, r=0, mat=steel))
    parts.append(cylinder('shade', shade_r, shade_h, (0, 0, h - shade_h), segments=96, r=0, mat=paper))
    for i in range(int(shade_h / 0.045) + 1):
        z = h - shade_h + i * 0.045
        ring = [(shade_r * 1.003 * math.cos(a), shade_r * 1.003 * math.sin(a), z) for a in [2 * math.pi * k / 72 for k in range(72)]]
        parts.append(tube_path(f'rib{i}', ring, 0.0016, rib, cyclic=True))
    return join('floor-lamp', parts)


# ---------------------------------------------------------------------------------------------
# Dining


def dining_table(w, d, h=0.75, round_top=False):
    """Solid oak table with softened edges: square-section legs, or a pedestal for the round one."""
    wood = oak()
    top_t = 0.04
    if round_top:
        parts = [cylinder('top', w / 2, top_t, (0, 0, h - top_t), segments=128, r=0.014, mat=wood, grain='x')]
        parts.append(cylinder('stem', 0.11, h - top_t - 0.04, (0, 0, 0.04), segments=64, r=0.006, mat=wood, radius_top=0.09))
        for a in (0, 90):
            foot = box(f'foot{a}', (w * 0.62, 0.07, 0.04), (0, 0, 0.02), r=0.012, mat=wood, grain='x')
            transform(foot, rot=(0, 0, math.radians(a)))
            parts.append(foot)
        return join('dining-table', parts)
    parts = [box('top', (w, d, top_t), (0, 0, h - top_t / 2), r=0.014, segments=5, mat=wood, grain='x')]
    inset = 0.07
    for sx in (-1, 1):
        for sy in (-1, 1):
            parts.append(box(f'leg{sx}{sy}', (0.065, 0.065, h - top_t), (sx * (w / 2 - inset), sy * (d / 2 - inset), (h - top_t) / 2), r=0.016, segments=4, mat=wood, grain='z'))
    for s in (-1, 1):
        parts.append(box(f'apronx{s}', (w - 2 * inset, 0.022, 0.08), (0, s * (d / 2 - inset), h - top_t - 0.04), r=0.004, mat=wood, grain='x'))
        parts.append(box(f'aprony{s}', (0.022, d - 2 * inset, 0.08), (s * (w / 2 - inset), 0, h - top_t - 0.04), r=0.004, mat=wood, grain='y'))
    return join('dining-table', parts)


def woven_seat(name, w, d, t, z, mat):
    """Paper-cord / rush seat: a slightly dished soft panel with a fine weave."""
    return soft_box(name, (w, d, t), (0, 0, z), r=t * 0.45, cuts=30, sag=0.008, wrinkle=0.0008, seed=3, mat=mat, tile=0.18)


def dining_chair():
    """Oak chair with a woven paper-cord seat and a curved back rail."""
    wood, seat = oak(), jute()
    w, d, sh = 0.46, 0.5, 0.45
    parts = []
    for sx in (-1, 1):
        parts.append(box(f'fl{sx}', (0.032, 0.032, sh), (sx * (w / 2 - 0.03), -d / 2 + 0.04, sh / 2), r=0.008, mat=wood, grain='z'))
        back_leg = box(f'bl{sx}', (0.032, 0.032, 0.8), (0, 0, 0.4), r=0.008, mat=wood, grain='z')
        transform(back_leg, (sx * (w / 2 - 0.03), d / 2 - 0.045, 0), (math.radians(-6), 0, 0))
        parts.append(back_leg)
        parts.append(box(f'rail_side{sx}', (0.028, d - 0.08, 0.035), (sx * (w / 2 - 0.03), 0, sh - 0.03), r=0.006, mat=wood, grain='y'))
        parts.append(box(f'stretch{sx}', (0.022, d - 0.08, 0.022), (sx * (w / 2 - 0.03), 0, 0.14), r=0.005, mat=wood, grain='y'))
    for sy, yy in ((-1, -d / 2 + 0.04), (1, d / 2 - 0.045)):
        parts.append(box(f'rail{sy}', (w - 0.06, 0.028, 0.035), (0, yy, sh - 0.03), r=0.006, mat=wood, grain='x'))
    parts.append(woven_seat('seat', w - 0.07, d - 0.09, 0.035, sh - 0.012, seat))
    # Curved back rail, concave towards the sitter, joining the tops of the back legs.
    rail = box('backrail', (w - 0.01, 0.03, 0.09), (0, 0, 0.74), r=0.012, segments=4, mat=wood, grain='x')
    rail_y = d / 2 - 0.045 + 0.74 * math.tan(math.radians(6))
    bend_ring(rail, 0.42, rail_y - 0.42)
    parts.append(rail)
    return join('dining-chair', parts)


def bar_stool(w=0.4, d=0.4, h=0.75):
    """Oak counter stool: splayed legs, two rows of rungs, woven paper-cord seat."""
    wood, seat = oak(), jute()
    parts = []
    splay = math.radians(4)
    for sx in (-1, 1):
        for sy in (-1, 1):
            leg = box(f'leg{sx}{sy}', (0.032, 0.032, h - 0.03), (0, 0, (h - 0.03) / 2), r=0.008, mat=wood, grain='z')
            transform(leg, (sx * (w / 2 - 0.06), sy * (d / 2 - 0.06), 0), (sy * splay, -sx * splay, 0))
            parts.append(leg)
    for z, inset in ((0.28, 0.045), (h - 0.06, 0.06)):
        for s in (-1, 1):
            parts.append(box(f'rx{z}{s}', (w - 2 * inset, 0.024, 0.024), (0, s * (d / 2 - inset), z), r=0.006, mat=wood, grain='x'))
            parts.append(box(f'ry{z}{s}', (0.024, d - 2 * inset, 0.024), (s * (w / 2 - inset), 0, z), r=0.006, mat=wood, grain='y'))
    parts.append(woven_seat('seat', w - 0.07, d - 0.07, 0.03, h - 0.033, seat))
    return join('bar-stool', parts)


# ---------------------------------------------------------------------------------------------
# Bedroom


def bed(w, d, h=1.0, name='bed'):
    """Low oak platform bed with a linen headboard, mattress, a draped linen duvet (cloth
    simulation), pillows and a folded throw."""
    wood, fab = oak(), linen()
    frame_h = 0.24
    parts = [box('platform', (w, d - 0.06, 0.05), (0, -0.03, frame_h - 0.025), r=0.012, segments=4, mat=wood, grain='y')]
    parts.append(box('plinth', (w - 0.16, d - 0.3, frame_h - 0.05), (0, -0.05, (frame_h - 0.05) / 2), r=0.004, mat=wood, grain='x'))
    head_h = h - frame_h + 0.02
    parts.append(box('headframe', (w + 0.02, 0.06, head_h * 0.98), (0, d / 2 - 0.03, frame_h - 0.02 + head_h * 0.49), r=0.012, mat=wood, grain='x'))
    parts.append(soft_box('headpad', (w - 0.06, 0.09, head_h * 0.72), (0, d / 2 - 0.085, frame_h + head_h * 0.42), r=0.045, cuts=30, puff=0.012, wrinkle=0.002, seed=8, mat=fab))
    mat_h = 0.22
    mw, md = w - 0.06, d - 0.2
    my = -0.055
    mattress = soft_box('mattress', (mw, md, mat_h), (0, my, frame_h + mat_h / 2), r=0.04, cuts=32, puff=0.006, mat=cotton_white())
    parts.append(mattress)
    # Duvet: a fine grid dropped onto the mattress; the cloth sim gives real folds over the edges.
    dw, dd = mw + 0.42, md * 0.78
    duvet = grid('duvet', dw, dd, int(dw / 0.018), int(dd / 0.018), (0, my - md / 2 + dd / 2 - 0.08, frame_h + mat_h + 0.06), white_linen())
    drape(duvet, [mattress], frames=45, thickness=0.006, quality=6, stiffness=10)
    solidify(duvet, 0.03)
    # The hanging sides can flare out; tuck them in so the bed stays within its footprint.
    limit = w / 2 - 0.012
    for v in duvet.data.vertices:
        if abs(v.co.x) > limit:
            v.co.x = math.copysign(limit - (abs(v.co.x) - limit) * 0.15, v.co.x)
    for p in duvet.data.polygons:
        p.use_smooth = True
    box_uv(duvet, 0.4, None)
    parts.append(duvet)
    n = 1 if w < 1.2 else 2
    pw = (mw - 0.1) / n
    for i in range(n):
        x = -mw / 2 + 0.05 + pw * (i + 0.5)
        rnd = random.Random(60 + i)
        pil = soft_box(f'pillow{i}', (pw - 0.06, 0.4, 0.15), (0, 0, 0), r=0.07, cuts=30, puff=0.04, wrinkle=0.006, seed=60 + i, mat=white_linen())
        transform(pil, (x, my + md / 2 - 0.25, frame_h + mat_h + 0.11), (math.radians(-28 + rnd.uniform(-3, 3)), 0, math.radians(rnd.uniform(-3, 3))))
        parts.append(pil)
    parts.append(soft_box('throw', (mw + 0.04, 0.42, 0.035), (0, my - md / 2 + 0.36, frame_h + mat_h + 0.075), r=0.015, cuts=34, wrinkle=0.006, seed=70, mat=fab, tile=0.35))
    return join(name, parts)


def bedside(w=0.45, d=0.4, h=0.5):
    """Oak bedside: a drawer with a finger-pull over an open niche, on a recessed plinth."""
    wood = oak()
    plinth = 0.05
    parts = [box('plinth', (w - 0.06, d - 0.06, plinth), (0, 0.015, plinth / 2), r=0.003, mat=wood)]
    body_h = h - plinth
    t = 0.022
    # One solid case with the drawer opening and open niche cut out, so there are no seams.
    case = box('case', (w, d, body_h), (0, 0, plinth + body_h / 2), r=0.008, segments=4, mat=wood, grain='x')
    dh = body_h * 0.42
    niche_h = body_h - dh - 3 * t
    cut(case, box('niche', (w - 2 * t, d - 0.02, niche_h), (0, -0.02, plinth + t + niche_h / 2), r=0))
    cut(case, box('drawerhole', (w - 2 * t, 0.03, dh), (0, -d / 2, h - t - dh / 2), r=0))
    box_uv(case, 0.6, 'x')
    parts.append(case)
    parts.append(box('drawer', (w - 2 * t - 0.004, 0.02, dh - 0.004), (0, -d / 2 + 0.012, h - t - dh / 2), r=0.004, mat=wood, grain='x'))
    parts.append(box('pull', (0.09, 0.004, 0.022), (0, -d / 2 + 0.0005, h - t - 0.03), r=0.002, mat=shadow_gap()))
    return join('bedside', parts)


def dresser(w=1.2, d=0.45, h=0.8):
    """Low oak dresser: three rows of drawers with oval finger pulls, softened top."""
    wood = oak()
    plinth = 0.07
    parts = [box('plinth', (w - 0.08, d - 0.08, plinth), (0, 0.02, plinth / 2), r=0.003, mat=wood)]
    body_h = h - plinth
    parts.append(box('case', (w, d - 0.02, body_h - 0.03), (0, 0.01, plinth + (body_h - 0.03) / 2), r=0.006, mat=wood, grain='x'))
    parts.append(box('top', (w + 0.01, d + 0.005, 0.03), (0, 0, h - 0.015), r=0.01, segments=4, mat=wood, grain='x'))
    rows = 3
    rh = (body_h - 0.03 - 0.02) / rows
    for r_ in range(rows):
        z = plinth + 0.01 + rh * (r_ + 0.5)
        cols = 2 if r_ == rows - 1 else 1
        cw = (w - 0.02) / cols
        for c in range(cols):
            x = -w / 2 + 0.01 + cw * (c + 0.5)
            parts.append(box(f'front{r_}{c}', (cw - 0.004, 0.02, rh - 0.004), (x, -d / 2 + 0.002, z), r=0.004, mat=wood, grain='x'))
            pull = cylinder(f'pull{r_}{c}', 0.022, 0.004, (0, 0, 0), segments=48, r=0, mat=shadow_gap())
            transform(pull, (x, -d / 2 - 0.009, z + rh * 0.28), (math.radians(90), 0, 0), (1.8, 1, 1))
            parts.append(pull)
    return join('dresser', parts)


def desk(w, d, h=0.75):
    """Oak writing desk: softened top, tapered legs, a slim drawer."""
    wood = oak()
    top_t = 0.03
    parts = [box('top', (w, d, top_t), (0, 0, h - top_t / 2), r=0.01, segments=4, mat=wood, grain='x')]
    inset = 0.05
    for sx in (-1, 1):
        for sy in (-1, 1):
            parts.append(cylinder(f'leg{sx}{sy}', 0.022, h - top_t, (sx * (w / 2 - inset), sy * (d / 2 - inset), 0), segments=32, r=0.004, mat=wood, radius_top=0.028))
    parts.append(box('apron', (w - 2 * inset, d - 2 * inset, 0.09), (0, 0, h - top_t - 0.045), r=0.004, mat=wood, grain='x'))
    dw = min(0.5, w * 0.4)
    parts.append(box('drawer', (dw, 0.012, 0.075), (0, -d / 2 + inset - 0.004, h - top_t - 0.045), r=0.003, mat=wood, grain='x'))
    parts.append(box('pull', (0.08, 0.003, 0.012), (0, -d / 2 + inset - 0.011, h - top_t - 0.06), r=0.001, mat=shadow_gap()))
    return join('desk', parts)


def office_chair(w=0.62, d=0.62, h=0.95):
    """Oak study chair with a padded linen seat and back."""
    wood, fab = oak(), linen()
    sw, sd, sh = 0.5, 0.5, 0.46
    parts = []
    for sx in (-1, 1):
        parts.append(box(f'fl{sx}', (0.035, 0.035, sh - 0.05), (sx * (sw / 2 - 0.03), -sd / 2 + 0.04, (sh - 0.05) / 2), r=0.009, mat=wood, grain='z'))
        bl = box(f'bl{sx}', (0.035, 0.035, h), (0, 0, h / 2), r=0.009, mat=wood, grain='z')
        transform(bl, (sx * (sw / 2 - 0.03), sd / 2 - 0.05, 0), (math.radians(-7), 0, 0))
        parts.append(bl)
        parts.append(box(f'side{sx}', (0.03, sd - 0.08, 0.05), (sx * (sw / 2 - 0.03), 0, sh - 0.075), r=0.006, mat=wood, grain='y'))
    parts.append(box('front', (sw - 0.06, 0.03, 0.05), (0, -sd / 2 + 0.04, sh - 0.075), r=0.006, mat=wood, grain='x'))
    size = (sw - 0.02, sd - 0.02, 0.07)
    parts.append(soft_box('seat', size, (0, 0, sh - 0.02), r=0.03, cuts=28, puff=0.012, wrinkle=0.002, seed=5, mat=fab))
    parts += welts('seatpipe', size, (0, 0, sh - 0.02), 0.03, 0.0025, fab)
    back = soft_box('back', (sw - 0.04, 0.06, 0.32), (0, 0, 0), r=0.028, cuts=28, puff=0.01, wrinkle=0.002, seed=6, mat=fab)
    lean = math.radians(7)
    transform(back, (0, sd / 2 - 0.05 + (h - 0.2) * math.sin(lean) - 0.04, h - 0.2), (-lean, 0, 0))
    parts.append(back)
    return join('office-chair', parts)


# ---------------------------------------------------------------------------------------------
# Kitchen, utility, bathroom


def fridge(w, d, h, side_by_side=False):
    ob = _fridge(w, d - 0.03, h, side_by_side)
    transform(ob, (0, 0.015, 0))
    return ob


def _fridge(w, d, h, side_by_side=False):
    """Fridge in matte appliance paint (colour set in the app), with flush doors and long pulls."""
    paint, steel, gasket = appliance_mat(), brushed_steel(), rubber()
    parts = [box('body', (w, d - 0.04, h - 0.01), (0, 0.02, (h - 0.01) / 2 + 0.01), r=0.012, mat=paint)]
    parts.append(box('kick', (w - 0.04, 0.02, 0.06), (0, -d / 2 + 0.06, 0.03), r=0.004, mat=gasket))
    if side_by_side:
        doors = [(-w / 4, w / 2 - 0.004, 0.07, h - 0.08), (w / 4, w / 2 - 0.004, 0.07, h - 0.08)]
    else:
        split = h * 0.68
        doors = [(0, w - 0.004, 0.07, split - 0.07), (0, w - 0.004, split + 0.004, h - split - 0.01)]
    for i, (x, dw, z0, dh) in enumerate(doors):
        parts.append(box(f'door{i}', (dw, 0.04, dh), (x, -d / 2 + 0.02, z0 + dh / 2), r=0.01, segments=4, mat=paint))
        parts.append(box(f'gasket{i}', (dw - 0.01, 0.006, dh - 0.01), (x, -d / 2 + 0.042, z0 + dh / 2), r=0.002, mat=gasket))
        if side_by_side:
            hx = x + (0.03 - dw / 2 if x > 0 else dw / 2 - 0.03)
            hz, hl = z0 + dh * 0.5, dh * 0.55
        else:
            hx = w / 2 - 0.05
            hl = min(0.5, dh * 0.6)
            hz = z0 + (0.06 + hl / 2 if i == 1 else dh - 0.06 - hl / 2)
        parts.append(box(f'pull{i}', (0.018, 0.03, hl), (hx, -d / 2 - 0.015, hz), r=0.006, mat=steel))
    return join('fridge', parts)


def washer_unit(prefix, w, d, h, z0, dryer=False):
    paint, steel, glass, gasket = appliance_mat(), brushed_steel(), dark_glass(), rubber()
    parts = [box(f'{prefix}body', (w, d, h), (0, 0, z0 + h / 2), r=0.014, segments=4, mat=paint)]
    parts.append(box(f'{prefix}panel', (w - 0.03, 0.006, 0.09), (0, -d / 2 - 0.002, z0 + h - 0.065), r=0.003, mat=plain_mat('panel', lin(0.88, 0.87, 0.84), 0.25)))
    knob = cylinder(f'{prefix}knob', 0.024, 0.02, (0, 0, 0), segments=48, r=0.004, mat=steel)
    transform(knob, (w / 2 - 0.09, -d / 2 - 0.006, z0 + h - 0.065), (math.radians(90), 0, 0))
    parts.append(knob)
    parts.append(box(f'{prefix}display', (0.12, 0.003, 0.035), (0, -d / 2 - 0.0055, z0 + h - 0.065), r=0.001, mat=glass))
    cz = z0 + h * (0.5 if dryer else 0.45)
    circle = [2 * math.pi * k / 96 for k in range(96)]
    parts.append(tube_path(f'{prefix}ring', [(0.17 * math.cos(a), -d / 2 - 0.02, cz + 0.17 * math.sin(a)) for a in circle], 0.022, steel, cyclic=True))
    door = cylinder(f'{prefix}door', 0.15, 0.03, (0, 0, 0), segments=96, r=0.01, mat=glass, radius_top=0.13)
    transform(door, (0, -d / 2 - 0.035, cz), (math.radians(90), 0, 0))
    parts.append(door)
    parts.append(tube_path(f'{prefix}seal', [(0.185 * math.cos(a), -d / 2 - 0.002, cz + 0.185 * math.sin(a)) for a in circle], 0.008, gasket, cyclic=True))
    return parts


def washer(w=0.6, d=0.6, h=0.85, stacked=False):
    body_d = d - 0.065  # leaves room in the footprint for the door ring
    parts = washer_unit('w', w, body_d, h, 0)
    if stacked:
        parts += washer_unit('d', w, body_d, h, h + 0.01, dryer=True)
    ob = join('washer', parts)
    transform(ob, (0, 0.0325, 0))
    return ob


def vanity(w, d, h=0.85):
    """Floating oak vanity, plaster counter, hand-thrown ceramic vessel basin, wall spout, round
    oak-framed mirror above."""
    wood, counter, cer, steel = oak(), plaster(), ceramic(), black_steel()
    cab_h = 0.42
    z0 = h - cab_h - 0.03
    parts = [box('cabinet', (w, d - 0.01, cab_h), (0, 0.005, z0 + cab_h / 2), r=0.006, mat=wood, grain='x')]
    n = 2 if w > 0.7 else 1
    for i in range(n):
        x = -w / 2 + w / n * (i + 0.5)
        parts.append(box(f'front{i}', (w / n - 0.004, 0.018, cab_h - 0.004), (x, -d / 2 + 0.004, z0 + cab_h / 2), r=0.004, mat=wood, grain='z'))
        px = x + (w / n / 2 - 0.04) * (-1 if (n > 1 and i == 0) else 1)
        parts.append(box(f'pull{i}', (0.012, 0.004, 0.09), (px, -d / 2 - 0.006, z0 + cab_h - 0.08), r=0.002, mat=shadow_gap()))
    parts.append(box('counter', (w + 0.01, d + 0.01, 0.03), (0, 0, h - 0.015), r=0.006, mat=counter, grain='x'))
    bowl_r = min(0.21, w * 0.3)
    bowl = wobbly_drum('bowl', bowl_r, 0.13, cer, 11, segments=96, rings=12, wobble=0.003)
    # Hollow it out: a rounded inner volume leaves a 12 mm wall and a thick base.
    cut(bowl, cylinder('hollow', bowl_r - 0.012, 0.2, (0, 0, 0.03), segments=96, r=0.03))
    transform(bowl, (0, -0.02, h))
    parts.append(bowl)
    parts.append(cylinder('waste', 0.022, 0.004, (0, -0.02, h + 0.03), segments=48, r=0.001, mat=brushed_steel()))
    parts.append(tube_path('spout', [(0, d / 2, h + 0.3), (0, d / 2 - 0.16, h + 0.3), (0, d / 2 - 0.17, h + 0.27)], 0.01, steel))
    mr = min(0.32, w * 0.42)
    mz = h + 0.3 + mr + 0.08
    frame = cylinder('mirrorframe', mr, 0.025, (0, 0, 0), segments=128, r=0.008, mat=wood, grain='x')
    transform(frame, (0, d / 2 - 0.0125, mz), (math.radians(90), 0, 0))
    glass = cylinder('mirror', mr - 0.02, 0.004, (0, 0, 0), segments=128, r=0, mat=mirror_mat())
    # Rotating the cylinder moves its base towards -y; the glass sits just in front of the frame.
    transform(glass, (0, d / 2 - 0.0425, mz), (math.radians(90), 0, 0))
    parts += [frame, glass]
    return join('vanity', parts)


def toilet(w=0.38, d=0.68, h=0.8):
    """Close-coupled ceramic toilet with a soft-close seat and slim cistern."""
    cer = ceramic()
    seat_mat = plain_mat('seat', lin(0.96, 0.955, 0.94), 0.2, coat=0.3)
    parts = [soft_box('pedestal', (0.24, 0.42, 0.34), (0, -0.04, 0.17), r=0.1, cuts=30, taper=0.18, mat=cer)]
    parts.append(soft_box('bowl', (w - 0.01, 0.52, 0.14), (0, -0.07, 0.32), r=0.17, cuts=36, taper=0.06, mat=cer))
    parts.append(soft_box('seat', (w - 0.03, 0.47, 0.016), (0, -0.075, 0.398), r=0.17, cuts=34, mat=seat_mat))
    parts.append(soft_box('lid', (w - 0.045, 0.45, 0.014), (0, -0.068, 0.415), r=0.165, cuts=34, puff=0.004, mat=seat_mat))
    parts.append(soft_box('cistern', (w - 0.02, 0.17, 0.38), (0, d / 2 - 0.085, 0.4 + 0.19), r=0.04, cuts=28, mat=cer))
    parts.append(cylinder('button', 0.025, 0.008, (0, d / 2 - 0.085, h - 0.003), segments=48, r=0.002, mat=brushed_steel()))
    return join('toilet', parts)


def shower_screen(w, h=2.0, d=0.05):
    """Fixed walk-in screen: 8 mm low-iron glass held in a slim black wall profile (on the left
    end) and a floor channel, all within the w x d footprint. There's no stabiliser bar: which wall
    it would brace against depends on the room, and a bar ending in mid-air looks broken."""
    glass, steel = clear_glass(), black_steel()
    profile_w = 0.022
    gw = w - profile_w  # glass runs from the profile to the free end
    gx = -w / 2 + profile_w + gw / 2
    parts = [box('glass', (gw, 0.008, h - 0.012), (gx, 0, 0.012 + (h - 0.012) / 2), r=0.0025, segments=4, mat=glass)]
    # Wall profile: a U-channel the glass slots into, full height.
    parts.append(box('profile', (profile_w, 0.03, h), (-w / 2 + profile_w / 2, 0, h / 2), r=0.002, mat=steel))
    # Floor channel the glass sits in, with a rubber seal line either side of the glass.
    parts.append(box('channel', (gw, 0.026, 0.016), (gx, 0, 0.008), r=0.002, mat=steel))
    for sy in (-1, 1):
        parts.append(box(f'seal{sy}', (gw - 0.004, 0.003, 0.006), (gx, sy * 0.0055, 0.019), r=0.001, mat=rubber()))
    # Polished free edge: a hairline catch-light along the exposed vertical edge of the glass.
    parts.append(box('edge', (0.002, 0.0075, h - 0.02), (w / 2 - 0.001, 0, 0.012 + (h - 0.012) / 2), r=0, mat=plain_mat('glass_edge', lin(0.55, 0.72, 0.66), 0.05, alpha=0.6)))
    return join('shower-screen', parts)


# ---------------------------------------------------------------------------------------------
# Decor


def standing_mirror(w=0.6, h=1.7, d=0.06):
    """Round-topped (arched) mirror in a slim oak frame, leaning back slightly."""
    wood = oak()
    frame = outline_solid('frame', arch_outline(w, h), 0.03, wood, r=0.006, grain='z')
    glass = outline_solid('glass', arch_outline(w, h, inset=0.035), 0.004, mirror_mat(), r=0, smooth=False)
    transform(glass, (0, -0.003, 0))
    ob = join('mirror', [frame, glass])
    transform(ob, (0, 0, 0), (math.radians(-5), 0, 0))
    transform(ob, (0, -0.0885, 0))
    return ob


def wall_art(w, h, d=0.03):
    """Ensō ink painting on rice paper, floated in a slim oak frame."""
    wood = oak()
    art = image_mat('enso', os.path.join(PREPARED, 'enso_color.jpg'), 0.85)
    t = 0.018
    parts = []
    for s in (-1, 1):
        parts.append(box(f'fx{s}', (w, d, t), (0, 0, h / 2 + s * (h / 2 - t / 2)), r=0.003, mat=wood, grain='x'))
        parts.append(box(f'fz{s}', (t, d, h - 2 * t), (s * (w / 2 - t / 2), 0, h / 2), r=0.003, mat=wood, grain='z'))
    parts.append(box('mount', (w - 2 * t, 0.006, h - 2 * t), (0, 0.004, h / 2), r=0, mat=plain_mat('mount', lin(0.93, 0.91, 0.86), 0.9)))
    # The paper is cropped to the frame's proportions so the circle isn't stretched.
    pw, ph = w - 2 * t - 0.08, h - 2 * t - 0.08
    paper = grid('paper', pw, ph, 1, 1, (0, 0, 0), art)
    transform(paper, (0, 0.0, h / 2), (math.radians(90), 0, 0))
    me = paper.data
    uv = me.uv_layers.new(name='UVMap')
    aspect = (pw / ph) / 1.5
    for loop in me.loops:
        co = me.vertices[loop.vertex_index].co
        u = (co.x / pw + 0.5) * min(1, aspect) + (1 - min(1, aspect)) / 2
        v = (co.z - h / 2) / ph + 0.5
        v = v * min(1, 1 / aspect) + (1 - min(1, 1 / aspect)) / 2
        uv.data[loop.index].uv = (u, v)
    parts.append(paper)
    return join('wall-art', parts)


def wall_shelf(w=1.0, d=0.24, h=0.035):
    return join('wall-shelf', [box('shelf', (w, d, h), (0, 0, h / 2), r=0.008, segments=4, mat=oak(), grain='x')])
