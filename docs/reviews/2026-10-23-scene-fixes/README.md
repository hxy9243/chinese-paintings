# Bridge, banks, motion and rendering fixes (23 October 2026)

Follows main commit `df232fc`. Not committed; changes are staged in the working tree.

## Layout and modelling

- **Bridge:** crosses nearly square to the river at −86°, spanning 14 units with a 2.1 rise. The deck profile is half parabola, half cosine, so the steepest step is about 21° instead of about 49°. Both landings sit on dry bank.
- **River bend:** rounded and swept up-left instead of running out of frame as a straight channel.
- **Bank zigzag:** a zigzag of two incommensurate triangle waves rides on the traced curve. It is measured along the bank's own length, so steep reaches zigzag too. It is zero under the bridge abutments.
- **Bank faces:** offset across the bank rather than only in depth. They carry runs of stacked, ink-outlined stones and a stepped zigzag lip. The abutment masonry uses the earth palette instead of white.
- **Inn gateway (彩楼欢门):** stands beside the bridge's near approach, facing the street, with the inn hall behind it. The western lane was rerouted around the inn.
- **Stand near the bridge:** the small house there is now a woven-mat awning stall with counters and a paper parasol.
- **Houses:** the large house right of the approach turns its gable end to the street. Far-bank shops by the far landing moved aside, and neighbours were re-spaced.
- **Far-bank trees:** four trees now stand on the far bank at the bend.

## Delegated work, merged here

- **Boats** (`boatNavigation.ts`):
  - Boats travel a channel derived from the shorelines, both ways, at about 0.2 units/s, recycling beyond the paper fade.
  - Lanes are planned for hull, mast and deck headroom.
  - The main boat swings square to the bridge under the deck.
  - The folding mast lowers from its own distance to the deck.
- **People** (`pedestrians.ts`, `streetRoutes.ts`):
  - The main-street head-on jam that froze most walkers is fixed, and the walking pace raised.
  - 112 walkers now move on the western streets, joining the main street and the bridge; before, 42 people stood still.
  - Three riders on the western streets and three on the main street and bridge.
- **Streets** (`roadSurface.ts`, `passageSpace.ts`):
  - Roads are a soft, slightly lighter, feathered wash with faint ruts.
  - Bank lanes sit 1.0 to 1.75 units inland and follow the bank loosely.
- **Drag and distance detail** (`lod.ts`, `crossroadsArchitecture.ts`):
  - Dragging drops each house and figure one detail level instead of to boxes.
  - Trees keep medium detail and the canvas keeps at least 0.8x resolution.
  - Distant houses keep eaves, ridge, tile lines and ink outline.
  - About 1 ms more per drag frame.

## Note

The app starts paused when the operating system's "reduce motion" setting is on, so nothing moves for viewers who have it enabled.

## Views

`full-t0` / `full-t60` show the same camera a minute apart. `bridge-t0` / `bridge-t20` show the approach and deck. `west-t20` shows the western streets. `bend`, `bank-close`, `bridge-low` and `approach` are close views. All are captured from the live scene with the silk palette.

## Validation

All 114 tests in 30 files pass, including new tests for boat navigation, crowd motion, bank-lane setback and drag detail. The production build passes.
