# Waterfront relationships: source review

Base: `3a19127c779276c3e1eb425f7994ae6713d42bf9`.

## Changes

- Group foreground buildings into staggered courtyards, turn a side gallery and tighten rear-wing relationships without intersecting roof envelopes. Orient stockyards with their buildings.
- Differentiate adjacent boats with an open cargo hold, a short reed shelter and a low aft timber cabin. Preserve the original default fleet and mast/sail implementation.
- Open selected bend-tree silhouettes using sparse needle sprays while retaining the branch geometry and the full needle crowns elsewhere.
- Replace repeated shore/roof poses with small purposeful groups, a loading exchange and boarding interaction connected by sloped gangplanks to actual deck edges.

## Reference evidence and limits

Directly inspected `artworks/qingming/public/reference/chicago-river-bend.png` (Git blob `67aa991bf95653e07db15bc627a62bcef2b27659`), from the Zhang Zeduan Song original at https://scrolls.uchicago.edu/view-scroll/52 . The reference visibly supports clustered/overlapping roofs, varied boats and open branching silhouettes. The precise 3D arrangement and individual work poses remain interpretations.

The earlier `docs/reviews/2026-10-21-river-bend` screenshots show the baseline, not these modifications. No new rendered screenshots are claimed. Chromium capture was attempted but failed at process startup because the sandbox denies its singleton socket; the cloud browser also cannot reach the executor's isolated localhost preview. Pixel-level after/before review and browser end-to-end tests therefore remain pending.

## Verification

New geometry tests cover separated roof envelopes and closer group relationships; dry, matched landing/deck endpoints; uncluttered interaction approaches; exact coarse/fine gangplank endpoint transforms; stockyard vertices outside rotated walls; boat variants within navigation envelopes; true open deck holes; short/offset shelter proportions; retained branch tips with thinned foliage.

Run `npm test --prefix artworks/qingming` and `npm run build --prefix artworks/qingming`. For visual QA, use the existing review script with `REVIEW_VIEWS=whole-extended-scene,river-bend,cargo-landings` and `REVIEW_DIR=docs/reviews/2026-10-21-waterfront-relations` in an environment that can launch Chromium. No video is required.
