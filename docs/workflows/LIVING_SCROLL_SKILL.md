# Living Scroll Studio Workflow (`画中行 · 立体水墨工作流`)

This document records the repeatable production workflow and architectural standards used by the [`living-scroll-studio`](../../.gemini/skills/living-scroll-studio/SKILL.md) skill across `artworks/qingming/` and `artworks/thousand-miles/`.

## 1. Five-Stage Production Loop

1. **Reference Registration & Oblique Scroll Camera Calibration**:
   - Register shorelines, bridge arches, street corridors, and building footprints in the reference crop's `(s, d)` basis (`scrollLayout.ts`, `passageLayout.ts`).
2. **Parametric Song Architecture, Vessel & Botanical Grammar**:
   - Construct buildings with concave *ju-zhe* roofs, open shop bays, intersecting roof valleys (`crossroadsArchitecture.ts`), woven-timber arch bridges (`bridgeStudy.ts`), hollow planked boats with folding masts (`referenceAssets.ts`, `referenceDetails.ts`), and gnarled pollarded trees (`referenceTrees.ts`).
3. **Five-Style Living Ink Shader Pipeline (`packages/painting-kit/artStyles.ts`)**:
   - Drive surface shading (`paintMaterial.ts`) and screen-space ink finish (`inkFinish.ts`) through 5 curated Chinese painting render styles:
     - `jiehua-ink` (**界画五色 · Jiehua & Five-Tone Ink**)
     - `anamorphic-scroll` (**古卷浮雕 · Palace Scroll Relief**)
     - `baimiao-mineral` (**白描设色 · Baimiao & Mineral Glaze**)
     - `river-mist-cinema` (**烟雨汴河 · Bian River Morning Mist**)
     - `xieyi-poetic` (**写意泼墨 · Xieyi Splash-Ink**)
4. **CPU & GPU Efficiency Rules**:
   - Cache synthesized prototype geometries (`crowd.ts`, `referenceTrees.ts`) so scene construction completes in ~1 second instead of >12 seconds.
   - Gate `updateMatrixWorld(true)` in `crowd.ts` by camera frustum visibility instead of traversing the entire static scene graph every frame.
   - Bound `brushEdges()` subdivision counts and use a 4-tap rotated halo in `inkFinish.ts`.
5. **Automated Multi-Style Visual Capture & Regression Gate**:
   - Run `node scripts/review-qingming-styles.mjs` to capture matched camera views across all 5 art styles and record triangle/draw-call/timing metrics.
