# Rainbow Bridge art direction and provenance

## Source crop

The reference is the complete **3600 × 1800, 2:1** Rainbow Bridge detail of Zhang Zeduan’s Northern Song original, downloaded without additional cropping:

https://commons.wikimedia.org/wiki/File:Along_the_River_During_the_Qingming_Festival_(detail_of_original).jpg

The Commons record identifies the Palace Museum original and marks this reproduction as public domain / PD-Art. Its current revision notes a brightness and contrast adjustment. The local reproduction is `public/reference/rainbow-bridge.jpg`. Artwork attribution remains available in the in-app original-view dialog.

Museum catalog: https://www.dpm.org.cn/collection/paint/228226.html

This is not the later Qing court scroll. The selected passage includes the entire timber bridge, crowded approaches, foreground tile-roof buildings, cloth shelters, sparse trees and river vessels.

## Interpretation

The generated landscape deliberately removes crowds and buildings to provide editable space. It keeps the 2:1 framing and diagonal timber arch motif, but changes bank geometry, proportions, density and some structural details. It must be presented as a simplified interpretation. It is not a conservation reconstruction or a measured historical model.

The generated art proof was inspected before expanding the object set. It demonstrated the intended ink line, muted palette and scale relationship. Final historical fidelity still benefits from an art historian/illustrator review.

## Catalog

The runtime collection shows every object and its source-detail note. Full anchor/footprint/scale metadata lives in `src/model.ts`.

| ID | Reference cue | Variation pair |
| --- | --- | --- |
| shop | Open-front timber shops along the approaches | house |
| house | Low tiled roofs and timber dwellings in the foreground | shop |
| bare-tree | Sparse, twisting bank-side branches | leaf-tree |
| leaf-tree | Lightly leafed interpretation of the same tree form | bare-tree |
| skiff | Open low-sided wooden hull | cargo |
| cargo | Working boats with woven arched covers | skiff |
| table | Roadside goods, baskets and vendor furniture | canopy |
| canopy | Cloth-roof roadside shelters | table |

All are single-facing authored interpretations. Leaf density and shop details are variations, not botanically or archaeologically identified species or structures. The tree sprites use off-center ground anchors matching their trunks. Objects have a fixed scale, and only ground footprints collide.

## Asset pipeline

Generated using the built-in image-generation tool, with the original crop and subsequent art proof as references. Final sources are stored in `art-sources/`; optimized WebP runtime files are in `public/art/`.

Most requests for transparent sprites returned an opaque checkerboard. A second transparency edit still returned an opaque checkerboard, so those drafts were rejected. The successful cleanup used the image-generation tool to replace the checkerboard with pure white. Runtime **multiply compositing** treats white as unpainted silk and blends the ink into the landscape; the shop retains the alpha channel supplied by the generator. HTML catalog thumbnails use the same multiply treatment. This is an explicit compositing compromise rather than a claim that every delivered file has alpha. Overlapping objects are therefore ink-composited rather than perfectly opaque cutouts. True-alpha replacements can be substituted later without changing scene documents.

A masked copy of the fixed painting supplies the bridge’s foreground railing. The bridge route follows the visible deck; people are rendered between background and railing. The static landscape remains unmodified by the player.

The three small character appearances are drawn with PixiJS graphics, matching the subdued ink palette; they are not generated walk-cycle sprite sheets.

## Full-scroll comparison source

The expanded scene includes a separately labeled 2D reproduction for direct comparison:
https://commons.wikimedia.org/wiki/File:Alongtheriver_QingMing.jpg

This record identifies Zhang Zeduan's Northern Song original in the Palace Museum and a public-domain faithful reproduction. Downloaded from `https://upload.wikimedia.org/wikipedia/commons/8/86/Alongtheriver_QingMing.jpg` (38,414 × 1,800). The bundled `public/reference/original-scroll.webp` preserves the full image and proportions, reduced to 16,000 px wide and WebP quality 85 for browser delivery. It loads only when the comparison dialog opens. No painted content was invented or retouched in this reproduction.

The 3D districts are interpretive, modular scenery guided by the broad progression from country roads and river transport to the bridge, gate, and city streets. They are not measured placements or traced models of the full original. The 2D reproduction retains the painting's local perspective choices; the 3D interpretation cannot claim exact likeness.

## Selected passage reference, September 20

`public/reference/selected-passage.webp` is a WebP packaging copy (quality 92, unchanged dimensions/composition) of the user-provided `/home/kevin/Pictures/Screenshots/Screenshot from 2026-09-20 00-49-26.png`. This selected crop supersedes the full-scroll expansion as the active scene brief. Original work attribution remains Zhang Zeduan, Palace Museum; the supplied screenshot's yellow-brown rendering is the current palette guide. The original full-scroll reference remains archived but is no longer the comparison dialog's image.
