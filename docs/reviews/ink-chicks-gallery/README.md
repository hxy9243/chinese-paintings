# Ink chicks gallery integration — 2026-11-09

The active v14 hen/eight-chick study was imported from the separate
`chinese_painting` working tree into the combined `chinese-paintings` gallery.
The migration includes both supplied paintings, authored chick assets and
correspondence data, the articulated hen, and the individual model study.
Historical exports remain in the original tree.

## Changes reviewed

- Fixed paper fibres, pulp variation and grain, plus a thin irregular edge.
- An orthographic 3D camera around the paper and existing hen geometry.
- Eight-view painted chicks, now with grounded 3D legs; their pigment angle
  changes with the camera. They remain a 2.5D interpretation.
- Mouse, touch and keyboard viewing; movement, ink, paper, turn, tilt and zoom.
- Gallery-style playback, PNG saving, references and a responsive settings panel.
- A fourth card, development route and production route, including the hen study.

The first browser composition left the sheet and birds too small; the canvas
height was increased and view margins reduced. Sampled self-review covered
frontal and angled views, the default flock, mobile layout and the gallery.
The paper texture stays attached to the sheet while it turns. The default
pose retains the reference's open paper and one mother with eight chicks.

## Verification

`npm run test:chicks` passes all 15 movement/anatomy checks, including three
minutes of independent travel, planted contacts, separation, fixed geometry,
repeatable seeking and repeated pecks after one descent. These validate the
existing simulation and rig, not biological fidelity.

`npm run build` includes all four paintings and the individual hen study.
`npm run test:chicks:browser` exercises the production build: gallery links,
mouse orbit and wheel zoom, keyboard and six parameter controls, paused
viewing, repeatable backward seeking, PNG saving, reference images and
390-pixel / short landscape layouts. Reduced-motion mode starts paused.
The exact tested sources and results are recorded in `verification.json`.

`paper-default.png`, `paper-turned.png`, `paper-mobile.png` and
`gallery-four-paintings.png` are production browser screenshots. Visual review
is sampled self-review, not independent artistic acceptance. The bounded view
retains painted chicks instead of claiming complete 3D reconstruction. Projected
occlusion at an angled view is expected; collision spacing is on the ground.
