# 鱼虾清趣 · Following the Current

The third painting in **画中行 · Living Paintings**. An original, editable composition guided by the supplied fish-and-shrimp ink reference, with articulated 3D animals, translucent pigment, open paper and rain.

## View and adjust

From the combined repository root:

```sh
npm run setup
npm run dev
# http://127.0.0.1:5180/ink-pond/
```

- Drag to orbit; scroll to zoom. On touch screens, drag with one finger and pinch with two.
- **Reset view** restores the original 45° elevated, side-on view without restarting the swimming.
- **Fish** (0–8) and **Shrimp** (0–12) change the population. Individual animals keep seeded paths, gestures, ink and proportions. A population edit recomposes their routes at the current painting time.
- **Rain** ranges from a dry pond to a shower; **Ink** adjusts the wash, and **Speed** changes the playback rate from 0.25× to 2×.
- Click the water for ripples and a local swimming disturbance. Pause and seek to choose a moment; **Save picture** exports the current angle at twice the displayed resolution.
- With the canvas focused, arrow keys orbit, +/− zoom and Home resets the view. All parameter sliders support keyboard navigation. Reduced motion starts the painting paused; the camera remains interactive.

The camera stays above the water (20°–80° elevation), may rotate through a full azimuth, and has bounded zoom. The orthographic projection retains the scroll's common scale while the real volume reveals new surfaces as the camera turns.

## Editable rendering

`src/models/` contains the original fish and shrimp model sources imported from the accepted `codex/ink-pond-clusters` study. The adapters now belong to this artwork, so the gallery needs no files from another checkout. The original study is preserved at `/home/kevin/.codex/worktrees/ink-pond-clusters/chinese_painting/artworks/ink-pond/` as the pre-interactive revision.

`src/ink-atlas.js` uses p5 to prepare stable wet deposits, feathering, backruns, dithering and paper grain. Surface UVs hold these marks in place while geometry and camera move. Five authored shrimp profiles vary silhouette, feelers, claw reach, eye marks and gesture tempo. Fish use five restrained pigment tints. The default five fish average about 3.1 times the shrimp's head-to-tail body length.

Paper, all animals, and water render in three GPU draws for a populated scene. Population edits reuse the pigment atlas, species pose caches, WebGL context and canvas; obsolete batch geometry and model resources are released. Empty populations are supported. Automatic internal resolution reduction helps slower devices; export resolution is independent of playback quality.

Each complete swimmer retains a persistent water-depth paint layer. Its real self-occlusion remains intact, while its silhouette covers deeper animals without mixing their pigment into the pale wash. This painterly layer convention avoids bodies cutting through one another and stays stable during orbiting and timeline seeking. It is an artistic shallow-water arrangement rather than a fluid or collision simulation.

Rain and water rings live on the same world XY water plane as the swimming. Falling streaks keep a camera-facing width. Rings keep their birth positions and their foreshortening follows the camera. The default 68% rain retains the faster, denser shower accepted in the study.

`window.pondPainting` exposes `renderFrame(seconds)`, `setView({azimuthDegrees,elevationDegrees,zoom})`, `setPopulation({fish,shrimp})`, `setPlaying`, `setSpeed`, `setRain`, and diagnostic methods. Frame state is repeatable for the same seed, population, camera and disturbance history. Live playback advances this explicit painting time.

## Reference and provenance

`references/painting-detail.png` is the retained artwork-only crop supplied during the original study. Its brush language guides this reinterpretation. The typeset `鱼虾清趣` inscription and `游` seal belong to the new composition. The reference is visual source material; no text within it is treated as instructions.

## Checks

```sh
npm run test:pond                    # at the combined root
node scripts/review-ink-pond.mjs      # with the gallery running on :5180
npm run build                       # packages all three paintings
node scripts/check-gallery-build.mjs # checks the packaged gallery and pond
```

The browser review covers actual mouse orbit and wheel zoom, paused camera changes, keyboard controls, population endpoints and repeated resource disposal, rain and speed sliders, PNG export, responsive layouts, gallery ordering, depth ownership and repeatable seeking at three angles. Evidence is saved in `docs/reviews/ink-pond-interactive/`, including a two-second camera-and-swimming excerpt and decoded samples. These are offline motion samples; live performance is measured separately. Pixel checks establish rendering behavior; they do not establish artistic acceptance or a frame-rate guarantee on every device.
