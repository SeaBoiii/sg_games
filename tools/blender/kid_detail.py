"""Chapteh Kick player rig (KidRig) in the style of the SG cast (Blender, chapteh-assets.blend open).

Keeps every animated empty (Kid_Body, Kid_Head, Kid_ArmL/R, Kid_ForeL/R, Kid_ThighL/R, Kid_ShinL/R) and the
recoloured materials (CK_Shirt, CK_Shorts, CK_Skin, CK_Hair, CK_Sock, CK_Shoe, CK_Trim); only the meshes change.
    exec(open(r'<repo>/tools/blender/kid_detail.py').read())
    print(detail_kid())
"""
import bpy, math, os
from mathutils import Vector, Matrix

TOOLS = r'C:\Users\seabo\Documents\GitHub\sg_games\tools\blender'


def _ns(scene):
    ns = {'SC': scene}
    exec(open(os.path.join(TOOLS, 'sg_cast.py')).read(), ns)
    return ns


def detail_kid():
    rig = bpy.data.objects['KidRig']
    g = _ns(rig.users_scene[0])
    V = g['V']
    M = bpy.data.materials
    SH, SO, SK, HR, SOCK, SHOE = M['CK_Shirt'], M['CK_Shorts'], M['CK_Skin'], M['CK_Hair'], M['CK_Sock'], M['CK_Shoe']
    SOLE, STRIPE = M['CK_Sole'], M['CK_ShoeStripe']
    EYE = M['CK_Eye']
    EYEHI = g['solid']('CK_EyeHi', '#FFFFFF', 0.2)
    E = bpy.data.objects

    def kill(*names):
        for n in names:
            o = E.get(n)
            if o: bpy.data.objects.remove(o, do_unlink=True)

    def at(name):
        return E[name].matrix_world.translation.copy() - rig.matrix_world.translation

    # ---------- body: rounded tee, shorts with leg openings ----------
    body = E['Kid_Body']
    kill('K_shirt', 'K_shorts', 'K_shortlegL', 'K_shortlegR', 'K_belt')
    prof = [(0.0, 0.655), (0.95, 0.655), (1.04, 0.672), (1.0, 0.75), (0.95, 0.84), (0.99, 0.93), (1.03, 0.975), (0.95, 1.012), (0.62, 1.034), (0.3, 1.045), (0.0, 1.048)]
    g['revolve']('K_shirt', body, SH, prof, 32, sx=0.145, sy=0.085, n=2.5, sm=70)
    g['revolve']('K_shorts', body, SO, [(0.0, 0.53), (0.55, 0.532), (0.88, 0.56), (1.0, 0.6), (1.0, 0.672), (0.0, 0.672)], 32, sx=0.135, sy=0.08, n=2.5, sm=70)
    for sx in (-1, 1):
        g['capsule']('K_shortleg', body, SO, V(sx * 0.072, 0, 0.585), V(sx * 0.082, 0, 0.5), 0.061, 0.06, seg=18, n=2, cap0='flat', cap1='flat')

    # ---------- arms ----------
    for side, sx in (('L', -1), ('R', 1)):
        arm, fore = E['Kid_Arm' + side], E['Kid_Fore' + side]
        kill(f'K_sleeve{side}', f'K_sleeve{side}J', f'K_upper{side}', f'K_upper{side}J', f'K_fore{side}', f'K_fore{side}J', f'K_hand{side}')
        g['ellipsoid']('K_deltoid', arm, SH, V(0, 0, -0.005), 0.05, (1, 1.02, 0.85), seg=16)
        g['capsule']('K_sleeve', arm, SH, V(0, 0, 0.0), V(0, 0, -0.1), 0.05, 0.048, seg=18, n=2, cap1='flat')
        g['capsule']('K_upper', arm, SK, V(0, 0, -0.06), V(0, 0, -0.19), 0.033, 0.031, seg=16)
        g['capsule']('K_fore', fore, SK, V(0, 0, 0.0), V(0, 0, -0.15), 0.031, 0.026, seg=16, bulge=0.06)
        g['hand'](fore, SK, V(0, 0, -0.15), V(0, 0, 0.0), sx, 0.85)

    # ---------- legs, socks, sneakers ----------
    for side, sx in (('L', -1), ('R', 1)):
        thigh, shin = E['Kid_Thigh' + side], E['Kid_Shin' + side]
        kill(f'K_thigh{side}', f'K_thigh{side}J', f'K_shin{side}', f'K_shin{side}J', f'K_shoe{side}', f'K_sock{side}', f'K_sole{side}', f'K_stripe{side}')
        g['capsule']('K_thigh', thigh, SK, V(0, 0, 0.03), V(0, 0, -0.33), 0.045, 0.04, seg=16)
        g['capsule']('K_shin', shin, SK, V(0, 0, 0.0), V(0, 0, -0.21), 0.038, 0.031, seg=16, bulge=0.1)
        g['capsule']('K_sock', shin, SOCK, V(0, 0, -0.165), V(0, 0, -0.27), 0.036, 0.034, seg=16, n=1, cap0='flat')
        g['torus']('K_sockRib', shin, SOCK, V(0, 0, -0.168), 0.036, 0.004, segR=16, segr=6)
        before = set(shin.children)
        g['shoe'](shin, 'sneaker', sx * 0.006, -0.03, -0.318, 0.76, SHOE, {'stripe': STRIPE, 'skin': '#F2C9A0', '_key': 'kid'}, sx)
        for o in set(shin.children) - before:
            if o.name.startswith('Sole'): o.data.materials[0] = SOLE

    # ---------- face: fringe lobes, brows, nose, eye highlights ----------
    head = E['Kid_Head']
    kill('K_fringe')
    for sx in (-1, 1):
        g['ellipsoid']('K_fringe', head, HR, V(sx * 0.05, -0.098, 0.258), 0.07, (1.2, 0.45, 0.42), seg=16, rot=(0.6, 0, sx * 0.35))
        eye = E['K_eye1' if sx > 0 else 'K_eye-1']
        ec = eye.location.copy()
        g['ellipsoid']('K_eyeHi', head, EYEHI, ec + V(-0.005, -0.008, 0.008), 0.0055, seg=8)
        bp = [ec + V(dx, -0.006 + abs(dx) * 0.15, 0.04 + 0.006 * (1 - (dx / 0.022) ** 2) - sx * dx * 0.12) for dx in (-0.022, -0.011, 0.0, 0.011, 0.022)]
        g['sweep']('K_brow', head, HR, bp, 0.0042, seg=8, caprings=2)
    g['ellipsoid']('K_nose', head, SK, V(0, -0.136, 0.14), 0.014, (0.8, 0.9, 1.1), seg=12)
    return sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in rig.children_recursive if o.type == 'MESH')


def finish_kid():
    """Merge each joint's parts by material (fingers, laces, face bits) so the rig stays light on draw calls."""
    exec(open(os.path.join(TOOLS, 'merge.py')).read(), globals())
    return merge_by_material(bpy.data.objects['KidRig'], keep=())
