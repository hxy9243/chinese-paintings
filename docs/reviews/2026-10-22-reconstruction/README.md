# Qingming reference reconstruction

This review contains actual Three.js renders of the rebuilt scene. No generated image substitutes are used. The revision is based on main commit `5fdddcfea9425ec1e9a0454f031857a0d6b903e7` and has not been pushed or merged.

## Changes

- Registered the three reference crops at their different image scales, then measured the crossroads, river bend, main frontages, bridge landings, scaffold and tree anchors. See `layout-audit.md` and `reference-composite.jpg`.
- Kept rectangular building walls and aligned their axes to streets and banks. Added intersecting roof wings, clipped valleys, swept eaves, roof ribs, lattice windows, timber bays and a two-storey balcony. The small bridge-approach house was moved 0.8 units west to clear the painted road.
- Rebuilt old trees with asymmetric trunks, fine branching fans and narrow pointed leaves. Added layered bank rocks and angular erosion strokes.
- Rebuilt cabin and freight boats, woven shelters, crews and eight moorings. Added the tall scaffold lattice and covered ox carts.
- Changed moving boats to local drift around their reference positions. Curved street routes carry carts and pedestrians around buildings and fixed objects; recycling occurs beyond the faded paper boundary.
- Applied one world-space feathered paper mask to surfaces, ink outlines, instanced people, water and wakes. Removed the old hard clipping planes. Objects dissolve into the edge and contribute no pixels beyond its outer boundary.

## Views

`full-layout.jpg` shows the whole composition. `reference-view.jpg` uses the reference-facing camera. `crossroads.jpg`, `joined-roofs.jpg`, `old-tree.jpg`, `river-bend.jpg`, `bank-texture.jpg`, `boat-close.jpg`, `scaffold-close.jpg`, `scaffold-and-bridge.jpg` and `covered-carts.jpg` show the modeled details. `rotated-overview.jpg` shows the depth of the scene. `painting-edge.jpg` shows the unified feathered edge. The `waterfront-*.png` files isolate the cabin, freight boat and construction models.

The key frontage and bridge anchors come from the reference. Secondary, partly hidden footprints and reverse sides are modeled interpretations; this is a detailed 3D reconstruction, not a pixel-exact copy of the painting.

## Reproduce

Final validation: all 91 tests across 23 files pass; the TypeScript/Vite production build passes. The renderer recorded no browser errors across 13 scene views. The build retains a bundle-size advisory for the detailed Three.js scene. GPU pixel checks confirm complete disappearance beyond the paper fade. The patch was checked in reverse against the completed working tree.

From the repository root:

```sh
npm ci --prefix artworks/qingming
npm test --prefix artworks/qingming
npm run build --prefix artworks/qingming
npx --prefix artworks/qingming playwright install chromium
node scripts/review-qingming-reconstruction.mjs
node scripts/check-qingming-edge.mjs
```

Set `PLAYWRIGHT_CHROMIUM_EXECUTABLE` if using an existing Chromium installation. `REVIEW_VIEWS` accepts comma-separated view names for selective rendering. The render script records browser errors and scene metrics in `review.json`. The GPU edge probe records pixel alpha in `edge-gpu-check.json`; at depth 30 or along-scroll positions -61 and 41 the measured output is zero.

The accompanying patch applies to the baseline commit with `git apply qingming-recovery.patch`. It includes source, tests, render scripts and these review notes. Renders and validation logs are included separately in the review archive.
