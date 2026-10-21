# River bend and progressive rendering

The added reference is `public/reference/chicago-river-bend.png`, the user's wider Chicago Song-scroll crop. Its right half overlaps the existing bridge district: the two-story balcony house, construction frame, bridge approach and their crowds are retained, rather than duplicated in the extension.

## Authored inventory

| Visible group in the wider crop | Scene treatment |
| --- | --- |
| Broad water turning behind the left shoreline | Continuous curved near/far banks extending upstream, with matching water shading, raised earth edges and broken riprap |
| Cluster of working boats along the curved near bank | Differentiated low aft cabin, open cargo hold and short reed shelter berths, with cargo, deck crews, poles and mooring lines |
| Far-bank vessels and small open boats | Two cabin berths and two open skiffs; moving boats follow the widened fairway through the curve |
| Foreground tiled roof groups | Staggered courtyard compounds with a turned gallery wing, closer rear halls and open quay lanes; existing landmarks remain in the bridge district |
| Opposite-bank shop fronts and sheds | Open galleries, warehouse, shops, house and upstream shed |
| Waterfront activity | Five stepped landings, loading poles, baskets, sacks, stored poles, wood bundles, benches, timber sign frames and four stalls |
| Street figures and animals | Localized conversation/carrying groups, deck crews and two connected loading/boarding exchanges; existing cart/pack-animal groups retained |
| Old trees around houses and along the shore | Selectively open branch silhouettes at the bend, with retained needle tufts in coarse/refined detail; full needle crowns elsewhere remain unchanged |

The exact count, spacing and concealed geometry of overlapping objects in the painting cannot be recovered uniquely from this crop. The layout is an authored 3D interpretation, not a claim to have identified every obscured person or object. Roof footprints and complete hull envelopes are checked against the banks. Two adjacent original far-bank berths move slightly along the quay to keep the new turning route clear.

## Rendering behavior

- Pointer movement invalidates the view and uses a 0.65 pixel-ratio drawing buffer, coarse vegetation/buildings/crowds and coarse river-bend chunks.
- After a 180 ms settle interval, full pixel ratio returns. Visible bend districts build their refined meshes one district per frame and retain them for subsequent visits.
- Offscreen districts are culled. The original instanced crowd also omits actors outside the camera frustum.
- While paused and idle, no animation frame loop or GPU redraw runs. Camera, palette, resize and play/pause changes wake it. Active animation is capped at about 30 fps; hidden documents suspend rendering.
- Both reference crops are available in the reference dialog. Whole passage fits the extended scene; River bend and Cargo landings provide closer views.

Validation artifacts and reproducible capture scripts are in `docs/reviews/2026-10-21-river-bend`, `scripts/review-qingming-reference.mjs`, and `scripts/review-qingming-buffering.mjs`.

## Waterfront relationship refinement (2026-10-21)

The original Chicago river-bend PNG was directly inspected for this pass. Observable cues are overlapping foreground roof groups, varied boat superstructures, exposed branching silhouettes and localized waterfront activity. The new courtyard spacing, concealed roof backs, specific boat variants and two exchange poses are authored interpretations, not measured reconstructions.

Building rotations now apply to both coarse and fine meshes and their stockyard props. Roof separation, dry-bank clearance, boat navigation envelopes, deck-connected gangplanks and stockyard/wall clearance are covered by geometry tests. Optional boat/tree variants preserve default bridge-district geometry, fine pine needles and the original articulated mast/sail behavior.

Rendered comparison of these latest changes is pending: the available shell cannot launch Chromium because its required socket is denied, and its local preview namespace is not reachable from the cloud browser. Existing screenshots in the earlier river-bend review are pre-refinement evidence only.
