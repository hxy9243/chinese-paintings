# Old pine foliage and folding boat rigs

Reference: `artworks/qingming/public/reference/chicago-rainbow-bridge.png` and the user's corrections about old pine needles, a collapsible post, and a sail.

The previous broad pointed blades are replaced with fine tapered needles in three-needle clusters on short shoots. Muted dark olive pigments and fine ink strokes keep the foliage readable at distance. Exposed old boughs, asymmetric branches, roots and trunk scars remain visible.

Freight and cabin boats now have fixed timber mast cheeks, a visible transverse hinge pin, an independently pivoting mast, a stitched battened sail, and hauling ropes anchored to the deck. The sail gathers vertically before the spar lowers; the battens keep their full length. The rig lowers for bridge clearance and raises again outside the crossing. Moored cabin boats keep their rigs lowered.

The concealed construction and the precise rig dimensions are modelling interpretations. The static boat factory contains the hull and cabin; the moving rig is assembled separately so batching preserves its articulation.

## Visual checks

- `old-pine-needles.jpg`: complete old pine viewed from the river.
- `old-trees-and-bank.jpg`: needle foliage around the foreground houses.
- `sail-raised.jpg`: upright mast and open sail, time 95.
- `mast-folding.jpg`: inclined mast and gathered sail, time 62.
- `mast-lowered.jpg`: lowered mast, hinge and bundled canvas, time 12.
- `overview.jpg` and `mobile.jpg`: scene composition at desktop and phone sizes.

Captured from the production build using `scripts/review-qingming-reference.mjs`. Browser console and page error lists are empty. The rig test samples every moving cabin/freight boat over a complete 400-second circuit, checking its transformed geometry and roof crew against the bridge underside. A separate sequence check verifies that furling precedes mast rotation and that the deck support remains fixed.
