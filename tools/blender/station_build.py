"""Next Station 3D assets: builds games/next-station/models/source/station-assets.blend and exports the GLB.

Run in Blender through the MCP, one step per call:
    exec(open(r'<repo>/tools/blender/station_build.py').read())
    print(new_file())   # fresh empty file, saved as the game's source .blend
    print(build())      # (next call) cab, station, viaduct, tunnel, signs + borrowed scenery and the SG cast
    print(export_glb()) # (next call) merge by material, export, save
The track runs along Blender +Y (three.js -Z). Templates sit in a row along X; board3d.js clones them by root name.
"""
import bpy, bmesh, math, os, random
from mathutils import Vector, Matrix

REPO = r'C:\Users\seabo\Documents\GitHub\sg_games'
TOOLS = os.path.join(REPO, 'tools', 'blender')
BLEND = os.path.join(REPO, 'games', 'next-station', 'models', 'source', 'station-assets.blend')
GLB = os.path.join(REPO, 'games', 'next-station', 'models', 'station-assets.glb')
CAST_SRC = os.path.join(REPO, 'games', 'mrt-rush', 'models', 'source', 'mrt-assets.blend')
SCENERY_SRC = os.path.join(REPO, 'games', 'chapteh-kick', 'models', 'source', 'chapteh-assets.blend')
CAST = ['aunty', 'uncle', 'ns', 'worker_a', 'worker_b', 'student_a', 'student_b', 'parent']
SCENERY = ['HDBBlock', 'RainTree', 'Bush', 'LampPost']
ROOTS = ['Cab', 'PlatformModule', 'StationSign', 'StopBoard', 'ViaductSpan', 'TunnelRing', 'Sleeper', 'SpeedSign', 'WarnSign', 'EndSign', 'Fence', 'Bench']


def new_file():
    bpy.ops.wm.read_homefile(use_empty=True)
    sc = bpy.data.scenes[0]
    sc.name = 'NextStation'
    os.makedirs(os.path.dirname(BLEND), exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=BLEND)
    return bpy.data.filepath


def _ns():
    ns = {'SC': bpy.data.scenes['NextStation']}
    exec(open(os.path.join(TOOLS, 'sg_cast.py')).read(), ns)
    return ns


def tris(root):
    return sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in root.children_recursive if o.type == 'MESH')


def text_mesh(name, root, mat, body, size, loc, rot=(math.pi / 2, 0, 0), extrude=0.004, align='CENTER'):
    """Real geometry text (no fonts needed at run time), placed at loc in root's space."""
    from mathutils import Euler
    cu = bpy.data.curves.new(name, 'FONT')
    cu.body = body; cu.size = size; cu.extrude = extrude; cu.align_x = align; cu.align_y = 'CENTER'
    o = bpy.data.objects.new(name, cu)
    sc = bpy.data.scenes['NextStation']
    sc.collection.objects.link(o)
    dg = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(o.evaluated_get(dg))
    bpy.data.objects.remove(o, do_unlink=True)
    m = bpy.data.objects.new(name, me)
    sc.collection.objects.link(m)
    me.materials.clear(); me.materials.append(mat)
    m.parent = root
    m.matrix_basis = Matrix.Translation(Vector(loc)) @ Euler(rot).to_matrix().to_4x4()
    m['hd'] = 1
    return m


def plane(name, root, mat, c, w, h, rot=None):
    """A flat quad with 0..1 UVs (for canvas textures), centred on c, facing -Y before rotation."""
    bm = bmesh.new()
    vs = [bm.verts.new((x * w / 2, 0, z * h / 2)) for x, z in ((-1, -1), (1, -1), (1, 1), (-1, 1))]
    f = bm.faces.new(vs)
    uvl = bm.loops.layers.uv.new('UVMap')
    for l, uv in zip(f.loops, ((0, 0), (1, 0), (1, 1), (0, 1))): l[uvl].uv = uv
    M = Matrix.Translation(Vector(c)) @ (rot if rot is not None else Matrix.Identity(4))
    bmesh.ops.transform(bm, matrix=M, verts=bm.verts[:])  # the face points along -Y (towards the train)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(name, me)
    bpy.data.scenes['NextStation'].collection.objects.link(o)
    me.materials.append(mat); o.parent = root; o['hd'] = 1
    return o


def build_props():
    g = _ns()
    V, solid, empty = g['V'], g['solid'], g['empty']
    revolve, ellipsoid, torus, cylinder, sweep, capsule, rbox, loft = (g[k] for k in ('revolve', 'ellipsoid', 'torus', 'cylinder', 'sweep', 'capsule', 'rbox', 'loft'))
    CONC = solid('NS_Concrete', '#C9C3B6', 0.85)
    CONC2 = solid('NS_ConcreteDark', '#A9A397', 0.9)
    STEEL = solid('NS_Steel', '#B9C0C6', 0.3, 0.85)
    DARK = solid('NS_Dark', '#2B2F33', 0.6)
    PANEL = solid('NS_Panel', '#3A4148', 0.45)
    WHITE = solid('NS_White', '#F1EEE6', 0.5)
    YELLOW = solid('NS_Yellow', '#F2C230', 0.5)
    RED = solid('NS_Red', '#D7263D', 0.45)
    GREEN = solid('NS_Green', '#2F9E5B', 0.4)
    GLASS = solid('NS_Glass', '#CDE8EE', 0.05)
    gb = next(n for n in GLASS.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    gb.inputs['Alpha'].default_value = 0.3
    for attr, val in (('blend_method', 'BLEND'), ('surface_render_method', 'BLENDED')):
        try: setattr(GLASS, attr, val)
        except Exception: pass
    LAMP = solid('NS_Lamp', '#FFF1C4', 0.3)
    lb = next(n for n in LAMP.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    try:
        lb.inputs['Emission Color'].default_value = (1.0, 0.88, 0.6, 1); lb.inputs['Emission Strength'].default_value = 3.0
    except Exception: pass
    SCREEN = solid('NS_Screen', '#0E1A22', 0.2)
    SIGNF = solid('NS_SignFace', '#FFFFFF', 0.5)
    TILE = solid('NS_PlatformTile', '#D9D3C7', 0.7)
    TACT = solid('NS_Tactile', '#E8B92E', 0.7)
    ROOF = solid('NS_Roof', '#7D8A92', 0.5, 0.4)
    LINEC = solid('NS_LineColour', '#7FA82E', 0.45)   # recoloured per line in three.js
    out = {}

    # ---------------- driver's cab (camera at the origin, looking down +Y) ----------------
    root = empty('Cab', (0, 0, 0))
    # desk across the bottom of the view, sloping up towards the windscreen
    secs = []
    for i in range(13):
        x = -0.95 + 1.9 * i / 12
        secs.append((V(x, 0.62, -0.62), V(0, 1, 0), V(0, 0, 1), 0.28, 0.07, 3.0, 3.0))
    loft('Desk', root, PANEL, secs, seg=20, sm=45)
    rbox('DeskFront', root, DARK, (0, 0.42, -0.86), (1.9, 0.1, 0.42), 0.03, segs=3)
    rbox('DeskTop', root, PANEL, (0, 0.86, -0.55), (1.9, 0.34, 0.05), 0.02, rot=(-0.35, 0, 0), segs=3)
    # speed screen and a smaller status screen, faced towards the driver
    tilt = Matrix.Rotation(-0.55, 4, 'X')
    rbox('ScreenBezel', root, DARK, (-0.12, 0.7, -0.5), (0.46, 0.04, 0.3), 0.025, rot=(-0.55 + math.pi / 2 - math.pi / 2, 0, 0), segs=3)
    plane('CabScreen', root, SCREEN, (-0.12, 0.676, -0.488), 0.4, 0.25, Matrix.Rotation(-0.55, 4, 'X'))
    rbox('Screen2Bezel', root, DARK, (0.42, 0.74, -0.52), (0.26, 0.04, 0.18), 0.02, rot=(-0.55, 0, 0), segs=2)
    plane('CabScreen2', root, SCREEN, (0.42, 0.717, -0.509), 0.22, 0.14, Matrix.Rotation(-0.55, 4, 'X'))
    for i, (bx, col) in enumerate(((-0.62, RED), (-0.54, GREEN), (-0.46, YELLOW), (0.66, STEEL), (0.74, STEEL))):
        cylinder('Button', root, col, (bx, 0.66, -0.55), (bx, 0.64, -0.53), 0.022, seg=16)
    # master controller: the handle rotates about the X axis at its base (board3d moves it)
    lever = empty('CabLever', (0.22, 0.55, -0.6)); lever.parent = root
    rbox('LeverSlot', root, DARK, (0.22, 0.55, -0.598), (0.07, 0.22, 0.02), 0.008, segs=2)
    capsule('LeverShaft', lever, STEEL, V(0, 0, 0), V(0, 0, 0.13), 0.011, 0.009, seg=12, n=1, cap0='flat')
    ellipsoid('LeverKnob', lever, RED, V(0, 0, 0.145), 0.03, (1.2, 0.9, 0.8), seg=16)
    # windscreen frame: A-pillars, header and a wiper
    for sx in (-1, 1):
        sweep('Pillar', root, PANEL, [V(sx * 0.92, 0.85, -0.6), V(sx * 0.9, 0.95, 0.0), V(sx * 0.84, 0.88, 0.48)], [0.07, 0.065, 0.06], seg=12, caprings=1)
    rbox('Header', root, PANEL, (0, 0.82, 0.55), (1.9, 0.18, 0.12), 0.03, segs=3)
    rbox('Visor', root, DARK, (-0.35, 0.72, 0.44), (0.6, 0.02, 0.18), 0.01, rot=(0.5, 0, 0), segs=2)
    out['Cab'] = tris(root)

    # ---------------- platform module: 10 m along +Y, on the left of the track ----------------
    root = empty('PlatformModule', (3, 0, 0))
    L = 10.0
    edge = -1.55                       # platform edge, metres left of the track centre
    rbox('PlatformSlab', root, CONC, (edge - 2.2, L / 2, 0.55), (4.4, L, 1.1), 0.02, segs=2)
    rbox('PlatformTop', root, TILE, (edge - 2.2, L / 2, 1.11), (4.4, L, 0.02), 0.005, segs=1)
    rbox('YellowLine', root, YELLOW, (edge - 0.35, L / 2, 1.122), (0.1, L, 0.004), 0.001, segs=1)
    rbox('Tactile', root, TACT, (edge - 0.7, L / 2, 1.122), (0.3, L, 0.006), 0.001, segs=1)
    for i in range(10):
        y = 0.5 + i
        for k in range(3):
            cylinder('Stud', root, TACT, (edge - 0.62 - k * 0.08, y, 1.12), (edge - 0.62 - k * 0.08, y, 1.128), 0.012, seg=8)
    # half-height platform screen doors: fixed glass panels with a sliding door every 5 m
    for j in range(2):
        y0 = j * 5.0
        for (a, b) in ((0.2, 1.6), (3.4, 4.8)):
            rbox('PSDGlass', root, GLASS, (edge - 0.5, y0 + (a + b) / 2, 1.85), (0.03, b - a - 0.05, 1.3), 0.01, segs=1)
        rbox('PSDDoorL', root, GLASS, (edge - 0.5, y0 + 2.05, 1.85), (0.035, 0.8, 1.3), 0.01, segs=1)
        rbox('PSDDoorR', root, GLASS, (edge - 0.5, y0 + 2.95, 1.85), (0.035, 0.8, 1.3), 0.01, segs=1)
        for y in (y0 + 0.2, y0 + 1.6, y0 + 3.4, y0 + 4.8):
            rbox('PSDPost', root, STEEL, (edge - 0.5, y, 1.85), (0.09, 0.09, 1.42), 0.015, segs=2)
        rbox('PSDTop', root, STEEL, (edge - 0.5, y0 + 2.5, 2.53), (0.08, 4.9, 0.06), 0.01, segs=2)
        rbox('PSDHeader', root, LINEC, (edge - 0.5, y0 + 2.5, 2.48), (0.05, 1.7, 0.04), 0.005, segs=1)
    # columns and a gently curved roof that spans the track
    for y in (2.5, 7.5):
        cylinder('Column', root, WHITE, (edge - 3.4, y, 1.12), (edge - 3.4, y, 6.2), 0.16, seg=24)
        sweep('RoofArm', root, ROOF, [V(edge - 3.4, y, 6.1), V(edge - 1.5, y, 6.55), V(1.0, y, 6.75), V(3.4, y, 6.6)], 0.07, seg=10, caprings=1)
    secs = []
    for i in range(11):
        x = -6.6 + 10.6 * i / 10
        z = 6.75 + 0.35 * math.cos((x + 1.6) / 5.3 * math.pi / 2) - 0.2
        secs.append((V(x, L / 2, z), V(0, 1, 0), V(0, 0, 1), L / 2, 0.06, 3.0, 3.0))
    loft('Roof', root, ROOF, secs, seg=12, sm=30)
    rbox('Fascia', root, LINEC, (3.6, L / 2, 6.45), (0.08, L, 0.4), 0.01, segs=1)
    rbox('BackWall', root, WHITE, (edge - 4.45, L / 2, 2.2), (0.1, L, 2.2), 0.01, segs=1)
    for y in (2.5, 7.5):
        rbox('Advert', root, solid('NS_Advert', '#F2B134', 0.5), (edge - 4.38, y, 2.0), (0.04, 2.6, 1.4), 0.02, segs=2)
        rbox('AdvertText', root, solid('NS_AdvertInk', '#2A1A12', 0.6), (edge - 4.35, y - 0.3, 2.2), (0.01, 1.6, 0.18), 0.005, segs=1)
    out['PlatformModule'] = tris(root)

    # ---------------- hanging station sign (face is a canvas texture in three.js) ----------------
    root = empty('StationSign', (5, 0, 0))
    rbox('SignBox', root, DARK, (0, 0, 0), (2.6, 0.12, 0.5), 0.03, segs=3)
    plane('SignFace', root, SIGNF, (0, -0.0625, 0), 2.5, 0.42)
    plane('SignFaceB', root, SIGNF, (0, 0.0625, 0), 2.5, 0.42, Matrix.Rotation(math.pi, 4, 'Z'))
    for sx in (-1, 1):
        capsule('SignRod', root, STEEL, V(sx * 1.0, 0, 0.25), V(sx * 1.0, 0, 0.9), 0.012, seg=8, n=1)
    out['StationSign'] = tris(root)

    # ---------------- STOP board ----------------
    root = empty('StopBoard', (6, 0, 0))
    capsule('StopPost', root, STEEL, V(0, 0, 0), V(0, 0, 1.5), 0.03, seg=12, n=1, cap0='flat')
    rbox('StopPlate', root, WHITE, (0, 0, 1.75), (0.55, 0.03, 0.42), 0.04, segs=3)
    rbox('StopRim', root, RED, (0, 0.003, 1.75), (0.59, 0.026, 0.46), 0.05, segs=3)
    text_mesh('StopText', root, RED, 'STOP', 0.16, (0, -0.02, 1.78))
    text_mesh('StopCars', root, solid('NS_Ink', '#2A1A12', 0.6), '4 CARS', 0.075, (0, -0.02, 1.61))
    out['StopBoard'] = tris(root)

    # ---------------- viaduct span (30 m) with its pier ----------------
    root = empty('ViaductSpan', (8, 0, 0))
    S = 30.0
    rbox('Deck', root, CONC, (0, S / 2, -0.55), (7.0, S, 0.5), 0.05, segs=2)
    loft('Girder', root, CONC2, [(V(0, y, -1.5), V(1, 0, 0), V(0, 0, 1), 2.3, 0.75, 4.0, 2.2) for y in (0.05, S - 0.05)], seg=24, sm=30)
    for sx in (-1, 1):
        rbox('Parapet', root, CONC, (sx * 3.35, S / 2, 0.25), (0.3, S, 1.1), 0.04, segs=2)
        rbox('ParapetCap', root, CONC2, (sx * 3.35, S / 2, 0.82), (0.42, S, 0.08), 0.02, segs=1)
        rbox('Plinth', root, CONC2, (sx * 1.6, S / 2, -0.25), (0.6, S, 0.12), 0.01, segs=1)
    revolve('Pier', root, CONC, [(0, -16), (1.05, -16), (1.0, -3.2), (1.25, -2.4), (2.2, -2.05), (2.3, -1.8), (0, -1.8)], 32, sx=1.0, sy=0.8, n=3.0)
    for sx in (-1, 1):
        rbox('Bearing', root, DARK, (sx * 1.6, 0.3, -1.85), (0.5, 0.4, 0.12), 0.01, segs=1)
    out['ViaductSpan'] = tris(root)

    # ---------------- tunnel ring (6 m) ----------------
    root = empty('TunnelRing', (12, 0, 0))
    R = 3.0
    prof = [(R, -0.3), (R, 0.45)]
    for i in range(25):
        a = math.pi * i / 24
        prof.append((R * math.cos(a), 1.2 + R * 0.95 * math.sin(a)))
    prof += [(-R, 0.45), (-R, -0.3)]
    bm = bmesh.new(); uvl = bm.loops.layers.uv.new('UVMap')
    rows = []
    for y in (0.0, 6.0):
        rows.append([bm.verts.new((x, y, z)) for x, z in prof])
    for i in range(len(prof) - 1):
        f = bm.faces.new((rows[0][i], rows[0][i + 1], rows[1][i + 1], rows[1][i]))
        for l in f.loops: l[uvl].uv = (l.vert.co.y / 2, i / 4)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    bmesh.ops.reverse_faces(bm, faces=bm.faces[:])
    g['_emit'](bm, 'TunnelShell', root, CONC2, 30)
    rbox('TunnelFloor', root, CONC2, (0, 3, -0.45), (6.2, 6, 0.3), 0.02, segs=1)
    sweep('TunnelJoint', root, DARK, [V(x * 0.985, 0.02, z) for x, z in prof], 0.05, seg=6, caprings=1)
    rbox('Walkway', root, CONC, (2.4, 3, 0.15), (0.9, 6, 0.25), 0.02, segs=1)
    rbox('WalkRail', root, YELLOW, (1.98, 3, 1.05), (0.04, 6, 0.04), 0.01, segs=1)
    for y in (0.5, 5.5):
        capsule('WalkPost', root, YELLOW, V(1.98, y, 0.28), V(1.98, y, 1.06), 0.02, seg=8, n=1, cap0='flat')
    for z in (0.75, 0.95, 1.15):
        rbox('Cable', root, DARK, (-2.9, 3, z), (0.08, 6, 0.06), 0.02, segs=1)
    rbox('LampBox', root, DARK, (2.52, 3, 2.4), (0.14, 0.9, 0.16), 0.02, segs=2)
    rbox('TunnelLamp', root, LAMP, (2.45, 3, 2.39), (0.02, 0.8, 0.1), 0.01, segs=1)
    out['TunnelRing'] = tris(root)

    # ---------------- concrete sleeper with rail clips ----------------
    root = empty('Sleeper', (14, 0, 0))
    rbox('SleeperBlock', root, CONC2, (0, 0, -0.09), (2.4, 0.24, 0.16), 0.02, segs=2)
    for sx in (-1, 1):
        rbox('RailPad', root, DARK, (sx * 0.7175, 0, 0.0), (0.18, 0.18, 0.02), 0.004, segs=1)
        for d in (-1, 1):
            sweep('Clip', root, STEEL, [V(sx * 0.7175 + d * 0.1, -0.03, 0.0), V(sx * 0.7175 + d * 0.07, 0, 0.045), V(sx * 0.7175 + d * 0.1, 0.03, 0.0)], 0.009, seg=6, caprings=1)
    out['Sleeper'] = tris(root)

    # ---------------- line-side signs (faces are canvas textures in three.js) ----------------
    root = empty('SpeedSign', (15, 0, 0))
    capsule('SSPost', root, STEEL, V(0, 0, 0), V(0, 0, 2.3), 0.04, seg=12, n=1, cap0='flat')
    cylinder('SSDiscBack', root, DARK, (0, 0.02, 2.55), (0, 0.05, 2.55), 0.36, seg=40)
    cylinder('SSRim', root, RED, (0, -0.0, 2.55), (0, 0.02, 2.55), 0.36, seg=40)
    plane('SignDisc', root, SIGNF, (0, -0.006, 2.55), 0.56, 0.56)
    out['SpeedSign'] = tris(root)
    root = empty('WarnSign', (16, 0, 0))
    capsule('WSPost', root, STEEL, V(0, 0, 0), V(0, 0, 2.2), 0.04, seg=12, n=1, cap0='flat')
    rbox('WSBoard', root, YELLOW, (0, 0.01, 2.55), (0.5, 0.03, 0.5), 0.02, rot=(0, math.pi / 4, 0), segs=2)
    plane('WarnFace', root, SIGNF, (0, -0.008, 2.55), 0.4, 0.4)
    out['WarnSign'] = tris(root)
    root = empty('EndSign', (17, 0, 0))
    capsule('ESPost', root, STEEL, V(0, 0, 0), V(0, 0, 2.3), 0.04, seg=12, n=1, cap0='flat')
    cylinder('ESDisc', root, WHITE, (0, 0.0, 2.55), (0, 0.03, 2.55), 0.34, seg=40)
    rbox('ESSlash', root, DARK, (0, -0.005, 2.55), (0.6, 0.01, 0.06), 0.01, rot=(0, math.radians(40), 0), segs=1)
    torus('ESRing', root, DARK, (0, -0.002, 2.55), 0.33, 0.015, rot=(math.pi / 2, 0, 0), segR=40, segr=6)
    out['EndSign'] = tris(root)

    # ---------------- fence (10 m) for the ground sections ----------------
    root = empty('Fence', (18, 0, 0))
    for y in (0.0, 2.5, 5.0, 7.5):
        capsule('FencePost', root, STEEL, V(0, y, 0), V(0, y, 1.6), 0.035, seg=8, n=1, cap0='flat')
    for z in (0.3, 1.55):
        capsule('FenceRail', root, STEEL, V(0, 0, z), V(0, 10, z), 0.02, seg=8, n=1, cap0='flat', cap1='flat')
    mesh = solid('NS_FenceMesh', '#7E8A84', 0.6)
    rbox('FenceMesh', root, mesh, (0, 5, 0.93), (0.01, 10, 1.25), 0.002, segs=1)
    out['Fence'] = tris(root)

    # ---------------- platform bench ----------------
    root = empty('Bench', (19, 0, 0))
    for i in range(3):
        rbox('Seat', root, solid('NS_Seat', '#2D6FD1', 0.4), (0, -0.55 + i * 0.55, 0.45), (0.42, 0.48, 0.05), 0.02, segs=2)
        rbox('Back', root, solid('NS_Seat', '#2D6FD1', 0.4), (0.2, -0.55 + i * 0.55, 0.72), (0.04, 0.48, 0.42), 0.02, rot=(0, -0.15, 0), segs=2)
    rbox('BenchBeam', root, STEEL, (0.05, 0, 0.4), (0.08, 1.7, 0.06), 0.01, segs=1)
    for y in (-0.7, 0.7):
        capsule('BenchLeg', root, STEEL, V(0.05, y, 0), V(0.05, y, 0.4), 0.025, seg=8, n=1, cap0='flat')
    out['Bench'] = tris(root)
    return out


def append_borrowed():
    sc = bpy.data.scenes['NextStation']
    for t in bpy.data.texts: t.use_fake_user = True
    # scenery from Chapteh Kick: load everything, keep the four trees/blocks and their children
    with bpy.data.libraries.load(SCENERY_SRC, link=False) as (src, dst):
        dst.objects = list(src.objects)
    keep = set()
    for o in dst.objects:
        if o is None: continue
        r = o
        while r.parent: r = r.parent
        if r.name in SCENERY: keep.add(o.name)
    for o in list(dst.objects):
        if o is None: continue
        if o.name in keep: sc.collection.objects.link(o)
        else: bpy.data.objects.remove(o, do_unlink=True)
    # the standing cast from MRT Rush
    want = []
    for k in CAST: want += [f'Char_{k}_Stand', f'Char_{k}_Stand_Mesh']
    with bpy.data.libraries.load(CAST_SRC, link=False) as (src, dst):
        dst.objects = [n for n in want if n in src.objects]
    for o in dst.objects:
        if o is not None: sc.collection.objects.link(o)
    for i, k in enumerate(CAST):
        r = bpy.data.objects.get(f'Char_{k}_Stand')
        if r: r.location = (i * 0.8, 10.0, 0.0)
    for i, n in enumerate(SCENERY):
        r = bpy.data.objects.get(n)
        if r: r.location = (i * 12.0, 30.0, 0.0)
    bpy.data.orphans_purge(do_local_ids=True, do_linked_ids=True, do_recursive=True)
    return {n: (tuple(round(v, 2) for v in bpy.data.objects[n].dimensions), len(bpy.data.objects[n].children_recursive)) for n in SCENERY if n in bpy.data.objects}


def build():
    out = build_props()
    out['borrowed'] = append_borrowed()
    return out


def export_glb():
    exec(open(os.path.join(TOOLS, 'merge.py')).read(), globals())
    keep = ('CabScreen', 'CabScreen2', 'CabLever', 'SignFace', 'SignFaceB', 'SignDisc', 'WarnFace', 'PSDDoorL', 'PSDDoorR', 'PSDHeader', 'Fascia')
    for r in ROOTS:
        o = bpy.data.objects.get(r)
        if o: merge_by_material(o, keep=keep)
    sc = bpy.data.scenes['NextStation']
    win = bpy.context.window or bpy.context.window_manager.windows[0]
    win.scene = sc
    names = ROOTS + SCENERY + [f'Char_{k}_Stand' for k in CAST]
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
