# Qingming geometry, people, and distant detail

This revision changes layout, modeling, animation, and geometry detail before changing the painting shaders. The original reference images and both original project checkouts are preserved.

## Reference observations

The supplied Rainbow Bridge crop is the working reference, rather than an invented town plan. Its hand-read structure includes a bridge-led market street, small waterfront buildings, broad foreground roofs, moored working boats, and a conspicuous old bare tree beside the near quay.

- The foreground hall beside the bridge has its ridge perpendicular to the adjoining hall. The primary building axes are now 0° or 90° in passage coordinates; courtyard and compound wings also turn their actual ridge geometry, rather than only turning a bounding box.
- Seven additional roof masses restore foreground wings, partly visible rear roofs and the eastern groups. There are 26 placed building groups. The small near-landing shelter leaves the bank walking lane open.
- Eight named reference trees are reserved before market placement, including the old near-quay tree, the far-landing tree and the two foreground pollards. The old tree has a curved, tapering trunk, continuous forks, roots, bark strokes and secondary twigs. Elevated crowns may overlap a roof or water silhouette; root discs remain on clear ground.
- Both the wider `selected-passage.webp` and the 3600 × 1800 `rainbow-bridge.jpg` are used. The latter makes individual clothes, market wares and timber joints readable; the long selected strip supplies the wider arrangement.
- Dimensions and hidden sides remain interpretations from the painting, not surveyed reconstruction or exact image registration.

## People and traffic

The twelve figure types are rebuilt with adult proportions of approximately 6.5 heads, shaped shoulders and jaw, overlapping collars, sashes, garment folds, bent sleeves, palms and fingers, leg wraps and rounded shoes. Close faces include brows, eyelids, eyes, nose, mouth and ears. Carried baskets have rims, vertical stakes and horizontal weaving; the porter holds the curved yoke with one raised hand. Scholars and shopkeepers hold their books or trays with restrained arm motion.

Thirty-two bridge observers face the rails and look down. Every bank stall has a vendor who reaches toward the counter; some sit on the low stool. Browsers look toward wares while stopped. These actions use absolute scene time and keep the existing passing lanes clear.

Eight traffic slots replace six. The scene includes open and covered horse carts, an ox-drawn cart, a laden pack horse, and a handcart. Legs and wheels animate from scene time. Traffic remains on the bridge-aligned street; pedestrians, boats, moorings, and pause behavior retain their existing systems. Traffic handlers retain pedestrian world scale rather than being shrunk again by the vehicle group.

The separate [figure study](../artworks/qingming/figure-study.html) shows the actual twelve models, with individual enlargement and front, three-quarter, side and back views. When running the combined preview, open `/qingming/figure-study.html`.

## Bridge and market

Six modeled stall assortments replace identical tables with five spheres: tea and bowls, woven baskets, skewers and food, cloth and scrolls, grain and jars, and fish. Props include turned ceramic profiles, stacked dishes, basket stakes and bands, hanging goods, sagging awnings, roof seams, cloth fringe, signs and stools.

Four small counters occupy the bridge edges, outside the central passing lanes. Bridge members include crossed timbers, projecting joint blocks, pegs and rope lashings, in addition to the plank deck, rails and longitudinal courses. Counter footprints and the new crowd spacing are checked with the existing street and route geometry.

## Distant geometry

Figures, vegetation, and architecture have genuinely different geometry levels. Far figures use fewer radial segments and omit small accessories and facial details. Far trees reduce secondary twigs and leaf marks. Distant buildings replace tile, lattice, bracket, and rafter detail with a roof-and-wall proxy.

Selection uses projected screen size and hysteresis. This matters for the orthographic painting camera: camera distance alone does not make an object smaller, whereas zoom does. The projection helper is the first small reusable module in `packages/scene-kit/`; the Thousand Miles renderer has not yet been converted to use it.

Crowds remain instanced and grouped by figure type, articulated part, material, and geometry level. Unused levels have zero instances and are not drawn. A paused scene redraws only after camera, size, or appearance changes. The existing `paintMaterial.ts` and `inkFinish.ts` are unchanged.

## Running and reviewing

```sh
npm run setup
npm run dev
npm test
npm run test:e2e
npm run build
node scripts/review-qingming.mjs
```

The review command uses the running combined preview on port 5180, saves current screenshots and an eight-second offline motion sample under ignored `qa/current/`, checks a repeated absolute timestamp after a forward seek, and opens the imported Thousand Miles viewer. `PAINTING_BASE_URL` and `REVIEW_DIR` override its URL and output directory.

Unit tests cover roof/bank/route clearances, boats and moorings, deterministic activity, rendered articulation, traffic footprints, reference landmarks, LOD hysteresis, and actual crowd triangle reduction. Desktop and mobile Chromium interactions cover camera limits, rendering controls, reference viewing, and layout overflow. Pixel replay checks apply to the tested browser/GPU environment; triangle counts do not establish a frame-rate gain.

Current limitations: the crowd remains stylized and the scene remains a bounded diorama. Fine painted surfaces, a unified ink pipeline, full historical accuracy, and unrestricted all-direction reconstruction are subsequent work. Website deployment remains deferred for local review.
