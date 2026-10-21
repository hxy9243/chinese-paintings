# Qingming: street life and watercolor

This revision distributes moving people over both approaches, the bridge, and
the waterfront roads, and extends the existing painted renderer. It is an
artistic interpretation of the Northern Song passage, with a researched muted
tile palette for ordinary buildings.

| Before | After |
| --- | --- |
| 108 walkers circling mainly on the bridge; 24 on bank loops | 132 full-street walkers and 48 waterfront walkers |
| Uniform forward circuits on the bridge | Independent pauses, differing speeds, street reversals, local yielding, off-frame recycling |
| 64 standing bridge figures | 32, leaving gaps around browsing groups |
| Saturated indigo tile mapping in the alternate palette | Charcoal and warm/green-gray unglazed tiles in both palettes |
| Mostly one canopy pigment | Six shared cloth colors, with varied folds and fringes |
| Static river surface pigment and moving line ripples | Drifting layered washes, broken highlights, and fading, feathered stern wakes |

[Research and implementation notes](../../../artworks/qingming/docs/STREET_LIFE_AND_WATERCOLOR.md)

## Visual review

- [River & ochre: overview](indigo-amber-overview.jpg)
- [Street and bridge detail](indigo-amber-street.jpg)
- [River and wake detail](indigo-amber-river.jpg)
- [Market detail](indigo-amber-market.jpg)
- [Silk: overview](silk-overview.jpg)
- [Plain-model comparison](plain-model.jpg)
- [Mobile controls](mobile.jpg)
- [Motion preview](motion.mp4)

At scene time 24, the walking density is approximately **2.4 people per route
unit on the bridge** and **3.1 on the two approaches**. Stationary market groups
remain locally clustered.

The `indigo-amber` filenames and stored preference retain compatibility; the
visible palette label is **River & ochre / 碧水赭彩**.

The motion preview is an offline sample of absolute scene time, not a hardware
frame-rate benchmark. Captures use software Chromium. Chinese fonts are supplied
through the review script's optional local font mirror, without changing the app.

## Checks

- Qingming unit suite: **59 passed across 13 files**. This includes three seeded
  20-minute crowd sweeps, a cart/prop/roof clearance sweep, real walking reversals,
  off-frame recycling, population density, deterministic seeking, and wake buffers.
- Production TypeScript/Vite build: **passed**.
- Desktop and mobile Chromium: **8 browser tests passed**. Optional Google Fonts
  CSS is stubbed in these tests; app resources and shader errors remain observable.
- `review.json` records source hashes, scene measurements, image replay,
  plain-model comparison, palette persistence, viewport overflow, and motion data.

Reproduce the checks:

```sh
npm test --prefix artworks/qingming
npm run build --prefix artworks/qingming
npm run test:e2e --prefix artworks/qingming
REVIEW_FRAMES=48 REVIEW_DIR=docs/reviews/2026-10-20-street-watercolor node scripts/review-qingming-watercolor.mjs
```

For restricted capture machines, `PLAYWRIGHT_CHROMIUM_EXECUTABLE` selects an
installed Chromium and `PLAYWRIGHT_USE_SWIFTSHADER=1` selects software rendering.
`QINGMING_QA_FONTS` may point to an installed `@fontsource/noto-serif-sc` package;
it is a capture-only option and is not an application dependency.

The production build retains Vite's existing large-chunk advisory. Physical
mobile GPU performance has not been measured in this review.
