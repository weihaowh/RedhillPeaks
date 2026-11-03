"""Modelling, material, preview and export helpers for the wabi-sabi furniture set.

Conventions (match the app's furniture frame after glTF's Y-up conversion):
- Metres. Origin at the centre of the footprint on the floor.
- Width along +X, depth along Y with the FRONT facing -Y (glTF +Z), height along +Z.
- Materials named `tint_fabric__*`, `tint_finish__*` or `tint_appliance__*` carry neutral grey
  textures; the app multiplies in the chosen fabric / finish / appliance colour.
"""
import math
import os
import random

import bmesh
import bpy
from mathutils import Matrix, Vector, noise

HERE = os.path.dirname(os.path.abspath(__file__))
TOOLS = os.path.dirname(HERE)
ROOT = os.path.dirname(os.path.dirname(TOOLS))
PREPARED = os.path.join(TOOLS, 'cache', 'prepared')
PREVIEWS = os.path.join(TOOLS, 'cache', 'previews')
OUT = os.path.join(ROOT, 'public', 'models', 'wabi')
HDRI = os.path.join(TOOLS, 'cache', 'brown_photostudio_02.hdr')

# Preview tints so renders show the default look; exports keep the neutral textures.
PREVIEW_TINT = {
    'oak': (0.76, 0.61, 0.44),
    'ash': (0.85, 0.78, 0.67),
    'linen': (0.85, 0.80, 0.74),
    'boucle': (0.94, 0.91, 0.86),
    'jute': (0.78, 0.70, 0.56),
    'cotton': (0.96, 0.95, 0.93),
}

# ---------------------------------------------------------------------------------------------
# Scene


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    for block in (bpy.data.meshes, bpy.data.materials, bpy.data.images, bpy.data.curves):
        for item in list(block):
            block.remove(item)


def link(ob):
    bpy.context.scene.collection.objects.link(ob)
    return ob


def mesh_object(name, bm, mat=None, smooth=True):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    if smooth:
        for p in me.polygons:
            p.use_smooth = True
    ob = link(bpy.data.objects.new(name, me))
    if mat:
        ob.data.materials.append(mat)
    return ob


def apply_modifiers(ob):
    """Bakes the modifier stack into the mesh (works in background mode)."""
    if not ob.modifiers:
        return ob
    dg = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(ob.evaluated_get(dg), preserve_all_data_layers=True, depsgraph=dg)
    old = ob.data
    ob.modifiers.clear()
    ob.data = me
    bpy.data.meshes.remove(old)
    return ob


def bevel(ob, width, segments=4, angle=40):
    m = ob.modifiers.new('bevel', 'BEVEL')
    m.width = width
    m.segments = segments
    m.limit_method = 'ANGLE'
    m.angle_limit = math.radians(angle)
    m.harden_normals = True
    return apply_modifiers(ob)


def subsurf(ob, levels=2):
    m = ob.modifiers.new('subsurf', 'SUBSURF')
    m.levels = levels
    m.render_levels = levels
    return apply_modifiers(ob)


def transform(ob, loc=(0, 0, 0), rot=(0, 0, 0), scale=None):
    mat = Matrix.Translation(loc) @ Matrix.Rotation(rot[2], 4, 'Z') @ Matrix.Rotation(rot[1], 4, 'Y') @ Matrix.Rotation(rot[0], 4, 'X')
    if scale:
        mat = mat @ Matrix.Diagonal((*scale, 1))
    ob.data.transform(mat)
    return ob


# ---------------------------------------------------------------------------------------------
# Shapes


def box(name, size, loc=(0, 0, 0), r=0.004, segments=5, mat=None, grain='x', tile=0.6):
    """Hard-edged part (wood, stone) with a small rounded bevel."""
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=Vector(size), verts=bm.verts)
    ob = mesh_object(name, bm, mat)
    if r > 0:
        bevel(ob, min(r, min(size) * 0.45), segments)
    transform(ob, loc)
    box_uv(ob, tile, grain)
    return ob


def soft_box(name, size, loc=(0, 0, 0), r=0.05, cuts=18, puff=0.0, wrinkle=0.0, seed=0, mat=None, tile=0.45, sag=0.0, taper=0.0):
    """Upholstered block: a cube re-shaped into an exact rounded box (radius r), optionally
    puffed on top/bottom, sagging in the middle, and wrinkled with low-frequency noise."""
    sx, sy, sz = size
    r = min(r, sx / 2 - 1e-3, sy / 2 - 1e-3, sz / 2 - 1e-3)
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=2.0)
    bmesh.ops.subdivide_edges(bm, edges=bm.edges[:], cuts=cuts, use_grid_fill=True)
    inner = Vector((sx / 2 - r, sy / 2 - r, sz / 2 - r))
    rnd = random.Random(seed)
    off = Vector((rnd.uniform(0, 50), rnd.uniform(0, 50), rnd.uniform(0, 50)))
    for v in bm.verts:
        u = v.co  # in [-1, 1]^3
        # Spread vertices evenly over the surface: map the cube to the box, then round it.
        p = Vector((u.x * sx / 2, u.y * sy / 2, u.z * sz / 2))
        c = Vector((max(-inner.x, min(inner.x, p.x)), max(-inner.y, min(inner.y, p.y)), max(-inner.z, min(inner.z, p.z))))
        d = p - c
        q = c + d.normalized() * r if d.length > 1e-9 else p
        nx, ny = (q.x / (sx / 2)), (q.y / (sy / 2))
        bulge = max(0.0, (1 - nx * nx)) * max(0.0, (1 - ny * ny))
        if puff and abs(q.z) > sz / 2 - r * 1.2:
            q.z += math.copysign(puff * bulge, q.z)
        if sag and q.z > 0:
            q.z -= sag * bulge
        if taper:
            q.x *= 1 - taper * (q.z / sz + 0.5)
        v.co = q
    bm.normal_update()
    if wrinkle:
        # Two octaves of soft creasing, plus a few sharper folds near the edges.
        for v in bm.verts:
            co = v.co + off
            n = noise.noise(co * 6.0) * 0.55 + noise.noise(co * 17.0) * 0.3 + abs(noise.noise(co * Vector((30.0, 30.0, 4.0)))) * 0.25
            v.co += v.normal * n * wrinkle
    ob = mesh_object(name, bm, mat)
    transform(ob, loc)
    box_uv(ob, tile, None)
    return ob


def cylinder(name, radius, height, loc=(0, 0, 0), segments=64, r=0.004, mat=None, radius_top=None, tile=0.6, grain='z'):
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=segments, radius1=radius, radius2=radius if radius_top is None else radius_top, depth=height)
    ob = mesh_object(name, bm, mat)
    if r > 0:
        bevel(ob, min(r, height * 0.4, radius * 0.4), 3, 30)
    transform(ob, (loc[0], loc[1], loc[2] + height / 2))
    box_uv(ob, tile, grain)
    return ob


def tube_path(name, points, radius, mat=None, cyclic=False, resolution=12, tile=0.3):
    """A round tube along a polyline (piping, rods, handles)."""
    cu = bpy.data.curves.new(name, 'CURVE')
    cu.dimensions = '3D'
    cu.bevel_depth = radius
    cu.bevel_resolution = 4
    cu.resolution_u = resolution
    sp = cu.splines.new('POLY')
    sp.points.add(len(points) - 1)
    for p, co in zip(sp.points, points):
        p.co = (*co, 1)
    sp.use_cyclic_u = cyclic
    ob = link(bpy.data.objects.new(name, cu))
    dg = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(ob.evaluated_get(dg), depsgraph=dg)
    bpy.data.objects.remove(ob)
    bpy.data.curves.remove(cu)
    out = link(bpy.data.objects.new(name, me))
    for p in me.polygons:
        p.use_smooth = True
    if mat:
        me.materials.append(mat)
    box_uv(out, tile, None)
    return out


def rounded_rect(w, d, r, z=0.0, steps=8):
    """Points around a rounded rectangle centred on the origin (counter-clockwise)."""
    pts = []
    for cx, cy, a0 in ((w / 2 - r, d / 2 - r, 0), (-w / 2 + r, d / 2 - r, 90), (-w / 2 + r, -d / 2 + r, 180), (w / 2 - r, -d / 2 + r, 270)):
        for i in range(steps + 1):
            a = math.radians(a0 + 90 * i / steps)
            pts.append((cx + r * math.cos(a), cy + r * math.sin(a), z))
    return pts


def piping(name, w, d, r, z, loc=(0, 0, 0), radius=0.004, mat=None):
    pts = [(x + loc[0], y + loc[1], zz + loc[2]) for x, y, zz in rounded_rect(w, d, r, z)]
    return tube_path(name, pts, radius, mat, cyclic=True)


def welts(name, size, loc, r, radius=0.003, mat=None):
    """Piping seams on the top and bottom edges of a soft_box, sitting on its rounded edge."""
    k = r * (1 - math.cos(math.radians(45)))
    out = []
    for s in (1, -1):
        z = loc[2] + s * (size[2] / 2 - k)
        out.append(piping(f'{name}{s}', size[0] - 2 * k, size[1] - 2 * k, r * 0.72, z, (loc[0], loc[1], 0), radius, mat))
    return out


def bend(ob, angle_deg, axis='Z'):
    """Bends an object (long along X) around its origin's Z axis by `angle_deg`."""
    m = ob.modifiers.new('bend', 'SIMPLE_DEFORM')
    m.deform_method = 'BEND'
    m.deform_axis = axis
    m.angle = math.radians(angle_deg)
    return apply_modifiers(ob)


def bend_ring(ob, radius, centre_y):
    """Wraps an object that lies along X around a vertical axis at (0, centre_y): X becomes the
    arc length and local +Y points away from the centre. Gives clean horseshoes and curved rails."""
    me = ob.data
    for v in me.vertices:
        a = v.co.x / radius
        rr = radius + v.co.y
        v.co.x = rr * math.sin(a)
        v.co.y = centre_y + rr * math.cos(a)
    me.update()
    return ob


def cut(ob, cutter):
    """Boolean difference: removes the cutter's volume from `ob`, then deletes the cutter."""
    m = ob.modifiers.new('cut', 'BOOLEAN')
    m.operation = 'DIFFERENCE'
    m.solver = 'EXACT'
    m.object = cutter
    apply_modifiers(ob)
    bpy.data.objects.remove(cutter)
    return ob


def outline_solid(name, pts, depth, mat=None, r=0.004, tile=0.6, grain='z', smooth=True):
    """Extrudes a closed 2D outline (x, z pairs, drawn in the XZ plane) by `depth` along +Y."""
    bm = bmesh.new()
    vs = [bm.verts.new((x, 0, z)) for x, z in pts]
    f = bm.faces.new(vs)
    ext = bmesh.ops.extrude_face_region(bm, geom=[f])
    moved = [e for e in ext['geom'] if isinstance(e, bmesh.types.BMVert)]
    bmesh.ops.translate(bm, vec=Vector((0, depth, 0)), verts=moved)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    ob = mesh_object(name, bm, mat, smooth=smooth)
    if r > 0:
        bevel(ob, r, 3, 30)
    box_uv(ob, tile, grain)
    return ob


def arch_outline(w, h, inset=0.0, steps=40):
    """A round-topped arch (x, z), base on z = 0."""
    rw = w / 2 - inset
    pts = [(-rw, inset), (rw, inset)]
    top = h - inset - rw
    for i in range(steps + 1):
        a = math.pi * i / steps
        pts.append((rw * math.cos(a), top + rw * math.sin(a)))
    return pts


# ---------------------------------------------------------------------------------------------
# UVs


def box_uv(ob, tile=0.5, grain=None):
    """Box-projects UVs in real-world units (1 UV unit = `tile` metres). With `grain` set, wood
    grain (texture V) runs along that axis wherever it lies in the projected plane."""
    me = ob.data
    if not me.uv_layers:
        me.uv_layers.new(name='UVMap')
    bm = bmesh.new()
    bm.from_mesh(me)
    uv = bm.loops.layers.uv.active
    axes = 'xyz'
    g = axes.index(grain) if grain else None
    for f in bm.faces:
        n = f.normal
        a = max(range(3), key=lambda i: abs(n[i]))
        plane = [i for i in range(3) if i != a]
        if g is not None and g in plane:
            vi = g
            ui = plane[0] if plane[1] == g else plane[1]
        else:
            ui, vi = plane
        for loop in f.loops:
            co = loop.vert.co
            loop[uv].uv = (co[ui] / tile, co[vi] / tile)
    bm.to_mesh(me)
    bm.free()


# ---------------------------------------------------------------------------------------------
# Materials

_mats = {}


def srgb_to_linear(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def _img(path, colour):
    img = bpy.data.images.load(path, check_existing=True)
    img.colorspace_settings.name = 'sRGB' if colour else 'Non-Color'
    return img


def tex_mat(kind, tex, normal=1.0, tinted=True, rough_scale=None, tone=None):
    """PBR material from a prepared texture set. kind: 'fabric' | 'finish' (tinted by the item's
    fabric / finish in the app), or 'tone' with a fixed sRGB `tone` hex, e.g. white bedding."""
    if kind == 'tone':
        name = f'tone_{tone}__{tex}'
    else:
        name = f'tint_{kind}__{tex}' if tinted else f'{tex}'
    if name in _mats:
        return _mats[name]
    m = bpy.data.materials.new(name)
    nt = m.node_tree
    nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    bsdf = nt.nodes.new('ShaderNodeBsdfPrincipled')
    nt.links.new(bsdf.outputs['BSDF'], out.inputs['Surface'])
    col = nt.nodes.new('ShaderNodeTexImage')
    col.image = _img(os.path.join(PREPARED, f'{tex}_color.jpg'), True)
    tint_rgb = None
    if kind == 'tone':
        tint_rgb = tuple(int(tone[i:i + 2], 16) / 255 for i in (0, 2, 4))
    elif tinted and tex in PREVIEW_TINT:
        tint_rgb = PREVIEW_TINT[tex]
    if tint_rgb:
        mix = nt.nodes.new('ShaderNodeMix')
        mix.data_type = 'RGBA'
        mix.blend_type = 'MULTIPLY'
        mix.inputs['Factor'].default_value = 1.0
        # Colours multiply in linear space: tint = linear(colour) / linear(80% grey), as in the app.
        t = [srgb_to_linear(c) / srgb_to_linear(0.8) for c in tint_rgb]
        mix.inputs['B'].default_value = (*t, 1)
        nt.links.new(col.outputs['Color'], mix.inputs['A'])
        nt.links.new(mix.outputs['Result'], bsdf.inputs['Base Color'])
        mix['preview_tint'] = True
    else:
        nt.links.new(col.outputs['Color'], bsdf.inputs['Base Color'])
    orm = nt.nodes.new('ShaderNodeTexImage')
    orm.image = _img(os.path.join(PREPARED, f'{tex}_orm.jpg'), False)
    sep = nt.nodes.new('ShaderNodeSeparateColor')
    nt.links.new(orm.outputs['Color'], sep.inputs['Color'])
    nt.links.new(sep.outputs['Green'], bsdf.inputs['Roughness'])
    nt.links.new(sep.outputs['Blue'], bsdf.inputs['Metallic'])
    nor = nt.nodes.new('ShaderNodeTexImage')
    nor.image = _img(os.path.join(PREPARED, f'{tex}_normal.jpg'), False)
    nm = nt.nodes.new('ShaderNodeNormalMap')
    nm.inputs['Strength'].default_value = normal
    nt.links.new(nor.outputs['Color'], nm.inputs['Color'])
    nt.links.new(nm.outputs['Normal'], bsdf.inputs['Normal'])
    if kind == 'fabric':
        bsdf.inputs['Sheen Weight'].default_value = 0.6
        bsdf.inputs['Sheen Roughness'].default_value = 0.6
    _mats[name] = m
    return m


def plain_mat(name, color, rough=0.5, metal=0.0, alpha=1.0, emission=None, emission_strength=0.0, coat=0.0, transmission=0.0):
    if name in _mats:
        return _mats[name]
    m = bpy.data.materials.new(name)
    bsdf = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    bsdf.inputs['Base Color'].default_value = (*color, 1)
    bsdf.inputs['Roughness'].default_value = rough
    bsdf.inputs['Metallic'].default_value = metal
    bsdf.inputs['Coat Weight'].default_value = coat
    bsdf.inputs['Transmission Weight'].default_value = transmission
    if alpha < 1:
        bsdf.inputs['Alpha'].default_value = alpha
        m.surface_render_method = 'BLENDED'
    if emission:
        bsdf.inputs['Emission Color'].default_value = (*emission, 1)
        bsdf.inputs['Emission Strength'].default_value = emission_strength
    _mats[name] = m
    return m


def appliance_mat(preview=(0.93, 0.92, 0.89)):
    """Appliance paint: the app replaces its colour with the item's colour option."""
    return plain_mat('tint_appliance__paint', tuple(srgb_to_linear(c) for c in preview), 0.32, coat=0.4)


def image_mat(name, path, rough=0.6):
    """A material showing a prepared picture (wall art)."""
    if name in _mats:
        return _mats[name]
    m = bpy.data.materials.new(name)
    nt = m.node_tree
    bsdf = next(n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED')
    img = nt.nodes.new('ShaderNodeTexImage')
    img.image = _img(path, True)
    nt.links.new(img.outputs['Color'], bsdf.inputs['Base Color'])
    bsdf.inputs['Roughness'].default_value = rough
    _mats[name] = m
    return m


def strip_preview_tints():
    """Exports carry neutral textures: unhook the preview tint multiply nodes."""
    for m in bpy.data.materials:
        if not m.node_tree:
            continue
        nt = m.node_tree
        for n in list(nt.nodes):
            if n.type == 'MIX' and n.get('preview_tint'):
                src = n.inputs['A'].links[0].from_socket
                dst = n.outputs['Result'].links[0].to_socket
                nt.nodes.remove(n)
                nt.links.new(src, dst)


# ---------------------------------------------------------------------------------------------
# Cloth


def drape(cloth_ob, colliders, frames=40, thickness=0.004, quality=8, pressure=0.0, stiffness=12, pin_group=None):
    """Runs a cloth simulation so fabric settles over `colliders`, then bakes the result."""
    for c in colliders:
        m = c.modifiers.new('collision', 'COLLISION')
        c.collision.thickness_outer = 0.004
        c.collision.cloth_friction = 8
    cl = cloth_ob.modifiers.new('cloth', 'CLOTH')
    s = cl.settings
    s.quality = quality
    s.mass = 0.4
    s.tension_stiffness = stiffness
    s.compression_stiffness = stiffness
    s.shear_stiffness = stiffness * 0.5
    s.bending_stiffness = 0.6
    s.air_damping = 1.5
    if pin_group:
        s.vertex_group_mass = pin_group
    cl.collision_settings.distance_min = thickness
    cl.collision_settings.use_self_collision = True
    cl.collision_settings.self_distance_min = thickness
    sc = bpy.context.scene
    sc.frame_start = 1
    sc.frame_end = frames
    for f in range(1, frames + 1):
        sc.frame_set(f)
    dg = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(cloth_ob.evaluated_get(dg), depsgraph=dg)
    old = cloth_ob.data
    cloth_ob.modifiers.clear()
    cloth_ob.data = me
    bpy.data.meshes.remove(old)
    for c in colliders:
        for m in list(c.modifiers):
            if m.type == 'COLLISION':
                c.modifiers.remove(m)
    sc.frame_set(1)
    return cloth_ob


def grid(name, w, d, cuts_x, cuts_y, loc=(0, 0, 0), mat=None):
    bm = bmesh.new()
    bmesh.ops.create_grid(bm, x_segments=cuts_x, y_segments=cuts_y, size=0.5)
    bmesh.ops.scale(bm, vec=Vector((w, d, 1)), verts=bm.verts)
    ob = mesh_object(name, bm, mat)
    transform(ob, loc)
    return ob


def solidify(ob, thickness):
    m = ob.modifiers.new('solid', 'SOLIDIFY')
    m.thickness = thickness
    m.offset = 0
    return apply_modifiers(ob)


# ---------------------------------------------------------------------------------------------
# Assembly, preview and export


def join(name, objs):
    objs = [o for o in objs if o]
    with bpy.context.temp_override(active_object=objs[0], object=objs[0], selected_objects=objs, selected_editable_objects=objs):
        bpy.ops.object.join()
    ob = objs[0]
    ob.name = name
    ob.data.name = name
    return ob


def stats(ob):
    me = ob.data
    tris = sum(len(p.vertices) - 2 for p in me.polygons)
    lo = Vector((min(v.co[i] for v in me.vertices) for i in range(3)))
    hi = Vector((max(v.co[i] for v in me.vertices) for i in range(3)))
    return tris, hi - lo, lo


def _setup_render(res, samples):
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    prefs = bpy.context.preferences.addons['cycles'].preferences
    # CUDA rather than OptiX: OptiX kernels fail to compile on some drivers.
    prefs.compute_device_type = 'CUDA'
    prefs.get_devices()
    gpus = [d for d in prefs.devices if d.type == 'CUDA']
    for d in prefs.devices:
        d.use = d.type == 'CUDA'
    sc.cycles.device = 'GPU' if gpus else 'CPU'
    sc.cycles.samples = samples
    sc.cycles.use_denoising = True
    sc.render.resolution_x, sc.render.resolution_y = res
    sc.render.film_transparent = False
    sc.view_settings.view_transform = 'AgX'
    sc.view_settings.look = 'AgX - Medium High Contrast'
    sc.view_settings.exposure = -0.7
    world = bpy.data.worlds.new('studio')
    sc.world = world
    nt = world.node_tree
    nt.nodes.clear()
    env = nt.nodes.new('ShaderNodeTexEnvironment')
    env.image = bpy.data.images.load(HDRI, check_existing=True)
    bg = nt.nodes.new('ShaderNodeBackground')
    bg.inputs['Strength'].default_value = 1.0
    out = nt.nodes.new('ShaderNodeOutputWorld')
    nt.links.new(env.outputs['Color'], bg.inputs['Color'])
    nt.links.new(bg.outputs['Background'], out.inputs['Surface'])


def preview(name, ob, views=('three_quarter',), res=(1100, 800), samples=128, extra=None):
    """Renders the object on a studio floor against a plaster wall. Returns PNG paths."""
    os.makedirs(PREVIEWS, exist_ok=True)
    _setup_render(res, samples)
    _, size, lo = stats(ob)
    centre = lo + size / 2
    floor_mat = plain_mat('_preview_floor', (0.62, 0.58, 0.53), 0.75)
    wall_mat = plain_mat('_preview_wall', (0.80, 0.77, 0.72), 0.95)
    floor = box('_floor', (30, 30, 0.02), (0, 0, -0.0101), r=0, mat=floor_mat)
    wall = box('_wall', (30, 0.02, 8), (0, centre.y + size.y / 2 + 0.6, 4), r=0, mat=wall_mat)
    sun = bpy.data.lights.new('key', 'AREA')
    sun.energy = 220
    sun.size = 3
    key = link(bpy.data.objects.new('key', sun))
    key.location = (centre.x - 2.5, centre.y - 2.5, 3.2)
    key.rotation_euler = (math.radians(50), 0, math.radians(-45))
    cam_data = bpy.data.cameras.new('cam')
    cam_data.lens = 50
    cam = link(bpy.data.objects.new('cam', cam_data))
    bpy.context.scene.camera = cam
    radius = max(size.length / 2, 0.25)
    dirs = {
        'three_quarter': Vector((-0.75, -1.0, 0.55)),
        'front': Vector((0, -1, 0.25)),
        'side': Vector((-1, -0.15, 0.3)),
        'top': Vector((-0.2, -0.5, 1.4)),
        'detail': Vector((-0.6, -1.0, 0.7)),
    }
    paths = []
    for v in views:
        d = dirs[v].normalized()
        dist = radius / math.tan(math.radians(17)) * (0.45 if v == 'detail' else 1.05)
        target = centre + (Vector((size.x * 0.25, 0, size.z * 0.15)) if v == 'detail' else Vector())
        cam.location = target + d * dist
        cam.rotation_euler = (-d).to_track_quat('-Z', 'Y').to_euler()
        path = os.path.join(PREVIEWS, f'{name}_{v}.png')
        bpy.context.scene.render.filepath = path
        bpy.ops.render.render(write_still=True)
        paths.append(path)
    for o in (floor, wall, key, cam):
        bpy.data.objects.remove(o)
    return paths


def export(name, ob):
    """Writes public/models/wabi/<name>.gltf (+ .bin), textures shared in textures/."""
    os.makedirs(OUT, exist_ok=True)
    strip_preview_tints()
    for o in bpy.context.scene.objects:
        o.select_set(o == ob)
    bpy.context.view_layer.objects.active = ob
    bpy.ops.export_scene.gltf(
        filepath=os.path.join(OUT, f'{name}.gltf'),
        export_format='GLTF_SEPARATE',
        export_texture_dir='textures',
        export_image_format='AUTO',
        use_selection=True,
        export_apply=True,
        export_yup=True,
        export_materials='EXPORT',
        export_draco_mesh_compression_enable=True,
        export_draco_mesh_compression_level=6,
        export_draco_position_quantization=14,
        export_draco_normal_quantization=10,
        export_draco_texcoord_quantization=12,
    )
    tris, size, _ = stats(ob)
    return tris, size
