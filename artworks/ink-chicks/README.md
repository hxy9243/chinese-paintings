# 群雏 · A mother and eight chicks

An interactive ink painting on fibrous paper. A modeled mother hen walks,
forages and stretches among eight painted chicks: six dark and two golden.
The flock was brought into this combined gallery from the version 14 study
in the separate `chinese_painting` working tree. The original references,
painted pose atlases, correspondence data and editable hen sources are retained.

## Run

From the **combined gallery** repository root:

```sh
npm ci
npm run dev
# http://127.0.0.1:5180/ink-chicks/
```

The gallery lists this as its fourth painting. For a standalone preview:

```sh
npm run chicks:dev
# http://127.0.0.1:5191/ink-chicks/
```

To use the older preview address, start with
`PAINTING_BASE=/artworks/ink-chicks/ npm run chicks:dev`.

## Paper, viewing and controls

- Mouse drag or one-finger drag turns the scene. Scroll or pinch zooms.
- Arrow keys turn and tilt a focused canvas; + / − zoom, Home resets.
- Movement, ink, paper, turn, tilt and zoom have labeled controls, matching
  the gallery's other interactive paintings.
- Pause, rewind, seek, save the current view as PNG, or hide individual birds.
- Reduced-motion preferences start the flock paused; camera controls still work.
- Both reference paintings and the separate hen study remain accessible.

The camera orbits a real paper plane and articulated 3D hen. The chicks use
view-dependent painted meshes with eight authored directions and grounded 3D
legs. They remain **2.5D**, not complete volumetric models. Orbit is bounded to
75 degrees either side and elevations of 20–70 degrees. This preserves their
painted silhouette; it is not an unrestricted reconstruction of the source.

Seeded pulp variation, fine grain and short fibres belong to the paper's UVs.
They stay fixed when the camera moves. The thin irregular edge and retained
inscription turn with the sheet. Animal positions map the original painting's
compressed ground depth into scene coordinates. Animals are clipped at the
paper boundary as they leave and re-enter.

## Shape and movement

The hen retains v14's full feather mantle and forward feeding lean. Her breast
lowers, back and attached tail pitch together, and leg joints bend over planted
feet. Both hen and chicks lower once, make two to four small pecks, then rise.
Each bird has independent travel and action timing. Conservative collision
circles, anticipation and braking keep their footprints separated.

The simulation runs at 120 Hz, displayed at 12 held poses per second. Seeking
reconstructs the same pose; four minutes of samples are cached. Camera movement
is independent of the held animation. Display speed depends on browser and host.

## Editable sources and provenance

- `src/scene.js`: paper plane, 3D camera, painted chick meshes and grounded legs.
- `src/paper.js`: deterministic paper surface and original printed marks.
- `src/main.js`, `src/style.css`, `index.html`: gallery controls and layout.
- `src/flock.js`: independent actions, travel, separation and planted contacts.
- `src/poses.js`: correspondence-based interpolation of eight chick views.
- `assets/v5/`: authored RGBA pose atlases, alignment metadata and flows.
- `hen-study/src/model.js`, `neck.js`, `legs.js`: editable anatomical parts.
- `hen-study/src/motion.js`, `behavior.js`, `contact.js`: joint and foot motion.
- `hen-study/`: model → brushwork → compare → refine and individual actions.
- `references/`: the two user-supplied reference paintings.
- `assets/prompts.json` and prompt text files: prior generated-image provenance.

The original studies' historical archives, films and exports remain in the
source checkout; they are not duplicated here. The current gallery includes
all runtime assets and the previous model used by the refinement comparison.
The hen uses pigment mapped from the supplied reference; chicks are generated
painted interpretations, not literal cutouts. This is a stylized reconstruction.

## Build and check

```sh
npm run test:chicks
npm run build
npm run test:chicks:browser
```

The production browser check covers all four gallery cards, the built painting
and hen-study routes, mouse and keyboard view controls, all six parameters,
PNG saving, pause/seek, reduced motion, source references and narrow screens.
It also checks exact repeatability after a backwards seek. To refresh the
fourth gallery card's preview, run the browser check with `-- --update-preview`,
then rebuild before final verification.

Review screenshots and source hashes are in `docs/reviews/ink-chicks-gallery/`.
Mechanical checks cover collision spacing, planted feet, stable geometry,
connected bones and independent feeding. The screenshot review is a sampled
self-review; it does not establish independent artistic approval or measured
avian biomechanics.
