"""Swap the SG cast in a game's source .blend for the current one in mrt-assets.blend.

Run inside Blender after detail_pass.open_game(<game blend>) (in its own call):
    exec(open(r'<repo>/tools/blender/propagate_cast.py').read())
    swap_cast()
Every Char_* root keeps its name, scene and location; only its mesh is replaced.
"""
import bpy, os


def _cast_src():
    here = os.path.normpath(bpy.data.filepath)
    games = here[:here.lower().rfind(os.sep + 'games' + os.sep) + len(os.sep + 'games')]
    return os.path.join(games, 'mrt-rush', 'models', 'source', 'mrt-assets.blend')


def swap_cast(src=None):
    src = src or _cast_src()
    roots = [o for o in bpy.data.objects if o.name.startswith('Char_') and o.parent is None and o.type == 'EMPTY']
    if not roots:
        return dict(swapped=0)
    keep = {}
    for r in roots:
        keep[r.name] = (r.location.copy(), r.rotation_euler.copy(), r.scale.copy(), [c for c in r.users_collection])
    for r in roots:
        for c in list(r.children_recursive):
            bpy.data.objects.remove(c, do_unlink=True)
        bpy.data.objects.remove(r, do_unlink=True)
    for t in bpy.data.texts:
        t.use_fake_user = True
    bpy.data.orphans_purge(do_local_ids=True, do_linked_ids=True, do_recursive=True)
    want = []
    for n in keep:
        want += [n, n + '_Mesh']
    with bpy.data.libraries.load(src, link=False) as (data_from, data_to):
        data_to.objects = [n for n in want if n in data_from.objects]
    got = {o.name: o for o in data_to.objects if o is not None}
    for n, (loc, rot, scl, cols) in keep.items():
        r = got.get(n)
        if r is None:
            continue
        for c in cols:
            c.objects.link(r)
        m = got.get(n + '_Mesh')
        if m is not None:
            for c in cols:
                c.objects.link(m)
            m.parent = r
        r.location, r.rotation_euler, r.scale = loc, rot, scl
    return dict(swapped=len([n for n in keep if n in got]), missing=[n for n in keep if n not in got], src=src)
