"""Chope Wars hand-detail pass (run in Blender with chope-assets.blend open, after open_game).

Adds modelled detail to the hawker-centre templates while keeping every name board3d.js looks up
(TableEdge, PacketBody, TrayBase, FanBlades, StallSign, StallAwning).
    exec(open(r'<repo>/tools/blender/chope_detail.py').read())
    print(detail_chope())
"""
import bpy, bmesh, math, os
from mathutils import Vector, Matrix, Euler

TOOLS = r'C:\Users\seabo\Documents\GitHub\sg_games\tools\blender'


def _ns(scene):
    ns = {'SC': scene}
    exec(open(os.path.join(TOOLS, 'sg_cast.py')).read(), ns)
    return ns


def _kill(*names):
    for n in names:
        o = bpy.data.objects.get(n)
        if o:
            for c in list(o.children_recursive): bpy.data.objects.remove(c, do_unlink=True)
            bpy.data.objects.remove(o, do_unlink=True)


def _join_into(target, parts):
    """Bake target's modifiers, then merge parts (meshes in target's parent space) into it."""
    win = bpy.context.window or bpy.context.window_manager.windows[0]
    sc = target.users_scene[0]
    if win.scene != sc: win.scene = sc
    vl = sc.view_layers[0]
    dg = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(target.evaluated_get(dg))
    target.modifiers.clear()
    old = target.data
    target.data = me
    if old.users == 0: bpy.data.meshes.remove(old)
    # bring each part into target's local space, then join
    inv = target.matrix_world.inverted()
    for p in parts:
        mw = p.matrix_world.copy()
        p.data.transform(inv @ mw)
        p.parent = target; p.matrix_parent_inverse.identity()
        p.location = (0, 0, 0); p.rotation_euler = (0, 0, 0); p.scale = (1, 1, 1)
    with bpy.context.temp_override(window=win, scene=sc, view_layer=vl, active_object=target, object=target,
                                   selected_objects=[target] + parts, selected_editable_objects=[target] + parts):
        bpy.ops.object.join()
    return target


def detail_chope():
    sc = bpy.data.objects['TableTpl'].users_scene[0]
    ns = _ns(sc)
    g = ns
    V, solid = g['V'], g['solid']
    out = {}

    # ---------------- tissue packet: a puffy pillow pack with a resealable flap ----------------
    root = bpy.data.objects['PacketTpl']
    pb = bpy.data.objects['PacketBody']; band = bpy.data.objects['PacketBand']
    m_body, m_band = pb.data.materials[0], band.data.materials[0]
    _kill('PacketBody', 'PacketBand')

    def pack_secs(x0, x1, k=1.0, n=13):
        secs = []
        for i in range(n):
            t = i / (n - 1); x = x0 + (x1 - x0) * t
            u = abs(x) / 0.06
            puff = max(0.0, 1 - u ** 3)
            hh = (0.0035 + 0.0105 * puff) * k
            hw = 0.0425 * (0.94 + 0.06 * puff) * k
            secs.append((V(x, 0, 0.014), V(0, 1, 0), V(0, 0, 1), hw, hh, 3.2, 3.2))
        return secs
    g['loft']('PacketBody', root, m_body, pack_secs(-0.06, 0.06, 1.0, 11), seg=20, sm=60)
    g['loft']('PacketBand', root, m_band, pack_secs(-0.021, 0.021, 1.035, 4), seg=20, sm=60)
    g['rbox']('PacketFlap', root, m_band, (0.0, 0.0, 0.0262), (0.05, 0.03, 0.0014), 0.0006, segs=2)
    for sx in (-1, 1):
        g['rbox']('PacketBodySeal', root, m_body, (sx * 0.0605, 0, 0.014), (0.006, 0.084, 0.006), 0.0015, segs=2)

    # ---------------- plastic stool: lips, foot ring and a moulded grip ring ----------------
    root = bpy.data.objects['StoolTpl']
    body = bpy.data.objects['StoolBody']
    GR = body.data.materials[0]
    r_at = lambda z0, z1: max(math.hypot(v.co.x, v.co.y) for v in body.data.vertices if z0 <= v.co.z <= z1)
    rt, rb = r_at(0.44, 0.46), r_at(-0.01, 0.012)
    g['torus']('StoolLip', root, GR, (0, 0, 0.442), rt * 0.99, 0.009, segR=40, segr=8)
    g['torus']('StoolFoot', root, GR, (0, 0, 0.012), rb * 0.99, 0.012, segR=40, segr=8)
    g['torus']('StoolGrip', root, GR, (0, 0, 0.452), 0.115, 0.004, segR=32, segr=6)
    for i in range(8):
        a = i / 8 * 2 * math.pi + math.pi / 8
        c = V(math.cos(a) * rb * 0.98, math.sin(a) * rb * 0.98, 0.05)
        g['rbox']('StoolRib', root, GR, c, (0.012, 0.022, 0.07), 0.005, rot=(0, 0, a), segs=2)

    # ---------------- marble table: under-plate, collars and a domed foot ----------------
    root = bpy.data.objects['TableTpl']
    ST = bpy.data.objects['TableLeg.001'].data.materials[0]
    g['cylinder']('TableUnder', root, ST, V(0, 0, 0.675), V(0, 0, 0.69), 0.2, seg=48)
    g['revolve']('TableCollar', root, ST, [(0.0, 0.62), (0.05, 0.62), (0.085, 0.66), (0.1, 0.676), (0.0, 0.676)], 40)
    g['revolve']('TableFootDome', root, ST, [(0.0, 0.03), (0.25, 0.03), (0.2, 0.05), (0.11, 0.07), (0.09, 0.1), (0.0, 0.1)], 48)
    for i in range(4):
        a = i / 4 * 2 * math.pi + math.pi / 4
        g['cylinder']('TablePad', root, solid('CW_Rubber', '#2A2622', 0.8), V(math.cos(a) * 0.22, math.sin(a) * 0.22, 0.0), V(math.cos(a) * 0.22, math.sin(a) * 0.22, 0.006), 0.022, seg=16)

    # ---------------- ceiling fan: shaped blades, brackets, canopy and caps ----------------
    root = bpy.data.objects['FanTpl']
    hub = bpy.data.objects['FanBlades']
    m_blade = bpy.data.objects['FanBlade'].data.materials[0]
    m_white = bpy.data.objects['FanMotor'].data.materials[0]
    _kill('FanBlade', 'FanBlade.001', 'FanBlade.002')
    for k in range(3):
        a = k / 3 * 2 * math.pi
        R = Matrix.Rotation(a, 3, 'Z')
        radial, tang = R @ V(1, 0, 0), R @ V(0, 1, 0)
        secs = []
        for i, r in enumerate((0.1, 0.13, 0.22, 0.34, 0.46, 0.56, 0.615, 0.635)):
            w = {0.1: 0.035, 0.13: 0.05, 0.22: 0.062, 0.34: 0.066, 0.46: 0.066, 0.56: 0.062, 0.615: 0.048, 0.635: 0.02}[r]
            pitch = 0.16
            up = Vector((0, 0, 1)); tw_ = (Matrix.Rotation(pitch, 3, radial) @ tang).normalized(); nv = (Matrix.Rotation(pitch, 3, radial) @ up).normalized()
            secs.append((radial * r, tw_, nv, w, 0.0035, 2.0, 2.0))
        g['loft']('FanBlade', hub, m_blade, secs, seg=16, sm=50)
        g['rbox']('FanBracket', hub, m_white, radial * 0.085 + V(0, 0, 0.006), (0.09, 0.024, 0.008), 0.003, rot=Matrix.Rotation(a, 3, 'Z'), segs=2)
    g['revolve']('FanCanopy', root, m_white, [(0.0, -0.06), (0.03, -0.06), (0.065, -0.03), (0.075, -0.004), (0.0, -0.004)], 40)
    g['torus']('FanCollar', root, m_white, (0, 0, -0.56), 0.02, 0.006, segR=24, segr=8)
    g['revolve']('FanCap', root, m_white, [(0.0, -0.735), (0.03, -0.73), (0.075, -0.712), (0.1, -0.7), (0.0, -0.7)], 48)
    g['torus']('FanTrim', root, solid('CW_FanTrim', '#C9C3B8', 0.4, 0.6), (0, 0, -0.63), 0.111, 0.004, segR=48, segr=6)

    # ---------------- hawker stall ----------------
    root = bpy.data.objects['StallTpl']
    WALL = bpy.data.objects['StallBack'].data.materials[0]
    STEEL = solid('CW_StallSteel', '#BFC5CC', 0.25, 0.85)
    DARK = solid('CW_StallDark', '#2B2622', 0.6)
    # tiled back wall
    im = bpy.data.images.get('cw_tiles')
    if im is None:
        im = bpy.data.images.new('cw_tiles', 64, 64, alpha=False)
        px = []
        for y in range(64):
            for x in range(64):
                grout = (x % 32) < 2 or (y % 32) < 2
                v = 0.72 if grout else 0.96
                px += [v, v * 0.99, v * 0.97, 1.0]
        im.pixels[:] = px; im.update(); im.pack()
    mt = bpy.data.materials.get('CW_Tiles') or bpy.data.materials.new('CW_Tiles')
    mt.use_nodes = True
    nt = mt.node_tree
    b = next(n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED')
    if not any(n.type == 'TEX_IMAGE' for n in nt.nodes):
        t = nt.nodes.new('ShaderNodeTexImage'); t.image = im
        nt.links.new(t.outputs['Color'], b.inputs['Base Color'])
    b.inputs['Roughness'].default_value = 0.25
    old_tile = g['TILE']; g['TILE'] = 0.3
    g['rbox']('StallTiles', root, mt, (0, 0.855, 1.45), (1.8, 0.01, 1.1), 0.0, segs=1)
    g['TILE'] = old_tile
    # stainless counter trim and kick plate
    for z in (0.06, 0.55):
        g['rbox']('CounterRail', root, STEEL, (0, -0.132, z), (1.78, 0.016, 0.03), 0.006, segs=3)
    g['rbox']('CounterKick', root, DARK, (0, -0.128, 0.025), (1.8, 0.012, 0.05), 0.004)
    # food trays in the counter top, with food
    foods = (('#E9C46A', 'egg'), ('#7FB069', 'veg'), ('#C8553D', 'char'), ('#F4E3C1', 'tofu'))
    for i, (col, kind) in enumerate(foods):
        x = -0.15 + i * 0.105
        g['rbox']('FoodTray', root, STEEL, (x, 0.16, 1.03), (0.095, 0.14, 0.02), 0.004, segs=2)
        FM = solid('CW_Food_' + kind, col, 0.6)
        for j in range(5):
            jx = x + (-0.025 + (j % 3) * 0.025)
            jy = 0.13 + (j // 3) * 0.05
            g['ellipsoid']('Food', root, FM, (jx, jy, 1.045), 0.016, (1.1, 0.9, 0.55), seg=10)
    # pot lids, handles and ladles
    for px_ in (-0.5, 0.45):
        g['revolve']('PotLid', root, STEEL, [(0.0, 1.278), (0.04, 1.276), (0.15, 1.262), (0.178, 1.255), (0.178, 1.25), (0.0, 1.25)], 48, xf=Matrix.Translation(V(px_, 0.15, 0)))
        g['ellipsoid']('PotKnob', root, DARK, (px_, 0.15, 1.285), 0.018, (1, 1, 0.6), seg=12)
        for sx in (-1, 1):
            g['torus']('PotHandle', root, STEEL, (px_ + sx * 0.188, 0.15, 1.21), 0.025, 0.006, rot=(math.pi / 2, 0, 0), segR=16, segr=6)
        g['sweep']('Ladle', root, STEEL, [V(px_ + 0.08, 0.1, 1.2), V(px_ + 0.12, 0.06, 1.34), V(px_ + 0.15, 0.02, 1.42)], 0.006, seg=8, caprings=1)
    # menu board on the side wall, and a hanging lamp
    g['rbox']('MenuBoard', root, DARK, (-0.895, 0.45, 1.55), (0.012, 0.6, 0.42), 0.006)
    LINE = solid('CW_MenuText', '#F1EEE6', 0.6)
    for i in range(6):
        g['rbox']('MenuLine', root, LINE, (-0.888, 0.45 - 0.05 * (i % 2), 1.7 - i * 0.055), (0.002, 0.42 - 0.12 * (i % 2), 0.014), 0.0, segs=1)
        g['rbox']('MenuPrice', root, solid('CW_MenuPrice', '#E2A93B', 0.5), (-0.888, 0.7, 1.7 - i * 0.055), (0.002, 0.06, 0.014), 0.0, segs=1)
    for lx in (-0.45, 0.45):
        g['sweep']('LampCord', root, DARK, [V(lx, 0.3, 2.5), V(lx, 0.3, 1.86)], 0.004, seg=6, caprings=1)
        g['revolve']('LampShade', root, solid('CW_LampShade', '#2D6A4F', 0.45), [(0.012, 1.88), (0.03, 1.875), (0.09, 1.8), (0.1, 1.79), (0.0, 1.79)], 32, xf=Matrix.Translation(V(lx, 0.3, 0)))
        g['ellipsoid']('LampBulb', root, solid('CW_Bulb', '#FFF3C4', 0.2), (lx, 0.3, 1.79), 0.03, seg=12)
    # roof plate, stall number and a tissue-pack box on the counter
    g['rbox']('StallRoof', root, WALL, (0, 0.45, 2.52), (1.96, 0.98, 0.04), 0.01)
    g['rbox']('StallNumber', root, solid('CW_StallNum', '#22305C', 0.5), (0.78, -0.152, 0.85), (0.16, 0.008, 0.09), 0.006)
    g['rbox']('StallNumberText', root, solid('CW_MenuText', '#F1EEE6', 0.6), (0.78, -0.157, 0.85), (0.11, 0.002, 0.025), 0.0, segs=1)
    # scalloped valance joined into the awning (so the per-stall recolour covers it)
    aw = bpy.data.objects['StallAwning']
    sc_parts = []
    n = 12
    for i in range(n):
        x = -0.95 + (i + 0.5) * 1.9 / n
        sc_parts.append(g['revolve']('Scallop', root, aw.data.materials[0], [(0.0, 0.0), (1.0, 0.0), (1.0, 0.012), (0.0, 0.012)], 24,
                                     xf=Matrix.Translation(V(x, -0.4, 2.035)) @ Matrix.Rotation(math.pi / 2, 4, 'X') @ Matrix.Diagonal((1.9 / n / 2, 0.11, 1, 1)),
                                     arc=(math.pi, 2 * math.pi)))
    _join_into(aw, sc_parts)

    # ---------------- food tray: sliced chicken rice and fishball noodle soup ----------------
    root = bpy.data.objects['TrayTpl']
    m_ch = bpy.data.objects['Chicken'].data.materials[0]
    m_nd = bpy.data.objects['Noodles'].data.materials[0]
    m_rice = bpy.data.objects['Rice'].data.materials[0]
    _kill('Chicken', 'Noodles', 'Rice')
    g['ellipsoid']('Rice', root, m_rice, (0.07, -0.005, 0.03), 0.042, (1, 1, 0.62), seg=28, deform=g['bumpy'](g['fib_dirs'](90), 0.06, 0.18))
    SKIN = solid('CW_ChickenSkin', '#E8C07A', 0.45)
    for i in range(5):
        y = -0.06 + i * 0.014
        g['rbox']('Chicken', root, m_ch, (0.128, y, 0.038 + i * 0.002), (0.05, 0.012, 0.012), 0.004, rot=(0.25, 0, 0.35), segs=2)
        g['rbox']('ChickenSkin', root, SKIN, (0.128, y, 0.0455 + i * 0.002), (0.05, 0.0125, 0.0025), 0.001, rot=(0.25, 0, 0.35), segs=1)
    CUKE = solid('CW_Cucumber', '#9BC53D', 0.5)
    for i in range(4):
        g['cylinder']('Cucumber', root, CUKE, V(0.155 - i * 0.012, 0.035, 0.032), V(0.155 - i * 0.012, 0.035 + 0.004, 0.036), 0.011, seg=14)
    g['revolve']('ChiliDish', root, bpy.data.objects['Bowl'].data.materials[0], [(0.0, 0.02), (0.012, 0.02), (0.02, 0.03), (0.022, 0.034), (0.019, 0.034), (0.0, 0.025)], 24, xf=Matrix.Translation(V(0.14, 0.095, 0)))
    g['cylinder']('Chili', root, solid('CW_Chili', '#D7263D', 0.4), V(0.14, 0.095, 0.026), V(0.14, 0.095, 0.03), 0.018, seg=20)
    bc = V(-0.07, 0.02, 0.0)
    for i in range(9):
        a = i / 9 * 2 * math.pi
        pts = []
        for j in range(7):
            t = j / 6
            r = 0.012 + 0.04 * t
            pts.append(bc + V(math.cos(a + t * 2.2) * r, math.sin(a + t * 2.2) * r, 0.064 + 0.006 * math.sin(t * 9 + i)))
        g['sweep']('Noodles', root, m_nd, pts, 0.0032, seg=6, caprings=1)
    FB = solid('CW_Fishball', '#F4EFE6', 0.5)
    for i, (dx, dy_) in enumerate(((-0.02, 0.015), (0.018, 0.022), (0.0, -0.025))):
        g['ellipsoid']('Fishball', root, FB, bc + V(dx, dy_, 0.07), 0.011, seg=12)
    GREEN = solid('CW_Greens', '#4C9A2A', 0.6)
    for i in range(3):
        a = 2.2 + i * 0.45
        g['ellipsoid']('Greens', root, GREEN, bc + V(math.cos(a) * 0.03, math.sin(a) * 0.03, 0.07), 0.02, (1.0, 0.45, 0.12), seg=12, rot=(0, 0.2, a))
    WOOD = solid('CW_Chopsticks', '#C9A27A', 0.5)
    for k in (-0.006, 0.006):
        g['capsule']('Chopstick', root, WOOD, V(-0.16, -0.1 + k, 0.024), V(0.0, -0.11 + k * 0.4, 0.024), 0.0032, 0.0022, seg=6, n=1, caprings=1)
    SP = bpy.data.objects['Bowl'].data.materials[0]
    g['ellipsoid']('SpoonBowl', root, SP, (0.03, 0.105, 0.026), 0.016, (1.4, 1.0, 0.35), seg=14)
    g['capsule']('SpoonHandle', root, SP, V(0.05, 0.105, 0.028), V(0.11, 0.105, 0.03), 0.004, seg=8, n=1, caprings=1)

    out['tris'] = {r: sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in bpy.data.objects[r].children_recursive if o.type == 'MESH')
                   for r in ('TableTpl', 'StoolTpl', 'PacketTpl', 'FanTpl', 'StallTpl', 'TrayTpl', 'CardTpl')}
    return out


def finish_chope():
    """Merge parts by material (fewer draw calls for ~40 stools) and fold the packet seals into PacketBody."""
    exec(open(os.path.join(TOOLS, 'merge.py')).read(), globals())
    keep = ('TableEdge', 'PacketBody', 'TrayBase', 'StallSign', 'StallAwning', 'Card')
    res = {}
    for r in ('TableTpl', 'StoolTpl', 'PacketTpl', 'FanTpl', 'StallTpl', 'TrayTpl'):
        root = bpy.data.objects[r]
        before = len([c for c in root.children_recursive if c.type == 'MESH'])
        merge_by_material(root, keep)
        res[r] = (before, len([c for c in root.children_recursive if c.type == 'MESH']))
    pb = bpy.data.objects['PacketBody']
    seals = [o for o in bpy.data.objects['PacketTpl'].children if o.name.startswith('PacketBodySeal')]
    if seals:
        sc = pb.users_scene[0]
        win = bpy.context.window or bpy.context.window_manager.windows[0]
        win.scene = sc
        dg = bpy.context.evaluated_depsgraph_get()
        for o in seals:
            if o.modifiers:
                me = bpy.data.meshes.new_from_object(o.evaluated_get(dg)); o.modifiers.clear(); o.data = me
        with bpy.context.temp_override(window=win, scene=sc, view_layer=sc.view_layers[0], active_object=pb, object=pb,
                                       selected_objects=[pb] + seals, selected_editable_objects=[pb] + seals):
            bpy.ops.object.join()
    return res
