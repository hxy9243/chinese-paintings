# Street life, roof colors, and painted water

## Historical palette

The ordinary houses and shops in this passage now use varied charcoal, warm gray,
and slightly green-gray tiles in both palettes. The former saturated indigo roof
mapping has been removed. The stored `indigo-amber` preference remains compatible;
its visible label is now **River & ochre / 碧水赭彩**.

Shanghai's Landscaping and City Appearance Administrative Bureau describes most
roofs in *Qingming Shanghe Tu*—including urban homes and shops—as blue-gray small
flat tiles, and explains that these are ordinary unglazed earthenware. Its account
distinguishes them from thatch and more privileged buildings. This supports a
muted tile palette for this market scene; it does not establish an exact digital
color or imply that colored glazed tiles never existed in Northern Song Bianliang.

- [园林瓦事, 2020-10-13](https://lhsr.sh.gov.cn/jnylwh/20201013/438fa5d6a412424aa6776554d069db98.html)
- [Palace Museum: Zhang Zeduan's original Northern Song scroll](https://www.dpm.org.cn/collection/paint/228226.html)

The original is light color on silk. Its present aged appearance is a reference,
not a reliable measurement of freshly fired Song tiles. The National Palace
Museum's colorful **1736 Qing court version** includes later customs and styles;
it should not be used as direct evidence of Northern Song roof colors.

- [National Palace Museum: Qing court version](https://theme.npm.edu.tw/selection/Article.aspx?sNo=04000988)

## Crowd behavior

- 132 walkers share the entire main street, including both approaches and the
  bridge, rather than circling only on the span. Another 48 use the waterfront
  paths. Standing bridge figures decrease from 64 to 32.
- Each walker has a seeded speed and pause schedule. Main-street walkers may
  reverse after a pause, turn gradually, and move sideways to pass. Different
  speeds, stops, and local yielding break the former uniform procession.
- Main-street actors recycle at local ±24, beyond the rounded terrain and viewing
  window. They never teleport across the visible bridge or street.
- A fixed 0.2-second simulation step and interpolation make motion independent
  of rendering cadence. Backward seeks rebuild from the seed; repeated absolute
  timestamps freeze the scene, including water and wake buffers.
- The two footways keep carts clear. Waterfront paths remain inside the reserved
  dry corridors; stalls, trunks, roofs, and browsing spaces keep their clearances.
- Walking density is measured per unit route length on the bridge and the two
  approaches. Standing market clusters vary locally, as they should in a market.

This is a constrained crowd simulation, not free navigation through every yard.
Waterfront walkers use the bank routes and pause independently; direction changes
belong to the full main street. At very busy moments, walkers can queue to pass.

## Rendering approach

Curtis et al.'s *Computer-Generated Watercolor* (SIGGRAPH 1997) identifies layered
glazing, edge accumulation, granulation, and dry-brush marks as useful watercolor
effects. This scene uses lightweight artistic approximations of those effects,
rather than running their fluid/pigment simulation or full Kubelka–Munk solver.

[Author-hosted paper, University of Washington](https://grail.cs.washington.edu/projects/watercolor/paper_small.pdf)

| Technique | Implementation here |
| --- | --- |
| Layered color | Two multiplicative transmission glazes over the substrate, with independent broad and fine variation. |
| Pigment deposits | Local wash boundaries darken slightly; fine sediment and dry gaps break flat surfaces. |
| Stable marks | Pigment and dry-ink coordinates attach to geometry, including articulated crowd parts and moving boats. |
| Soft ink | A modest-resolution finish spreads nearby color while reducing mixing across high-contrast details. |
| Moving water | Broad color washes drift downstream at different speeds, with sparse broken ripple highlights. |
| Stern wakes | Two fading ribbons sample each moving boat's previous positions over 22 seconds. They stay inside the channel and disappear at recycle discontinuities. Moored boats produce no propulsion wake. |
| Market color | Six shared cloth pigments vary canopies, fringes, and folded fabric without cloning a material per stall. |
| Spring greens | Several leaf glazes and varied small leaf forms add freshness while retaining the passage's bare branching silhouettes. |

The finish intentionally retains readable architecture and figures. Full reflected
scene rendering, fluid simulation, and authored paint textures remain possible
future work. The added wake is one batched draw, with fixed buffers updated in
place; the water uses the existing surface shader rather than another framebuffer.

## Validation

Unit coverage includes actual walker stops/reversals, off-frame recycling,
collision sweeps, roof/prop/cart clearance, repeatable seeking, matched walking
density, and wake positions/fading/buffer reuse. Browser coverage exercises both
palettes, persistence, bounded camera controls, plain-model comparison, pause,
reference navigation, and desktop/mobile layout.

See the linked review record in `docs/reviews/2026-10-20-street-watercolor/` for
the final commands, screenshots, and motion sample. Software-rendered captures
are visual evidence, not a hardware frame-rate claim.
