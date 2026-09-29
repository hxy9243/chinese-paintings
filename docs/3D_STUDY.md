# Limited-angle spatial study

The home page opens this 3D study directly. Older `?view=3d` links still work. The 2D painting editor has been removed; existing browser save data is left untouched. The original painting crop remains available for reference.

## Camera contract

- Orthographic projection, initially 35 degrees above the ground.
- Turn (Y), tilt (X), and view-axis roll (Z) each allow ±30 degrees. Left-drag turns and tilts; all three axes also have keyboard-accessible sliders.
- Right-drag pans; wheel or two-finger pinch zooms. Reset and destination buttons restore all three axes.
- The elevation range stays above the ground (5–65 degrees). Roll is applied after the orbit controller updates so it does not drift or change the pan target.

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

## Riverbank alignment and scale correction

`passageLayout.ts` now supplies the riverbank outlines and architecture in one reference-crop coordinate system. Each hall follows the local shoreline tangent, faces toward the river, and is set back using its entire roof footprint, including eaves. Rear warehouses leave a lane behind the waterfront shops. All sixteen roofs sit on land without intersecting neighboring roofs.

The bridge runs between explicit near- and far-bank landings, with its full width seated on dry land. Its 9.58-unit span, 2.05-unit deck, and 1.55-unit rise replace the short disconnected span. Transverse planks sit on five longitudinal timber ribs, with cross-bearers, low rails, and bank-side bearing sills. Walking figures use the same transformed bridge curve as the structure. There are no support piers in the navigable channel. This remains an artistic timber-arch interpretation, not a structural engineering or historical reconstruction claim.

Scale is anchored to roughly 0.36-unit people: lower roof pitches, smaller stalls and parasols, broad foreground buildings, and 3.5–7.2-unit boats. All five hulls remain within the river; tree roots, market stalls, and bank pedestrians follow the shoreline. In the editable 2D game, trees and boats have larger silhouettes and market furnishings are smaller relative to dwellings. Existing saved object positions and collision footprints remain compatible. New games start with five editable houses/shops distributed across both banks; stored compositions are not repopulated.

Regression tests check the complete roof footprints and separation, both bridge landing widths, hull clearance, relative scale, starter-save validity, and saved-scene preservation.

## Architecture, planting, and river life

The sixteen bank-aligned plots now use five architectural forms: lattice-window dwellings, long-ridge warehouses with boarded doors, open shop bays with cloth valances, three-wing courtyard compounds, and larger gallery halls with a secondary eave and timber balustrade. The validated outer roof envelopes are retained. These forms interpret the selected passage rather than claim exact building identities.

Sparse spring trees, drooping willows, additional bare trees, low reeds, and irregular river stones complement the existing bare-tree groves. New planting avoids roof footprints and the bridge approaches, preserving open water and the subdued brown/olive palette.

Thirty-six moving figures replace the previous eight: twelve cross the bridge and twenty-four follow both banks. Articulated legs, small body movement, varied stride phases, and brief endpoint pauses complement the existing posed crowd. Five separately batched boat groups drift, bob, and rock on bounded routes. A single reusable line buffer animates 120 short ink ripples across the channel. Boat motion is intentionally small so the composition and navigable clearances remain stable.

**Pause life / Resume life** freezes all scene motion together. Reduced-motion preference starts paused; hidden tabs do not advance animation time. Tests sample full walking and boat-motion cycles, check planting and ripple clearance, and exercise the actual scene's moving geometry, local boat transforms, stable buffers, pause behavior, and draw-object budget. Browser and physical-device performance have not been measured for this update.

## Reference refinement — 2026-09-28

Compared against the supplied bridge crop again: the deck's former 1.55-unit rise and thin understructure understated the rainbow silhouette. The rise is now 2.05 units, with three overlapping timber courses, paired outer arch bands, diagonal connections, and projecting transverse ties. The same bridgeHeight function drives decking and pedestrians; bank anchors and pier-free navigation remain unchanged. This is a visual approximation, not a structural reconstruction of the historical woven-timber joints.

Shop and warehouse roofs now have full-length ridges and closed gable ends. Dwellings retain shorter hipped ridges; courtyard wings and balconied halls remain distinct. All roof planes use shallow concavity, with tile courses following that profile, eave fascias and exposed rafters. Shops gain hanging boards and counter wares; galleries gain corner posts and lanterns. New façade details remain inside the existing roof envelopes.

The fixed camera is lowered from about 31.9° to 28° above the ground. Azimuth, ±12° rotation limits, warm ink materials, shoreline layout, and the source comparison remain unchanged. Production build and all 22 geometry/model/animation tests pass; no browser or physical-device QA was performed for this revision.

## Architecture and tree variety — 2026-09-28

The sixteen existing footprints now contain eight building styles: dwelling, warehouse, shop, courtyard, gallery, rough-roofed shed, open trading hall, and L-shaped compound. Open halls have visible space between timber posts, benches, and rear screens. Sheds use pale fibrous roofs, irregular straw fringes and vertical plank fronts. Compounds combine unequal wings, low yard walls, recessed gates and storage jars. These are reference-informed variations rather than identifications of individual historical buildings.

Ten formerly identical feature trees now use broad old crowns, knotted pollarded crowns, and narrow upright saplings with varied size, lean and orientation. The river-bend tree receives the broadest crown. Bare shoreline planting also varies between sapling and pollard forms; existing spring foliage and drooping willow forms remain. Exposed roots and broken bark lines distinguish older trunks. The bridge and camera are unchanged. Build and all 22 automated tests pass; browser and physical-device visual review was not performed for this revision.

## Rounded passage and freer camera — 2026-09-29

The banks and water share a rounded perimeter with six-unit corner arcs. The bridge now crosses nearly perpendicular to the far bank, and the near shoreline is smoother around its inland landing. Foreground buildings form a compact row with aligned roof axes and small clear gaps. Six horse-drawn carts include visible harnesses, shafts, spoked wheels, drivers, and alternate cloth covers or cargo. Taller existing trees and added shoreline/rear groves retain clear roof footprints.

Seven boat groups travel slowly in both directions. Two begin beyond the side edges and enter shortly after the scene opens. Hull-length shoreline sampling keeps their routes inside the narrow bends; global side clipping allows partial hulls to enter the frame. Recycling happens only after the complete hull leaves view. Ripple motion, Pause life, reduced-motion startup, and hidden-tab pausing share the same scene clock.

Three labeled rotation sliders expose ±30° turning, tilting, and rolling. The default elevation is 35° so the full tilt range stays above ground. The interpretation remains a modeled study of the supplied passage.

Validation: production build and 25 geometry/model/animation tests pass. Six desktop/mobile Chromium checks cover presets, all three axes, pan/zoom/reset, rendering styles, language, reference access, saved-painting preservation, and page overflow. The final framing gives tall crowns more space; a focused desktop rendering check verifies that adjustment. Physical-device performance remains unmeasured.


## Moving horses and shared clearance — 2026-09-29

Six horse carts now move along reserved routes, turn in clear spaces, and continue back along their routes. Horse legs, heads, and spoked wheels remain articulated after the rest of each cart is batched. Wheel rotation follows travel distance. All motion uses the existing scene clock, so Pause life, reduced-motion startup, and hidden-tab pausing also cover the carts.

`passageSpace.ts` defines shared clearance around roof envelopes, bridge approaches, footpaths, trees, stalls, and posed figures. Route selection reserves the full swept cart footprint, including room to turn. Placement checks use trunk/root footprints for tall trees whose branches are above traffic, and full hanging-crown footprints for low willows. The resulting layout keeps eight market stalls and thirty grove trees, with displaced props repositioned into clear areas.

Pedestrians follow spaced loops with separate passing lanes. Bank loops stop short of the bridge approaches; bridge walkers have their own two lanes, clear of the stationary observers. Some front-row buildings move inland to create usable footpaths. Boats share a spaced convoy at a common speed and alternate direction only after all vessels leave the frame. This prevents overtaking and opposing traffic in the narrow channel. Oars stay within the vessel clearance envelope and cabin masts are lowered to clear the timber arch.

This is collision-free authored traffic for the fixed scene, using conservative footprints and reserved routes rather than a general rigid-body physics simulation. Tests sample twenty minutes of land traffic and more than twenty-three minutes of river traffic; check static spacing, bank and arch clearance, articulated cart bounds, pause behavior, and geometry reuse. The production build and all thirty unit tests pass. Desktop and mobile Chromium checks cover the rendered scene and its controls.


## Individual motion, one-way carts, and browsing — 2026-09-29

Every figure now belongs to an animated role: walkers, residents, bridge observers, shoppers, boat crews, or cart drivers. Independent seeded schedules let walkers and residents pause and resume. Standing figures breathe, shift their posture, and turn slightly. Eighteen stands have reserved browsing spaces where shoppers linger and face the wares; those spaces are placed before trees and other residents. Local wandering stays inside validated clearance discs. All activity still follows the shared pause/reduced-motion clock.

Six horse carts travel continuously in one direction along a reserved road behind the near-bank roof row. They clip at the rounded ground boundary and recycle only fully offstage, with no U-turns. Seven boats use simultaneous opposing lanes with separation based on their complete hull and oar envelopes. The left river entrance is slightly wider, and the largest cabin vessel is narrower, to make passing possible without clipping banks or the arch.

Articulated people share instanced mesh and ink geometry, so the larger animated crowd does not add a separate set of draw calls per person. Deterministic tests check multiple activity schedules, motion of all six roles, complete pause behavior, offstage recycling, and land/river separation over extended simulated time. The scene remains authored traffic for this fixed landscape rather than a general physics simulation.


## Far-bank moored boats — 2026-09-29

Four smaller vessels now remain beside the far-bank buildings in two clusters, following the supplied crop. Their berths follow the shore tangent and reserve the full hull/oar footprint. Mooring posts stay fixed, lines follow gentle bobbing, and two softly animated crew members occupy each boat. They share Pause life and reduced-motion behavior with the rest of the scene. The seven passing boats retain their opposing routes. Tests verify shore, bridge, berth, and passing-traffic clearance over twenty simulated minutes, plus rendered bobbing and pause behavior.
