---
name: living-scroll-studio
description: Repeatable workflow and technical toolkit for transforming classical Chinese paintings (such as Qingming Shanghe Tu and A Thousand Miles of Rivers and Mountains) into high-craft, low-CPU 3D living scroll artworks. Use when investigating, modeling, registering layouts, authoring ink/mineral shaders, brainstorming 3D art styles, or optimizing Three.js performance in chinese-paintings.
---

# Living Scroll Studio (`画中行 · 立体水墨工作流`)

This skill codifies the repeatable 5-stage engineering and art-direction workflow for creating, refining, and consolidating 3D interpretations of classical Chinese handscrolls in `/home/kevin/Workspace/chinese-paintings`.

---

## Stage 1: Reference Registration & Oblique Scroll Camera Calibration

Classical Chinese handscrolls use **shifting oblique perspective (`散点透视` / `斜轴测`)** rather than a single wide-angle Euclidean camera. Before adding or moving any 3D geometry:

1. **Lock the Reference Basis (`scrollLayout.ts` & `passageLayout.ts`)**:
   - All terrain, shorelines (`SHORELINES`), buildings (`HALLS`), bridge landings (`BRIDGE`), and routes must be authored in the scroll's `(s, d)` coordinate basis (`scrollPoint(s, d)` rotated by `REFERENCE_AZIMUTH = -50°`).
2. **Trace Connected Urban & Waterway Corridors**:
   - Avoid isolated grid-like "suburban" blocks or abrupt 90° canal turns.
   - Verify that shorelines use smooth monotone cubic Hermite tangents (`SHORE_TANGENTS`) and that courtyard wings, market stalls, and pollarded trees frame continuous street corridors.
3. **Clearance & Registration Invariants**:
   - Every roof overhang (`roofFootprint`) must stay on dry bank (`onBank(side, p, 0.24)`), separated from neighboring roofs by `>= 0.08`, and clear of `MAIN_STREET` (`segmentDistance > STREET_HALF_WIDTH + 0.08`) and `CROSSROADS_ROUTES`.

---

## Stage 2: Authentic Song Modeling Grammar (`packages/scene-kit` & `artworks/qingming/src/`)

Never leave raw, un-detailed CAD boxes or stretched-sphere primitives exposed in close or medium views:

1. **Song *Jiehua* (界画) Roofs & Joinery**:
   - Use concave *ju-zhe* (`举折`) roof profiles (`roofY(t)` with `-Math.sin(t * Math.PI) * 0.065` sag), intersecting roof valleys (`buildCrossroadsHouse`), recessed open shop bays with counters and ceramic jars, and overhanging eave rafters.
2. **Woven-Timber Arch Bridges (`木拱虹桥`) & River Vessels**:
   - Model overlapping cantilevered arch courses, transverse cross-beams, and stepped masonry abutments (`buildBridgeFoundations`).
   - Model hollow planked hulls (`buildReferenceBoat`) with open-hold, woven bamboo canopy (`篷`), and articulated mast-tabernacle lowering rigs (`buildLoweringRig`) that fold before passing under the arch.
3. **Pollarded Deciduous & Ancient Trees (`buildScrollTree` / `buildReferenceTree`)**:
   - Combine gnarled asymmetric trunks, root buttresses, bark furrows, and fan-shaped twigs (`fine-pollard-shoots`) that remain readable across all 3 LOD levels (`detail = 0, 1, 2`).

---

## Stage 3: Five-Style Shader & Brushwork Pipeline (`packages/painting-kit/artStyles.ts`)

Avoid generic isotropic 3D Perlin noise on flat surfaces or heavy multi-ring screen blurs. Use the unified 5-style living-scroll shader system in [`packages/painting-kit/artStyles.ts`](file:///home/kevin/Workspace/chinese-paintings/packages/painting-kit/artStyles.ts), [`paintMaterial.ts`](file:///home/kevin/Workspace/chinese-paintings/artworks/qingming/src/paintMaterial.ts), and [`inkFinish.ts`](file:///home/kevin/Workspace/chinese-paintings/artworks/qingming/src/inkFinish.ts):

| Style ID | Name | Visual Signature & Shader Controls |
| :--- | :--- | :--- |
| `jiehua-ink` | **Jiehua & Five-Tone Ink (`界画五色`)** | Crisp Sobel contour reinforcement, Song *Xiaowa* (`小瓦`) tile course shading, and deep *Mo Fen Wu Se* (`焦、浓、重、淡、清`) ambient occlusion under eaves and bridge arches. |
| `anamorphic-scroll` | **Palace Scroll Relief (`古卷浮雕`)** | Warm aged-silk patina (`#dfd0aa`), dense architectural tile/timber hatching, soft relief contrast, and seamless outward paper absorption. |
| `baimiao-mineral` | **Baimiao & Mineral Glaze (`白描设色`)** | Luminous raw silk (`#f4ecda`) with high-contrast *Baimiao* hair-line ink and translucent celadon, indigo, and ochre mineral glazes. |
| `river-mist-cinema` | **Bian River Morning Mist (`烟雨汴河`)** | Directional morning sun shadows, Rainbow Bridge arch water reflections, and depth-layered mist veiling the far bank. |
| `xieyi-poetic` | **Xieyi Splash-Ink (`写意泼墨`)** | Expressive wet-edge pigment blooms (`水渍`), dry-brush *feibai* (`飞白`) gaps, and bold ink massing. |

---

## Stage 4: Low-CPU & Bounded-GPU Performance Architecture

To keep initialization fast and runtime CPU usage minimal:

1. **Cache Prototype Geometries & Typed Arrays**:
   - Synthesizing 48 articulated figure templates (`crowd.ts`) or 100+ spline trees (`referenceTrees.ts`) from scratch on every scene creation is prohibitively expensive. Always cache synthesized geometry buffers at module scope and instantiate lightweight buffer copies.
2. **Compact Calligraphic Edges (`brushEdges`)**:
   - Subdivide `EdgesGeometry` with a bounded segment cap (`Math.min(5, Math.ceil(dist / 0.35))`) and zero inner-loop `THREE.Vector3` allocations.
3. **Frustum-Gated Actor Hierarchy Updates (`crowd.ts`)**:
   - Never call `parent.updateMatrixWorld(true)` on the root scene group every frame. Update `actor.updateMatrixWorld(true)` **only** for actors intersecting the camera frustum (`inView === true`), and skip GPU buffer uploads (`needsUpdate = true`) for empty instance pools.
4. **Render-Demand Scheduling (`RenderDemand`)**:
   - When paused, draw **zero** frames unless the camera, viewport, or style changes. During active camera drags, drop to preview resolution (`0.65x`) and LOD 0, then refine after `180ms` of stillness.

---

## Stage 5: Automated Visual Review & Validation Gate

Every modeling, layout, or shader refinement must pass both deterministic unit tests and visual multi-style review:

```sh
# 1. Run deterministic geometry, clearance, motion, and LOD unit tests
npm test --prefix artworks/qingming

# 2. Capture the 5-style visual brainstorm & benchmark matrix
node scripts/review-qingming-styles.mjs

# 3. Verify production bundle
npm run build
```
