# Trees, timber architecture and working boats

Scene revision: `f9e067e`. The [record](record.json) preserves artifact hashes, source revision and verification. [Asset source hashes](assets-review.json) and the [integrated scene capture](scene-review.json) match the saved source.

- [Painting/model comparisons](reference-comparison.jpg): supplied crops beside the actual model factories, with different cameras explicitly labelled.
- [Overview before/after](overview-comparison.jpg): same camera, seed and scene time.
- [House close-up](houses.jpg), [boat close-up](boats.jpg), [tree in the scene](tree.jpg).
- [Isolated house](house-isolated.jpg), [cabin boat](cabin-isolated.jpg), [freighter](freight-isolated.jpg), [old tree](tree-isolated.jpg).
- [Two-second scene-time sample](motion.mp4), [decoded contact sheet](motion-contact.jpg).

## Observations and implemented changes

The high-resolution `public/reference/rainbow-bridge.jpg` shows curved tiled slopes, exposed gable framing, doorways and open timber screens. The wider `selected-passage.webp` reveals the whole old riverbank tree, including its crooked bole and broad crown. Far-bank boats have raised ends, cabin posts and screens, walkways and deck fittings; the vessel approaching the bridge carries lowered rigging.

Trees now use tapered curved limbs, distinct low forks, intermediate boughs, fine twig forks and bark strokes. The old tree has a separately authored crooked trunk and broader crown. Pollards and saplings retain different silhouettes. Sparse three-dimensional spring leaves replace large planar foliage blobs. Fine twigs have persistent ink strokes so they remain legible at ordinary zoom. Bare trees still simplify in distant views.

Houses retain their perpendicular ridge axes and tested footprints. Front/rear bays are recessed between posts. The foreground gable doorway has an actual opening with its dark backing behind the plaster face; an obsolete post crossing the opening was removed after raycast testing. Close views add semicylindrical overlapping cap tiles, ridge caps, gable king posts/struts, lattice screens, opened shutters and eave braces. Compound/courtyard joinery follows each component hall rather than spanning the yard. Existing distant shells omit this fine geometry.

All seven travelling and four moored boats use sectioned, flared hulls with curved sheer, inside faces, planked decks and gunwales. Cabin boats have framed openings rather than a solid box. Freight boats use shorter deckhouses and lowered rigging along the side; covered boats have arched woven shelters; small open craft have deck cargo. Rudders, stowed oars, rails, rope coils and tubs provide working details. Decks retain crew support height, hulls retain the tested navigation envelope, and rigging stays below the bridge clearance limit. Distant boat geometry drops fine fittings: the isolated freight model reduces from 7,612 to 1,468 mesh triangles.

The zoom limit increases from 2.5 to 4.5 for inspection. Painting shaders and the bridge landing separation are unchanged.

## Verification and limits

The full 53-test suite and six desktop/mobile interaction checks passed. After the last old-tree refinement, eight asset/detail checks and the combined production build passed again. New checks inspect actual boat vertices against navigation/height limits, raycast through cabin openings and the recessed gable entrance, measure real roof-cap thickness, and compare actual near/far mesh geometry.

The saved integrated capture loads both artworks without page/resource errors, reproduces identical pixels at a repeated absolute timestamp and retains simpler geometry at distance. The two-second movie fully decodes to 24 frames at 12 fps. Self-review covers enlarged model renders, production stills and decoded motion samples. No realtime performance or independent artistic acceptance is claimed.

These are closer editable approximations, not a completed object-by-object facsimile. Bark cavities and ornament remain simplified; several boats share superstructure modules; hidden surfaces are inferred. The precise raft/junk grouping and the painting's specific boat incident are not reconstructed. Website deployment remains deferred for local review.

Reproduce model stills with `node scripts/review-qingming-assets.mjs`; integrated capture with `REVIEW_FRAMES=24 node scripts/review-qingming.mjs` while the combined local server is running. Do not edit scene sources during capture.
