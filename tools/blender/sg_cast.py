"""SG cast v2: the higher-detail generator for the shared Singapore characters.

Builds Char_<key>_Stand / Char_<key>_Sit roots (an empty at the feet with one joined
mesh child, <root>_Mesh) in the scene SC. Every part is built straight in root-local
coordinates with world-scale UVs (TILE metres per texture repeat), then all parts are
joined. The characters keep the joint positions of the first version, so they still
fit the seats, podiums and props of every game.

Run inside Blender with mrt-assets.blend open (it holds the materials and mr_specs):
    ns = {'SC': bpy.data.scenes['MRTRush']}
    exec(open(r'...\\tools\\blender\\sg_cast.py').read(), ns)
    ns['rebuild_all']()
"""
import bpy, bmesh, math
from mathutils import Vector, Matrix, Quaternion, Euler
from mathutils.bvhtree import BVHTree

try:
    SC
except NameError:
    SC = bpy.data.scenes['MRTRush']
TILE = 0.065


def V(x, y, z):
    return Vector((x, y, z))


# ------------------------------------------------------------------ materials
def lin(c): return ((c + 0.055) / 1.055) ** 2.4 if c > 0.04045 else c / 12.92
def hexrgb(h): return tuple(int(h[i:i + 2], 16) / 255 for i in (1, 3, 5))


def mix_hex(a, b, t):
    A, B = hexrgb(a), hexrgb(b)
    return '#' + ''.join('%02X' % round((A[i] * (1 - t) + B[i] * t) * 255) for i in range(3))


def solid(name, hexc, rough=0.6, metal=0.0):
    m = bpy.data.materials.get(name)
    if m: return m
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    c = tuple(lin(x) for x in hexrgb(hexc))
    b.inputs['Base Color'].default_value = (*c, 1); b.inputs['Roughness'].default_value = rough; b.inputs['Metallic'].default_value = metal
    m.diffuse_color = (*c, 1)
    return m


def empty(name, loc=(0, 0, 0)):
    old = bpy.data.objects.get(name)
    if old:
        for c in list(old.children_recursive): bpy.data.objects.remove(c, do_unlink=True)
        bpy.data.objects.remove(old, do_unlink=True)
    e = bpy.data.objects.new(name, None); SC.collection.objects.link(e); e.location = loc
    return e


def rotm(rot):
    if rot is None: return Matrix.Identity(4)
    if isinstance(rot, Matrix): return rot.to_4x4() if len(rot) == 3 else rot.copy()
    if isinstance(rot, Quaternion): return rot.to_matrix().to_4x4()
    return Euler(rot).to_matrix().to_4x4()


def normal_frame(n, spin=0.0):
    """3x3 rotation whose local -Y points along the surface normal n (thin parts lie flat on a surface)."""
    m = n.to_track_quat('-Y', 'Z').to_matrix()
    return m @ Matrix.Rotation(spin, 3, 'Y')


def se_xy(a, n):
    c, s = math.cos(a), math.sin(a)
    if n == 2.0: return c, s
    e = 2.0 / n
    return math.copysign(abs(c) ** e, c), math.copysign(abs(s) ** e, s)


# ------------------------------------------------------------------ mesh core
def _emit(bm, name, root, m, sm=60):
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(name, me)
    o['hd'] = 1   # already detailed: detail_pass.py leaves it alone
    SC.collection.objects.link(o)
    if m is not None: me.materials.append(m)
    for p in me.polygons: p.use_smooth = True
    if sm is not None and sm < 180:
        try: me.set_sharp_from_angle(angle=math.radians(sm))
        except Exception: pass
    o.parent = root
    return o


def _skin(rows, closed_u=True, closed_v=False, vwrap=None):
    """Stitch rings (and poles) into faces. ring u lists hold one more entry than points when closed."""
    bm = bmesh.new(); uvl = bm.loops.layers.uv.new('UVMap')
    built = []
    for r in rows:
        if r['kind'] == 'pole': built.append(('pole', bm.verts.new(r['pt']), r['v']))
        else: built.append(('ring', [bm.verts.new(p) for p in r['pts']], r['u'], r['v']))

    def face(vs, uvs):
        try: f = bm.faces.new(vs)
        except ValueError: return
        for l, uv in zip(f.loops, uvs): l[uvl].uv = uv

    pairs = [(built[i], built[i + 1], None) for i in range(len(built) - 1)]
    if closed_v: pairs.append((built[-1], built[0], vwrap))
    for A, B, vb in pairs:
        if A[0] == 'pole' and B[0] == 'pole': continue
        n = len(A[1]) if A[0] == 'ring' else len(B[1])
        cnt = n if closed_u else n - 1
        for i in range(cnt):
            j = (i + 1) % n
            if A[0] == 'ring' and B[0] == 'ring':
                bv = B[3] if vb is None else vb
                face([A[1][i], A[1][j], B[1][j], B[1][i]], [(A[2][i], A[3]), (A[2][i + 1], A[3]), (B[2][i + 1], bv), (B[2][i], bv)])
            elif A[0] == 'pole':
                face([A[1], B[1][j], B[1][i]], [((B[2][i] + B[2][i + 1]) / 2, A[2]), (B[2][i + 1], B[3]), (B[2][i], B[3])])
            else:
                face([A[1][i], A[1][j], B[1]], [(A[2][i], A[3]), (A[2][i + 1], A[3]), ((A[2][i] + A[2][i + 1]) / 2, B[2])])
    return bm


def _ring_u(pts, closed=True):
    us = [0.0]; L = 0.0
    loop = pts + [pts[0]] if closed else pts
    for i in range(1, len(loop)):
        L += (loop[i] - loop[i - 1]).length; us.append(L / TILE)
    return us


def revolve(name, root, m, prof, seg=32, xf=None, sx=1.0, sy=1.0, n=2.0, arc=None, closed_prof=False,
            deform=None, amod=None, sm=60, a0=math.pi / 2):
    """Spin a (r, z) profile round local Z. Cross-section is a superellipse (exponent n) scaled by sx, sy."""
    xf = xf if xf is not None else Matrix.Identity(4)
    closed_u = arc is None
    if closed_u: angs = [a0 + 2 * math.pi * i / seg for i in range(seg)]
    else: angs = [arc[0] + (arc[1] - arc[0]) * i / seg for i in range(seg + 1)]
    unit = [se_xy(a, n) for a in angs]
    rows = []; vacc = 0.0; prev = None; rs = (sx + sy) / 2; N = len(prof)
    for k, (r, z) in enumerate(prof):
        if prev is not None: vacc += math.hypot((r - prev[0]) * rs, z - prev[1])
        prev = (r, z); v = vacc / TILE
        if r <= 1e-7 and not closed_prof:
            p = V(0, 0, z)
            if deform: p = deform(p)
            rows.append(dict(kind='pole', pt=xf @ p, v=v)); continue
        t = k / max(1, N - 1); pts = []
        for i, (ux, uy) in enumerate(unit):
            rr = r * (amod(angs[i], t) if amod else 1.0)
            p = V(rr * sx * ux, rr * sy * uy, z)
            if deform: p = deform(p)
            pts.append(xf @ p)
        rows.append(dict(kind='ring', pts=pts, u=_ring_u(pts, closed_u), v=v))
    vwrap = None
    if closed_prof:
        vwrap = (vacc + math.hypot((prof[0][0] - prev[0]) * rs, prof[0][1] - prev[1])) / TILE
    return _emit(_skin(rows, closed_u, closed_prof, vwrap), name, root, m, sm)


def ellipsoid(name, root, m, c, r, scale=(1, 1, 1), seg=24, rot=None, deform=None, sm=80, rings=None):
    rings = rings or max(6, seg // 2)
    prof = [(r * math.sin(math.pi * i / rings), -r * math.cos(math.pi * i / rings)) for i in range(rings + 1)]
    prof[0] = (0.0, -r); prof[-1] = (0.0, r)
    xf = Matrix.Translation(Vector(c)) @ rotm(rot) @ Matrix.Diagonal((*scale, 1.0))
    return revolve(name, root, m, prof, seg, xf=xf, deform=deform, sm=sm)


def torus(name, root, m, c, R, r, rot=None, segR=32, segr=10, sm=80):
    prof = [(R + r * math.cos(2 * math.pi * i / segr), r * math.sin(2 * math.pi * i / segr)) for i in range(segr)]
    return revolve(name, root, m, prof, segR, xf=Matrix.Translation(Vector(c)) @ rotm(rot), closed_prof=True, sm=sm)


def cylinder(name, root, m, p0, p1, r, seg=16, bev=None, sm=40):
    p0, p1 = Vector(p0), Vector(p1); d = p1 - p0; L = d.length
    b = min(r * 0.18 if bev is None else bev, L * 0.45, r * 0.5)
    prof = [(0.0, 0.0), (r - b, 0.0), (r, b), (r, L - b), (r - b, L), (0.0, L)]
    q = d.normalized().to_track_quat('Z', 'Y')
    return revolve(name, root, m, prof, seg, xf=Matrix.Translation(p0) @ q.to_matrix().to_4x4(), sm=sm)


def sweep(name, root, m, pts, radii, seg=16, cap0=True, cap1=True, caprings=3, sm=70, up=None):
    """Tube along a polyline (parallel-transport frames) with round, flat or open ends."""
    pts = [Vector(p) for p in pts]; N = len(pts)
    if not isinstance(radii, (list, tuple)): radii = [radii] * N
    T = [(pts[min(i + 1, N - 1)] - pts[max(i - 1, 0)]).normalized() for i in range(N)]
    ref = Vector(up) if up is not None else (V(0, 0, 1) if abs(T[0].z) < 0.9 else V(1, 0, 0))
    nv = (ref - T[0] * ref.dot(T[0])).normalized()
    frames = []
    for i in range(N):
        if i > 0:
            nv = T[i - 1].rotation_difference(T[i]) @ nv
            nv = (nv - T[i] * nv.dot(T[i])).normalized()
        frames.append((nv.copy(), T[i].cross(nv)))
    rmean = sum(radii) / N
    us = [2 * math.pi * rmean * k / seg / TILE for k in range(seg + 1)]

    def ring(c, f, r):
        return [c + f[0] * (r * math.cos(2 * math.pi * k / seg)) + f[1] * (r * math.sin(2 * math.pi * k / seg)) for k in range(seg)]

    rows = []; v = 0.0
    if cap0:
        r0 = radii[0]
        if cap0 == 'flat':
            rows.append(dict(kind='pole', pt=pts[0].copy(), v=-r0 / TILE))
        else:
            rows.append(dict(kind='pole', pt=pts[0] - T[0] * r0, v=0.0))
            for j in range(caprings, 0, -1):
                ph = (math.pi / 2) * j / (caprings + 1)
                rows.append(dict(kind='ring', pts=ring(pts[0] - T[0] * (r0 * math.sin(ph)), frames[0], r0 * math.cos(ph)), u=us, v=r0 * (math.pi / 2 - ph) / TILE))
            v = r0 * math.pi / 2
    for i in range(N):
        if i > 0: v += (pts[i] - pts[i - 1]).length
        rows.append(dict(kind='ring', pts=ring(pts[i], frames[i], radii[i]), u=us, v=v / TILE))
    if cap1:
        r1 = radii[-1]
        if cap1 == 'flat':
            rows.append(dict(kind='pole', pt=pts[-1].copy(), v=(v + r1) / TILE))
        else:
            for j in range(1, caprings + 1):
                ph = (math.pi / 2) * j / (caprings + 1)
                rows.append(dict(kind='ring', pts=ring(pts[-1] + T[-1] * (r1 * math.sin(ph)), frames[-1], r1 * math.cos(ph)), u=us, v=(v + r1 * ph) / TILE))
            rows.append(dict(kind='pole', pt=pts[-1] + T[-1] * r1, v=(v + r1 * math.pi / 2) / TILE))
    return _emit(_skin(rows, True), name, root, m, sm)


def capsule(name, root, m, p0, p1, r0, r1=None, seg=16, n=3, bulge=0.0, cap0=True, cap1=True, caprings=2, sm=70):
    p0, p1 = Vector(p0), Vector(p1); r1 = r0 if r1 is None else r1
    pts = [p0.lerp(p1, i / n) for i in range(n + 1)]
    radii = [(r0 + (r1 - r0) * i / n) * (1 + bulge * math.sin(math.pi * i / n)) for i in range(n + 1)]
    return sweep(name, root, m, pts, radii, seg, cap0, cap1, caprings, sm)


def arc_pts(c, R, a0, a1, n, plane='XZ'):
    out = []
    for i in range(n + 1):
        a = a0 + (a1 - a0) * i / n
        u, w = R * math.cos(a), R * math.sin(a)
        out.append(Vector(c) + (V(u, 0, w) if plane == 'XZ' else V(0, u, w) if plane == 'YZ' else V(u, w, 0)))
    return out


def rbox(name, root, m, c, size, rad, rot=None, segs=3, sm=35):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts: v.co = V(v.co.x * size[0], v.co.y * size[1], v.co.z * size[2])
    rad = min(rad, min(size) * 0.49)
    if rad > 1e-5:
        bmesh.ops.bevel(bm, geom=bm.verts[:] + bm.edges[:], offset=rad, offset_type='OFFSET', segments=segs,
                        profile=0.5, affect='EDGES', clamp_overlap=True)
    bmesh.ops.transform(bm, matrix=Matrix.Translation(Vector(c)) @ rotm(rot), verts=bm.verts[:])
    bm.normal_update()
    uvl = bm.loops.layers.uv.new('UVMap')
    for f in bm.faces:
        ax = max(range(3), key=lambda i: abs(f.normal[i]))
        a, b = ((1, 2), (0, 2), (0, 1))[ax]
        for l in f.loops: l[uvl].uv = (l.vert.co[a] / TILE, l.vert.co[b] / TILE)
    return _emit(bm, name, root, m, sm)


def loft(name, root, m, secs, seg=24, sm=60, caps=True):
    """secs: (centre, U, V, half_w, half_h, n_top, n_bottom); cross-section = centre + U*x + V*y."""
    rows = []; v = 0.0; prev = None
    for (c, U, Vv, hw, hh, nt, nb) in secs:
        c = Vector(c)
        if prev is not None: v += (c - prev).length
        prev = c
        if hw < 1e-6 and hh < 1e-6:
            rows.append(dict(kind='pole', pt=c, v=v / TILE)); continue
        pts = []
        for i in range(seg):
            a = 2 * math.pi * i / seg
            x, y = se_xy(a, nt if math.sin(a) >= 0 else nb)
            pts.append(c + U * (hw * x) + Vv * (hh * y))
        rows.append(dict(kind='ring', pts=pts, u=_ring_u(pts), v=v / TILE))
    if caps and rows[0]['kind'] == 'ring': rows.insert(0, dict(kind='pole', pt=Vector(secs[0][0]), v=rows[0]['v'] - 0.02))
    if caps and rows[-1]['kind'] == 'ring': rows.append(dict(kind='pole', pt=Vector(secs[-1][0]), v=rows[-1]['v'] + 0.02))
    bm = _skin(rows, True)
    _box_uv(bm)   # lofts have pole fans; a world-space box projection keeps patterns undistorted
    return _emit(bm, name, root, m, sm)


def _box_uv(bm):
    bm.normal_update()
    uvl = bm.loops.layers.uv.active or bm.loops.layers.uv.new('UVMap')
    for f in bm.faces:
        ax = max(range(3), key=lambda i: abs(f.normal[i]))
        a, b = ((1, 2), (0, 2), (0, 1))[ax]
        for l in f.loops: l[uvl].uv = (l.vert.co[a] / TILE, l.vert.co[b] / TILE)


def cull(o, center, scale, keep):
    """Delete vertices of o whose direction from center (divided by scale, normalised) fails keep(d)."""
    bm = bmesh.new(); bm.from_mesh(o.data)
    c = Vector(center); kill = []
    for v in bm.verts:
        d = v.co - c; d = V(d.x / scale[0], d.y / scale[1], d.z / scale[2])
        if d.length > 1e-9 and not keep(d.normalized()): kill.append(v)
    bmesh.ops.delete(bm, geom=kill, context='VERTS')
    bm.to_mesh(o.data); bm.free()
    return o


# ------------------------------------------------------------------ surfaces
def bvh_of(*objs):
    verts, polys = [], []
    for o in objs:
        base = len(verts)
        verts += [v.co.copy() for v in o.data.vertices]
        polys += [[base + i for i in p.vertices] for p in o.data.polygons]
    return BVHTree.FromPolygons(verts, polys)


def hit(bvh, x, z, back=False, yc=0.0):
    d = V(0, -1, 0) if back else V(0, 1, 0)
    loc, nrm, idx, dist = bvh.ray_cast(V(x, yc - 5 * d.y, z), d)
    if loc is None:
        loc, nrm, idx, dist = bvh.find_nearest(V(x, yc, z))
    nrm = nrm.normalized()
    if nrm.dot(d) > 0: nrm = -nrm
    return loc, nrm


def patch(name, root, m, bvh, rows, nx=4, off=0.002, thick=0.004, back=False, yc=0.0, sm=50):
    """A thin shell that follows a surface (pockets, ties, pinafores, tags). rows: [(z, x0, x1)]."""
    bm = bmesh.new(); uvl = bm.loops.layers.uv.new('UVMap')
    F, B = [], []
    for (z, x0, x1) in rows:
        xs = [x0] if abs(x1 - x0) < 1e-6 else [x0 + (x1 - x0) * i / nx for i in range(nx + 1)]
        fr, br = [], []
        for x in xs:
            p, n = hit(bvh, x, z, back, yc)
            fr.append(bm.verts.new(p + n * (off + thick))); br.append(bm.verts.new(p + n * off))
        F.append(fr); B.append(br)

    def face(vs):
        try: f = bm.faces.new(vs)
        except ValueError: return
        for l in f.loops: l[uvl].uv = (l.vert.co.x / TILE, l.vert.co.z / TILE)

    def grid(L):
        for a, b in zip(L[:-1], L[1:]):
            if len(a) == 1 and len(b) == 1: continue
            if len(a) == 1:
                for i in range(len(b) - 1): face([a[0], b[i], b[i + 1]])
            elif len(b) == 1:
                for i in range(len(a) - 1): face([a[i], a[i + 1], b[0]])
            else:
                for i in range(len(a) - 1): face([a[i], a[i + 1], b[i + 1], b[i]])
    grid(F); grid(B)
    edges = []
    for k in (0, len(F) - 1):
        edges += [((F[k][i], F[k][i + 1]), (B[k][i], B[k][i + 1])) for i in range(len(F[k]) - 1)]
    for k in range(len(F) - 1):
        edges.append(((F[k][0], F[k + 1][0]), (B[k][0], B[k + 1][0])))
        edges.append(((F[k][-1], F[k + 1][-1]), (B[k][-1], B[k + 1][-1])))
    for (f1, f2), (b1, b2) in edges:
        if f1 is f2: continue
        face([f1, f2, b2, b1])
    return _emit(bm, name, root, m, sm)


def surf_path(bvh, xz, off=0.005, back=False, yc=0.0):
    out = []
    for x, z in xz:
        p, n = hit(bvh, x, z, back, yc)
        out.append(p + n * off)
    return out


def fib_dirs(n):
    ga = math.pi * (3 - math.sqrt(5)); out = []
    for i in range(n):
        z = 1 - 2 * (i + 0.5) / n; r = math.sqrt(max(0.0, 1 - z * z)); a = ga * i
        out.append(V(r * math.cos(a), r * math.sin(a), z))
    return out


def bumpy(dirs, amp, width):
    cw = math.cos(width)

    def f(p):
        L = p.length
        if L < 1e-9: return p
        d = p / L; b = 0.0
        for c in dirs:
            k = d.dot(c)
            if k > cw: b = max(b, ((k - cw) / (1 - cw)) ** 0.55)
        return p * (1 + amp * b)
    return f


# ------------------------------------------------------------------ parts
def hand(root, SK, W, E, sx, s, curl=1.0):
    D = (Vector(W) - Vector(E)).normalized()
    F = V(0, -1, 0); F = (F - D * F.dot(D)).normalized()
    I = D.cross(F)
    if I.x * sx > 0: I = -I            # I points in towards the body
    W = Vector(W)
    capsule('Wrist', root, SK, W - D * 0.016 * s, W + D * 0.014 * s, 0.027 * s, 0.026 * s, seg=16, n=1, caprings=2)
    pc = W + D * 0.04 * s
    rot = Matrix((I, F, D)).transposed()
    ellipsoid('Palm', root, SK, pc, 0.036 * s, (0.5, 0.95, 1.0), seg=16, rot=rot)
    lens_ = (0.036, 0.042, 0.04, 0.032)
    for i, off in enumerate((1.5, 0.5, -0.5, -1.5)):
        b = pc + D * 0.024 * s + F * (off * 0.0165 * s)
        L = lens_[i] * s
        sweep('Finger', root, SK, [b, b + D * (L * 0.55) + I * (0.004 * s * curl), b + D * (L * 0.88) + I * (0.016 * s * curl)],
              [0.0088 * s, 0.0083 * s, 0.0074 * s], seg=8, caprings=2)
    tb = pc + F * 0.022 * s - D * 0.006 * s
    sweep('Thumb', root, SK, [tb, tb + F * 0.014 * s + D * 0.012 * s + I * 0.004 * s, tb + F * 0.02 * s + D * 0.028 * s + I * 0.012 * s],
          [0.0105 * s, 0.0096 * s, 0.0086 * s], seg=8, caprings=2)
    return D, F, I


SHOE_T = (0.0, 0.03, 0.1, 0.25, 0.45, 0.65, 0.82, 0.92, 0.98, 1.0)
SHOE_W = (0.42, 0.72, 0.84, 0.86, 0.92, 1.0, 0.95, 0.8, 0.52, 0.18)


def shoe(root, kind, x, fy, z0, s, SH, sp, sx):
    X, Y, Zv = V(1, 0, 0), V(0, -1, 0), V(0, 0, 1)
    DARKSOLE = solid('c_soledark', '#2B2622', 0.7)
    WHITE = solid('c_solewhite', '#F1EEE6', 0.6)

    def body(name, m, L, W, H, hf, zb_fn, wf=SHOE_W, nt=2.3, nb=7.0, seg=16):
        secs = []
        for t, w_, h in zip(SHOE_T, wf, hf):
            y = fy + L / 2 - t * L
            zb = z0 + zb_fn(t)
            hh = max(H * h / 2, 1e-4)
            secs.append((V(x, y, zb + hh), X, Zv, W / 2 * w_, hh, nt, nb))
        return loft(name, root, m, secs, seg=seg, sm=70)

    def sole(name, m, L, W, st, zb_fn=lambda t: 0.0):
        wf = [min(1.0, w_ * 1.06 + 0.12) for w_ in SHOE_W]
        secs = []
        for t, w_ in zip(SHOE_T, wf):
            y = fy + L / 2 - t * L
            secs.append((V(x, y, z0 + zb_fn(t) + st / 2), X, Zv, W / 2 * w_ * 1.04, st / 2, 8.0, 8.0))
        return loft(name, root, m, secs, seg=14, sm=45)

    if kind == 'slipper':
        L, W = 0.22 * s, 0.1 * s
        sole('Slipper', SH, L, W, 0.022)
        SK = solid('cs_' + sp['_key'], sp['skin'], 0.55)
        body('Foot', SK, 0.17 * s, 0.078 * s, 0.05 * s, (0.6, 0.8, 0.9, 0.85, 0.7, 0.55, 0.45, 0.38, 0.3, 0.12), lambda t: 0.018, seg=16)
        # thong strap: a V from the sole sides to between the toes
        tip = V(x, fy - 0.06 * s, z0 + 0.03)
        for side in (-1, 1):
            a = V(x + side * 0.042 * s, fy + 0.01 * s, z0 + 0.02)
            mid = a.lerp(tip, 0.5) + V(0, 0, 0.022 * s)
            sweep('Strap', root, SH, [a, mid, tip], 0.0065 * s, seg=10, caprings=2)
        return
    if kind == 'heel':
        L, W, H = 0.19 * s, 0.08 * s, 0.05 * s
        lift = lambda t: 0.05 * s * max(0.0, 1 - t / 0.62) ** 1.4
        sole('HeelSole', DARKSOLE, L, W, 0.008, lift)
        body('Heel', SH, L, W, H, (0.7, 0.9, 0.95, 0.85, 0.6, 0.45, 0.38, 0.32, 0.24, 0.1), lambda t: lift(t) + 0.005, nt=2.2)
        hp = V(x, fy + L / 2 - 0.022 * s, z0)
        capsule('HeelPost', root, DARKSOLE, hp, hp + V(0, 0, 0.052 * s), 0.011 * s, 0.016 * s, seg=12, n=1, cap0='flat', cap1='flat')
        return
    L, W = 0.2 * s, (0.1 if kind in ('sneaker', 'boot') else 0.095) * s
    st = {'sneaker': 0.024, 'boot': 0.026}.get(kind, 0.014) * max(0.8, s)
    H = {'sneaker': 0.074, 'boot': 0.082}.get(kind, 0.07) * s
    sole_m = WHITE if kind == 'sneaker' else DARKSOLE
    sole('Sole', sole_m, L, W, st)
    hf = (0.62, 0.9, 0.98, 0.98, 0.84, 0.62, 0.52, 0.45, 0.32, 0.12)
    body('Shoe', SH, L * 0.97, W * 0.96, H, hf, lambda t: st * 0.6)
    top_at = lambda t: z0 + st * 0.6 + H * (0.98 - 0.4 * max(0, t - 0.25) / 0.4)
    if kind in ('sneaker', 'boot'):
        LACE = WHITE if kind == 'sneaker' else solid('c_lacedark', '#3A3027', 0.7)
        for i, t in enumerate((0.34, 0.44, 0.54)):
            y = fy + L / 2 - t * L
            zt = z0 + st * 0.6 + H * (0.97 - 0.55 * max(0.0, t - 0.25))
            capsule('Lace', root, LACE, V(x - W * 0.2, y, zt), V(x + W * 0.2, y - 0.004, zt), 0.0042 * s, seg=6, n=1, caprings=1)
    if kind == 'sneaker':
        STR = sp.get('stripe') or solid('c_ink', '#1A1512', 0.4)
        for side in (-1, 1):
            pts = []
            for t in (0.18, 0.3, 0.42, 0.55, 0.66):
                y = fy + L / 2 - t * L
                k = SHOE_W[min(range(len(SHOE_T)), key=lambda i: abs(SHOE_T[i] - t))]
                pts.append(V(x + side * (W / 2 * 0.96 * k + 0.0025), y, z0 + st + H * (0.18 + 0.5 * (t - 0.18))))
            sweep('SneakerStripe', root, STR, pts, 0.0048 * s, seg=6, caprings=1)
    if kind == 'boot':
        b0 = V(x, fy + L * 0.26, z0 + st + H * 0.5)
        capsule('BootShaft', root, SH, b0, b0 + V(0, 0.004, 0.13 * s), 0.054 * s, 0.05 * s, seg=16, n=2, cap1='flat')
        for i in range(3):
            zz = b0.z + 0.035 * s + i * 0.03 * s
            capsule('Lace', root, solid('c_lacedark', '#3A3027', 0.7), V(x - 0.022 * s, b0.y - 0.05 * s, zz), V(x + 0.022 * s, b0.y - 0.05 * s, zz), 0.004 * s, seg=6, n=1, caprings=1)


CFG = {
    'worker_a': dict(collar='shirt', buttons=True, pocket=(1,), tuck=True, belt='#1A1512', watch=-1, cuff=True),
    'worker_b': dict(collar='shirt', buttons=True, tuck=True, cuff=True),
    'student_a': dict(collar='shirt', buttons=True, pocket=(1,), tuck=True, belt='#1A1512'),
    'student_b': dict(collar='shirt', tuck=True, pleats=True),
    'aunty': dict(collar='tee', buttons=True),
    'ns': dict(collar='shirt', buttons=True, pocket=(-1, 1), tuck=True, belt='#2F3524'),
    'parent': dict(collar='tee', watch=-1),
    'kid': dict(collar='tee'),
    'uncle': dict(collar='shirt', buttons=True, pocket=(1,), pen=True, watch=-1),
    'expecting': dict(collar='tee'),
}


def torso_profile(s, hip_z, sh_z, tucked):
    if tucked:
        P = [(0.0, hip_z), (0.9, hip_z), (0.97, hip_z + 0.03 * s)]
    else:
        P = [(0.0, hip_z - 0.065 * s), (0.98, hip_z - 0.065 * s), (1.06, hip_z - 0.05 * s), (1.03, hip_z + 0.03 * s)]
    return P + [(0.95, hip_z + 0.15 * s), (0.97, hip_z + 0.28 * s), (1.02, sh_z - 0.15 * s), (1.07, sh_z - 0.07 * s),
                (1.05, sh_z - 0.02 * s), (0.9, sh_z + 0.015 * s), (0.6, sh_z + 0.038 * s), (0.32, sh_z + 0.05 * s), (0.0, sh_z + 0.055 * s)]


# ------------------------------------------------------------------ the character
def build2(key, pose, sp, at=(0, 0, 0)):
    cfg = CFG.get(key, {})
    sp = dict(sp); sp['_key'] = key
    sit = pose == 'sit'
    root = empty(f"Char_{key}_{'Sit' if sit else 'Stand'}", at)
    s = sp['h'] / 1.70
    w = sp.get('w', 1.0)
    SK = solid('cs_' + key, sp['skin'], 0.55)
    hcol = sp.get('haircol', '#2A1A12')
    HR = solid('ch_' + hcol, hcol, 0.75)
    TOP, BOT = sp['top'], sp['bot']
    DARK = solid('c_ink', '#1A1512', 0.4); LIP = solid('c_lip', '#9E4A4A', 0.6)
    BTN = solid('c_button', '#E9E4D8', 0.4)
    EYEHI = solid('c_eyehi', '#FFFFFF', 0.2)
    BLUSH = solid('cb_' + key, mix_hex(sp['skin'], '#E0706A', 0.3), 0.6)
    legs = sp.get('legs')
    hip_z, knee_z, ank_z = 0.86 * s, 0.47 * s, 0.09 * s
    sh_z = 1.40 * s
    tw, td = 0.30 * w * s, 0.19 * w * s
    lx = 0.075 * w * s
    dz, dy = 0.0, 0.0
    if sit: dz, dy = 0.53 - hip_z, 0.05
    Z = lambda z: z + dz
    tucked = cfg.get('tuck', False)
    # a hunched back is a gradual bend of the spine above the waist, so the shirt hem stays put
    hunch = 0.17 if sp.get('hunch') else 0.0
    zb_bend, zt_bend = Z(hip_z + 0.1 * s), Z(sh_z)
    piv = V(0, dy, zb_bend)

    def bend(p):
        p = Vector(p)
        if not hunch or p.z <= zb_bend: return p
        t = min(1.0, (p.z - zb_bend) / (zt_bend - zb_bend))
        return piv + Matrix.Rotation(hunch * t, 3, 'X') @ (p - piv)

    # ---------- legs and shoes ----------
    for sx in (-1, 1):
        x = sx * lx
        if not sit:
            hip, knee, ank = V(x, 0, hip_z), V(x, 0, knee_z), V(x, -0.005, ank_z)
            fy, z0 = -0.035 * s, 0.0
        else:
            ky = max(dy - 0.36 * s, -0.125)
            hip, knee = V(x, dy, 0.53), V(x, ky, 0.53)
            ank = V(x, ky - 0.02, max(0.09, 0.53 - 0.40 * s))
            fy, z0 = ky - 0.06, (ank.z - 0.055) - 0.035 * s
        if legs == 'pants':
            capsule('Thigh', root, BOT, hip, knee, 0.067 * s, 0.059 * s, seg=16)
            capsule('Shin', root, BOT, knee, ank - V(0, 0, 0.012 * s), 0.055 * s, 0.05 * s, seg=16, cap1='flat')
            capsule('Ankle', root, SK, ank + V(0, 0, 0.01 * s), ank - V(0, 0, 0.03 * s), 0.036 * s, 0.034 * s, seg=14, n=1)
        elif legs == 'shorts':
            capsule('Thigh', root, SK, hip, knee, 0.06 * s, 0.052 * s, seg=16)
            capsule('ShortsLeg', root, BOT, hip, hip.lerp(knee, 0.8), 0.071 * s, 0.069 * s, seg=16, n=2, cap1='flat')
            capsule('Shin', root, SK, knee, ank, 0.05 * s, 0.038 * s, seg=16, bulge=0.12)
        else:
            capsule('Thigh', root, SK, hip, knee, 0.06 * s, 0.052 * s, seg=16)
            capsule('Shin', root, SK, knee, ank, 0.048 * s, 0.036 * s, seg=16, bulge=0.12)
        if sp.get('socks'):
            capsule('Sock', root, sp['socks'], ank + V(0, 0, 0.075 * s), ank - V(0, 0, 0.02 * s), 0.043 * s, 0.04 * s, seg=18, n=1, cap0='flat')
            torus('SockRib', root, sp['socks'], ank + V(0, 0, 0.072 * s), 0.043 * s, 0.0045 * s, segR=18, segr=6)
        shoe(root, sp.get('shoe', 'shoe'), x, fy, z0, s, sp.get('shoemat', DARK), sp, sx)

    # ---------- hips, skirts, laps ----------
    if not sit and legs in ('pants', 'shorts'):
        # tucked: the waistband shows above the belt; untucked: keep it inside the shirt hem
        k, top, syk = (1.01, 0.06, 1.04) if tucked else (0.95, 0.03, 0.97)
        prof = [(0.0, hip_z - 0.06 * s), (0.5 * k, hip_z - 0.056 * s), (0.86 * k, hip_z - 0.03 * s), (k, hip_z + 0.005 * s), (k * 0.99, hip_z + top * s), (0.0, hip_z + top * s)]
        revolve('Pelvis', root, BOT, prof, 32, xf=Matrix.Translation(V(0, dy, 0)), sx=tw / 2, sy=td / 2 * syk, n=2.5)
    if legs in ('skirt', 'dress'):
        if not sit:
            hem = knee_z + 0.06 * s if legs == 'skirt' else knee_z - 0.02 * s
            r_hip = tw / 2 + 0.01
            flare = sp.get('flare', 1.0)
            prof = [(r_hip * 1.0 * flare, hem + 0.012), (r_hip * 1.04 * flare, hem), (r_hip * 1.0 * (1 + (flare - 1) * 0.5), (hem + hip_z) / 2),
                    (r_hip, hip_z - 0.04), (r_hip * 0.96, hip_z + 0.04), (r_hip * 0.94, hip_z + 0.065 * s), (0.0, hip_z + 0.065 * s)]
            amod = None
            if cfg.get('pleats'):
                amod = lambda a, t: 1 + 0.07 * max(0.0, 1 - t / 0.8) * abs(math.sin(12 * a))
            revolve('Skirt', root, BOT, prof, 96 if amod else 40, xf=Matrix.Translation(V(0, dy, 0)), sy=0.75, amod=amod, sm=80)
        else:
            ky = max(dy - 0.36 * s, -0.125)
            yb, yf = dy + 0.07, ky - 0.065
            hem_drop = 0.035 * s if legs == 'skirt' else 0.11 * s
            secs = []
            for t_ in (0.0, 0.25, 0.5, 0.75, 0.92, 1.0):
                y = yb + (yf - yb) * t_
                hw = (tw / 2 + 0.018) * (1.0 - 0.08 * t_)
                hh = 0.055 * (1.0 - 0.15 * t_)
                secs.append((V(0, y, 0.56 - (0.012 if t_ > 0.9 else 0.0)), V(1, 0, 0), V(0, 0, 1), hw, hh, 2.6, 5.0))
            loft('Lap', root, BOT, secs, seg=28, sm=70)
            secs = []
            for k_, zz in enumerate((0.0, 0.5, 1.0)):
                y = yf + 0.012 + 0.012 * zz
                secs.append((V(0, y, 0.545 - hem_drop * zz), V(1, 0, 0), V(0, 1, 0), (tw / 2 + 0.012) * (1 + 0.06 * zz), 0.018, 2.2, 2.2))
            loft('LapHem', root, BOT, secs, seg=24, sm=70)
    elif sit:
        rbox('Seat', root, BOT, (0, dy, 0.55), (tw + 0.01, td + 0.01, 0.11), 0.045, segs=4, sm=70)
    if tucked and cfg.get('belt') and legs in ('pants', 'shorts') and not sit:
        BELT = solid('c_belt_' + cfg['belt'][1:], cfg['belt'], 0.45)
        z0b, z1b = hip_z + 0.022 * s, hip_z + 0.052 * s
        revolve('Belt', root, BELT, [(1.025, z0b), (1.05, z0b + 0.004), (1.05, z1b - 0.004), (1.025, z1b)], 40,
                xf=Matrix.Translation(V(0, dy, 0)), sx=tw / 2, sy=td / 2 * 1.04, n=2.5, closed_prof=True, sm=50)
        rbox('Buckle', root, solid('c_steel', '#9AA3AD', 0.3, 1.0), (0, dy - td / 2 * 1.04 * 1.05 - 0.003, (z0b + z1b) / 2), (0.04 * s, 0.008, 0.034 * s), 0.004)

    # ---------- torso ----------
    tz0, tz1 = hip_z - 0.04, sh_z + 0.02
    torso = revolve('Torso', root, TOP, torso_profile(s, hip_z, sh_z, tucked), 36, xf=Matrix.Translation(V(0, dy, dz)), sx=tw / 2, sy=td / 2, n=2.5, sm=70)
    if hunch:
        for v in torso.data.vertices: v.co = bend(v.co)
        torso.data.update()
    tobjs = [torso]
    if sp.get('belly'):
        tobjs.append(ellipsoid('Belly', root, TOP, (0, dy - td * 0.45, Z(hip_z + 0.17 * s)), 0.13 * s, (1, 0.85, 1), seg=32))
    tb = bvh_of(*tobjs)
    neck_r = 0.042 * s

    # ---------- arms and hands ----------
    sleeve = sp.get('sleeve', 'long')
    for sx in (-1, 1):
        S = V(sx * (tw / 2 + 0.024), dy, Z(sh_z - 0.045))
        if not sit:
            E = V(sx * (tw / 2 + 0.035), dy + 0.01, Z(sh_z - 0.29 * s))
            W = V(sx * (tw / 2 + 0.028), dy - 0.03, Z(sh_z - 0.52 * s))
        else:
            E = V(sx * (tw / 2 + 0.04), dy - 0.02, Z(sh_z - 0.27 * s))
            W = V(sx * (tw / 2 - 0.02), -0.09, 0.62)
        hold = sp.get('hold', {}).get('R' if sx > 0 else 'L')
        if hold == 'cane' and not sit: W = V(sx * (tw / 2 + 0.03), dy - 0.1, Z(sh_z - 0.5 * s))
        if hold == 'phone' and not sit: W = V(sx * (tw / 2 - 0.01), dy - 0.14, Z(sh_z - 0.36 * s))
        S, E, W = bend(S), bend(E), bend(W)
        ellipsoid('Deltoid', root, TOP, S + V(0, 0, 0.006), 0.05 * s, (1, 1.02, 0.85), seg=14)
        if sleeve == 'short':
            capsule('UpperArm', root, SK, S.lerp(E, 0.35), E, 0.041 * s, 0.039 * s, seg=16)
            capsule('Sleeve', root, TOP, S, S.lerp(E, 0.52), 0.051 * s, 0.05 * s, seg=18, n=2, cap1='flat')
            capsule('Forearm', root, SK, E, W, 0.038 * s, 0.03 * s, seg=16, bulge=0.07)
        else:
            capsule('UpperArm', root, TOP, S, E, 0.048 * s, 0.045 * s, seg=16)
            capsule('Forearm', root, TOP, E, W, 0.045 * s, 0.04 * s, seg=16, cap1='flat')
            if cfg.get('cuff'):
                D_ = (W - E).normalized()
                capsule('Cuff', root, sp.get('collar') or TOP, W - D_ * 0.03 * s, W, 0.043 * s, 0.043 * s, seg=22, n=1, cap0='flat', cap1='flat')
        D, F, I = hand(root, SK, W, E, sx, s, curl=1.4 if hold else 1.0)
        if cfg.get('watch') == sx:
            wc = W - D * 0.03 * s
            q = D.to_track_quat('Z', 'Y')
            torus('WatchBand', root, DARK, wc, 0.032 * s if sleeve == 'short' else 0.044 * s, 0.006 * s, rot=q, segR=24, segr=8)
            out = V(sx, 0, 0); out = (out - D * out.dot(D)).normalized()
            fc = wc + out * (0.036 * s if sleeve == 'short' else 0.048 * s)
            cylinder('WatchFace', root, solid('c_steel', '#9AA3AD', 0.3, 1.0), fc - out * 0.004, fc + out * 0.004, 0.014 * s, seg=16)
            cylinder('WatchGlass', root, solid('c_card', '#FFFFFF', 0.4), fc + out * 0.004, fc + out * 0.0052, 0.011 * s, seg=16)
        if hold == 'phone':
            pc = W + V(0, -0.05, -0.01)
            rbox('Phone', root, DARK, pc, (0.042, 0.009, 0.082), 0.006, rot=(0.6, 0, 0), segs=3)
            n_ = Euler((0.6, 0, 0)).to_matrix() @ V(0, 1, 0)
            rbox('PhoneScreen', root, solid('c_screen', '#4A86C5', 0.2), pc + n_ * 0.0046, (0.035, 0.0015, 0.07), 0.003, rot=(0.6, 0, 0), segs=2)
        if hold == 'cane' and not sit:
            WOOD = solid('c_wood', '#6B3E26', 0.5)
            cy_, cz_ = W.y + 0.015, W.z - 0.005
            pts = [V(W.x, W.y - 0.01, 0.03), V(W.x, W.y - 0.01, W.z * 0.5), V(W.x, W.y - 0.01, cz_)]
            pts += arc_pts(V(W.x, cy_, cz_), 0.025, math.pi * 0.98, 0.0, 8, plane='YZ')[1:]
            pts.append(V(W.x, cy_ + 0.025, cz_ - 0.02))
            sweep('Cane', root, WOOD, pts, 0.011, seg=14, caprings=2)
            capsule('CaneTip', root, DARK, V(W.x, W.y - 0.01, 0.0), V(W.x, W.y - 0.01, 0.045), 0.013, seg=14, n=1, cap0='flat', cap1='flat')
        if hold == 'news':
            PAPER = solid('c_paper', '#EDEBE4', 0.8)
            INK = solid('c_newsprint', '#8C8A84', 0.8)
            R3 = Matrix((I, F, D)).transposed()
            nc = W + D * 0.115 * s + I * 0.004
            rbox('Newspaper', root, PAPER, nc, (0.012, 0.17 * s, 0.24 * s), 0.003, rot=R3, segs=2)
            for i in range(5):
                hgt = 0.022 if i == 0 else 0.008
                off = D * ((-0.085 + (0.0 if i == 0 else 0.03 + i * 0.024)) * s) + I * -0.0062
                rbox('NewsPrint', root, INK, nc + off, (0.001, (0.14 if i == 0 else 0.12) * s, hgt * s), 0.0, rot=R3, segs=1)
        if hold == 'handbag':
            BG = sp.get('bagmat', solid('c_bagred', '#9E2B3A', 0.4))
            bc = V(W.x, W.y, W.z - 0.105)
            rbox('Handbag', root, BG, bc, (0.055, 0.18, 0.13), 0.022, segs=4, sm=60)
            rbox('BagFlap', root, BG, bc + V(sx * 0.03, 0, 0.03), (0.006, 0.17, 0.07), 0.004)
            rbox('BagClasp', root, solid('c_gold', '#E2A93B', 0.3, 1.0), bc + V(sx * 0.034, 0, 0.0), (0.006, 0.026, 0.016), 0.003)
            sweep('BagHandle', root, BG, arc_pts(V(W.x, W.y, bc.z + 0.065), 0.05, 0.0, math.pi, 10, plane='YZ'), 0.0065, seg=10, caprings=2)

    # ---------- neckline, buttons, pockets ----------
    if cfg.get('collar') == 'shirt':
        CM = sp.get('collar') or TOP
        zc = Z(sh_z + 0.034 * s)
        prof = [(neck_r * 1.1, 0.0), (neck_r * 1.28, 0.0), (neck_r * 1.62, 0.034 * s), (neck_r * 1.46, 0.036 * s)]
        revolve('Collar', root, CM, prof, 30, xf=Matrix.Translation(bend(V(0, dy, zc - 0.012 * s))) @ Matrix.Rotation(hunch, 4, 'X'),
                arc=(math.radians(-62), math.radians(242)), closed_prof=True, sm=60)
        for sx in (-1, 1):
            rows = [(Z(sh_z + 0.03 * s), sx * 0.008 * s, sx * 0.062 * s), (Z(sh_z + 0.004 * s), sx * 0.01 * s, sx * 0.05 * s), (Z(sh_z - 0.03 * s), sx * 0.016 * s, sx * 0.016 * s)]
            patch('CollarTip', root, CM, tb, rows, nx=3, off=0.002, thick=0.003, yc=dy)
    else:
        torus('Neckline', root, TOP, bend(V(0, dy, Z(sh_z + 0.043 * s))), neck_r * 1.28, 0.0085 * s, rot=(hunch, 0, 0), segR=28, segr=8)
    if cfg.get('buttons'):
        top = Z(sh_z - 0.07 * s); bot = Z(hip_z + (0.1 if tucked else 0.0) * s)
        for i in range(5):
            if 'tie' in sp.get('extras', []) and i < 4: continue
            z = top + (bot - top) * i / 4
            p, n = hit(tb, 0.0, z, yc=dy)
            cylinder('Button', root, BTN, p + n * 0.0005, p + n * 0.0045, 0.0075 * s, seg=8)
    for sxp in cfg.get('pocket', ()):
        xc = sxp * 0.072 * s; zc_ = Z(sh_z - 0.16 * s); hw = 0.036 * s
        rows = [(zc_ + 0.038 * s, xc - hw, xc + hw), (zc_, xc - hw, xc + hw), (zc_ - 0.032 * s, xc - hw * 0.95, xc + hw * 0.95), (zc_ - 0.042 * s, xc - hw * 0.6, xc + hw * 0.6)]
        patch('Pocket', root, TOP, tb, rows, nx=4, off=0.0, thick=0.003, yc=dy)
        patch('PocketFlap', root, TOP, tb, [(zc_ + 0.042 * s, xc - hw * 1.04, xc + hw * 1.04), (zc_ + 0.02 * s, xc - hw * 1.04, xc + hw * 1.04)], nx=4, off=0.003, thick=0.003, yc=dy)
        if cfg.get('pen') and sxp == cfg['pocket'][0]:
            p, n = hit(tb, xc + hw * 0.5, zc_ + 0.03 * s, yc=dy)
            capsule('Pen', root, solid('c_pen', '#1F5FAF', 0.35), p + n * 0.003 - V(0, 0, 0.02 * s), p + n * 0.003 + V(0, 0, 0.028 * s), 0.0055 * s, seg=10, n=1, caprings=2)

    # ---------- head ----------
    hr = 0.1 * s * sp.get('headk', 1.0)
    neck_top = Z(sh_z + 0.07 * s)
    capsule('Neck', root, SK, bend(V(0, dy, Z(sh_z - 0.01 * s))), bend(V(0, dy, neck_top + hr * 0.3)), neck_r, neck_r * 0.95, seg=20, n=2)
    hcen = bend(V(0, dy, neck_top + hr * 0.9))
    hy, hc = hcen.y, hcen.z

    def head_deform(p):
        t = max(0.0, -p.z / hr); k = t ** 1.6
        x = p.x * 0.95 * (1 - 0.15 * k); y = p.y * 0.95 * (1 - 0.05 * k)
        if p.y < 0: y *= 0.97
        return V(x, y, p.z * 1.08)
    head = ellipsoid('Head', root, SK, (0, hy, hc), hr, seg=36, deform=head_deform, sm=180)
    hb = bvh_of(head)

    def on_head(x, z):
        return hit(hb, x, z, yc=hy)
    for sx in (-1, 1):
        ellipsoid('Ear', root, SK, (sx * hr * 0.93, hy + 0.005, hc), hr * 0.22, (0.5, 0.9, 1), seg=12)
        ellipsoid('EarIn', root, solid('cs_' + key + '_in', mix_hex(sp['skin'], '#6B3A2A', 0.25), 0.6), (sx * hr * 0.99, hy + 0.003, hc), hr * 0.13, (0.3, 0.7, 0.85), seg=10)
        er = hr * 0.11
        p, n = on_head(sx * hr * 0.34, hc + hr * 0.12)
        ec = p - n * (er * 0.32)
        ellipsoid('Eye', root, DARK, ec, er, (1, 1, 1.15), seg=12)
        ellipsoid('EyeHi', root, EYEHI, ec + n * (er * 0.7) + V(-0.32 * er, 0, 0.38 * er), er * 0.27, seg=6)
        bx = sx * hr * 0.34
        bp = surf_path(hb, [(bx + dx * hr, hc + hr * (0.33 + 0.045 * (1 - (dx / 0.17) ** 2) - sx * dx * 0.12)) for dx in (-0.17, -0.085, 0.0, 0.085, 0.17)], off=hr * 0.02, yc=hy)
        sweep('Brow', root, HR, bp, hr * 0.042, seg=10, caprings=2)
        p, n = on_head(sx * hr * 0.5, hc - hr * 0.22)
        ellipsoid('Cheek', root, BLUSH, p - n * hr * 0.035, hr * 0.14, (1, 0.3, 0.72), seg=10, rot=normal_frame(n))
    p, n = on_head(0, hc - hr * 0.08)
    ellipsoid('Nose', root, SK, p + n * hr * 0.03, hr * 0.13, (0.8, 0.9, 1.1), seg=12)
    mp = surf_path(hb, [(0.16 * hr * math.cos(a), hc - hr * 0.3 + 0.16 * hr * math.sin(a)) for a in [math.radians(d) for d in range(205, 340, 15)]], off=hr * 0.012, yc=hy)
    sweep('Mouth', root, LIP, mp, hr * 0.034, seg=10, caprings=2)

    # ---------- hair ----------
    style = sp.get('hairstyle', 'neat')
    capc = V(0, hy + 0.03 * s, hc + 0.05 * s)
    long_hair = style in ('bun', 'pigtails', 'ponytail')
    if style not in ('bald', 'perm'):
        ellipsoid('HairCap', root, HR, capc, hr * 1.06, (1.0, 1.02, 0.78), seg=30)
    if long_hair:
        ellipsoid('HairBack', root, HR, (0, hy + hr * 0.3, hc - hr * 0.08), hr * 0.98, (1.03, 0.8, 0.92), seg=24)
    if style == 'neat':
        ellipsoid('Fringe', root, HR, (-hr * 0.2, hy - hr * 0.6, hc + hr * 0.62), hr * 0.5, (1.2, 0.4, 0.34), seg=20, rot=(0.85, 0.0, -0.3))
        for sx in (-1, 1):
            ellipsoid('Sideburn', root, HR, (sx * hr * 0.88, hy + 0.012, hc + hr * 0.02), hr * 0.16, (0.45, 1.0, 1.7), seg=10)
    if long_hair or style == 'pigtails':
        for sx in (-1, 1):
            ellipsoid('FringeLobe', root, HR, (sx * hr * 0.3, hy - hr * 0.62, hc + hr * 0.62), hr * 0.42, (1.1, 0.4, 0.36), seg=14, rot=(0.8, 0, sx * 0.4))
    if style == 'bun':
        ellipsoid('Bun', root, HR, (0, hy + hr * 0.98, hc + 0.05 * s), hr * 0.5, (1, 0.9, 0.95), seg=28,
                  deform=bumpy(fib_dirs(14), 0.06, 0.5))
        torus('BunTie', root, solid('c_gold', '#E2A93B', 0.3, 1.0), (0, hy + hr * 0.62, hc + 0.05 * s), hr * 0.34, hr * 0.06, rot=(math.pi / 2, 0, 0), segR=20, segr=6)
    elif style == 'spiky':
        dirs = [d for d in fib_dirs(40) if d.z > 0.35 and not (d.y < -0.55 and d.z < 0.75)]
        for d in dirs:
            b = capc + V(d.x * hr * 0.75, d.y * hr * 0.78, d.z * hr * 0.55)
            sweep('Spike', root, HR, [b, b + d * hr * 0.34], [hr * 0.17, hr * 0.012], seg=8, cap0='flat', caprings=1)
    elif style == 'pigtails':
        TIE = solid('c_tie', '#D7263D', 0.5)
        for sx in (-1, 1):
            tc = V(sx * hr * 1.06, hy + 0.02, hc + hr * 0.12)
            torus('PigtailTie', root, TIE, tc, hr * 0.16, hr * 0.06, rot=(0, math.pi / 2 + sx * 0.5, 0), segR=16, segr=6)
            pts = [tc + V(sx * hr * 0.05, 0, 0), tc + V(sx * hr * 0.22, 0.01, -hr * 0.22), tc + V(sx * hr * 0.3, 0.015, -hr * 0.55), tc + V(sx * hr * 0.27, 0.02, -hr * 0.85)]
            sweep('Pigtail', root, HR, pts, [hr * 0.17, hr * 0.34, hr * 0.3, hr * 0.12], seg=18, caprings=2)
    elif style == 'perm':
        pc_ = V(0, hy + 0.005, hc + hr * 0.12); sc_ = (1.0, 1.0, 0.9)
        perm = ellipsoid('Perm', root, HR, pc_, hr * 1.12, sc_, seg=48, deform=bumpy(fib_dirs(110), 0.17, 0.25))
        cull(perm, pc_, (hr * 1.12, hr * 1.12, hr * 1.12 * 0.9),
             lambda d: not (d.y < -0.25 and d.z < 0.45) and (d.z > 0.05 or (d.y > 0.2 and d.z > -0.6)))
    elif style == 'bald':
        ring = torus('HairRing', root, HR, (0, hy + 0.01, hc - hr * 0.05), hr * 0.92, hr * 0.16, rot=(0.25, 0, 0), segR=36, segr=10)
        cull(ring, V(0, hy + 0.01, hc - hr * 0.05), (1, 1, 1), lambda d: not (d.y < -0.55))
    elif style == 'ponytail':
        TIE = solid('c_pink', '#E0457B', 0.5)
        tc = V(0, hy + hr * 0.98, hc + hr * 0.12)
        torus('PonyTie', root, TIE, tc, hr * 0.17, hr * 0.06, rot=(math.pi / 2 - 0.35, 0, 0), segR=16, segr=6)
        pts = [tc - V(0, hr * 0.05, 0), tc + V(0, hr * 0.2, -hr * 0.12), tc + V(0, hr * 0.32, -hr * 0.5), tc + V(0, hr * 0.3, -hr * 0.9), tc + V(0, hr * 0.22, -hr * 1.2)]
        sweep('Ponytail', root, HR, pts, [hr * 0.16, hr * 0.3, hr * 0.3, hr * 0.22, hr * 0.07], seg=18, caprings=2)

    # ---------- extras ----------
    for ex in sp.get('extras', []):
        if ex in ('glasses', 'readers'):
            gz = hc + hr * (0.12 if ex == 'glasses' else -0.02)
            FR = solid('c_frame', '#2A2F36', 0.3, 0.6)
            cs = []
            for sx in (-1, 1):
                p, n = on_head(sx * hr * 0.36, gz)
                c = p + n * hr * 0.13
                torus('Rim', root, FR, c, hr * 0.21, hr * 0.028, rot=(math.pi / 2, 0, 0), segR=24, segr=6)
                cs.append(c)
                temple = [c + V(sx * hr * 0.21, 0, 0), V(sx * hr * 0.93, hy - hr * 0.35, gz + hr * 0.02), V(sx * hr * 0.95, hy + hr * 0.2, gz - hr * 0.05)]
                sweep('Temple', root, FR, temple, hr * 0.022, seg=8, caprings=2)
            sweep('Bridge', root, FR, [cs[0] + V(hr * 0.2, 0, hr * 0.03), (cs[0] + cs[1]) / 2 + V(0, -hr * 0.02, hr * 0.07), cs[1] - V(hr * 0.2, 0, -hr * 0.03)], hr * 0.024, seg=8, caprings=2)
        if ex == 'tie':
            T_ = solid('c_tieRed', '#A81A2E', 0.5)
            z_top, z_bot = Z(sh_z - 0.03 * s), Z(sh_z - 0.33 * s)
            rows = [(z_top + (z_bot - z_top) * i / 8, -(0.012 + 0.012 * i / 8) * s, (0.012 + 0.012 * i / 8) * s) for i in range(9)]
            rows.append((z_bot - 0.025 * s, 0.0, 0.0))
            patch('Tie', root, T_, tb, rows, nx=4, off=0.003, thick=0.004, yc=dy)
            p, n = hit(tb, 0, z_top + 0.01 * s, yc=dy)
            ellipsoid('TieKnot', root, T_, p + n * 0.009, 0.019 * s, (1.1, 0.6, 0.95), seg=16)
            for i in range(3):
                zz = z_top - 0.06 * s - i * 0.07 * s
                p, n = hit(tb, 0, zz, yc=dy)
                ellipsoid('TieStripe', root, solid('c_tieStripe', '#E2A93B', 0.5), p + n * 0.0072, 0.016 * s, (1.0, 0.12, 0.16), seg=12, rot=normal_frame(n, 0.5))
        if ex == 'lanyard':
            BL = solid('c_lanyard', '#1F5FAF', 0.5)
            card_x, card_z = 0.02, Z(sh_z - 0.35 * s)
            for sx in (-1, 1):
                xz = [(sx * 0.06 * s * (1 - t) + (card_x + sx * 0.01) * t, Z(sh_z + 0.02 * s) + (card_z + 0.05 * s - Z(sh_z + 0.02 * s)) * t) for t in (0.0, 0.2, 0.4, 0.6, 0.8, 1.0)]
                pts = [V(sx * 0.045 * s, dy + 0.025, Z(sh_z + 0.05 * s))] + surf_path(tb, xz, off=0.009, yc=dy)
                sweep('Lanyard', root, BL, pts, 0.0042, seg=8, caprings=2)
            p, n = hit(tb, card_x, card_z, yc=dy)
            cc = p + n * 0.014
            rbox('IDCard', root, solid('c_card', '#FFFFFF', 0.4), cc, (0.056 * s, 0.004, 0.082 * s), 0.004, rot=normal_frame(n))
            rbox('IDBand', root, BL, cc + n * 0.0022 + V(0, 0, 0.028 * s), (0.056 * s, 0.001, 0.018 * s), 0.0, rot=normal_frame(n), segs=1)
            rbox('IDPhoto', root, solid('c_idphoto', '#9DB3C8', 0.5), cc + n * 0.0022 + V(-0.012 * s, 0, -0.008 * s), (0.02 * s, 0.001, 0.026 * s), 0.0, rot=normal_frame(n), segs=1)
        if ex == 'earrings':
            for sx in (-1, 1):
                ellipsoid('Earring', root, solid('c_gold', '#E2A93B', 0.3, 1.0), (sx * hr * 0.96, hy, hc - hr * 0.3), hr * 0.075, seg=8)
        if ex == 'shoulderbag':
            BG = sp.get('bagmat', solid('c_bagtan', '#B07A4F', 0.45))
            x0, x1 = -tw / 2 + 0.015, tw / 2 - 0.02
            xz = [(x0 + (x1 - x0) * t, Z(sh_z - 0.02 * s) + (Z(hip_z + 0.05) - Z(sh_z - 0.02 * s)) * t) for t in (0.0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.9, 1.0)]
            pts = [V(x0 + 0.01, dy + td / 2 * 0.6, Z(sh_z + 0.035 * s)), V(x0, dy, Z(sh_z + 0.05 * s))] + surf_path(tb, xz, off=0.008, yc=dy)
            sweep('Strap', root, DARK, pts, 0.0075, seg=8, caprings=2)
            bc = V(tw / 2 + 0.035, dy - 0.02, Z(hip_z))
            rbox('ShoulderBag', root, BG, bc, (0.065, 0.17, 0.145), 0.026, segs=4, sm=60)
            rbox('BagFlap', root, BG, bc + V(0.031, 0, 0.032), (0.008, 0.165, 0.085), 0.006, segs=3)
            rbox('BagBuckle', root, solid('c_gold', '#E2A93B', 0.3, 1.0), bc + V(0.036, 0, 0.0), (0.004, 0.03, 0.02), 0.003)
        if ex == 'crest':
            xc, zc_ = -tw * 0.28, Z(sh_z - 0.12 * s)
            rows = [(zc_ + 0.03 * s, xc - 0.025 * s, xc + 0.025 * s), (zc_, xc - 0.025 * s, xc + 0.025 * s), (zc_ - 0.02 * s, xc - 0.017 * s, xc + 0.017 * s), (zc_ - 0.033 * s, xc, xc)]
            patch('Crest', root, solid('c_navy', '#22305C', 0.5), tb, rows, nx=4, off=0.001, thick=0.003, yc=dy)
            p, n = hit(tb, xc, zc_ + 0.003 * s, yc=dy)
            ellipsoid('CrestStar', root, solid('c_gold', '#E2A93B', 0.3, 1.0), p + n * 0.0045, 0.01 * s, (1, 0.45, 1), seg=12, rot=normal_frame(n))
        if ex == 'pinafore':
            NV = solid('c_navy', '#22305C', 0.5)
            zt = Z(hip_z + 0.24 * s)
            rows = [(zt - (zt - Z(hip_z + 0.03 * s)) * i / 5, -tw * 0.31, tw * 0.31) for i in range(6)]
            patch('PinaBib', root, NV, tb, rows, nx=8, off=0.002, thick=0.004, yc=dy)
            for back in (False, True):
                for sx in (-1, 1):
                    rows = [(zt + (Z(sh_z + 0.02 * s) - zt) * i / 6, sx * tw * 0.22 - 0.017 * s, sx * tw * 0.22 + 0.017 * s) for i in range(7)]
                    if back: rows = [(z, x0_ * 0.9, x1_ * 0.9) for z, x0_, x1_ in rows]
                    patch('PinaStrap', root, NV, tb, rows, nx=2, off=0.002, thick=0.004, back=back, yc=dy)
            for sx in (-1, 1):
                p, n = hit(tb, sx * tw * 0.22, zt - 0.012 * s, yc=dy)
                cylinder('PinaButton', root, solid('c_gold', '#E2A93B', 0.3, 1.0), p + n * 0.005, p + n * 0.009, 0.008 * s, seg=12)
        if ex in ('jockeycap', 'backcap'):
            CP = solid('c_capgreen', '#3E4A26', 0.6) if ex == 'jockeycap' else solid('c_capyellow', '#F2B134', 0.5)
            cc = V(0, hy + 0.005, hc + hr * 0.45)
            ellipsoid('Cap', root, CP, cc, hr * 1.08, (1, 1.05, 0.62), seg=30)
            ellipsoid('CapButton', root, CP, cc + V(0, 0, hr * 0.66), hr * 0.08, (1, 1, 0.5), seg=12)
            fwd = -1 if ex == 'jockeycap' else 1
            ellipsoid('CapBrim', root, CP, (0, hy + fwd * hr * 0.98, hc + hr * 0.36), hr * 0.72, (1.0, 0.85, 0.07), seg=24, rot=(fwd * 0.15, 0, 0))
            SEAM = solid('c_seam_' + ex, mix_hex('#3E4A26' if ex == 'jockeycap' else '#F2B134', '#000000', 0.25), 0.6)
            for i in range(4):
                a = i / 4 * 2 * math.pi + math.pi / 4
                pts = [cc + V(1.08 * math.cos(t) * math.cos(a), 1.134 * math.cos(t) * math.sin(a), 0.67 * math.sin(t)) * (hr * 1.008) for t in (0.2, 0.6, 1.0, 1.4)]
                sweep('CapSeam', root, SEAM, pts, hr * 0.012, seg=5, caprings=1)
        if ex == 'nametag':
            xc, zc_ = tw * 0.26, Z(sh_z - 0.1 * s)
            rows = [(zc_ + 0.011 * s, xc - 0.04 * s, xc + 0.04 * s), (zc_ - 0.011 * s, xc - 0.04 * s, xc + 0.04 * s)]
            patch('NameTag', root, DARK, tb, rows, nx=4, off=0.001, thick=0.003, yc=dy)
            p, n = hit(tb, xc, zc_, yc=dy)
            rbox('NameText', root, solid('c_nametext', '#D9D2B8', 0.6), p + n * 0.0045, (0.055 * s, 0.001, 0.006 * s), 0.0, rot=normal_frame(n), segs=1)
        if ex == 'sunnies':
            SG = solid('c_sunnies', '#1A1512', 0.15, 0.4)
            cs = []
            for sx in (-1, 1):
                p, n = on_head(sx * hr * 0.36, hc + hr * 0.12)
                c = p + n * hr * 0.12
                ellipsoid('Sunnies', root, SG, c, hr * 0.23, (1, 0.35, 0.78), seg=14, rot=normal_frame(n))
                cs.append(c)
                sweep('Temple', root, SG, [c + V(sx * hr * 0.2, 0, 0), V(sx * hr * 0.93, hy - hr * 0.35, hc + hr * 0.14), V(sx * hr * 0.95, hy + hr * 0.2, hc + hr * 0.08)], hr * 0.024, seg=8, caprings=2)
            sweep('Bridge', root, SG, [cs[0] + V(hr * 0.18, 0, hr * 0.04), (cs[0] + cs[1]) / 2 + V(0, -hr * 0.02, hr * 0.07), cs[1] - V(hr * 0.18, 0, -hr * 0.04)], hr * 0.026, seg=8, caprings=2)
        if ex == 'badge':
            p, n = hit(tb, -tw * 0.25, Z(sh_z - 0.12 * s), yc=dy)
            cylinder('BabyBadge', root, solid('c_badge', '#F7A8C0', 0.4), p + n * 0.002, p + n * 0.008, 0.03 * s, seg=28)
            torus('BadgeRim', root, solid('c_white', '#FFFFFF', 0.5), p + n * 0.008, 0.028 * s, 0.0025 * s, rot=n.to_track_quat('Z', 'Y'), segR=28, segr=6)
            ellipsoid('BadgeHeart', root, solid('c_red', '#D7263D', 0.5), p + n * 0.0095, 0.009 * s, (1, 1, 0.3), seg=12, rot=n.to_track_quat('Z', 'Y'))
    return root


def assemble(root):
    """Join the parts under root into one mesh named <root>_Mesh (identity transform)."""
    kids = [o for o in root.children if o.type == 'MESH']
    win = bpy.context.window or bpy.context.window_manager.windows[0]
    if win.scene != SC: win.scene = SC
    a = kids[0]
    with bpy.context.temp_override(window=win, scene=SC, view_layer=SC.view_layers[0], active_object=a, object=a,
                                   selected_objects=kids, selected_editable_objects=kids):
        bpy.ops.object.join()
    a.name = root.name + '_Mesh'; a.data.name = a.name
    return a


def load_specs():
    ns = {'bpy': bpy}
    exec(bpy.data.texts['mr_specs'].as_string(), ns)
    return ns['SPECS']


def rebuild_all(keys=None, poses=('stand', 'sit')):
    specs = load_specs()
    out = {}
    for key in (keys or list(specs)):
        for pose in poses:
            name = f"Char_{key}_{'Sit' if pose == 'sit' else 'Stand'}"
            old = bpy.data.objects.get(name)
            at = tuple(old.location) if old else (0, 0, 0)
            root = build2(key, pose, specs[key], at)
            me = assemble(root)
            out[name] = (len(me.data.polygons), sum(len(p.vertices) - 2 for p in me.data.polygons))
    return out
