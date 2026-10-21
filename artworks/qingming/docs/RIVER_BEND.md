# River bend and progressive rendering

The added reference is `public/reference/chicago-river-bend.png`, the user's wider Chicago Song-scroll crop. Its right half overlaps the existing bridge district: the two-story balcony house, construction frame, bridge approach and their crowds are retained, rather than duplicated in the extension.

## Authored inventory

| Visible group in the wider crop | Scene treatment |
| --- | --- |
| Broad water turning behind the left shoreline | Continuous curved near/far banks extending upstream, with matching water shading, raised earth edges and broken riprap |
| Cluster of working boats along the curved near bank | Five cabin, freight and reed-canopy berths, with cargo, crews, poles, lowered masts and mooring lines |
| Far-bank vessels and small open boats | Two cabin berths and two open skiffs; moving boats follow the widened fairway through the curve |
| Foreground tiled roof groups | Courtyards, a compound, gallery wings, dwellings and an open warehouse; existing overlapping landmarks remain in the bridge district |
| Opposite-bank shop fronts and sheds | Open galleries, warehouse, shops, house and upstream shed |
| Waterfront activity | Five stepped landings, loading poles, baskets, sacks, stored poles, wood bundles, benches, timber sign frames and four stalls |
| Street figures and animals | 68 additional shore figures using twelve clothing/load profiles, 38 boat crew, three cart/pack-animal groups |
| Old trees around houses and along the shore | Fine pine needles on exposed branching trees, at both coarse and refined detail |

There are 15 new building groups and 9 new berths. The exact count, spacing and concealed geometry of overlapping objects in the painting cannot be recovered uniquely from this crop. The layout is an authored 3D interpretation, not a claim to have identified every obscured person or object. Roof footprints and complete hull envelopes are checked against the banks. Two adjacent original far-bank berths move slightly along the quay to keep the new turning route clear.

## Rendering behavior

- Pointer movement invalidates the view and uses a 0.65 pixel-ratio drawing buffer, coarse vegetation/buildings/crowds and coarse river-bend chunks.
- After a 180 ms settle interval, full pixel ratio returns. Visible bend districts build their refined meshes one district per frame and retain them for subsequent visits.
- Offscreen districts are culled. The original instanced crowd also omits actors outside the camera frustum.
- While paused and idle, no animation frame loop or GPU redraw runs. Camera, palette, resize and play/pause changes wake it. Active animation is capped at about 30 fps; hidden documents suspend rendering.
- Both reference crops are available in the reference dialog. Whole passage fits the extended scene; River bend and Cargo landings provide closer views.

Validation artifacts and reproducible capture scripts are in `docs/reviews/2026-10-21-river-bend`, `scripts/review-qingming-reference.mjs`, and `scripts/review-qingming-buffering.mjs`.
