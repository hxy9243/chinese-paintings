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
