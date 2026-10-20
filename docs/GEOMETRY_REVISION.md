# Qingming geometry, people, and distant detail

This revision changes layout, modeling, animation, and geometry detail before changing the painting shaders. The original reference images and both original project checkouts are preserved.

## Reference observations

The supplied Rainbow Bridge crop is the working reference, rather than an invented town plan. Its hand-read structure includes a bridge-led market street, small waterfront buildings, broad foreground roofs, moored working boats, and a conspicuous old bare tree beside the near quay.

- The foreground hall immediately right of the bridge presents an oblique gable; it must not inherit the bank-parallel orientation of the small waterfront shops. Its roof axis and gabled form are now explicit layout data.
- The great bare tree is explicitly placed behind the foreground roof line near the water. Its root footprint is reserved before market allocation. Earlier planting rules silently rejected the former near-water candidate. The new tree has a thick, knotted, forked trunk and a broad branching crown.
- Foreground building groups and the right-hand shore curve have been revised. Far-bank buildings are lower and less uniform, with an additional small quay-side shop. Whole roof envelopes, the street, and pedestrian and boat clearances remain checked together.
- All dimensions, depths, and roof axes are artistic interpretations read from a single image. This is not a surveyed reconstruction or a claim of exact image registration.

## People and traffic

Twelve figure types replace three templates: merchant, porter, scholar, boatman, traveler, shopkeeper, woman, elder, child, craftsman, attendant, and basket seller. They vary in proportion, clothing, hats, and carried goods. Close models include hands, shoes, collars, belts, facial forms, and selected garment and basket details. Arms, legs, and heads articulate independently.

Eight traffic slots replace six. The scene includes open and covered horse carts, an ox-drawn cart, a laden pack horse, and a handcart. Legs and wheels animate from scene time. Traffic remains on the bridge-aligned street; pedestrians, boats, moorings, and pause behavior retain their existing systems. Traffic handlers retain pedestrian world scale rather than being shrunk again by the vehicle group.

The separate [figure study](../artworks/qingming/figure-study.html) shows the actual twelve models without reducing them to tiny figures in the overview. When running the combined preview, open `/qingming/figure-study.html`.

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
