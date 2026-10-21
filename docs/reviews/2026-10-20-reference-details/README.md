# Clearer Chicago crop: scene refinement

Based on the user-supplied `Screenshot from 2026-10-20 23-03-23(1).png`, now bundled as `artworks/qingming/public/reference/chicago-rainbow-bridge.png` and displayed by the in-app reference dialog. Base: `9da35d6` on main.

## Visible changes

- Pulled back the near-bank projection to a broad continuous edge, moved the old-tree root inland with it, and enlarged intermittent stones embedded in the bank face.
- Corrected the bare-tree factory call that incorrectly added leaves to every landmark tree. Old trees now expose bent leaders, thick buttresses, bark scars, asymmetric forks and fine branching. Existing foreground and rear tree anchors remain separately visible.
- Replaced the west foreground gallery with a two-storey shop: open lower bays, timber floor, recessed upper rooms, shutters, surrounding balcony and occupants. Adjusted its footprint to clear adjoining roofs.
- Added a separate open construction frame beside the approach: exposed trusses, partial tiles, bamboo staging, ties, diagonal braces, plank platforms, ladder, timber stock and two workers.
- Boat crews vary by vessel: 2 on small skiffs, 3 on canopy boats, 6 on cabin boats (2 on the roof), and 9 on the main freight boat (3 on the roof). Roof gangways support their feet. These counts are authored interpretations of the visible activity, not a verified census of obscured painted figures.
- Freight sailcloth has slack folds and battens on a pivoting rig. It lowers before entering the arch; cabin boats keep their spars stowed. Offset opposing traffic so the main freight boat is beside the bridge in the opening view.
- Expanded the crowd from 12 to 16 occupations, including water and produce carriers. Shoulder poles, bundles and staffs remain present in distant geometry. Added more walkers and bridge observers, varied bridge parasols and sign poles.
- Added long-eared draught/pack animals with eyes, bridles, soft tied saddlebags and bundles. The pack animal starts near the approach and is led on foot; animated carts retain their traffic corridor.

## Review images

- [Overview](overview.jpg)
- [Bridge crowds and traffic](bridge-crowd.jpg)
- [Construction and upper storey](construction-and-balcony.jpg)
- [Main boat crew and lowered sail](boat-crew.jpg)
- [Old trees in front of and behind the houses](old-trees-and-bank.jpg)
- [Bank from water level](rocky-bank.jpg)
- [Reverse view](reverse.jpg)
- [Mobile](mobile.jpg)

These are actual Three.js renders, not generated illustrations. Run `scripts/review-qingming-reference.mjs` after building Qingming; set `PLAYWRIGHT_CHROMIUM_EXECUTABLE` where needed and optionally `QINGMING_QA_FONTS` to a local Noto Serif SC fontsource directory.

## Verification and limits

Passed: production TypeScript/Vite build, all 72 unit tests across 17 files, and the desktop browser orbit/plain-model interaction test. Coverage includes existing placement, pedestrian separation, navigation, animation replay and LOD tests; added freight-rig/roof-crew clearance coverage over a complete navigation cycle. Extended close-face geometry checks to the four new occupations after fixing profile indexing for the larger cast. Desktop/mobile still capture reports no runtime or shader errors in `review.json`.

The no-camera medium-detail draw budget is now 850 (previously 650) for 16 articulated variants and additional architectural/boat detail. The captured overview uses 632 draw calls; whole-view figures still use coarse geometry. Physical mobile performance is unmeasured.

The construction framing, hidden building faces, boat working poses and exact occupation assignments are plausible reconstructions. The reference does not establish the old tree's species; this pass follows the exposed trunk and branching silhouette without identifying it as a pine.
