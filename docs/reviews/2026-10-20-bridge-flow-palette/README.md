# A crowded moving bridge, connected mud roads and an optional indigo palette

Source: `2a801b9`. The [record](record.json) preserves hashes and verification; the [capture report](review.json) records scene measurements and exact source hashes.

- [Indigo and amber overview](indigo-amber-overview.jpg), [close bridge](indigo-amber-bridge.jpg).
- [Crowd before/after](crowd-comparison.jpg), same overview camera, seed and scene time.
- [Original silk bridge](silk-bridge.jpg), [mud-road connection](silk-road.jpg).
- [Four-second moving sample](motion.mp4), [decoded contact sheet](motion-contact.jpg).
- [Small-screen palette control](mobile-controls.jpg).

## Bridge circulation

The previous 36 bridge walkers circulated along 44-unit approaches, leaving only about eight on the actual span. There are now 108 circulating bridge walkers plus the existing 24 bank walkers. The saved eight-second view contains 94 passing people and 64 market figures: 158 people across the span.

Two narrow circuits run along opposite sides of the cart corridor, producing inner and outer pedestrian streams in both directions. End turns stay on their own side, avoiding the horse/cart collision that a circuit around the whole street would create. Individual phase offsets, stride phases, small speed variations and lateral movement stagger the crowd. Feet follow the arch. Sellers, customers, watchers and conversations remain at the edge market while the much larger passing crowd fills the deck.

The enlarged schedule checks retain 20-minute sweeps. A unit-cell broad phase checks all nearby pairs that can violate the existing clearance limits, avoiding a quadratic all-pairs cost with the denser crowd. Horse, cart, roof, bank and stationary-market clearances still pass. Absolute-time poses, pause and backward seeking remain deterministic.

## Road treatment

The ground material now paints a slightly darker compacted-mud path along the bridge axis and both banks. Shared route/shoreline coordinates make continuous junctions at the approaches; broken wheel marks remain on top. Feathered, noisy margins blend the worn earth into surrounding ground.

The road is part of the existing bank surface shader. It adds no coplanar road plane and does not darken the river or bridge decking. This is the requested visual interpretation, rather than a claim of an exact historical pavement reconstruction.

## Indigo and amber option

Choose **Color palette → Indigo & amber** under the scene. **Original silk** remains the default; a chosen palette persists across reloads. Both languages and small screens have the control.

The direction comes from **Explore vibrant Qingming palettes**, specifically [its generated concept](indigo-amber-concept.png). The production scene uses blue-violet roofs, teal water, amber timber, apricot plaster, muted ground/vegetation, ivory paper and coral cloth accents. Pigments are assigned to material families; this is not a global color overlay. Geometry, animation and detail levels remain the same when switching palettes. The concept's incidental painted details are not imported as scene geometry.

## Verification

All 56 unit/geometry tests, eight desktop/mobile interaction checks and the combined build passed. The actual palette selector changes rendered pixels, preserves triangle counts, persists after reload and restores the original sampled pixels when switched back. Captures have no page/resource errors and no small-screen horizontal overflow. The 32-frame, 8-fps, four-second scene-time sample fully decodes. Self-review covers production stills and decoded motion samples; it is not a realtime frame-rate benchmark.

Reproduce with `node scripts/review-qingming-flow.mjs` while the combined local server runs on port 5180. Do not edit scene sources during capture. The scene remains an interpretive reconstruction, with cyclic pedestrian circulation and the previously documented limits in bark, ornament and exact boat grouping.
