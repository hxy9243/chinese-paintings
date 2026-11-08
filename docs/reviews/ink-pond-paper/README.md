# Calligraphy and paper revision

The only writing inside the painting is 魚蝦清趣, a finished vertical Liu Gongquan Kai still generated through the calligraphy repository's StaticFontScene. The transparent asset has no stamp, signature, additional glyphs or paper rectangle. Its generator, input specification, engine revision and font checksum remain in the project; the font binary is not bundled.

Paper defaults to 72%, with a 0-100% control for grain, scattered fibres, broad uneven age and sparse foxing. Paper and translucent animals share the same uniform and paper field. Fibres have individually seeded positions, orientations and lengths; their texture remains fixed. The existing two textures and three draws are retained.

Reviewed the production still and exported PNG: lettering is legible, all four characters are traditional forms, the old red seal is absent, and the heavier surface shows through pale ink. These are sampled self-reviews. `review.json` records native slider endpoint checks, unchanged swimmers/camera/weather/time, fresh-load and backward-seek equality, stable bare paper, responsive layouts, PNG export dimensions and runtime/asset hashes.

Reproduce with `npm run build` and `node scripts/review-pond-paper.mjs`. The full 20-second film is exported separately from the same source revision.
