"""Big Two 3D assets: builds games/big-two/models/source/bigtwo-assets.blend and exports the GLB.

Run in Blender through the MCP, one step per call:
    exec(open(r'<repo>/tools/blender/bigtwo_build.py').read())
    print(new_file())   # fresh empty file, saved as the game's source .blend
    print(build())      # (next call) props + the seated SG cast, then export_glb()
Templates sit in a row along X; board3d.js clones them by root name.
"""
import bpy, bmesh, math, os, random
from mathutils import Vector, Matrix

REPO = r'C:\Users\seabo\Documents\GitHub\sg_games'
TOOLS = os.path.join(REPO, 'tools', 'blender')
BLEND = os.path.join(REPO, 'games', 'big-two', 'models', 'source', 'bigtwo-assets.blend')
GLB = os.path.join(REPO, 'games', 'big-two', 'models', 'bigtwo-assets.glb')
CAST_SRC = os.path.join(REPO, 'games', 'mrt-rush', 'models', 'source', 'mrt-assets.blend')
CAST = ['aunty', 'uncle', 'ns', 'worker_b', 'parent', 'student_a']
ROOTS = ['RoundTable', 'Chair', 'Orange', 'OrangePlate', 'TartJar', 'AngBao', 'TeaSet', 'Lantern', 'FuPlaque', 'Sideboard', 'Window']


def new_file():
    bpy.ops.wm.read_homefile(use_empty=True)
    sc = bpy.data.scenes[0]
    sc.name = 'BigTwo'
    sc.unit_settings.system = 'METRIC'
    os.makedirs(os.path.dirname(BLEND), exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=BLEND)
    return bpy.data.filepath


def _ns():
    sc = bpy.data.scenes['BigTwo']
    ns = {'SC': sc}
    exec(open(os.path.join(TOOLS, 'sg_cast.py')).read(), ns)
    return ns


def append_cast():
    want = []
    for k in CAST:
        want += [f'Char_{k}_Sit', f'Char_{k}_Sit_Mesh']
    for t in bpy.data.texts: t.use_fake_user = True
    with bpy.data.libraries.load(CAST_SRC, link=False) as (src, dst):
        dst.objects = [n for n in want if n in src.objects]
    sc = bpy.data.scenes['BigTwo']
    out = []
    for i, o in enumerate(dst.objects):
        if o is None: continue
        sc.collection.objects.link(o)
    for i, k in enumerate(CAST):
        r = bpy.data.objects.get(f'Char_{k}_Sit')
        if r: r.location = (i * 0.8, 6.0, 0.0); out.append(r.name)
    return out


def _join(objs, name):
    sc = bpy.data.scenes['BigTwo']
    win = bpy.context.window or bpy.context.window_manager.windows[0]
    if win.scene != sc: win.scene = sc
    a = objs[0]
    with bpy.context.temp_override(window=win, scene=sc, view_layer=sc.view_layers[0], active_object=a, object=a,
                                   selected_objects=objs, selected_editable_objects=objs):
        bpy.ops.object.join()
    a.name = name; a.data.name = name
    return a


def tris(root):
    return sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in root.children_recursive if o.type == 'MESH')


def build_props():
    g = _ns()
    V, solid, empty = g['V'], g['solid'], g['empty']
    revolve, ellipsoid, torus, cylinder, sweep, capsule, rbox, loft = (g[k] for k in ('revolve', 'ellipsoid', 'torus', 'cylinder', 'sweep', 'capsule', 'rbox', 'loft'))
    rnd = random.Random(7)
    WOOD = solid('BT_Wood', '#7A4A2A', 0.42)
    WOODD = solid('BT_WoodDark', '#4E2E1A', 0.45)
    CLOTH = solid('BT_Cloth', '#C8162F', 0.85)
    GOLD = solid('BT_Gold', '#E2A93B', 0.32, 0.7)
    ORANGE = solid('BT_Orange', '#F0861E', 0.5)
    LEAF = solid('BT_Leaf', '#3F8F3D', 0.45)
    STEM = solid('BT_Stem', '#5A3A1E', 0.7)
    PORC = solid('BT_Porcelain', '#F6F2E8', 0.18)
    BLUE = solid('BT_Blue', '#2D5FA8', 0.22)
    RED = solid('BT_Red', '#C8162F', 0.35)
    TART = solid('BT_Tart', '#E7B566', 0.75)
    JAM = solid('BT_Jam', '#C9781C', 0.35)
    CUSH = solid('BT_Cushion', '#B3122E', 0.8)
    LANT = solid('BT_Lantern', '#D7263D', 0.7)
    TEA = solid('BT_Tea', '#7A4A1E', 0.15)
    BUD = solid('BT_Bud', '#EEE9DF', 0.95)
    TWIG = solid('BT_Twig', '#5B4636', 0.8)
    FRAME = solid('BT_Frame', '#EDE7DA', 0.5)
    GLASS = solid('BT_Glass', '#BFE0EA', 0.08)
    JAR = solid('BT_Jar', '#F4F8F6', 0.05)
    b = next(n for n in JAR.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    b.inputs['Alpha'].default_value = 0.28
    for attr, val in (('blend_method', 'BLEND'), ('surface_render_method', 'BLENDED')):
        try: setattr(JAR, attr, val)
        except Exception: pass
    out = {}

    # ---------------- round table with a red CNY tablecloth ----------------
    root = empty('RoundTable', (0, 0, 0))
    TOP = 0.7585
    fold = lambda a, t: 1 + max(0.0, (t - 0.42) / 0.58) ** 1.6 * 0.032 * math.sin(a * 18 + 0.4 * math.sin(a * 5))
    revolve('ClothTop', root, CLOTH, [(0, TOP), (0.5, TOP), (0.585, TOP - 0.0005), (0.612, TOP - 0.004), (0.626, TOP - 0.014),
                                     (0.634, TOP - 0.04), (0.64, 0.68), (0.646, 0.62), (0.652, 0.565), (0.655, 0.545)], 144, amod=fold, sm=50)
    revolve('ClothHem', root, GOLD, [(0.651, 0.566), (0.661, 0.562), (0.663, 0.546), (0.653, 0.541)], 144,
            amod=lambda a, t: 1 + 0.032 * math.sin(a * 18 + 0.4 * math.sin(a * 5)), closed_prof=True, sm=50)
    revolve('ClothRing', root, GOLD, [(0.44, TOP + 0.0004), (0.452, TOP + 0.0004), (0.452, TOP + 0.0012), (0.44, TOP + 0.0012)], 96, closed_prof=True)
    for i in range(48):
        a = i / 48 * 2 * math.pi
        cylinder('ClothDot', root, GOLD, (math.cos(a) * 0.53, math.sin(a) * 0.53, TOP), (math.cos(a) * 0.53, math.sin(a) * 0.53, TOP + 0.001), 0.0065, seg=12)
    revolve('TableTop', root, WOOD, [(0, 0.722), (0.58, 0.722), (0.596, 0.728), (0.6, 0.74), (0.596, 0.752), (0.58, 0.757), (0, 0.757)], 96)
    revolve('Pedestal', root, WOOD, [(0, 0.05), (0.1, 0.05), (0.11, 0.08), (0.07, 0.13), (0.058, 0.25), (0.08, 0.36), (0.084, 0.4), (0.062, 0.46),
                                     (0.052, 0.62), (0.07, 0.66), (0.1, 0.69), (0.1, 0.722), (0, 0.722)], 48)
    for k in range(4):
        a = k / 4 * 2 * math.pi + math.pi / 4
        d = V(math.cos(a), math.sin(a), 0)
        pts = [d * 0.04 + V(0, 0, 0.115), d * 0.16 + V(0, 0, 0.1), d * 0.3 + V(0, 0, 0.055), d * 0.4 + V(0, 0, 0.03)]
        sweep('Foot', root, WOOD, pts, [0.038, 0.034, 0.028, 0.024], seg=16, cap0='flat', caprings=2)
        cylinder('FootPad', root, WOODD, d * 0.4 + V(0, 0, 0.0), d * 0.4 + V(0, 0, 0.022), 0.028, seg=16)
    out['RoundTable'] = tris(root)

    # ---------------- dining chair with a red cushion ----------------
    root = empty('Chair', (2.0, 0, 0))
    SEAT = 0.36
    rbox('Seat', root, WOOD, (0, 0.03, SEAT), (0.44, 0.37, 0.035), 0.012, segs=3)
    rbox('Cushion', root, CUSH, (0, 0.025, SEAT + 0.035), (0.39, 0.32, 0.04), 0.017, segs=4)
    # gold piping round the cushion
    hw, hd, rr = 0.195, 0.16, 0.03
    path = []
    for cx_, cy_, a0 in ((hw - rr, hd - rr, 0), (-hw + rr, hd - rr, 90), (-hw + rr, -hd + rr, 180), (hw - rr, -hd + rr, 270)):
        for k in range(7):
            a_ = math.radians(a0 + 90 * k / 6)
            path.append(V(cx_ + rr * math.cos(a_), 0.025 + cy_ + rr * math.sin(a_), SEAT + 0.052))
    path.append(path[0])
    sweep('Piping', root, GOLD, path, 0.0045, seg=8, cap0=False, cap1=False)
    turned = [(0, 0.0), (0.017, 0.0), (0.019, 0.02), (0.015, 0.06), (0.018, 0.12), (0.014, 0.16), (0.02, 0.18), (0.02, 0.2), (0.016, 0.22), (0.018, SEAT - 0.04), (0.02, SEAT - 0.02), (0, SEAT - 0.02)]
    for sx in (-1, 1):
        for sy in (-1, 1):
            top = SEAT - 0.02
            if sy > 0:
                # back leg runs up into the back post, leaning back a little
                pts = [V(sx * 0.19, 0.185, 0.0), V(sx * 0.19, 0.18, top), V(sx * 0.19, 0.2, 0.62), V(sx * 0.19, 0.225, 0.86)]
                sweep('BackPost', root, WOOD, pts, [0.018, 0.019, 0.017, 0.016], seg=14, cap0='flat', caprings=2)
                ellipsoid('PostCap', root, WOODD, V(sx * 0.19, 0.225, 0.865), 0.02, (1, 1, 0.8), seg=14)
            else:
                revolve('Leg', root, WOOD, turned, 20, xf=Matrix.Translation(V(sx * 0.19, -0.13, 0)))
        capsule('Rail', root, WOOD, V(sx * 0.19, -0.13, 0.16), V(sx * 0.19, 0.185, 0.16), 0.009, seg=10, n=1, cap0='flat', cap1='flat')
    capsule('Rail', root, WOOD, V(-0.19, 0.03, 0.16), V(0.19, 0.03, 0.16), 0.009, seg=10, n=1, cap0='flat', cap1='flat')
    rbox('Apron', root, WOOD, (0, -0.135, SEAT - 0.035), (0.36, 0.018, 0.04), 0.006, segs=2)
    secs = []
    for i in range(9):
        x = -0.2 + 0.4 * i / 8
        y = 0.222 - 0.025 * math.cos(x / 0.2 * math.pi / 2)
        secs.append((V(x, y, 0.81), V(0, 1, 0), V(0, 0, 1), 0.012, 0.045, 3.0, 3.0))
    loft('TopRail', root, WOOD, secs, seg=20, sm=50)
    for x in (-0.09, 0.0, 0.09):
        rbox('Slat', root, WOODD if x == 0 else WOOD, (x, 0.21 - 0.012 * math.cos(x / 0.2 * math.pi / 2), 0.6), (0.045 if x == 0 else 0.028, 0.014, 0.36), 0.006, segs=2)
    rbox('LowRail', root, WOOD, (0, 0.195, 0.42), (0.38, 0.02, 0.04), 0.008, segs=2)
    out['Chair'] = tris(root)

    # ---------------- mandarin oranges ----------------
    dirs = g['fib_dirs'](220)

    def make_orange(name, root, c, r=0.032, rot=0.0, leaf=True):
        pores = lambda p: p * (1 + 0.006 * math.sin(p.x * 900) * math.sin(p.y * 870) * math.sin(p.z * 910))
        dent = lambda p: p if p.length < 1e-9 else p - V(0, 0, 1) * (0.11 * r * max(0.0, (p.z / r) - 0.72) / 0.28) ** 1.0 * (1 if p.z > 0 else 0)
        parts = [ellipsoid(name, root, ORANGE, V(0, 0, 0), r, (1.0, 1.0, 0.84), seg=40, rings=22, deform=lambda p: pores(dent(p)))]
        top = 0.84 * r - 0.004
        for k in range(5):
            a = k / 5 * 2 * math.pi
            parts.append(ellipsoid('Calyx', root, LEAF, V(math.cos(a) * 0.004, math.sin(a) * 0.004, top), 0.005, (1.3, 0.55, 0.3), seg=8, rot=(0, 0, a)))
        parts.append(capsule('Stem', root, STEM, V(0, 0, top), V(0.001, 0.0, top + 0.008), 0.0022, 0.0016, seg=8, n=1, cap0='flat'))
        if leaf:
            secs = []
            for i in range(11):
                t = i / 10
                w = 0.012 * math.sin(math.pi * min(1, t * 1.08)) ** 0.8
                secs.append((V(0.004 + t * 0.05, 0, top + 0.006 + 0.012 * math.sin(t * 2.4) - 0.01 * t * t), V(0, 1, 0), V(0, 0, 1), w, 0.0012, 2.2, 2.2))
            parts.append(loft('Leaf', root, LEAF, secs, seg=14, sm=40))
        for o in parts:
            o.data.transform(Matrix.Translation(Vector(c)) @ Matrix.Rotation(rot, 4, 'Z'))
        return parts

    root = empty('Orange', (3.0, 0, 0))
    make_orange('Orange', root, V(0, 0, 0.032 * 0.84), leaf=True)
    out['Orange'] = tris(root)

    root = empty('OrangePlate', (3.6, 0, 0))
    revolve('Plate', root, PORC, [(0, 0.004), (0.09, 0.004), (0.1, 0.0), (0.11, 0.004), (0.14, 0.016), (0.155, 0.024), (0.158, 0.028),
                                  (0.152, 0.029), (0.136, 0.022), (0.1, 0.013), (0, 0.012)], 64, closed_prof=False)
    revolve('PlateBand', root, BLUE, [(0.13, 0.0205), (0.146, 0.0255), (0.146, 0.0263), (0.13, 0.0213)], 64, closed_prof=True)
    r = 0.031
    spots = [(0.075 * math.cos(a), 0.075 * math.sin(a), 0.012 + r * 0.84) for a in [i / 7 * 2 * math.pi for i in range(7)]]
    spots += [(0.034 * math.cos(a), 0.034 * math.sin(a), 0.012 + r * 0.84 + 0.042) for a in [i / 3 * 2 * math.pi + 0.5 for i in range(3)]]
    spots += [(0.0, 0.0, 0.012 + r * 0.84 + 0.08)]
    spots += [(0.0, 0.0, 0.012 + r * 0.84)]
    for i, c in enumerate(spots):
        make_orange('Orange', root, V(*c), r=r, rot=rnd.uniform(0, 6.28), leaf=i in (1, 4, 8, 10))
    out['OrangePlate'] = tris(root)

    # ---------------- pineapple tart jar ----------------
    root = empty('TartJar', (4.2, 0, 0))
    revolve('Jar', root, JAR, [(0, 0.0), (0.06, 0.0), (0.066, 0.004), (0.068, 0.012), (0.068, 0.106), (0.064, 0.112), (0.0615, 0.112),
                                (0.0645, 0.106), (0.0645, 0.012), (0.06, 0.0045), (0, 0.004)], 64)
    revolve('Lid', root, RED, [(0, 0.132), (0.05, 0.132), (0.064, 0.128), (0.071, 0.12), (0.072, 0.106), (0.066, 0.106), (0.066, 0.12), (0, 0.124)], 64, closed_prof=False)
    revolve('LidBand', root, GOLD, [(0.071, 0.11), (0.0735, 0.11), (0.0735, 0.116), (0.071, 0.116)], 64, closed_prof=True)
    revolve('Knob', root, GOLD, [(0, 0.132), (0.022, 0.132), (0.024, 0.136), (0.02, 0.143), (0, 0.145)], 32)
    lobes = lambda a, t: 1 + 0.06 * abs(math.sin(a * 6))
    for layer in range(3):
        z = 0.006 + layer * 0.034
        ring = [(0, 0)] + [(0.036 * math.cos(a), 0.036 * math.sin(a)) for a in [i / 6 * 2 * math.pi + layer * 0.5 for i in range(6)]]
        for (x, y) in ring:
            base = revolve('Tart', root, TART, [(0, 0), (0.0145, 0), (0.0155, 0.004), (0.0145, 0.011), (0.0105, 0.012), (0.009, 0.009), (0, 0.009)], 24, amod=lobes)
            jam = ellipsoid('TartJam', root, JAM, V(0, 0, 0.0095), 0.0085, (1, 1, 0.65), seg=16)
            for o in (base, jam): o.data.transform(Matrix.Translation(V(x, y, z)))
    out['TartJar'] = tris(root)

    # ---------------- red packets ----------------
    root = empty('AngBao', (4.8, 0, 0))
    for i, (dx, dy, a) in enumerate(((0, 0, 0.0), (0.012, 0.01, 0.22), (-0.01, 0.018, -0.18))):
        z = 0.0015 + i * 0.003
        parts = [rbox('Packet', root, RED, (0, 0, 0), (0.088, 0.162, 0.0026), 0.0012, segs=1),
                 cylinder('Coin', root, GOLD, (0, 0.02, 0.0012), (0, 0.02, 0.0018), 0.017, seg=28),
                 rbox('Flap', root, GOLD, (0, -0.045, 0.0013), (0.07, 0.0025, 0.0005), 0.0002, segs=1)]
        for o in parts: o.data.transform(Matrix.Translation(V(dx, dy, z)) @ Matrix.Rotation(a, 4, 'Z'))
    out['AngBao'] = tris(root)

    # ---------------- tea set on a tray ----------------
    root = empty('TeaSet', (5.4, 0, 0))
    rbox('Tray', root, WOODD, (0, 0, 0.008), (0.3, 0.2, 0.016), 0.006, segs=3)
    rbox('TrayLip', root, WOOD, (0, 0, 0.018), (0.29, 0.19, 0.006), 0.003, segs=2)
    pot = [(0, 0.02), (0.035, 0.02), (0.05, 0.03), (0.062, 0.055), (0.063, 0.075), (0.055, 0.1), (0.04, 0.112), (0.032, 0.114), (0, 0.114)]
    revolve('Pot', root, PORC, [(x, z) for x, z in pot], 48)
    revolve('PotBand', root, BLUE, [(0.0625, 0.06), (0.0645, 0.062), (0.0645, 0.072), (0.0625, 0.074)], 48, closed_prof=True)
    revolve('PotLid', root, PORC, [(0, 0.124), (0.012, 0.124), (0.014, 0.118), (0.034, 0.113), (0.035, 0.111), (0, 0.111)], 40)
    ellipsoid('PotKnob', root, BLUE, V(0, 0, 0.128), 0.008, (1, 1, 0.8), seg=16)
    sweep('Spout', root, PORC, [V(-0.055, 0, 0.06), V(-0.075, 0, 0.075), V(-0.088, 0, 0.098), V(-0.094, 0, 0.11)], [0.013, 0.01, 0.007, 0.0065], seg=16, cap0=False, cap1='flat')
    hp = g['arc_pts'](V(0.062, 0, 0.073), 1.0, math.radians(80), math.radians(-85), 14)
    hp = [V(0.062 + (p.x - 0.062) * 0.034, 0, 0.073 + (p.z - 0.073) * 0.028) for p in hp]
    sweep('Handle', root, PORC, hp, [0.0065 + 0.0015 * math.sin(math.pi * i / 14) for i in range(15)], seg=12, caprings=1)
    for (cx, cy) in ((-0.06, -0.07), (0.03, -0.075), (0.1, -0.03), (0.1, 0.06)):
        cup = revolve('Cup', root, PORC, [(0, 0.02), (0.016, 0.02), (0.017, 0.024), (0.022, 0.03), (0.028, 0.06), (0.029, 0.062), (0.026, 0.062), (0.0255, 0.06), (0.02, 0.031), (0, 0.028)], 36)
        band = revolve('CupBand', root, BLUE, [(0.0262, 0.047), (0.0285, 0.051), (0.0285, 0.055), (0.0265, 0.053)], 36, closed_prof=True)
        tea = cylinder('Tea', root, TEA, (0, 0, 0.05), (0, 0, 0.0505), 0.024, seg=24)
        for o in (cup, band, tea): o.data.transform(Matrix.Translation(V(cx, cy, 0)))
    out['TeaSet'] = tris(root)

    # ---------------- red lantern ----------------
    root = empty('Lantern', (6.2, 0, 0))
    ribs = lambda a, t: 1 - 0.05 * abs(math.sin(a * 6)) ** 0.7
    lp = []
    for i in range(25):
        z = -0.125 + 0.25 * i / 24
        lp.append((max(0.07, 0.186 * math.sqrt(max(0.0, 1 - (z / 0.152) ** 2))), z))
    revolve('LanternBody', root, LANT, lp, 72, amod=ribs, sm=60)
    for z, s in ((0.125, 1), (-0.125, -1)):
        revolve('LanternCap', root, GOLD, [(0, z), (0.075, z), (0.078, z + s * 0.012), (0.072, z + s * 0.024), (0, z + s * 0.024)], 40)
    for k in range(12):
        a = k / 12 * 2 * math.pi
        pts = [V(math.cos(a) * r_ * 1.006, math.sin(a) * r_ * 1.006, z_) for r_, z_ in lp]
        sweep('LanternRib', root, GOLD, pts, 0.0022, seg=6, caprings=1)
    sweep('Cord', root, GOLD, [V(0, 0, 0.149), V(0, 0, 0.4)], 0.004, seg=8, caprings=1)
    for k in range(14):
        a = k / 14 * 2 * math.pi
        rr = 0.012 + 0.004 * (k % 2)
        capsule('Tassel', root, GOLD, V(math.cos(a) * rr * 0.4, math.sin(a) * rr * 0.4, -0.15), V(math.cos(a) * rr, math.sin(a) * rr, -0.32), 0.0028, seg=6, n=1, cap0='flat')
    revolve('TasselKnot', root, GOLD, [(0, -0.149), (0.012, -0.152), (0.016, -0.162), (0.012, -0.172), (0, -0.175)], 24)
    out['Lantern'] = tris(root)

    # ---------------- diamond plaque (faces -Y) ----------------
    root = empty('FuPlaque', (6.8, 0, 0))
    R = Matrix.Rotation(math.pi / 4, 4, 'Y')
    rbox('PlaqueBoard', root, LANT, (0, 0, 0), (0.3, 0.012, 0.3), 0.01, rot=R, segs=3)
    for i in range(4):
        a = i * math.pi / 2
        d = V(math.cos(a + math.pi / 4), 0, math.sin(a + math.pi / 4))
        rbox('PlaqueRim', root, GOLD, tuple(d * 0.128 + V(0, -0.007, 0)), (0.25, 0.004, 0.012), 0.002, rot=Matrix.Rotation(-a - math.pi / 4 + math.pi / 2, 4, 'Y'), segs=1)
    for k in range(5):
        a = k / 5 * 2 * math.pi - math.pi / 2
        ellipsoid('Petal', root, GOLD, V(math.cos(a) * 0.035, -0.011, math.sin(a) * 0.035), 0.03, (0.7, 0.15, 1.0), seg=16, rot=(0, -a - math.pi / 2, 0))
    ellipsoid('PetalCore', root, solid('BT_Pale', '#FFE08A', 0.4), V(0, -0.014, 0), 0.016, (1, 0.35, 1), seg=16)
    sweep('PlaqueCord', root, GOLD, [V(0, -0.002, 0.2), V(0, -0.002, 0.34)], 0.003, seg=6, caprings=1)
    for k in range(9):
        x = (k - 4) * 0.003
        capsule('PlaqueTassel', root, GOLD, V(x * 0.5, -0.004, -0.215), V(x, -0.004, -0.31), 0.0022, seg=6, n=1, cap0='flat')
    ellipsoid('PlaqueKnot', root, GOLD, V(0, -0.004, -0.215), 0.01, seg=12)
    out['FuPlaque'] = tris(root)

    # ---------------- sideboard with pussy willow ----------------
    root = empty('Sideboard', (8.0, 0, 0))
    rbox('Cabinet', root, WOOD, (0, 0, 0.42), (1.3, 0.42, 0.7), 0.012, segs=3)
    rbox('CabTop', root, WOODD, (0, 0, 0.785), (1.36, 0.46, 0.035), 0.01, segs=3)
    rbox('CabBase', root, WOODD, (0, 0.01, 0.04), (1.26, 0.4, 0.08), 0.006, segs=2)
    for i in range(3):
        x = (i - 1) * 0.42
        rbox('Door', root, WOOD, (x, -0.214, 0.42), (0.39, 0.02, 0.62), 0.008, segs=3)
        rbox('DoorPanel', root, WOODD, (x, -0.225, 0.42), (0.3, 0.008, 0.5), 0.01, segs=3)
        capsule('Knob', root, GOLD, V(x + (0.15 if i < 2 else -0.15), -0.232, 0.5), V(x + (0.15 if i < 2 else -0.15), -0.248, 0.5), 0.009, seg=12, n=1, cap0='flat')
    vase = revolve('Vase', root, BLUE, [(0, 0.8), (0.06, 0.8), (0.085, 0.85), (0.09, 0.9), (0.07, 0.98), (0.04, 1.03), (0.038, 1.06), (0.046, 1.08), (0.04, 1.08), (0.032, 1.06), (0, 1.06)], 48)
    revolve('VaseBand', root, PORC, [(0.0895, 0.88), (0.0915, 0.885), (0.0915, 0.915), (0.0895, 0.92)], 48, closed_prof=True)
    for k in range(7):
        a = k / 7 * 2 * math.pi + rnd.uniform(-0.3, 0.3)
        lean = rnd.uniform(0.12, 0.3)
        h = rnd.uniform(0.55, 0.8)
        pts = [V(0, 0, 1.0)] + [V(math.cos(a) * lean * t * t * 0.6 + 0.01 * math.sin(t * 9 + k), math.sin(a) * lean * t * t * 0.6, 1.0 + h * t) for t in (0.25, 0.5, 0.75, 1.0)]
        sweep('Twig', root, TWIG, pts, [0.0045, 0.004, 0.0032, 0.0024, 0.0015], seg=8, caprings=1)
        for t in [0.3 + 0.1 * i for i in range(7)]:
            p = V(math.cos(a) * lean * t * t * 0.6 + 0.01 * math.sin(t * 9 + k), math.sin(a) * lean * t * t * 0.6, 1.0 + h * t)
            side = 1 if (int(t * 10) % 2) else -1
            ellipsoid('Bud', root, BUD, p + V(side * 0.007 * math.sin(a), -side * 0.007 * math.cos(a), 0), 0.008, (0.7, 0.7, 1.25), seg=10)
        # little red ornaments on a few twigs
        if k % 2 == 0:
            p = V(math.cos(a) * lean * 0.36 * 0.6, math.sin(a) * lean * 0.36 * 0.6, 1.0 + h * 0.6)
            sweep('OrnCord', root, GOLD, [p, p - V(0, 0, 0.04)], 0.0012, seg=5, caprings=1)
            ellipsoid('Ornament', root, LANT, p - V(0, 0, 0.06), 0.02, (1, 1, 0.85), seg=16)
            for z in (0.017, -0.017):
                cylinder('OrnCap', root, GOLD, p - V(0, 0, 0.06 - z), p - V(0, 0, 0.06 - z * 1.25), 0.008, seg=12)
    # a stack of CNY goodies tins
    for i, (x, r_, h, m) in enumerate(((0.38, 0.09, 0.08, RED), (0.38, 0.075, 0.07, GOLD), (0.55, 0.07, 0.09, RED))):
        z0 = 0.8 + (0.08 if i == 1 else 0)
        revolve('Tin', root, m, [(0, z0), (r_, z0), (r_ + 0.003, z0 + 0.005), (r_ + 0.003, z0 + h - 0.005), (r_, z0 + h), (0, z0 + h)], 48)
        revolve('TinBand', root, GOLD if m == RED else RED, [(r_ + 0.002, z0 + h * 0.4), (r_ + 0.0045, z0 + h * 0.42), (r_ + 0.0045, z0 + h * 0.58), (r_ + 0.002, z0 + h * 0.6)], 48, closed_prof=True)
    vase_x = -0.42
    for o in [c for c in root.children if c.name.split('.')[0] in ('Vase', 'VaseBand', 'Twig', 'Bud', 'OrnCord', 'Ornament', 'OrnCap')]:
        o.data.transform(Matrix.Translation(V(vase_x, 0, 0)))
    out['Sideboard'] = tris(root)

    # ---------------- HDB window with a grille (faces -Y) ----------------
    root = empty('Window', (10.0, 0, 0))
    W, H = 1.3, 1.0
    rbox('Glass', root, GLASS, (0, 0.01, 0), (W - 0.08, 0.006, H - 0.08), 0.002, segs=1)
    for (cx, cz, sx_, sz_) in ((0, H / 2 - 0.03, W, 0.06), (0, -H / 2 + 0.03, W, 0.06), (W / 2 - 0.03, 0, 0.06, H), (-W / 2 + 0.03, 0, 0.06, H), (0, 0, 0.04, H - 0.06)):
        rbox('Frame', root, FRAME, (cx, 0, cz), (sx_, 0.07, sz_), 0.008, segs=2)
    rbox('Sill', root, FRAME, (0, -0.06, -H / 2 - 0.02), (W + 0.12, 0.14, 0.04), 0.01, segs=2)
    for k in range(9):
        x = -W / 2 + 0.1 + k * (W - 0.2) / 8
        capsule('Grille', root, FRAME, V(x, -0.06, -H / 2 + 0.02), V(x, -0.06, H / 2 - 0.02), 0.008, seg=8, n=1, cap0='flat', cap1='flat')
    for z in (-0.18, 0.18):
        capsule('Grille', root, FRAME, V(-W / 2 + 0.04, -0.06, z), V(W / 2 - 0.04, -0.06, z), 0.008, seg=8, n=1, cap0='flat', cap1='flat')
    out['Window'] = tris(root)
    return out


def finish():
    """Merge each template's parts by material so the scene stays light on draw calls."""
    exec(open(os.path.join(TOOLS, 'merge.py')).read(), globals())
    res = {}
    for r in ROOTS:
        o = bpy.data.objects.get(r)
        if o: res[r] = merge_by_material(o, keep=())
    return res


def export_glb():
    sc = bpy.data.scenes['BigTwo']
    win = bpy.context.window or bpy.context.window_manager.windows[0]
    win.scene = sc
    names = ROOTS + [f'Char_{k}_Sit' for k in CAST]
    objs = []
    for n in names:
        o = bpy.data.objects.get(n)
        if o: objs += [o] + list(o.children_recursive)
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs: o.select_set(True)
    bpy.ops.export_scene.gltf(filepath=GLB, export_format='GLB', use_selection=True, export_apply=True,
                              export_draco_mesh_compression_enable=True, export_draco_mesh_compression_level=6, export_yup=True)
    bpy.ops.wm.save_as_mainfile(filepath=BLEND)
    return dict(size_kb=round(os.path.getsize(GLB) / 1024), roots=len(names))


def build():
    out = build_props()
    out['cast'] = append_cast()
    return out
