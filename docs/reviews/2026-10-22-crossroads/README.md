# Qingming crossroads and reference detail revision — 22 October 2026

The previous layout checkpoint was published to main as `70daba45275a1d07188430d26f0a414115c8a18c` before this revision. This revision is local for review.

The supplied crossroads screenshot is preserved as `artworks/qingming/public/reference/chicago-crossroads.png` and is selectable in the scene's reference viewer. It guides the joined building wings, intersecting streets, open shops, and old deciduous trees. The existing Chicago bridge crop guides the adjacent scaffold and banks. Concealed sides and metric distances remain reconstruction choices.

## Changes

- Added eight western buildings and two intersecting streets, connected to the bank-side lane. Kept each building wing rectangular and aligned with its frontage.
- Replaced selected foreground blocks with joined rectangular wings. Roof surfaces are cut at their intersections to form valleys. Exposed gable frames, open shop sections, lattice bays, benches, counters, jars, floor slabs, tile courses, and roof frames are modeled in 3D.
- Replaced the scene's generic needle crowns with a separate deciduous tree model: irregular trunks, pollard knots, bark furrows, angular boughs, fine fan-shaped shoots, and sparse broad leaf buds. Fine shoots remain at distant detail levels.
- Replaced the ornate-gate interpretation with a scaffolded house beside the bridge approach. Added dense bamboo ledgers, unequal uprights, diagonal braces, and lashings.
- Added angular bank lip erosion, faceted riprap, stone edges, and exposed-earth fissures, while retaining the shared navigation shoreline.
- Preserved rendering-demand scheduling, drag previews, crowd culling, moving boats, bridge traffic, and the prior reusable asset variants.

## Captures

All captures are from the actual Three.js scene at time zero using the silk palette, not generated images.

| File | View |
| --- | --- |
| `full-layout.jpg` | Extended composition |
| `crossroads.jpg` | Intersecting streets and adjacent houses |
| `joined-roofs.jpg` | Foreground roof wings and lattice elevations |
| `open-shop.jpg` | Gable framing and interior shop section |
| `old-tree.jpg` | Fine branching and old trunk |
| `bank-and-trees.jpg` | Relationship of houses, trees, and berths |
| `bank-texture.jpg` | Water-level earth and stone detail |
| `scaffold-and-bridge.jpg` | Scaffold beside the bridge approach |

Capture command: `node scripts/review-qingming-crossroads.mjs`. Set `PLAYWRIGHT_CHROMIUM_EXECUTABLE` when using a nonstandard Chromium installation. `REVIEW_VIEWS` can select comma-separated view names.

## Validation

Production build passed. All 82 tests in 21 files passed. Tests cover dry roofs and landings, roof separation, unobstructed crossroads, scaffold proximity, finite joined-roof surfaces within their reserved bounds, boat/crew clearance, pedestrian and cart clearance, replayable animation, rendering demand, and deciduous shoot visibility at all detail levels. The eight browser captures reported no runtime errors. Visual review removed floating generic joinery, tightened the crossroads frontage spacing, exposed rear lattice bays, and moved tile ink above the raised tile surfaces.
