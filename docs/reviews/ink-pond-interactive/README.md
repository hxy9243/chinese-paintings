# Interactive pond — local review

The pond is painting 03 in the combined gallery. This revision retains the accepted wet-ink animals and adds a real camera orbit, bounded zoom, fish and shrimp population sliders, swimming speed, and navigation back to the gallery.

Validation performed:

- Mouse drag and wheel zoom, keyboard orbit/reset, touch drag and two-finger pinch. Orbiting while paused leaves the swimming time and poses unchanged.
- Population endpoints 0/0, 8/12, fish-only and shrimp-only, plus repeated edits. The same canvas and context remain; the renderer retains three geometries, two textures and three draws. Node checks also cover finite ripple sizing with no shrimp and deterministic backward seeking.
- Default, lower side and higher opposite-side angles. At the sampled overlap pixels, whole-animal ownership and isolated foreground pigment matched without rear-animal ink leakage. This validates the retained painterly depth-layer convention, not a physical collision simulation.
- Responsive widths 320, 375, 768 and 1280; touch at 390; short landscape viewports in the production check. No horizontal overflow was found.
- PNG export, reference loading, three gallery entries and the production pond controls. The other two packaged artwork HTML routes returned 200; their renderers were not re-reviewed as part of this change.
- Combined production build and matching reviewed source hashes.

The in-app browser showed 60 fps after returning to the original view. The headless software-rendered sample was about 25 fps after automatic resolution adjustment. These are local observations, not a performance guarantee. Population edits reuse the pigment atlas and species pose caches; no texture atlas is regenerated for a slider change.

`orbit-preview.mp4` is a two-second offline excerpt at 24 fps, with swimming and a camera turn. The decoded samples were visually inspected for readable volume, ink continuity and water perspective. It does not measure live playback speed. The inspected forms retain pale washes and darker brush deposits as the camera reveals new surfaces. This is self-review; artistic acceptance remains with the user.

`review.json` records the checks, source hashes, production capture and script hashes. `interactive-pond-*.png` is the immutable final production still. The original standalone study remains preserved in its attached worktree.

Reproduce from the combined repository root:

```sh
npm run test:pond
npm run dev
node scripts/review-ink-pond.mjs --film
npm run build
node scripts/check-gallery-build.mjs
```
