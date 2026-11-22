"""Quick look-dev renders of named roots from any scene, via a private 'CastLab' scene.

Usage inside Blender:
    exec(open(r'...\\tools\\blender\\lab_render.py').read())
    lab_shot(['Char_uncle_Stand', 'Char_aunty_Stand'], r'C:\\...\\shot.png', yaw=0, pitch=8, fill=1.1)
"""
import bpy, math
from mathutils import Vector


def ensure_lab():
    lab = bpy.data.scenes.get('CastLab') or bpy.data.scenes.new('CastLab')
    w = bpy.data.worlds.get('CastLabWorld') or bpy.data.worlds.new('CastLabWorld')
    w.use_nodes = True
    bg = next(n for n in w.node_tree.nodes if n.type == 'BACKGROUND')
    bg.inputs[0].default_value = (0.75, 0.78, 0.82, 1); bg.inputs[1].default_value = 0.9
    lab.world = w
    for name, kind in (('LabSun', 'SUN'), ('LabCam', None)):
        if bpy.data.objects.get(name) is None:
            data = bpy.data.lights.new(name + 'L', 'SUN') if kind else bpy.data.cameras.new(name + 'D')
            o = bpy.data.objects.new(name, data); lab.collection.objects.link(o)
    sun = bpy.data.objects['LabSun']; sun.data.energy = 3.0; sun.rotation_euler = (math.radians(50), 0, math.radians(-30))
    lab.camera = bpy.data.objects['LabCam']
    try: lab.render.engine = 'BLENDER_EEVEE_NEXT'
    except TypeError: lab.render.engine = 'BLENDER_EEVEE'
    lab.view_settings.view_transform = 'Standard'
    return lab


def drop_lab():
    """Remove the look-dev scene before a source file is saved."""
    lab = bpy.data.scenes.get('CastLab')
    if lab:
        for o in list(lab.collection.objects):
            if o.name in ('LabSun', 'LabCam'): bpy.data.objects.remove(o, do_unlink=True)
        bpy.data.scenes.remove(lab)
    w = bpy.data.worlds.get('CastLabWorld')
    if w: bpy.data.worlds.remove(w)


def _lab():
    lab = bpy.data.scenes.get('CastLab') or ensure_lab()
    col = bpy.data.collections.get('LabSet')
    if col is None:
        col = bpy.data.collections.new('LabSet')
        lab.collection.children.link(col)
    return lab, col


def lab_shot(names, path, yaw=0.0, pitch=8.0, fill=1.08, res=(1400, 800), lens=85, samples=32, zrange=None):
    lab, col = _lab()
    for o in list(col.objects):
        col.objects.unlink(o)
    objs = []
    for n in names:
        r = bpy.data.objects[n]
        for o in [r] + list(r.children_recursive):
            if o.name not in col.objects:
                col.objects.link(o)
            objs.append(o)
    bpy.context.view_layer.update()
    lo = Vector((1e9, 1e9, 1e9)); hi = Vector((-1e9, -1e9, -1e9))
    for o in objs:
        if o.type != 'MESH':
            continue
        for c in o.bound_box:
            p = o.matrix_world @ Vector(c)
            lo = Vector(map(min, lo, p)); hi = Vector(map(max, hi, p))
    if zrange:   # frame only a height band (fractions of the bounding box), e.g. (0.8, 1.0) for heads
        h = hi.z - lo.z
        lo.z, hi.z = lo.z + h * zrange[0], lo.z + h * zrange[1]
    ctr = (lo + hi) / 2
    size = hi - lo
    cam = bpy.data.objects['LabCam']
    cam.data.lens = lens
    lab.render.resolution_x, lab.render.resolution_y = res
    aspect = res[0] / res[1]
    # distance so the larger of width/aspect and height fits the frame
    sensor = cam.data.sensor_width
    cam.data.sensor_fit = 'AUTO'   # the sensor width spans the longer image side
    fov_long = 2 * math.atan(sensor / 2 / lens)
    if aspect >= 1:
        fov_h = fov_long; fov_v = 2 * math.atan(math.tan(fov_h / 2) / aspect)
    else:
        fov_v = fov_long; fov_h = 2 * math.atan(math.tan(fov_v / 2) * aspect)
    wdt = max(size.x, size.y)
    need = max(wdt / 2 / math.tan(fov_h / 2), size.z / 2 / math.tan(fov_v / 2)) * fill + max(size.x, size.y) / 2
    yw, pt = math.radians(yaw), math.radians(pitch)
    d = Vector((math.sin(yw) * math.cos(pt), -math.cos(yw) * math.cos(pt), math.sin(pt)))
    cam.location = ctr + d * need
    cam.rotation_euler = (-d).to_track_quat('-Z', 'Y').to_euler()
    try:
        lab.eevee.taa_render_samples = samples
    except Exception:
        pass
    lab.render.filepath = path
    lab.render.image_settings.file_format = 'PNG'
    win = bpy.context.window or bpy.context.window_manager.windows[0]
    prev = win.scene
    win.scene = lab
    try:
        bpy.ops.render.render(write_still=True, scene=lab.name)
    finally:
        win.scene = prev
    for o in list(col.objects):
        col.objects.unlink(o)
    return path
