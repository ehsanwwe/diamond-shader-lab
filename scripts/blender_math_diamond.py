# Build the EXACT diamond from the math shader (gem() SDF) as a real mesh in Blender.
#
# The shader's gem() is the intersection of a set of half-spaces (facet planes):
# a convex polyhedron. This script recreates that polyhedron by starting from a
# big cube and slicing it with each plane, so the resulting mesh is geometrically
# identical to the mesh-less "photon" diamond. Export it to glTF and the app's
# hull tracer will render it exactly like the math box.
#
# Usage: open Blender -> Scripting tab -> paste -> Run. A "MathDiamond" object
# appears. Then File > Export > glTF 2.0.
#
# Tunables:
#   GIRDLE_SIDES  facets approximating the round girdle band (higher = rounder)
#   RECENTER      move the bounding-box center to the origin

import math
import bpy
import bmesh
from mathutils import Vector

GIRDLE_SIDES = 24
RECENTER = True

# --- facet planes, transcribed 1:1 from gem(): half-space is dot(N, p) <= c ---
planes = []  # (Vector N (unnormalised), c)

def add(nx, ny, nz, c):
    planes.append((Vector((nx, ny, nz)), c))

SECTORS = 8  # gem() uses 8-fold angular symmetry (af = 4/PI -> 45 deg steps)
for k in range(SECTORS):
    a = k * (2 * math.pi / SECTORS)
    fx, fy = math.cos(a), math.sin(a)
    add(fx, fy, 1.444, 0.94)                                   # bezel crown
    add(fx, fy, -1.072, 0.94)                                  # pavilion main
    add(math.cos(a + 0.21), math.sin(a + 0.21), 1.03, 0.912)   # crown star +
    add(math.cos(a - 0.21), math.sin(a - 0.21), 1.03, 0.912)   # crown star -
    add(math.cos(a + 0.21), math.sin(a + 0.21), -1.02, 0.9193) # lower girdle +
    add(math.cos(a - 0.21), math.sin(a - 0.21), -1.02, 0.9193) # lower girdle -
    b = a + 0.393                                              # ~22.5 deg offset
    add(math.cos(b), math.sin(b), 2.21, 1.131)                 # upper (star) facet

add(0.0, 0.0, 1.0, 0.30)    # table  (p.z <= 0.30)
add(0.0, 0.0, -1.0, 0.865)  # culet  (p.z >= -0.865)

for k in range(GIRDLE_SIDES):                                  # round girdle band
    t = k * (2 * math.pi / GIRDLE_SIDES)
    add(math.cos(t), math.sin(t), 0.0, 0.911)

# --- carve the polyhedron out of a big cube ---
bm = bmesh.new()
bmesh.ops.create_cube(bm, size=8.0)

for n, c in planes:
    ln = n.length
    un = n / ln                    # unit outward normal
    co = un * (c / ln)             # a point on the plane
    geom = bm.verts[:] + bm.edges[:] + bm.faces[:]
    res = bmesh.ops.bisect_plane(
        bm, geom=geom, dist=1e-7,
        plane_co=co, plane_no=un,
        clear_outer=True,          # keep the inside (dot(un, p) <= c/ln)
        clear_inner=False,
    )
    cut_edges = [e for e in res["geom_cut"] if isinstance(e, bmesh.types.BMEdge)]
    if cut_edges:
        bmesh.ops.contextual_create(bm, geom=cut_edges)  # cap the cut with one n-gon

bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
bmesh.ops.recalc_face_normals(bm, faces=bm.faces)

if RECENTER:
    center = sum((v.co for v in bm.verts), Vector()) / len(bm.verts)
    lo = Vector((min(v.co.x for v in bm.verts),
                 min(v.co.y for v in bm.verts),
                 min(v.co.z for v in bm.verts)))
    hi = Vector((max(v.co.x for v in bm.verts),
                 max(v.co.y for v in bm.verts),
                 max(v.co.z for v in bm.verts)))
    center = (lo + hi) / 2
    for v in bm.verts:
        v.co -= center

# --- build the object ---
for obj in list(bpy.data.objects):
    if obj.name.startswith("MathDiamond"):
        bpy.data.objects.remove(obj, do_unlink=True)

mesh = bpy.data.meshes.new("MathDiamond")
bm.to_mesh(mesh)
bm.free()
for poly in mesh.polygons:
    poly.use_smooth = False        # flat shading -> crisp facets (essential!)

obj = bpy.data.objects.new("MathDiamond", mesh)
bpy.context.collection.objects.link(obj)

print("MathDiamond built: %d verts, %d faces" % (len(mesh.vertices), len(mesh.polygons)))
