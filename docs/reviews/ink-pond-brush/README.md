# Fish brush refinement

The narrow spine deposit now varies with irregular brush pressure, separated hairs, wet fringes and small pooled edges. Fin deposits taper along their length and contain stable bristle channels. The dilute tinted belly, articulated volumes and existing motion remain in the same production renderer. Pigment is baked once with p5; no new render pass, texture or per-frame noise is added.

Reviewed the production still at painting time 8, low and rotated camera views, and four decoded samples from the 2-second, 30 fps excerpt. The back reads as broken overlapping ink marks rather than a uniform stripe. This is a sampled self-review, not independent artistic acceptance or a live-playback frame-rate guarantee.

`review.json` records runtime source hashes, stable paper and pigment across fresh loads and backward seeking, and the unchanged three draws, two textures and three geometries. `npm run test:pond` and the production gallery checks passed. The gallery preview is an unscaled crop of the production still including its inscription. The full 20-second delivery is stored separately under the artwork renders folder.

Reproduce this review with `node scripts/review-pond-ink-refinements.mjs --brush` after building the combined gallery.
