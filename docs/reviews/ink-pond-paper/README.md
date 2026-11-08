# Calligraphy and paper revision

The only writing inside the painting is 魚蝦清趣, a vertical Liu Gongquan Kai inscription generated through the calligraphy repository's FontLayerScene. It writes 52 guide-inferred strokes over 10.52 seconds, in the left margin at mid-height, then holds the finished form. The transparent asset has no stamp, signature, additional glyphs or paper rectangle. Its generator, input specification, engine revision and font checksum remain in the project; the font binary is not bundled.

Paper defaults to 72%, with a 0-100% control for grain, scattered fibres, broad uneven age and sparse foxing. Paper and translucent animals share the same uniform and paper field. Fibres have individually seeded positions, orientations and lengths; their texture remains fixed. The existing two textures and three draws are retained.

Reviewed the production still and exported PNG: lettering is legible, all four characters are traditional forms, the old red seal is absent, and the heavier surface shows through pale ink. These are sampled self-reviews. `review.json` records native slider endpoint checks, unchanged swimmers/camera/weather/time, fresh-load and backward-seek equality, stable bare paper, responsive layouts, PNG export dimensions and runtime/asset hashes.

Reproduce with `npm run build` and `node scripts/review-pond-paper.mjs`. The full 20-second film is exported separately from the same source revision.

The review also checks empty writing at time zero, ordered deposition through the four characters, complete writing at 10.52 seconds, exact replay after backward seeking, and the inscription rectangle at left 3.5%, centre height 50%. Partial production samples are retained as `writing-*.png`. The two-second encoded brush excerpt exercises writing and swimming together.
