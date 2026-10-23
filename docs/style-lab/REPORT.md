# Controlled Chinese painting style lab

Source: `hxy9243/chinese-paintings`, commit `5fdddcfea9425ec1e9a0454f031857a0d6b903e7` (2026-10-22). Original checkout `/workspace/chinese-paintings` stayed clean on branch `work`. Lab: `/workspace/chinese-paintings-style-lab`, branch `style-lab/controlled-study`. At initial study completion there were no main edits, pushes, merges, deployments or external posts. Subsequent publication of the isolated style-lab branch was explicitly authorized on 2026-10-23; main remains outside scope. No AGENTS.md found under /workspace; /workspace/.agents was empty and no repository .agents/skills existed. Existing installed dependencies were reused via local symlinks; no dependency or external skill installation.

## Outcome

A runnable, isolated `artworks/qingming/style-lab.html` compares the repository material baseline and three experimental treatments on exactly the same scene objects and cameras. It reuses HALLS[8] and its `hall()` model, two FEATURE_TREES (`bend-roof-pollard`, `balcony-rear-pollard`) with original placements/scale/seed, and a small terrain window derived from the original shoreline and bankSection. It omits surrounding houses, boats and crowds deliberately; this is a controlled diagnostic subset, not a full scene revision. Terrain is a new sampling window of the existing formulas, not an identical extraction of every full-scene triangle. Baseline means repository materials + finish on this subset, not a screenshot of the full app.

The fine-line experiment is the most useful next direction: cleaner quiet surfaces and readable joinery. It is still too mechanically uniform. The expressive variant reveals strong branch ink but has repetitive wavy bands; the mineral variant changes semantic pigment regions but does not simulate mineral layers or a mountain landscape. Neither is accepted as authentic Chinese painting. No variant repairs the repeated tree fans, incorrect relative silhouettes, or unregistered projection. Geometry fidelity remains unaccepted.

## Evidence and source assessment

Actual pixels: `artworks/qingming/public/reference/chicago-river-bend.png`, 2048×611; exported crop `(560,190,650,380)` in `qingming-reference-pixels.png`. The crop contains the two-storey hall, trees and bank-water context. `reference-evidence.json` records SHA-256 hashes and dimensions. [Chicago catalog](https://scrolls.uchicago.edu/view-scroll/52) identifies Zhang Zeduan's painting as ink and color on silk. The local reference is a screenshot/crop, not color-calibrated pigment evidence.

`artworks/thousand-miles/reference/source.png` exists, and its `reference/analysis.json` explicitly calls it a user-supplied screenshot with no historical attribution inferred. `blue-green-reference-pixels.png` is resized from the repository's mineral-mountain crop. Thus the lab says **blue-green-inspired**; it does not claim faithful Thousand Li reconstruction. The Palace Museum link supplied by parent research, https://www.dpm.org.cn/collection/paint/228354.html, timed out in this environment; no independent full-page verification claimed.

All paths below refer to source commit above:

- `artworks/qingming/src/passageLayout.ts:16` and `riverbanks.ts:29`: shared monotone shore curves and rounded bank cross-sections are a sound foundation for bank/water consistency. They do not prove the traced composition matches reference pixels. `riverbanks.ts` uses repeated low-poly icosahedra and EdgesGeometry cracks; those can read as triangulation rather than erosion/strata.
- `referenceTrees.ts:13`: tapered curved trunks, knots, thin shoots, separate buds and fixed seeds are better than foliage balls. Yet the golden-angle heads, repeated shoot/fork loops and uniform pollard template generate conspicuously repeated fan structure. Reference crop shows uneven old-trunk gesture, asymmetric forks and very different crown gaps. More shoots are not a fidelity metric; no species determination is made here.
- `crossroadsArchitecture.ts:24`: clipped joined-wing roofs, valley seams, open bays, lattice and real internal frames address generic-box buildings. This lab uses the separate `bridgeStudy.ts:484` hall path, not the crossroads model. Repeated tile and bay rhythms remain too regular; placement and roof silhouette must be registered independently.
- `referenceDetails.ts:22`: construction has posts, trusses, ledgers, braces, ties and a ladder rather than a solid scaffold box. The hard-coded repeated levels and loops need silhouette/bay comparison to the reference; presence of details alone is not scaffold fidelity. Scaffold geometry was inspected in code, not included in this small render sample.
- `paintMaterial.ts:13`: local brushPoint, shared palette families and stable geometry-space pigment are reusable. Generic multi-scale noise, glaze and granulation do not establish brush anatomy or silk authenticity. `inkFinish.ts:32` introduces screen-pixel jitter/grain; this is a potential screen-attached texture problem even though it is deterministic at a fixed camera.
- `bridgeStudy.ts:1051` and `packages/scene-kit/lod.ts`: existing detail organization/batching/hysteresis is useful. Generic coarse roof replacement risks changing distinctive anatomy; several custom kinds are explicitly exempted. The lab intentionally freezes high detail and does not exercise LOD transitions.

## Rendering controls and research

New `styleLabMaterials.ts` keeps architecture lines relatively continuous and assigns separate landscape/tree/water treatments. Directional marks use local positions and derivative filtering; the ink treatment breaks non-architectural stroke opacity. It does not implement pressure-varying ribbon contours, physically based pigment, authored UV direction fields, or true moisture diffusion. The baseline alone uses the existing finish; the style comparison therefore changes several variables and is not a causal test.

A separate ablation, `ink-0.png` versus `ink-marks-off.png`, keeps palette, geometry, camera and line-opacity treatment fixed, changing only procedural surface-mark amount. Pixel inspection shows that removing those marks removes the repetitive bands. It does not fix the crown silhouette. This supports replacing analytic sine bands with authored, anatomy-following, sparse clustered marks rather than adding more noise.

[Praun et al., Real-Time Hatching](https://hhoppe.com/hatching.pdf) explains image-space shower-door artifacts, object-space marks, and coherence across scale/tones. This motivates the local attachment and future nested stroke LOD; the lab does not implement tonal art maps. [Lee et al., Real-Time 3D Artistic Rendering System](https://cgvsl-ncku.github.io/files/publications/papers/Real-time_3D_Artistic_Rendering_System.pdf) separates silhouette paths, width, intensity and moisture. Those are useful future independent controls, not implemented features of this prototype. These are rendering research references, not museum prescriptions for authenticity.

## Validation and limits

- PASS: root `npm run build`; static output includes `qingming/style-lab.html`. Existing bundle-size warning remains. Log: `build.txt`.
- PASS: root `npm test`: 21 files / 82 tests, 157.23 seconds. Log: `tests.txt`. These test project behavior, not painting fidelity.
- PASS: final capture run has zero page/console errors. Same object-count/vertex-count/world-transform signature across all 12 style/orbit captures; camera arrays match for corresponding angles. Signature does not hash vertex bytes; code changes only material assignments between styles.
- PASS: every style returns to byte-identical decoded RGB pixels at the starting camera after ±30° views. All animation time is fixed at zero; no dynamic water/foliage validation claimed.
- INSPECTED: contact sheet, all three orbit columns and adjacent ink frames at −2°, 0°, +2°. The land marks visibly follow the rotated terrain, rather than remaining screen-fixed. Fine twig and tile density changes with sampling; aliasing risk remains. Fixed-camera replay does not establish flicker-free motion. A short 13-frame, 2°-step ink sequence is saved as `ink-orbit.mp4` (8 fps evidence, not a performance claim).
- NOT RUN: fitted reference registration and held-out landmark residuals, silhouette IoU, reverse 180° view, continuous full orbit for every style, automated motion reprojection error, full existing e2e suite, mobile/physical GPU benchmarks, LOD transition test, pressure/moisture simulation or independent user acceptance.
- FAIL / UNACCEPTED: reference geometry fidelity, convincing expressive brush anatomy and convincing mineral layering. The fine variant is a direction for further work, not an accepted reconstruction.

At viewport 1200×850 (canvas 1200×740), DPR=1, Chromium with SwiftShader, 30 warmed fixed-camera render calls bracketed with performance.now and gl.finish gave:

| Variant | median ms | p95 ms | all-pass calls | triangles | zero-angle screenshot latency ms |
|---|---:|---:|---:|---:|---:|
| baseline | 4.4 | 19.7 | 942 | 49,160 | 2,214 |
| fine | 5.6 | 12.9 | 941 | 49,158 | 519 |
| ink | 3.3 | 10.1 | 941 | 49,158 | 575 |
| mineral | 3.2 | 4.3 | 941 | 49,158 | 285 |

These timings are browser-side synchronous-call measurements, not verified end-to-end GPU/display frame times. Screenshot latency is much larger and includes readback/capture. The two extra baseline triangles and one call are the full-screen finish quad, not changed scene geometry. 941 calls for this small unbatched subset is too many to call optimized. Full-app batching was deliberately not reproduced. Do not infer target-device 30/60 fps from this table. `measurements.json` preserves exact values/cameras/hash.

## Reuse

`WORKFLOW.md` is the reusable draft checklist, covering registration, anatomy, semantic material controls, temporal coherence, performance and separate acceptance gates. Skill-creation guidance was read; a plain workflow was chosen as explicitly allowed by the task, so no SKILL.md was authored or installed.

Run from the worktree: `npm run dev --prefix artworks/qingming`, then open `/style-lab.html`. Capture with `node scripts/review-style-lab.mjs`; generate reference evidence with `node scripts/style-lab-reference.mjs`. The capture script uses the preinstalled `/usr/bin/chromium`; adapt that explicit path on another machine. The app is also included by the normal build. The original index entry and all existing modeling/material files remain unchanged.

Next useful experiment: register the actual hall ridge/eaves and both tree trunks to the crop, correct crown topology and relative placement in neutral materials, then repeat these same material comparisons. Do not attempt to hide those mismatches with a filter.
