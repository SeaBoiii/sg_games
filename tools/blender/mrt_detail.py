"""MRT Rush carriage hand-detail pass (Blender, mrt-assets.blend open).

Keeps the names board3d.js relies on: SeatCushion*/SeatBack* (recoloured), WallLow*/DoorLeaf* (kept, cut to
waist height on the near side; everything else there is hidden).
    exec(open(r'<repo>/tools/blender/mrt_detail.py').read())
    print(detail_mrt())
"""
import bpy, math, os
from mathutils import Vector, Matrix

TOOLS = r'C:\Users\seabo\Documents\GitHub\sg_games\tools\blender'


def _ns(scene):
    ns = {'SC': scene}
    exec(open(os.path.join(TOOLS, 'sg_cast.py')).read(), ns)
    return ns


def _replace(name, new):
    """Swap object `name`'s mesh for new's (same parent space), keep the name and drop new."""
    o = bpy.data.objects[name]
    old = o.data
    o.data = new.data
    o.matrix_parent_inverse.identity()
    o.location = (0, 0, 0); o.rotation_euler = (0, 0, 0); o.scale = (1, 1, 1)
    o.modifiers.clear()
    o['hd'] = 1
    bpy.data.objects.remove(new, do_unlink=True)
    if old.users == 0: bpy.data.meshes.remove(old)
    return o


def detail_mrt():
    sc = bpy.data.objects['SeatTpl'].users_scene[0]
    g = _ns(sc)
    V, solid = g['V'], g['solid']
    STEEL = solid('MR_Steel', '#C3C9D0', 0.25, 0.9)
    RUBBER = solid('MR_Rubber', '#2B2D31', 0.8)

    # ---------------- seat: moulded cushion and back on a cantilever bracket ----------------
    root = bpy.data.objects['SeatTpl']
    m_seat = bpy.data.objects['SeatCushion'].data.materials[0]
    m_frame = bpy.data.objects['SeatBase'].data.materials[0]
    secs = []
    for i, x in enumerate((-0.28, -0.276, -0.26, -0.15, 0.0, 0.15, 0.26, 0.276, 0.28)):
        edge = 1.0 - (0.35 if abs(x) > 0.275 else 0.12 if abs(x) > 0.27 else 0.0)
        dip = 0.008 * math.cos(x / 0.28 * math.pi / 2)
        secs.append((V(x, -0.02, 0.44 - dip * 0.5), V(0, 1, 0), V(0, 0, 1), 0.22 * edge, 0.04 * edge, 3.0, 5.0))
    _replace('SeatCushion', g['loft']('tmp', root, m_seat, secs, seg=32, sm=60))
    secs = []
    for x in (-0.28, -0.276, -0.26, -0.15, 0.0, 0.15, 0.26, 0.276, 0.28):
        edge = 1.0 - (0.35 if abs(x) > 0.275 else 0.12 if abs(x) > 0.27 else 0.0)
        secs.append((V(x, 0.235, 0.72), V(0, 0, 1), V(0, 1, 0), 0.25 * edge, 0.035 * edge, 3.0, 3.0))
    back = g['loft']('tmp', root, m_seat, secs, seg=32, sm=60)
    back.data.transform(Matrix.Translation(V(0, 0.235, 0.47)) @ Matrix.Rotation(-0.1, 4, 'X') @ Matrix.Translation(V(0, -0.235, -0.47)))
    _replace('SeatBack', back)
    _replace('SeatBase', g['rbox']('tmp', root, m_frame, (0, 0.0, 0.375), (0.5, 0.38, 0.03), 0.01, segs=3))
    g['rbox']('SeatBaseWall', root, m_frame, (0, 0.205, 0.22), (0.42, 0.03, 0.36), 0.012, segs=3)
    for sx in (-1, 1):
        g['sweep']('SeatBaseBrace', root, STEEL, [V(sx * 0.2, 0.2, 0.08), V(sx * 0.2, 0.05, 0.25), V(sx * 0.2, -0.12, 0.36)], 0.012, seg=12, caprings=2)
        g['rbox']('SeatBaseFoot', root, STEEL, (sx * 0.2, 0.2, 0.07), (0.05, 0.03, 0.05), 0.008, segs=2)

    # ---------------- wall: framed window, poster frame and a stainless hand rail ----------------
    root = bpy.data.objects['WallTpl']
    WALLM = bpy.data.objects['WallTop'].data.materials[0]
    g['revolve']('WallFrame', root, solid('MR_Frame', '#9AA3AD', 0.35, 0.6),
                 [(1.0, -0.012), (1.06, -0.012), (1.06, 0.012), (1.0, 0.012)], 48,
                 xf=Matrix.Translation(V(0, 0.322, 1.35)) @ Matrix.Rotation(math.pi / 2, 4, 'X') @ Matrix.Diagonal((0.3, 0.4, 1, 1)),
                 n=6.0, closed_prof=True, sm=40)
    g['rbox']('WallAd', root, solid('MR_Ad', '#F2B134', 0.5), (0, 0.297, 1.95), (0.5, 0.006, 0.2), 0.008, segs=2)
    g['rbox']('WallAdText', root, solid('MR_AdText', '#2A1A12', 0.6), (-0.06, 0.293, 1.97), (0.3, 0.003, 0.04), 0.002, segs=1)
    g['rbox']('WallAdText', root, solid('MR_AdAccent', '#D7263D', 0.5), (0.17, 0.293, 1.93), (0.1, 0.003, 0.08), 0.006, segs=2)
    g['capsule']('WallRail', root, STEEL, V(-0.3, 0.25, 1.02), V(0.3, 0.25, 1.02), 0.014, seg=14, n=1, cap0='flat', cap1='flat')
    g['rbox']('WallRailBracket', root, STEEL, (0, 0.275, 1.02), (0.03, 0.05, 0.02), 0.006, segs=2)
    g['rbox']('WallSkirt', root, RUBBER, (0, 0.296, 0.04), (0.6, 0.01, 0.08), 0.004, segs=2)

    # ---------------- door: centre seam, rubber edges, framed window, sticker ----------------
    root = bpy.data.objects['DoorTpl']
    g['rbox']('DoorSeam', root, RUBBER, (0, 0.31, 1.0), (0.016, 0.012, 1.98), 0.005, segs=2)
    for sx in (-1, 1):
        g['rbox']('DoorEdge', root, RUBBER, (sx * 0.293, 0.31, 1.0), (0.012, 0.012, 1.98), 0.004, segs=2)
    g['revolve']('DoorFrame', root, solid('MR_Frame', '#9AA3AD', 0.35, 0.6),
                 [(1.0, -0.008), (1.07, -0.008), (1.07, 0.008), (1.0, 0.008)], 48,
                 xf=Matrix.Translation(V(0, 0.302, 1.35)) @ Matrix.Rotation(math.pi / 2, 4, 'X') @ Matrix.Diagonal((0.2, 0.35, 1, 1)),
                 n=6.0, closed_prof=True, sm=40)
    g['cylinder']('DoorSticker', root, solid('MR_Sticker', '#D7263D', 0.5), V(-0.15, 0.303, 0.65), V(-0.15, 0.299, 0.65), 0.045, seg=28)
    g['rbox']('DoorStickerBar', root, solid('MR_StickerBar', '#FFFFFF', 0.5), (-0.15, 0.2985, 0.65), (0.06, 0.002, 0.014), 0.002, segs=1)
    for sx in (-1, 1):
        g['capsule']('DoorHandle', root, STEEL, V(sx * 0.06, 0.29, 0.85), V(sx * 0.06, 0.29, 1.15), 0.011, seg=12, n=1, caprings=2)

    # ---------------- pole: flanges at both ends and a grip ring ----------------
    root = bpy.data.objects['PoleTpl']
    m_pole = bpy.data.objects['PoleRod'].data.materials[0]
    g['revolve']('PoleFoot', root, m_pole, [(0.0, 0.0), (0.075, 0.0), (0.075, 0.012), (0.045, 0.03), (0.03, 0.06), (0.0, 0.06)], 40)
    g['revolve']('PoleTop', root, m_pole, [(0.0, 2.1), (0.075, 2.1), (0.075, 2.088), (0.045, 2.07), (0.03, 2.04), (0.0, 2.04)], 40)
    g['capsule']('PoleGrip', root, RUBBER, V(0, 0, 1.15), V(0, 0, 1.45), 0.026, seg=20, n=1, cap0='flat', cap1='flat')
    return {r: sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in bpy.data.objects[r].children_recursive if o.type == 'MESH')
            for r in ('SeatTpl', 'WallTpl', 'DoorTpl', 'PoleTpl')}
