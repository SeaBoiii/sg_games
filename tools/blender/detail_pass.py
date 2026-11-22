"""SG Games — 3D detail pass (run inside Blender).

Opens a game's source .blend, raises the geometric detail of every exported asset and re-exports the
GLB with the same root names, so the game code needs no changes.

  * cylinders, cones, UV spheres and tori made from primitives are rebuilt with more segments,
    sized to how big they really are (tiny bulbs stay light, big table tops get very round);
  * bevelled boxes get more bevel segments;
  * smooth organic meshes (characters, lathed shapes, custom bmesh parts) get a subdivision level;
  * flat display surfaces (screens, tiles, signs, text) are left exactly as they are.

Usage from the Blender MCP:
    exec(open(r'<repo>/tools/blender/detail_pass.py').read())
    upgrade_game(r'<repo>/games/<game>/models/<file>.glb', r'<repo>/games/<game>/models/source/<file>.blend')
"""
import bpy, bmesh, json, math, os, struct
from mathutils import Vector

SKIP_WORDS = ('screen', 'tile', 'logo', 'face', 'board', 'sign', 'tag', 'text', 'label', 'plate_text', 'card_', 'decal')


def glb_roots(path):
    with open(path, 'rb') as f:
        data = f.read()
    n = struct.unpack_from('<I', data, 12)[0]
    j = json.loads(data[20:20 + n].decode('utf8'))
    return [j['nodes'][i]['name'] for i in j['scenes'][j.get('scene', 0)]['nodes']]


def world_scale(objs):
    s = 0.0
    for o in objs:
        ws = o.matrix_world.to_scale()
        s = max(s, abs(ws.x), abs(ws.y), abs(ws.z))
    return s or 1.0


def segs_for(radius_world, lo=16, hi=72, k=420):
    return int(max(lo, min(hi, round(radius_world * k / 4) * 4)))


def classify(me):
    nv, nf = len(me.vertices), len(me.polygons)
    sizes = [len(p.vertices) for p in me.polygons]
    ngons = [p for p in me.polygons if len(p.vertices) > 4]
    tris = sizes.count(3)
    co = [v.co for v in me.vertices]
    # cylinder / frustum from primitive_cylinder_add or primitive_cone_add(radius2>0)
    if len(ngons) == 2 and len(ngons[0].vertices) == len(ngons[1].vertices):
        k = len(ngons[0].vertices)
        if nv == 2 * k and nf == k + 2:
            a, b = ngons
            ca = sum((co[i] for i in a.vertices), Vector()) / k
            cb = sum((co[i] for i in b.vertices), Vector()) / k
            if abs(ca.x - cb.x) < 1e-4 and abs(ca.y - cb.y) < 1e-4:
                ra = sum(((co[i] - ca).length for i in a.vertices)) / k
                rb = sum(((co[i] - cb).length for i in b.vertices)) / k
                lo, hi = (ca, cb) if ca.z < cb.z else (cb, ca)
                r_lo, r_hi = (ra, rb) if ca.z < cb.z else (rb, ra)
                return ('cyl', k, dict(r1=r_lo, r2=r_hi, depth=hi.z - lo.z, z=(hi.z + lo.z) / 2))
    # cone with a point (radius2 = 0)
    if len(ngons) == 1 and nv == len(ngons[0].vertices) + 1 and nf == nv and tris == nv - 1:
        k = len(ngons[0].vertices)
        base = sum((co[i] for i in ngons[0].vertices), Vector()) / k
        tip = [co[i] for i in range(nv) if i not in set(ngons[0].vertices)][0]
        if abs(base.x - tip.x) < 1e-4 and abs(base.y - tip.y) < 1e-4:
            r = sum(((co[i] - base).length for i in ngons[0].vertices)) / k
            return ('cone', k, dict(r1=r if base.z < tip.z else 0.0, r2=0.0 if base.z < tip.z else r, depth=abs(tip.z - base.z), z=(tip.z + base.z) / 2))
    # UV sphere: 2·s triangles at the poles, the rest quads
    if not ngons and tris >= 6 and tris % 2 == 0:
        s = tris // 2
        if (nv - 2) % s == 0:
            r = (nv - 2) // s + 1
            if nf == s * r:
                c = sum(co, Vector()) / nv
                ds = [(v - c).length for v in co]
                rad = max(ds)
                # a real sphere: every vertex sits on the same radius
                if rad > 0 and (rad - min(ds)) < rad * 0.03:
                    return ('sphere', s, dict(radius=rad, rings=r, center=c))
    # torus from primitive_torus_add: all quads, verts == faces
    if not ngons and tris == 0 and nv == nf and nv >= 48:
        rxy = [math.hypot(v.x, v.y) for v in co]
        zs = [v.z for v in co]
        R, r = (max(rxy) + min(rxy)) / 2, (max(rxy) - min(rxy)) / 2
        if r > 0 and abs((max(zs) - min(zs)) / 2 - r) < r * 0.08 and R > r:
            return ('torus', nv, dict(R=R, r=r))
    return (None, 0, {})


def _swap(old, new):
    for m in old.materials:
        new.materials.append(m)
    for o in [o for o in bpy.data.objects if o.data == old]:
        o.data = new
    for p in new.polygons:
        p.use_smooth = True
    try:
        new.set_sharp_from_angle(angle=math.radians(50))
    except Exception:
        pass
    name = old.name
    bpy.data.meshes.remove(old)
    new.name = name


def _tmp_from_ops(fn):
    fn()
    o = bpy.context.active_object
    me = o.data
    bpy.data.objects.remove(o, do_unlink=True)
    return me


def rebuild(me, kind, info, scale):
    if kind in ('cyl', 'cone'):
        r = max(info['r1'], info['r2'])
        segs = segs_for(r * scale)
        if segs <= len(me.polygons) - 2 if kind == 'cyl' else segs <= len(me.vertices) - 1:
            return False
        new = bpy.data.meshes.new(me.name + '_hd')
        bm = bmesh.new()
        bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=segs, radius1=max(info['r1'], 1e-5) if info['r1'] > 0 else 0.0,
                              radius2=info['r2'] if info['r2'] > 0 else 0.0, depth=info['depth'], calc_uvs=True)
        bmesh.ops.translate(bm, verts=bm.verts, vec=Vector((0, 0, info['z'])))
        bm.to_mesh(new); bm.free()
        _swap(me, new)
        return True
    if kind == 'sphere':
        segs = segs_for(info['radius'] * scale, lo=16, hi=64, k=520)
        if segs <= info.get('s', 0) or segs <= len([p for p in me.polygons if len(p.vertices) == 3]) // 2:
            return False
        rings = max(8, segs // 2)
        new = bpy.data.meshes.new(me.name + '_hd')
        bm = bmesh.new()
        bmesh.ops.create_uvsphere(bm, u_segments=segs, v_segments=rings, radius=info['radius'], calc_uvs=True)
        bmesh.ops.translate(bm, verts=bm.verts, vec=info['center'])
        bm.to_mesh(new); bm.free()
        _swap(me, new)
        return True
    if kind == 'torus':
        major = segs_for((info['R'] + info['r']) * scale, lo=32, hi=96, k=600)
        minor = int(max(10, min(24, round(info['r'] * scale * 900))))
        if major * minor <= len(me.vertices):
            return False
        new = _tmp_from_ops(lambda: bpy.ops.mesh.primitive_torus_add(major_radius=info['R'], minor_radius=info['r'], major_segments=major, minor_segments=minor))
        _swap(me, new)
        return True
    return False


def lathe_profile(me, tol=1e-4):
    """If the mesh is a surface of revolution about local Z, return (segments, ordered rings, angle0).

    rings: [(radius, z)], each ring having `segments` vertices (or a single pole on the axis).
    """
    co = [v.co for v in me.vertices]
    if len(co) < 12 or any(len(p.vertices) > 4 for p in me.polygons):
        return None
    key = lambda v: (round(math.hypot(v.x, v.y), 4), round(v.z, 4))
    groups = {}
    for i, v in enumerate(co):
        groups.setdefault(key(v), []).append(i)
    counts = sorted(set(len(g) for g in groups.values()))
    n = max(counts)
    if n < 6 or any(c not in (1, n) for c in counts):
        return None
    if any(len(g) == 1 and k[0] > tol * 10 for k, g in groups.items()):
        return None  # a lone vertex off the axis: not a clean lathe
    # each ring must really be evenly spread round the axis
    for k, g in groups.items():
        if len(g) == n and k[0] > 1e-3:
            angs = sorted(math.atan2(co[i].y, co[i].x) for i in g)
            gaps = [(angs[(j + 1) % n] - angs[j]) % (2 * math.pi) for j in range(n)]
            if max(gaps) - min(gaps) > 0.05:
                return None
    ring_of = {}
    for ri, (k, g) in enumerate(groups.items()):
        for i in g:
            ring_of[i] = ri
    keys = list(groups.keys())
    adj = {ri: set() for ri in range(len(keys))}
    for e in me.edges:
        a, b = ring_of[e.vertices[0]], ring_of[e.vertices[1]]
        if a != b:
            adj[a].add(b); adj[b].add(a)
    if any(len(s) > 2 for s in adj.values()):
        return None
    ends = [r for r, s in adj.items() if len(s) <= 1]
    if not ends:
        return None
    order, prev, cur = [ends[0]], None, ends[0]
    while True:
        nxt = [x for x in adj[cur] if x != prev]
        if not nxt:
            break
        prev, cur = cur, nxt[0]
        order.append(cur)
    if len(order) != len(keys):
        return None
    big = [i for k, g in groups.items() if len(g) == n and k[0] > 1e-3 for i in g]
    a0 = math.atan2(co[big[0]].y, co[big[0]].x) if big else 0.0
    return n, [keys[r] for r in order], [len(groups[keys[r]]) == 1 for r in order], a0


def relathe(me, scale):
    prof = lathe_profile(me)
    if not prof:
        return False
    n, rings, poles, a0 = prof
    rmax = max(r for r, z in rings)
    segs = segs_for(rmax * scale)
    if segs <= n:
        return False
    a0 = a0 % (2 * math.pi / n)
    bm = bmesh.new()
    vrings = []
    for (r, z), pole in zip(rings, poles):
        if pole:
            vrings.append([bm.verts.new((0, 0, z))])
        else:
            vrings.append([bm.verts.new((r * math.cos(a0 + 2 * math.pi * i / segs), r * math.sin(a0 + 2 * math.pi * i / segs), z)) for i in range(segs)])
    uv = bm.loops.layers.uv.new('UVMap')
    for A, B in zip(vrings, vrings[1:]):
        for i in range(segs):
            if len(A) == 1 and len(B) == 1:
                continue
            if len(A) == 1:
                f = bm.faces.new([A[0], B[i], B[(i + 1) % segs]])
            elif len(B) == 1:
                f = bm.faces.new([A[i], A[(i + 1) % segs], B[0]])
            else:
                f = bm.faces.new([A[i], A[(i + 1) % segs], B[(i + 1) % segs], B[i]])
            for l in f.loops:
                c = l.vert.co
                l[uv].uv = ((math.atan2(c.y, c.x) / (2 * math.pi)) % 1.0, c.z * 2)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-6)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    new = bpy.data.meshes.new(me.name + '_hd')
    bm.to_mesh(new); bm.free()
    _swap(me, new)
    return True


def _in_char(o):
    while o is not None:
        if o.name.startswith('Char_'):
            return True
        o = o.parent
    return False


def upgrade_objects(objs):
    """Characters (anything under a Char_* root) are skipped: tools/blender/sg_cast.py builds them."""
    stats = dict(cyl=0, cone=0, sphere=0, torus=0, bevel=0, subsurf=0)
    by_mesh = {}
    for o in objs:
        if o.type == 'MESH' and not _in_char(o) and not o.get('hd'):
            by_mesh.setdefault(o.data.name, []).append(o)
    for name, users in by_mesh.items():
        me = bpy.data.meshes.get(name)
        if me is None:
            continue
        lname = name.lower() + ' ' + ' '.join(u.name.lower() for u in users)
        if any(w in lname for w in SKIP_WORDS):
            continue
        kind, k, info = classify(me)
        if kind:
            info['s'] = k if kind == 'sphere' else 0
            if rebuild(me, kind, info, world_scale(users)):
                stats[kind] += 1
            continue
        if relathe(me, world_scale(users)):
            stats['lathe'] = stats.get('lathe', 0) + 1
            continue
        # organic / custom meshes: one level of subdivision if they are smooth, not tiny and not already dense
        ngons = sum(1 for p in me.polygons if len(p.vertices) > 4)
        smooth = sum(1 for p in me.polygons if p.use_smooth) > len(me.polygons) * 0.6
        if smooth and ngons == 0 and 64 <= len(me.polygons) <= 2500:
            for u in users:
                if not any(m.type == 'SUBSURF' for m in u.modifiers) and not any(m.type == 'BEVEL' for m in u.modifiers):
                    md = u.modifiers.new('Detail', 'SUBSURF')
                    md.levels = 1
                    md.render_levels = 1
                    md.uv_smooth = 'PRESERVE_BOUNDARIES'
                    md.boundary_smooth = 'PRESERVE_CORNERS'
                    stats['subsurf'] += 1
    # every bevelled box gets smoother edges
    for o in objs:
        for m in o.modifiers:
            if m.type == 'BEVEL' and m.segments < 5:
                m.segments = 5
                stats['bevel'] += 1
    return stats


def open_game(blend_path):
    """Step 1 (its own MCP call): load the game's source file."""
    bpy.ops.wm.open_mainfile(filepath=blend_path)
    return bpy.data.filepath


def upgrade_game(glb_path, blend_path, export=True):
    """Step 2 (a separate MCP call, after open_game): upgrade, export, save."""
    if os.path.normcase(bpy.data.filepath) != os.path.normcase(blend_path):
        raise RuntimeError('open_game(blend_path) first, in its own call')
    roots = glb_roots(glb_path)
    missing = [r for r in roots if r not in bpy.data.objects]
    objs_root = [bpy.data.objects[r] for r in roots if r in bpy.data.objects]
    scene = objs_root[0].users_scene[0]
    win = bpy.context.window or bpy.context.window_manager.windows[0]
    win.scene = scene
    objs = []
    for r in objs_root:
        objs += [r] + list(r.children_recursive)
    for o in objs:
        if o.name not in scene.objects:
            scene.collection.objects.link(o)
    stats = upgrade_objects(objs)
    if export:
        bpy.ops.object.select_all(action='DESELECT')
        for o in objs:
            o.select_set(True)
        bpy.ops.export_scene.gltf(filepath=glb_path, export_format='GLB', use_selection=True, export_apply=True,
                                  export_draco_mesh_compression_enable=True, export_draco_mesh_compression_level=6, export_yup=True)
        bpy.ops.wm.save_as_mainfile(filepath=blend_path)
    return dict(roots=len(roots), missing=missing, stats=stats, size_kb=round(os.path.getsize(glb_path) / 1024))
