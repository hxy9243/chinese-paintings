# River bend review — 2026-10-21

The full-scene and close-up captures cover the curved upstream channel, working boats, new roof groups, cargo landings, bank-level details and the existing bridge district. Both user reference crops are available in the viewer. See `artworks/qingming/docs/RIVER_BEND.md` for the modeled inventory and interpretation limits.

## Verification

- Production TypeScript/Vite build passed.
- All 79 tests across 20 files passed, including dry building footprints, rotated hull clearance, moving-boat separation, bridge clearance, pine foliage at both detail levels, and progressive chunk caching.
- Desktop and mobile captures reported no browser errors (`review.json`).
- Browser interaction checks reported no errors (`buffering.json`): paused idle frames stayed at 5; dragging reduced the drawing buffer from 1452 to 943 pixels wide; release restored 1452 pixels; navigation and Resume life restarted rendering.

## Reproduce

Build with `npm run build --prefix artworks/qingming` and run `npm test --prefix artworks/qingming`. Set `PLAYWRIGHT_CHROMIUM_EXECUTABLE` to a working Chromium executable and `QINGMING_QA_FONTS` to a local `@fontsource/noto-serif-sc` package.

Run `scripts/review-qingming-reference.mjs` with `REVIEW_DIR=docs/reviews/2026-10-21-river-bend` and `REVIEW_VIEWS=whole-extended-scene,river-bend,cargo-landings,upstream-boats,bend-bank-level`, followed by `scripts/review-qingming-buffering.mjs`.
