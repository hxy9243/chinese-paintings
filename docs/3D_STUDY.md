# Limited-angle spatial study

Open `?view=3d` from the editor's **3D study** link. This is a separate, read-only composition, not a conversion of a player's saved painting.

## Camera contract

- Orthographic projection with fixed elevation (about 32 degrees above the ground).
- Authored central view, plus two comparison presets at minus/plus 12 degrees azimuth.
- Free orbit and vertical rotation disabled. Drag pans; wheel or two-finger pinch zooms. Reset restores the authored view.
- Camera orientation does not change when panning or zooming. This is the production asset visibility envelope: review each asset at all three angles before polishing it.

## Production implications

Use shallow real geometry for bridge, roof ridges, visible walls, trunks, hulls, and stall frames. Paint details into shared textures on the visible surfaces. Hidden façades can remain plain; interiors and undersides need no authored detail within this camera range. Keep collision footprints separate from mesh silhouettes. Billboards remain appropriate for small people and foliage if their turning is constrained.

A completely fixed single view would save more work and could use pre-rendered sprites. The narrow three-view study offers modest depth while retaining a small asset production scope. It does not promise a quantified cost reduction.

## Mock scope and limits

Procedural Three.js geometry, thin ink-colored edges, muted materials, bridge pedestrians, pan/zoom, three view presets, Chinese/English controls, responsive layout, WebGL failure fallback. Static geometry is batched by material; pixel ratio is capped at 2 and animation at roughly 30 fps. Three.js is loaded only for this separate view.

This is a modeling and camera proof, not finished painting art or an historically precise bridge reconstruction. Final ink texture work, reference review, asset editing in 3D, and physical-device performance testing are not included. No existing save data is read or written.

## Checks

Production TypeScript/build and model tests. Browser tests cover entry from editor, all camera presets, zoom/reset, pan without angle change, Chinese controls, phone-width overflow, and unchanged local save storage. Desktop and mobile Chromium profiles are used; these are not physical iOS/Android tests.

## Painting renderer MVP

The default rendering now uses world-space procedural pigment: broad wash variation, fine grain, restrained shading, and muted sepia/green colors. Because variation is attached to world coordinates, it does not slide across surfaces when the camera turns. A paper-grain overlay is decorative and does not intercept touch input.

The board base has been replaced by softly fading ground planes and irregular riverbanks. Foliage uses layered scalloped shapes and individual leaf marks rather than faceted spheres. Curved boat-canopy ink strokes now survive static geometry batching.

A continuous accessible slider turns the camera within the same ±12-degree envelope; presets and reset remain available. “Ink & wash” / “Plain model” compares the pigment treatment on the same geometry. Hidden tabs stop rendering frames. This is procedural painting treatment, not a hand-painted texture set or a claim of fidelity to the original scroll. Physical-device performance and historical detail review remain pending.

## Weathered ink refinement

Compared directly against the repository's original Rainbow Bridge crop: shift roof/foliage/river colors toward restrained warm browns, deepen the linework, break pen strokes with deterministic pigment gaps, subdivide outlines into slightly wavering segments, and add dry-brush gaps and pigment pooling to surface washes.

An optional single offscreen finish pass spreads a small amount of nearby ink and adds fine silk fibers. Its resolution is capped at 1.5 times CSS pixels to limit phone cost. The bilingual **Ink softness** slider controls this pass (0–100%, default 70%); Plain model bypasses it, and 0% renders the painted geometry directly. The pass and its render target are disposed on unmount. Camera limits, editing saves, and the fixed composition are unchanged. Physical-device performance remains unverified.

These effects bring the material closer to aged ink on silk. They do not replace the fine, reference-specific architectural drawing needed for a faithful recreation.

## Reference composition and direct rotation

The authored center camera now looks from azimuth −50 degrees at the existing fixed elevation. This puts the near bridge approach toward the lower left and the far approach toward the upper right, following the direction in `public/reference/rainbow-bridge.jpg`. The original uses locally varying painted perspectives, so this is a compositional approximation, not an exact single-camera reconstruction.

The scene contains seven shops/houses with additional timber framing and tile rows, seven trees with finer bare twigs, six stalls, three ribbed parasols, two boats, 26 posed people, and eight moving people. Static crowds are batched with the scenery. Four pedestrians cross the bridge and four walk the bank lanes; their routes reverse instead of teleporting at the ends.

Left-drag / one-finger drag rotates within ±12 degrees of the authored view. Elevation is fixed. Right-drag pans, wheel zooms, and two fingers pan/zoom. The rotation range slider was removed; the three view buttons remain for keyboard use. Ink softness remains adjustable.

## Expanded handscroll

The scene now spans 124 world units along the authored camera's horizontal axis (the previous bridge patch projected to about 20 units): approximately six times the prior visible length. `scrollLayout.ts` defines this basis and five destination points. The bridge remains at the center; six added districts extend city streets and a gate to the left, wharves and countryside to the right. This establishes a larger exploration MVP, not a historically exact reconstruction.

District geometry is batched separately to permit offscreen culling. Ground fade bounds now cover the long composition. A longer camera distance and far plane prevent the ends clipping while turning. Zoom limits accommodate a whole-scene overview. Destination buttons restore an authored close view without shrinking all details to phone size. Mouse rotation and ±12 degree limits remain; no rotation range slider is reintroduced.

“Original scroll” opens a native modal with a faithful 2D reproduction, horizontal browsing, attribution, keyboard-close support, and touch scrolling. It is explicitly labeled as 2D and is not represented as a 3D render. Exact reproduction remains a future asset/layout task requiring source-specific modeling and camera projection work.

## Current scene: supplied bridge-and-riverbank crop (supersedes the sixfold study)

The long modular street extension has been removed from the rendered scene. The current scene is a compact authored passage based on the user's `Screenshot from 2026-09-20 00-49-26.png`: bridge left of center, far-bank roof clusters, large foreground roof masses, an open river bend to the right, and a bare-tree peninsula. The ±12° mouse rotation and ink finish remain.

Sixteen individually sized waterfront halls replace repeated cottages. New hipped roofs have short ridges, triangular ends, tiled planes, and timber-framed façades. Five working boats include larger cabin vessels and lower covered hulls. Figures are scaled to 65% of the previous height (about 0.35 world units); main hulls range from 3.5 to 7.2 units and the broadest roof footprint is 5.9 × 4.2 units. These are pictorial scale choices, not claimed historical measurements. There are 72 posed figures (including ten boat crew) and eight moving figures, ten bare trees, eight stalls, and four parasols.

The central camera preserves the near-left/far-right bridge orientation; local positions follow a horizontal/depth authoring basis. Whole-passage, bridge-approach, far-bank, and river-bend views replace city-district navigation. The comparison dialog now displays the exact user-supplied crop. The reference is a drawing guide, not a texture pasted over the model. The result remains an interpretive 3D study requiring further reference-specific refinement.
