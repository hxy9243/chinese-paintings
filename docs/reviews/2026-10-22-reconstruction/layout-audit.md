# Reference layout recovery

The reference is the University of Chicago handscroll, using the three supplied image crops in `artworks/qingming/public/reference`. These crops are at different zoom levels; using them at 1:1 scale caused the earlier displaced crossroads and bridge.

## Image registration

| Source | Scale in composite | Composite translation |
| --- | ---: | --- |
| Crossroads | 1 | (0, 0) |
| River bend | 1.168 | (558, -10) |
| Rainbow bridge | 1.301152 | (1395.456, -0.656) |

The intermediate bridge-to-bend transform is `1.114 × bridge + (717, 8)`. `reference-composite.jpg` is a 4060 × 713-pixel non-generative alignment of those sources.

## Ground-to-image mapping

At the reference view (yaw 0°, polar angle 55°), use 47 pixels per world unit and image origin `(2367, 300)`. Along-scroll coordinate is `s = (px - 2367) / 47`. Ground depth is `d = (py - 300 + 0.819152 × 0.42 × 47) / (0.573576 × 47)`. Height moves image points upward by `0.819152 × 47` pixels per unit.

These measurements are ground/frontage anchors. A house center lies half its depth behind the frontage; putting the center directly on that line displaces the roof and street.

| Landmark | Along s | Depth d | Meaning |
| --- | ---: | ---: | --- |
| Crossroads | -37.60 | 5.42 | Crossing center |
| Western open shop | -42.06 | 3.94 | Frontage ground line |
| River-bend open hall | -28.23 | 6.16 | Frontage ground line |
| Two-storey balcony | -16.12 | 12.28 | Frontage ground line |
| Scaffolded structure | -6.56 | 11.85 | Footprint center |
| Bridge near landing | 7.01 | 4.89 | Landing center |
| Bridge far landing | 20.30 | -4.28 | Landing center |
| Eastern old tree | 26.11 | 10.85 | Root center; adjusted 0.65 inland for basal geometry |

## Geometry and circulation

The bridge follows the observed diagonal rather than a perpendicular-to-bank shortcut. It is 3.4 units wide and rises 5.4 units. A two-unit circular tangent transition connects each landing to its street; the arch itself remains on one straight axis.

Thirty-five buildings retain rectangular footprints. Joined roofs are built over rectangular wings. Four shallow shop galleries attach deliberately to their parent buildings (`5→0`, `6→1`, `13→3`, `14→4`). Other wall rectangles do not overlap; separate eaves may meet within a 0.15-unit overlap. The crossroads routes pass around roof groups and hold 42 individually positioned residents.

The reconstructed secondary house centers are modeled interpretations of partly occluded footprints. The measured main frontages, bridge ends and scaffold relationship anchor the composition. Their geometry is checked against shared bank curves and clear passage widths rather than forced to a uniform house grid.

Terrain support spans `s [-61,41], d [-30,30]`, extending beneath the complete paper fade. The near/far shores remain open at the crop edges, rather than closing into an island.

## Validation

Independent diagnostics found no roof samples over water (0.24-unit shore margin), no unrelated wall intersections, no excess eave overlap, no bridge-landing bank failures, and no crossroads path or resident roof collisions. `passageLayout.test.ts` preserves those requirements and explicitly validates the four gallery exceptions. `crossroads.test.ts` checks both paths and all 42 residents.
