# Boat flicker, riverside restaurant and bridge-foot store (25 October 2026)

Follows the uncommitted `2026-10-23-scene-fixes` pass. Not committed.

## Fixes

- **Boat flicker:** every hull's bow and stern platform had its top face exactly at deck height (0.335), so the two surfaces z-fought as boats bobbed or the camera turned. The platforms now stand 0.012 above the deck (`referenceVessels.ts`). `boat-t10` and `boat-t10.05` are consecutive samples of the same view; the end platforms stay solid.
- **Houses along the left bank:** the painting's two-storey balcony restaurant backs onto the river with pines at the water. It was placed about 6 units inland from a roof-mass tracing, which the painting's compressed ground misreads. It now stands at the bank (`HALLS[8]`, s −13.4), with the bank lane passing behind it. It is no longer in `TRACED_BUILDINGS`.
- **Houses near the bridge:** the festooned gateway belongs to the restaurant. It stood at the bridge foot with an inn hall behind it. Measured from the bridge foot in the bridge crop, the painting puts it about 13.7 units upstream. It now stands at the restaurant's right end (`HALLS[26]`, s −5.4), facing the plaza and bridge. The open plaza between it and the bridge keeps the mat-awning stall by the water, as painted.
- **Second store near the bridge:** the painting has a tiled open-front store on the bank right of the bridge foot. `HALLS[9]` (formerly the inn hall) is now that store (`shop`, s 12.8). The near-bank walking loop east of the bridge starts just past it. The large gable house moved 1.7 units down the approach street to make room.
- **Houses on the river bend:** the western street's east row (`HALLS[7]`, `[23]`, `[31]`) stood in a straight column at s −33. The bank curves away from that column, so an empty strip up to 3 units wide opened between the houses and the water. In the painting this row backs onto the bend, with the moored boats tied up below it. Each house now runs from the unchanged street front (s ≈ −35.35) back to the bank and turns 8 to 13° with it. A strip of open bank about 1.3 wide stays between the backs and the water (`westStreetLayout.ts`). The teahouse at the bend corner (`HALLS[21]`) moved 0.5 inland and narrowed to 6.0, which gives it the same strip and keeps it clear of the old tree beside it. The street test allows the east row up to 14° off square for the bend; the street-width and frontage checks are unchanged. See `bend-bank`.
- **Shop street:** the western shop street now passes in front of the restaurant and gateway instead of through them (`roadSurface.ts`). The street walkers, riders and road wash follow it.

## Validation

All 114 tests in 30 files pass. The landmark test now pins the restaurant, gateway and store positions instead of the old inn gable. The type check and production build pass.
