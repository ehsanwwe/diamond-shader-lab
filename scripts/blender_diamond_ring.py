# Build a silver ring with one large diamond (halo setting) and many small
# diamonds, using the project's EXACT diamond geometry (public/models/math-diamond.gltf,
# the mesh that the hull tracer renders). Saves the .blend and exports a GLB.
#
# Run headless from the repo root:
#   blender -b diamond_ring.blend -P scripts/blender_diamond_ring.py
# or paste into Blender's Scripting tab with diamond_ring.blend open and Run.
#
# Output: public/models/diamond-ring.glb  (consumed by src/lib/three/ringScene.ts)

import math
import os
import bpy
from mathutils import Vector

ROOT = os.getcwd()
if bpy.data.filepath:
    ROOT = os.path.dirname(bpy.data.filepath)
DIAMOND_GLTF = os.path.join(ROOT, "public", "models", "math-diamond.gltf")
OUT_GLB = os.path.join(ROOT, "public", "models", "diamond-ring.glb")

# ---- dimensions (ring axis = Y, stone points up +Z) --------------------------
BAND_R = 1.0           # band centre-line radius
BAND_T = 0.10          # band half thickness (radial)
BAND_W = 1.7           # band width multiplier along the finger axis
GEM_R = 0.911          # girdle radius of math-diamond.gltf
GEM_GIRDLE_Z = 0.2825  # girdle plane height in the (bbox-centred) gltf frame
CENTER_R = 0.30        # centre stone girdle radius
CENTER_GIRDLE_Z = 1.36
HALO_R = 0.42          # halo torus radius
HALO_Z = 1.30
HALO_STONE_R = 0.055
HALO_COUNT = 14
SHOULDER_STONE_R = 0.058
SHOULDER_ANGLES = [17, 29, 41, 53, 65]  # degrees from the top, each side

# ---- reset scene -------------------------------------------------------------
for obj in list(bpy.data.objects):
    bpy.data.objects.remove(obj, do_unlink=True)
for coll in (bpy.data.meshes, bpy.data.materials, bpy.data.cameras, bpy.data.lights):
    for block in list(coll):
        if block.users == 0:
            coll.remove(block)
scene = bpy.context.scene
# keep the default unit scale: the glTF importer multiplies by it, so the
# imported diamond must arrive at its native size (girdle radius GEM_R)
scene.unit_settings.system = "METRIC"
scene.unit_settings.scale_length = 1.0


# ---- materials ---------------------------------------------------------------
def principled(name, inputs):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes["Principled BSDF"]
    for key, value in inputs.items():
        bsdf.inputs[key].default_value = value
    return mat


silver = principled("Silver", {
    "Base Color": (0.96, 0.95, 0.91, 1.0),
    "Metallic": 1.0,
    "Roughness": 0.14,
})
diamond = principled("Diamond", {
    "Base Color": (1.0, 1.0, 1.0, 1.0),
    "Metallic": 0.0,
    "Roughness": 0.0,
    "IOR": 2.42,
    "Transmission Weight": 1.0,
})

# ---- the project's exact diamond ---------------------------------------------
before = set(bpy.data.objects)
bpy.ops.import_scene.gltf(filepath=DIAMOND_GLTF)
imported = [o for o in bpy.data.objects if o not in before and o.type == "MESH"]
if not imported:
    raise RuntimeError("math-diamond.gltf did not import a mesh")
gem_mesh = imported[0].data
gem_mesh.name = "MathDiamond"
gem_mesh.materials.clear()
gem_mesh.materials.append(diamond)
# normalise: girdle radius must equal GEM_R regardless of importer unit handling
import_r = max(math.hypot(v.co.x, v.co.y) for v in gem_mesh.vertices)
if abs(import_r - GEM_R) > 1e-4:
    f = GEM_R / import_r
    for v in gem_mesh.vertices:
        v.co *= f
for poly in gem_mesh.polygons:
    poly.use_smooth = False
for o in [o for o in bpy.data.objects if o not in before]:
    bpy.data.objects.remove(o, do_unlink=True)


def link(obj):
    scene.collection.objects.link(obj)
    return obj


def stone(name, girdle_r, girdle_pos, rotation=(0.0, 0.0, 0.0)):
    """Instance the diamond so its girdle centre sits at girdle_pos (world)."""
    s = girdle_r / GEM_R
    obj = bpy.data.objects.new(name, gem_mesh)
    obj.rotation_euler = rotation
    obj.scale = (s, s, s)
    local_up = obj.rotation_euler.to_matrix() @ Vector((0.0, 0.0, 1.0))
    obj.location = Vector(girdle_pos) - local_up * (GEM_GIRDLE_Z * s)
    return link(obj)


# ---- silver parts ------------------------------------------------------------
silver_parts = []


def add_silver(obj, name):
    obj.name = name
    obj.data.materials.clear()
    obj.data.materials.append(silver)
    for poly in obj.data.polygons:
        poly.use_smooth = True
    silver_parts.append(obj)
    return obj


# band: torus with axis Y, flattened into a comfort-fit profile
bpy.ops.mesh.primitive_torus_add(
    major_radius=BAND_R, minor_radius=BAND_T,
    major_segments=128, minor_segments=32,
    rotation=(math.pi / 2, 0.0, 0.0),
)
band = bpy.context.active_object
band.scale = (1.0, 1.0, BAND_W)  # local Z = torus axis = world Y (the finger) after the 90 deg X rotation
bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
add_silver(band, "Band")

# prongs holding the centre stone
PRONGS = 6
for k in range(PRONGS):
    a = k * 2 * math.pi / PRONGS + math.pi / PRONGS
    u = Vector((math.cos(a), math.sin(a), 0.0))
    base = u * 0.22 + Vector((0.0, 0.0, 1.04))
    top = u * (CENTER_R + 0.015) + Vector((0.0, 0.0, CENTER_GIRDLE_Z + 0.075))
    d = top - base
    bpy.ops.mesh.primitive_cylinder_add(
        radius=0.028, depth=d.length, vertices=16,
        location=(base + top) / 2,
        rotation=Vector((0.0, 0.0, 1.0)).rotation_difference(d).to_euler(),
    )
    add_silver(bpy.context.active_object, "Prong.%d" % k)
    bpy.ops.mesh.primitive_uv_sphere_add(
        radius=0.036, segments=16, ring_count=12,
        location=u * (CENTER_R - 0.02) + Vector((0.0, 0.0, CENTER_GIRDLE_Z + 0.07)),
    )
    add_silver(bpy.context.active_object, "ProngTip.%d" % k)

# gallery ring under the centre stone
bpy.ops.mesh.primitive_torus_add(
    major_radius=0.20, minor_radius=0.022, major_segments=48, minor_segments=12,
    location=(0.0, 0.0, 1.15),
)
add_silver(bpy.context.active_object, "Gallery")

# halo bed
bpy.ops.mesh.primitive_torus_add(
    major_radius=HALO_R, minor_radius=0.05, major_segments=96, minor_segments=16,
    location=(0.0, 0.0, HALO_Z),
)
add_silver(bpy.context.active_object, "HaloBed")

# little beads between halo stones
for k in range(HALO_COUNT):
    a = (k + 0.5) * 2 * math.pi / HALO_COUNT
    bpy.ops.mesh.primitive_uv_sphere_add(
        radius=0.022, segments=12, ring_count=8,
        location=(HALO_R * math.cos(a), HALO_R * math.sin(a), HALO_Z + 0.048),
    )
    add_silver(bpy.context.active_object, "HaloBead.%d" % k)

# bridge from the band up to the head
bpy.ops.mesh.primitive_cylinder_add(
    radius=0.16, depth=0.12, vertices=32, location=(0.0, 0.0, 1.10),
)
add_silver(bpy.context.active_object, "Bridge")

# ---- stones ------------------------------------------------------------------
stones = [stone("CenterDiamond", CENTER_R, (0.0, 0.0, CENTER_GIRDLE_Z))]

for k in range(HALO_COUNT):
    a = k * 2 * math.pi / HALO_COUNT
    stones.append(stone(
        "HaloDiamond.%d" % k, HALO_STONE_R,
        (HALO_R * math.cos(a), HALO_R * math.sin(a), HALO_Z + 0.048),
    ))

for side in (1, -1):
    for deg in SHOULDER_ANGLES:
        t = math.radians(deg) * side
        n = Vector((math.sin(t), 0.0, math.cos(t)))  # band outward normal
        pos = n * (BAND_R + BAND_T - 0.018)          # slightly sunk into the band
        stones.append(stone(
            "ShoulderDiamond.%s.%d" % ("R" if side > 0 else "L", deg),
            SHOULDER_STONE_R, pos, rotation=(0.0, t, 0.0),
        ))

# ---- join silver parts into one object ---------------------------------------
bpy.ops.object.select_all(action="DESELECT")
for o in silver_parts:
    o.select_set(True)
bpy.context.view_layer.objects.active = band
bpy.ops.object.join()
ring = bpy.context.active_object
ring.name = "RingSilver"
ring.data.name = "RingSilver"

# ---- camera + light so the .blend renders nicely on its own ------------------
cam_data = bpy.data.cameras.new("Camera")
cam_data.lens = 70
cam = link(bpy.data.objects.new("Camera", cam_data))
cam.location = (3.2, -3.8, 2.9)
cam.rotation_euler = (math.radians(62), 0.0, math.radians(40))
scene.camera = cam
key_data = bpy.data.lights.new("Key", "AREA")
key_data.energy = 400
key_data.size = 2.0
key = link(bpy.data.objects.new("Key", key_data))
key.location = (1.5, -2.0, 3.5)
key.rotation_euler = (math.radians(35), 0.0, math.radians(35))

# ---- save + export -----------------------------------------------------------
if bpy.data.filepath:
    bpy.ops.wm.save_mainfile(filepath=bpy.data.filepath)
bpy.ops.object.select_all(action="SELECT")
bpy.ops.export_scene.gltf(
    filepath=OUT_GLB,
    export_format="GLB",
    export_apply=True,
    export_materials="EXPORT",
    export_yup=True,
    use_selection=False,
)
print("diamond ring: %d silver verts, %d stones -> %s" % (len(ring.data.vertices), len(stones), OUT_GLB))
