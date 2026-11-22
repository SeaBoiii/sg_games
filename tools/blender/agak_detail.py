"""Agak Agak hand-detail pass (Blender, agak-scene.blend open): kaya toast, spoon, tissue pack, stool lips.

    exec(open(r'<repo>/tools/blender/agak_detail.py').read())
    print(detail_agak())
"""
import bpy, bmesh, math, os
from mathutils import Vector, Matrix

TOOLS = r'C:\Users\seabo\Documents\GitHub\sg_games\tools\blender'


def _ns(scene):
    ns = {'SC': scene}
    exec(open(os.path.join(TOOLS, 'sg_cast.py')).read(), ns)
    return ns


def rounded_poly(pts, rf, arc_n=5):
    n = len(pts); out = []
    norms = []
    for i in range(n):
        a, b = pts[i], pts[(i + 1) % n]
        d = (b - a).normalized(); norms.append(Vector((d.y, -d.x)))
    for i in range(n):
        n_prev, n_next = norms[i - 1], norms[i]
        bis = (n_prev + n_next).normalized()
        c = pts[i] - bis * (rf / max(0.2, bis.dot(n_next)))
        a0 = math.atan2(n_prev.y, n_prev.x); a1 = math.atan2(n_next.y, n_next.x)
        while a1 < a0: a1 += 2 * math.pi
        for k in range(arc_n + 1):
            a = a0 + (a1 - a0) * k / arc_n
            out.append(c + Vector((math.cos(a), math.sin(a))) * rf)
    return out


def slab(g, name, outline, z0, z1, m_top, m_side, bev=0.0, segs=2, wobble=0.0):
    bm = bmesh.new()
    vs = [bm.verts.new((p.x, p.y, z0)) for p in outline]
    f = bm.faces.new(vs)
    res = bmesh.ops.extrude_face_region(bm, geom=[f])
    for v in [e for e in res['geom'] if isinstance(e, bmesh.types.BMVert)]:
        v.co.z = z1
    if wobble:
        for v in bm.verts:
            if abs(v.co.z - z1) < 1e-7:
                a = math.atan2(v.co.y, v.co.x)
                v.co.z += wobble * math.sin(a * 5)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    if bev > 0:
        bottom = lambda v: abs(v.co.z - z0) < 1e-7
        rim = [e for e in bm.edges if bottom(e.verts[0]) == bottom(e.verts[1])]   # cap outlines, not the side walls
        bmesh.ops.bevel(bm, geom=rim, offset=bev, offset_type='OFFSET', segments=segs, profile=0.5, affect='EDGES', clamp_overlap=True)
    bm.normal_update()
    for f in bm.faces:
        f.material_index = 0 if abs(f.normal.z) > 0.6 else 1
    uvl = bm.loops.layers.uv.new('UVMap')
    for f in bm.faces:
        ax = max(range(3), key=lambda i: abs(f.normal[i]))
        a, b = ((1, 2), (0, 2), (0, 1))[ax]
        for l in f.loops: l[uvl].uv = (l.vert.co[a] / 0.05, l.vert.co[b] / 0.05)
    o = g['_emit'](bm, name, None, m_top, 40)
    o.data.materials.append(m_side)
    return o


def _take(o, new):
    """Give object o the geometry of new (built in o's local space), drop new."""
    old = o.data
    o.data = new.data
    bpy.data.objects.remove(new, do_unlink=True)
    if old.users == 0: bpy.data.meshes.remove(old)
    o.modifiers.clear()
    o['hd'] = 1


def detail_agak():
    sc = bpy.data.objects['TableTop'].users_scene[0]
    g = _ns(sc)
    V, solid = g['V'], g['solid']
    out = {}
    # --- kaya toast: rounded triangles with crust, a wavy kaya layer and a cold butter slab ---
    m_toast = bpy.data.materials['Toast']; m_kaya = bpy.data.materials['Kaya']; m_butter = bpy.data.materials['Butter']
    crust = solid('ToastCrust', '#8A5226', 0.7)
    tri = [Vector((-0.045, -0.03)), Vector((0.045, -0.03)), Vector((0.0, 0.035))]
    outline = rounded_poly(tri, 0.008, 5)
    kaya_out = rounded_poly([p * 0.93 for p in tri], 0.006, 4)
    for side in 'AB':
        _take(bpy.data.objects[f'Toast{side}0'], slab(g, 'tmp', outline, 0.016, 0.028, m_toast, crust, bev=0.0025))
        _take(bpy.data.objects[f'Toast{side}3'], slab(g, 'tmp', outline, 0.036, 0.049, m_toast, crust, bev=0.003))
        _take(bpy.data.objects[f'Toast{side}1'], slab(g, 'tmp', kaya_out, 0.028, 0.0345, m_kaya, m_kaya, bev=0.0015, wobble=0.0008))
        b = bpy.data.objects[f'Toast{side}2']; b.scale = (1, 1, 1)
        _take(b, g['rbox']('tmp', None, m_butter, (0.004, -0.004, 0.0355), (0.034, 0.024, 0.006), 0.0018, segs=2))
    # --- teaspoon ---
    sp = bpy.data.objects['Spoon']; sp.scale = (1, 1, 1)
    steel = sp.data.materials[0]
    parts = [g['ellipsoid']('tmp', None, steel, (0.022, 0, 0.0), 0.011, (1.5, 1.0, 0.28), seg=20),
             g['capsule']('tmp', None, steel, V(-0.04, 0, 0.002), V(0.008, 0, 0.0005), 0.0032, 0.0026, seg=8, n=2, caprings=2)]
    _take(sp, _join(parts))
    # --- pocket tissue pack: puffy pillow with crimped ends ---
    for nm, x0, x1, k in (('TissuePacket', -0.055, 0.055, 1.0), ('TissueBand', -0.0175, 0.0175, 1.04)):
        o = bpy.data.objects[nm]; m = o.data.materials[0]; o.scale = (1, 1, 1)
        secs = []
        n = 11 if nm == 'TissuePacket' else 4
        for i in range(n):
            t = i / (n - 1); x = x0 + (x1 - x0) * t
            u = abs(x) / 0.055; puff = max(0.0, 1 - u ** 3)
            secs.append((V(x, 0, 0), V(0, 1, 0), V(0, 0, 1), 0.0375 * (0.94 + 0.06 * puff) * k, (0.003 + 0.008 * puff) * k, 3.2, 3.2))
        _take(o, g['loft']('tmp', None, m, secs, seg=20, sm=60))
    # --- red plastic stools: rolled lip, foot ring and ribs, merged into each stool ---
    for nm in ('StoolA', 'StoolB', 'StoolC'):
        st = bpy.data.objects[nm]; m = st.data.materials[0]
        zs = [v.co.z for v in st.data.vertices]; top, bot = max(zs), min(zs)
        r_at = lambda z0, z1: max(math.hypot(v.co.x, v.co.y) for v in st.data.vertices if z0 <= v.co.z <= z1)
        rt, rb = r_at(top - 0.012, top), r_at(bot, bot + 0.012)
        parts = [g['torus']('tmp', None, m, (0, 0, top - 0.008), rt * 0.99, 0.009, segR=40, segr=8),
                 g['torus']('tmp', None, m, (0, 0, bot + 0.012), rb * 0.99, 0.012, segR=40, segr=8),
                 g['torus']('tmp', None, m, (0, 0, top + 0.002), rt * 0.6, 0.004, segR=32, segr=6)]
        for i in range(8):
            a = i / 8 * 2 * math.pi + math.pi / 8
            parts.append(g['rbox']('tmp', None, m, (math.cos(a) * rb * 0.98, math.sin(a) * rb * 0.98, bot + 0.05), (0.012, 0.02, 0.06), 0.005, rot=(0, 0, a), segs=2))
        extra = _join(parts)
        _merge_into(st, extra)
    out['tris'] = sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in sc.objects if o.type == 'MESH')
    return out


def _join(objs):
    sc = objs[0].users_scene[0]
    win = bpy.context.window or bpy.context.window_manager.windows[0]
    if win.scene != sc: win.scene = sc
    with bpy.context.temp_override(window=win, scene=sc, view_layer=sc.view_layers[0], active_object=objs[0], object=objs[0],
                                   selected_objects=objs, selected_editable_objects=objs):
        bpy.ops.object.join()
    return objs[0]


def _merge_into(target, part):
    """part is built in target's local space; bake target's modifiers, then join."""
    dg = bpy.context.evaluated_depsgraph_get()
    if target.modifiers:
        me = bpy.data.meshes.new_from_object(target.evaluated_get(dg)); target.modifiers.clear(); target.data = me
    part.matrix_world = target.matrix_world
    _join([target, part])
