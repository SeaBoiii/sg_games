"""Merge a template's parts by material to keep draw calls low (run inside Blender).

    exec(open(r'<repo>/tools/blender/merge.py').read())
    merge_by_material(bpy.data.objects['StoolTpl'], keep=('TableEdge',))
Meshes whose names start with an entry of `keep` stay separate (the game looks them up by name);
parts under a sub-empty are only merged with their siblings, so animated groups keep working.
"""
import bpy


def merge_by_material(root, keep=()):
    sc = root.users_scene[0]
    win = bpy.context.window or bpy.context.window_manager.windows[0]
    if win.scene != sc: win.scene = sc
    vl = sc.view_layers[0]
    merged = 0
    parents = [root] + [c for c in root.children_recursive if c.type == 'EMPTY']
    for par in parents:
        kids = [c for c in par.children if c.type == 'MESH' and not c.children and not any(c.name.startswith(k) for k in keep)]
        groups = {}
        for c in kids:
            key = tuple(m.name if m else '' for m in c.data.materials)
            groups.setdefault(key, []).append(c)
        for objs in groups.values():
            if len(objs) < 2: continue
            dg = bpy.context.evaluated_depsgraph_get()
            for o in objs:
                if o.modifiers or o.data.users > 1:
                    me = bpy.data.meshes.new_from_object(o.evaluated_get(dg))
                    o.modifiers.clear(); o.data = me
            target = objs[0]
            with bpy.context.temp_override(window=win, scene=sc, view_layer=vl, active_object=target, object=target,
                                           selected_objects=objs, selected_editable_objects=objs):
                bpy.ops.object.join()
            target['hd'] = 1
            merged += len(objs) - 1
    return merged
