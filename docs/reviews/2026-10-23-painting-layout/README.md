# Painting-traced layout, bridge crossing and inn gateway (23 October 2026)

Follows main commit `d8108b9`. Not committed.

## Traced layout

The three supplied Chicago crops are stitched into one panorama (`panorama.jpg`) by image correlation. The crop placements are bend = bridge × 1.13 + (704, 4) with r = 0.83, and bend = crossroads × 0.85 + (−472, 12) with r = 0.92. `artworks/qingming/src/paintingLayout.ts` registers that panorama to the scene through the app's own comparison camera: orthographic, 55° polar angle, zero yaw, 44 px per unit. A tested pair of functions converts panorama pixels and plan points in both directions.

The painting does not hold one projection. Facades are taller and the far bank more compressed than any single camera shows. Buildings are therefore anchored by the centre of their painted roof mass. `TRACED_BUILDINGS` lists each painted roof and the hall placed on it.

- `traced-layout.jpg`: painted roof centres (yellow crosses) and every hall's projected roof (red if traced, blue if not), with the bridge landings in green. Unmatched painted roofs are candidates for the next tracing pass.
- `plan.svg`: top-down plan of all footprints, banks and the bridge, with the panorama camera's extent.
- `render.jpg`, `overlay.jpg`: the scene through the registered camera, and the painting at 45% over it.

## Corrections

1. **Bridge angle.** Commit `d8108b9` traced the deck literally, at −35° to the river. The painting foreshortens the deck along the scroll so the arch's side reads, so taken literally the far foot lands mid-river. That commit added a sand spit to catch it and ran the main boat diagonally across the river. The bridge now crosses at −70° (`BRIDGE_PLAN_ANGLE`), spans 13 units with a 3.8 rise, and lands on the real far bank. The spit is gone. The main boat stays perpendicular to the deck and so now runs along the river through the arch. Two far-bank shops moved aside for the far landing.
2. **Inn gateway.** The 6-unit "construction" stage with poles to 11.5 units is replaced by the painting's 彩楼欢门. It is a framed gatehouse with a flat-topped swept roof, carrying three stepped tiers of lashed poles, splayed corner poles, pointed spires and a striped banner on an outrigger. The building kind is renamed `festoon-gate`.
3. **Placements from the trace.** The balcony house, gatehouse, inn hall (hall 9, kept street-aligned at −0.55) and the joined foreground roofs at the bend (hall 20) sit on their painted roofs.
4. **Far bank at the bend.** The painting keeps the far shops and moored freighters in frame east of the bend. That reach of the far shore moves about 2.5 units nearer, with its shops and the two freighters.

## Views

`before-ref.jpg` / `after-ref.jpg` and `before-bridge.jpg` / `after-bridge.jpg` are the same cameras on `d8108b9` and on this revision. `gate-close.jpg` and `boat-low.jpg` are close views.

## Validation

98 tests in 26 files pass, including the new `paintingLayout.test.ts`. That file checks the projection against a reconstructed Mock3D camera, the crop stitching, and every traced roof within 1 px. The production build passes; the existing large-chunk advisory remains. The capture reported no page errors.

Reproduce with `node scripts/review-qingming-painting-layout.mjs`; set `REVIEW_OUTPUT` to change the folder.

## Next tracing candidates

- Painted roofs still without a hall: the bridge-foot shed on the near bank, the riverside awning stall west of the approach, and the far-bank houses at the bend (still above the frame because the painting compresses distance).
- The white stone abutment blocks read much brighter than the painting's earth and timber landings.
