"""One-call game refresh (after detail_pass.open_game in its own call): new cast + detail pass + export.

    exec(open(r'<repo>/tools/blender/run_game.py').read())
    print(refresh(r'<repo>/games/<game>/models/<file>.glb'))
"""
import bpy, contextlib, io, os, logging

TOOLS = os.path.dirname(os.path.abspath(__file__)) if '__file__' in globals() else r'C:\Users\seabo\Documents\GitHub\sg_games\tools\blender'


def refresh(glb_path, cast=True, export=True):
    blend_path = os.path.join(os.path.dirname(glb_path), 'source', os.path.basename(glb_path)[:-4] + '.blend')
    ns = globals()
    exec(open(os.path.join(TOOLS, 'detail_pass.py')).read(), ns)
    exec(open(os.path.join(TOOLS, 'propagate_cast.py')).read(), ns)
    out = {}
    sink = io.StringIO()
    logging.disable(logging.INFO)
    try:
        with contextlib.redirect_stdout(sink), contextlib.redirect_stderr(sink):
            if cast:
                out['cast'] = ns['swap_cast']()
            out['upgrade'] = ns['upgrade_game'](glb_path, blend_path, export=export)
    finally:
        logging.disable(logging.NOTSET)
    return out
