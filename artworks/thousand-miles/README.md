# Blue & Green Waterways

A separate, editable 3D interpretation of the supplied blue-green landscape screenshot. The current finish keeps azurite-blue crests, malachite-green faces, weathered earth, quiet olive water and a light brown paper atmosphere.

Open the local preview at **http://127.0.0.1:8781/**. To start it from this directory:

```sh
python3 scripts/serve.py
```

The viewer is self-contained: Three.js and its license are vendored. It needs HTTP rather than opening the HTML directly as a file. Node is only needed to reproduce captures and automated checks.

## Curved shores and blue-green color · revision 10

The iconic mineral palette is restored. Warm earth, quiet olive water and a light brown paper atmosphere support the blue crests and green faces. The remote towers lose saturation and contrast without muting the nearer mountains.

Five hand-read shoreline footprints replace the long continuous river corridor: two curved main shores and three separated distant shoals. The foreground opens back into the lake. Short tree rows follow 19 observed paths, with varied heights, spacing and gaps; tree roots are intersected with the actual terrain. The dense random lowland forest and paired road avenues have been removed. Three unequal, hand-traced distant contours replace the repeated sine-wave horizon. The eastern footpath follows the new terraces, and the small blue hill formerly under the bridge is moved behind the eastern approach.

The editable reference landmarks are in `src/reference-composition.js`. A generated distance texture aligns water-edge pigment with the new geometry; it contains distances, not painting pixels. The crests, shoreline plans, tree positions and distant ridges remain full 3D geometry. The source photograph, earlier films and saved GLBs remain unchanged.

Open [the source comparison and observation notes](composition-study.html), or [the current scene](index.html). Remaining visible differences include the overly regular mountain faces, simplified cliff overhangs, sparse building groups, and the source's finer woven-paper and brush texture. Hand-read registration checks do not establish complete artistic fidelity.

```sh
node scripts/composition-study.cjs after
node scripts/composition-geometry-check.cjs
node scripts/check.cjs --quick --report=composition-scene-checks.json
```

## Reference-led forms and natural color · revision 9 (preserved study)

The current viewer corrects the mountain depths using **20 visible foot landmarks** as well as the retained crest traces. This shortens the faces that previously covered smaller foreground hills. Narrower crest bevels, broken saddles, stronger irregular folds and shorter end shoulders give the rocks more definition in both ink and neutral clay.

Round crown clumps are replaced by open, pointed leaf sprays with more exposed, tapering branch forks. **254 small ridge trees and 1,375 grass tufts** now follow the actual crests, including high summits. Their roots use the same triangle surface as the rendered terrain and retain the existing wind anchors. The scene has **5,378,870 triangles**, down from 8,866,968 before this revision; this is a geometry reduction, not a measured frame-rate claim. Auto/Fast/Detail and the three-pass ink renderer are retained.

The palette deliberately departs from the source's mineral saturation in response to the requested natural finish. Slate, sage, sandstone, dark timber and quiet green water replace bright cyan and the global yellow-green cast. A warm paper horizon, fine silk grain and restrained haze remain. Editable swatches are in `src/natural-palette.js`; the optional brush/mineral experiment remains separate from this revision.

Open [the source and matched before/after gallery](natural-study.html), including clay, reverse view and branch detail, or [the current viewer](index.html). Existing films, GLBs and revision manifests describe their saved revisions; this update changes the live editable scene, not those earlier exports.

```sh
node scripts/natural-study.cjs after
node scripts/natural-geometry-check.cjs
node scripts/check.cjs --quick --report=natural-scene-checks.json
```

The reference is preserved unchanged. Foot positions and unseen depths remain interpretations. Geometry checks cover crest registration, independent root raycasts, road clearance and finite buffers; replay and interaction checks cover the renderer. The gallery is the visual evidence, not an automated claim of exact painting fidelity.

## Faster viewing and detailed stills

The ink view now draws two scene passes and one finish pass. The unused 3D comparison render and split-view control have been removed. **3D materials**, **Clay**, and the supplied **Source** remain available as separate views. Diagnostic surface readback generates its material reference only when explicitly requested.

**Render quality** offers **Auto**, **Fast preview**, and **Detail**. Auto uses 75% of the detailed width and height while the camera moves, then refines after 350 ms without camera movement. Wind and water can keep moving during the detailed view. Fast preview stays at the smaller resolution. Preview and detail use pixel budgets equivalent to 1280 × 720 and 2560 × 1440 respectively, preserving the viewport's aspect ratio. The geometry is the same in every quality mode; this controls pixel cost rather than mesh detail. Silk keeps the same display scale during refinement.

Zoom or choose a close camera, then use **Save detailed view** for a PNG at twice the viewport dimensions, capped within 3840 × 2160. The viewer returns to its previous quality afterward. Explicit film and still captures keep their requested dimensions and absolute scene time, independently of preview quality. Existing films, models, and revision manifests remain preserved records of their original deliveries.

With the preview server running, `node scripts/render-speed.cjs` measures the old and current pipelines on the same GPU, checks matched PNGs, and exercises automatic refinement, detailed export, viewport resizing, and exact capture replay. Results are saved to `qa/render-speed.json`. `node scripts/check.cjs --quick --report=render-speed-checks.json` runs the existing scene checks without replacing the earlier report.

## Optional mountain brush and mineral study

Open **Brush & mineral study** in the paint controls. **Follow mountain folds** replaces part of the general mountain grain with marks mapped along the existing ridge and slope coordinates. **Layered mineral color** adds clearer malachite-green faces, azurite-blue crests and restrained ochre lower glazes. The controls are independent and off by default. Open `/?study=1` to try both together. The [matched gallery](renders/brush-study-comparison.jpg) includes the painting view, isolated finish changes and the reverse mountain view; the [close-up comparison](renders/brush-study-closeup.jpg) shows both treatments together.

The study preserves all terrain, vegetation and architecture geometry, uses the same three rendering passes, and retains fixed surface coordinates and absolute-time replay. It is a small ridge-relative brush-mapping experiment, rather than the full curvature-aligned parameterization described in the research. Switching both controls off returns to the committed speed renderer. The aesthetic work is kept separate from speed commit `77abff0` for review.

Run `node scripts/brush-study.cjs` with the preview server active, then `python3 scripts/brush-study-gallery.py`. The captures and checks cover four camera views, independent controls, unchanged geometry, protected surface interiors, finite output, exact replay and the unchanged default finish. These checks support behavior and reproducibility; they do not establish historical fidelity or artistic preference.

## Layered ink and pavilion orbit · revision 8

[Circle the pavilion](orbit.html) is a 40-second panoramic film: the painting view, an approach, a complete 360-degree circuit, then a pullback to exactly the original painting camera and framing. It ends with a two-second camera hold while the landscape continues to move. The frame is 1600 × 720 at 24 fps.

Tree crowns now carry stable jade, olive and young-leaf glazes that vary by tree, grove and crown height. Their root and rest coordinates keep those washes attached during wind and camera movement. Curved lake strokes and the broad water wash share a gentle current. A local ink diffusion pass softens low water/bank intersections and reduces the hard contour there; category and height checks protect foliage, architecture and high rock silhouettes. The modeled terrain, architecture and vegetation geometry are unchanged from revision 7.

`orbit-manifest.json` records the current scene, renderer, source hashes, film and verification. Earlier films and manifests remain preserved. The [matched finish comparison](renders/orbit-comparison.jpg) shows the color and wet-edge changes. The [film contact sheet](renders/pavilion-orbit-contact.jpg) includes the far side of the pavilion and the return to the painting view.

```sh
node scripts/orbit-study.cjs after
node scripts/orbit-style-check.cjs
node scripts/orbit-wind.cjs
node scripts/orbit-protection.cjs
node scripts/orbit-film.cjs pilot
node scripts/orbit-film.cjs frames 0 480
node scripts/orbit-film.cjs frames 480 960
node scripts/orbit-film.cjs verify
python3 scripts/orbit-delivery.py
python3 scripts/orbit-gallery.py
node scripts/orbit-player-check.cjs
python3 scripts/orbit-audit.py
```

The style checks isolate actual tree pigment changes, shoreline diffusion and water motion. The orbit checks measure a full turn, conservative camera clearances, roof framing and exact final-view pixel equality at the same environment time. Render chunks must agree on source hashes; the finished movie is fully decoded and sampled against the source frames. These checks support reproducibility and the stated effects, not an exact painting-fidelity score.

## Wooded foothills · revision 7

The nearby flat aprons now have fifteen broad, rounded foothills, fifteen woodland patches, 513 additional rooted trees, shrubs, grass and scattered bank stones. The terrain extends from the former foreground boundary at z=130 to z=334, retaining the original core vertex spacing. The outer mesh perimeter finishes below the lake. Foreground banks have shallow irregularities and wider slopes into the water. Roads remain open and the bridge pavilion, hand-read mountain crest definitions, palette and camera route are preserved.

Open [the updated 30-second pavilion film](lowlands.html), [matched before/after views](renders/lowlands-comparison.jpg), or the **Left/Right wooded foothills** viewpoints in the live scene. New ground marks use the same fixed surface coordinates as the mountain ink; new vegetation shares rooted wind deformation. The film repeats the existing approach, close pass and pullback through this fuller landscape.

`lowlands-manifest.json` records this revision's sources, scene metadata, checks and delivered artifacts. `scene-manifest.json`, the original `models/blue-green-*.glb`, earlier stills and films remain revision 6 records. Use **Scene → Download full 3D model** or **Trees and groundcover** in the live viewer to export the current geometry. The complete ink and motion finish remains in the browser renderer.

To reproduce this refinement with the server running:

```sh
node scripts/lowlands.cjs after
node scripts/lowlands-check.cjs
node scripts/lowlands-film.cjs pilot ink
node scripts/lowlands-film.cjs frames ink 0 360
node scripts/lowlands-film.cjs frames ink 360 720
node scripts/lowlands-film.cjs verify ink
python3 scripts/lowlands-delivery.py ink
python3 scripts/lowlands-gallery.py
node scripts/lowlands-player-check.cjs
python3 scripts/lowlands-audit.py
```

Pillow is required for the delivery/gallery scripts. The before images are preserved captures of commit `f45c470`; do not overwrite them from the current renderer. Checks cover submerged mesh boundaries, continuity across the old cutoff, terrain raycasts at tree roots, road clearance, mountain crest samples, film framing, replay and pigment attachment while the new trees move. They do not certify every possible flight path or exact painting fidelity.

## Composition and ink refinement · revision 6

The cruciform pavilion sits directly on the highest, level crown of a visibly rising timber bridge. The deck rises 5.6 scene units from the banks to a crown at 7.9. The two approaches have unequal lengths, following the source composition; the crown is at 42% of the plan run. The hall itself remains symmetric. Its floor is flush with the bridge planks and its foundation pilings reach the water.

The foreground banks extend inward to frame the narrower crossing. Two graded roads continue into the trees, keeping trunks outside the walking surface. The architecture GLB includes the roads.

Thirty-one mountain and island forms now use individually hand-read crest polylines from the source. The crests are registered to the painting camera, then given asymmetric front and back slopes, swept depth, carved channels and flared feet. Foreground hills sit back enough to expose their bases. Four broad, distant shore layers recede behind the lake. The left bank road and two nearby buildings have moved clear of the main ridge; smaller flattened ground patches protect its shoulder.

The [neutral clay shape study](shape-study.html) compares the source, previous mesh and current geometry at matched cameras. Use `?revision=6&clay=1` to explore the new forms without pigment or colored lighting. The painting palette and ink shaders are held at revision 5 for this geometry pass. Close registration checks are not a source-fidelity score; unseen depth remains interpreted.

The pigment separates blue crests and shadowed shoulders, pale green facets, deep ink clefts and warm ochre lower faces. Broken downhill folds and small granulated deposits replace radial spokes. Foreground contrast stays stronger than the faded remote towers. Surface marks use fixed undeformed coordinates during camera movement and wind.

Three low fog layers drift across the far lake and mountain bases in world space. A separate 12-second fixed-camera film isolates the moving mist.

The [comparison](renders/revision-comparison.jpg) includes fresh renders of revision 5 and this version from identical cameras. The [bridge crown](renders/arch.png), [pavilion front](renders/pavilion.png) and [wooded approach](renders/entry.png) expose the construction. Earlier versions remain in Git at `ec8caa4`, `f113033`, `f381c69`, `d78721f` and `1371ddf`.

## Explore

- Drag to orbit, scroll closer, or choose a camera viewpoint.
- Choose **Bridge crown and approaches**, **Pavilion front**, **Wooded bridge approach** or **Mist over the distant lake** to inspect this refinement.
- **Fly to the bridge** follows a 20-second approach into the roofed bridge pavilion.
- **Free flight:** drag to look, W/A/S/D move, Q/E descend or rise, Shift moves faster.
- **Source** opens the supplied reference; **Clay** exposes the underlying geometry.
- **Mineral color**, **Brush lines**, **Ink washes**, **Silk texture** and **Haze** adjust the finish.
- **Living landscape** pauses the shared clock for wind, water strokes and atmosphere.
- **Save view** saves a PNG; H hides the controls.

The new [ink rendering research and A/B experiment](research.html) links four primary papers and records exactly which ideas were adapted. The three tonal brush maps share cumulative marks across density levels. Soft painted shadows, dry gaps and colored pooling complement the geometric ink. Mountain ledges now carry small trees and grass, while the right-hand range recedes to reveal broader green shelves. Source photograph color patches guide the muted palette.

The illustrated study is [study.html](study.html). Source crops, a palette study and source provenance are in [reference/](reference/).

## Editable scene

- `src/mountain-shapes.js`: hand-read crest landmarks and individual depth records.
- `src/rock-form.js`: asymmetric sloping ridges, beveled crests, carved channels and flared toes.
- `src/terrain.js`: connected mountain terrain, two shorelines, mineral distribution, distant shores and lake.
- `src/architecture.js`: curved roof volumes, columns, brackets, screens, bridge planks, pilings and railings.
- `src/scene.js`: separate shore settlements, bridge pavilion, skiffs and figures.
- `src/roads.js`: graded road ribbons joining both bridge banks.
- `src/forest.js`: slender rooted groves, small leaf sprays, reeds and shore rocks.
- `src/ink.js`, `src/glazes.js`, `src/wash.js`, `src/effects.js`: fixed surface pigment, blue-green washes, dry brush, normal/depth contours, silk, haze, wind and water.
- `src/main.js`: perspective cameras, absolute-time playback, controls and model export.

The source image is a comparison reference. It is not projected onto geometry. Terrain, hidden sides, interiors and close construction are inferred. The new landscape deliberately retains the source's color family and broad composition, rather than claiming a brush-for-brush reconstruction.

## Models and renders

The `models/` directory contains standard GLB files for the whole scene and separate **bridge, shore architecture, mountains, water and trees**. These preserve static geometry, instancing and base colors. The complete custom ink treatment and environmental motion run in the browser renderer.

`renders/blue-green-flythrough.mp4` is a 20-second, 24 fps, 1280 × 576 film. The stills and galleries include matched source comparison, eleven viewpoints, clay geometry, zoom views and sampled encoded movie frames.

`renders/distant-mist.mp4` is a 12-second, 12 fps, 1280 × 576 fixed-camera study with wind and water paused, isolating the drifting fog.

The canonical source, artifact hashes, geometry counts and validation summary are recorded in `scene-manifest.json`. `qa/` contains the actual check results. Raw frame sequences and runtime logs are ignored by Git; the editable source, reference, delivered GLBs, preview images and movie are tracked.

## Reproduce

```sh
npm ci
npx playwright install chromium
npm run start
# In another terminal, with the preview running:
node scripts/capture.cjs stills
node scripts/capture.cjs detail
node scripts/capture.cjs motion
node scripts/capture.cjs fog
node scripts/capture.cjs export
node scripts/roundtrip.cjs
node scripts/refinement.cjs
node scripts/scene-study.cjs
node scripts/compare-revision.cjs
node scripts/wash-study.cjs
node scripts/shape-study.cjs
node scripts/check.cjs
node scripts/wind.cjs
python3 scripts/encode.py
python3 scripts/galleries.py
python3 scripts/refinement-gallery.py
python3 scripts/revision-gallery.py
python3 scripts/delivery.py
python3 scripts/wash-gallery.py
python3 scripts/shape-gallery.py
python3 scripts/finalize.py
```

If a film capture is interrupted, `node scripts/capture.cjs motion 240` resumes at frame 240. Reuse earlier frames only while rendering sources and settings remain unchanged; the final checks replay samples on both sides of that boundary.

The offline gallery and delivery scripts need Pillow and FFmpeg/ffprobe. The browser scripts use Playwright 1.63.0. Their original host uses Intel Vulkan acceleration; another machine may need a different Chromium graphics option. Set `NODE_PATH` only if using an already installed Playwright package outside this directory. The preview defaults to port 8781; update capture URLs if choosing a different port.

Checks cover pavilion mirror silhouettes, floor/deck alignment, road connections, tree clearance, depth-masked fog motion, continuous bridge deck ray hits, water/land separation, exact time replay, rendered color controls, finite zoom output, pigment reprojection, source-view controls, camera motion and GLB reload. Encoded movies are fully decoded and sampled for visual inspection. These checks support structural and rendering behavior; they do not certify exact historical fidelity, all possible viewpoints or subjective full-speed smoothness.

## Provenance

The supplied screenshot is preserved unchanged at `reference/source.png`; its SHA-256 is recorded in `reference/analysis.json`. No historical attribution is inferred. The geometry and shaders were developed from the earlier local ink-valley technique, with a new terrain, bridge, settlements, palette and camera route. Three.js 0.186.0 is included under its MIT license at `vendor/THREE-LICENSE`.
