# Qingming traced layout review — 21 October 2026

Applied the supplied composition plan to the editable Three.js scene. The plan is an image-space guide with locally varying painted perspective, not a surveyed map.

- The river turns out through the top crop and continues beyond the right crop. Independent banks replace the rounded island boundary.
- Twenty-seven architectural placements retain rectangular footprints. Buildings are translated and rotated along local bank streets and perpendicular lanes; the painted roof silhouettes are not used as distorted ground polygons.
- The Rainbow Bridge and connected market street move to the right of the composition. Its landings remain dry, and the arch retains clearance for crews and folded masts.
- The near-bank balcony house, foreground roof groups, far-bank shops, tree anchors, and six moored boats are repositioned around the bend.
- Anchor 5 is modeled as an ornate street gate, replacing the earlier scaffold interpretation.
- Monotone cubic shorelines are shared by terrain, water shading, placement, and navigation. Moving boats follow the bend, and walking clearances follow the actual curved banks.

## Renders

- `full-layout.jpg`: full composition.
- `bend-and-houses.jpg`: west bend and near-bank architecture.
- `bridge-and-gate.jpg`: bridge, approach market, and ornate gate.
- `high-layout.jpg`: higher view for inspecting footprints and clearances.

Captured from the actual scene with Playwright and software WebGL, at scene time 0, using the silk palette and a 1.5 pixel ratio. Review capture uses `scripts/review-qingming-layout.mjs`. The four captures reported no browser runtime errors.

## Validation

Production build passed. All 80 tests in 20 test files passed, including roof separation, dry landings, walking routes, moving and moored boat clearance, crew and rig clearance beneath the bridge, animation replay, and detail budgets. Screenshot inspection checked the four views.

This revision replaces the earlier detached upstream district with the supplied traced composition. The prior district-specific implementation and placement tests are retired; the current layout tests cover the integrated bend. Rendering demand scheduling, drag previews, crowd culling, and reusable boat/tree variants from main are retained. Historical review captures remain available in their original directories.
