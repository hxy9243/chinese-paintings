# Foundations, bank height and Song clothing

Reference check, 20 October 2026. This is a restrained scene interpretation, not a measured historical reconstruction.

## Bridge and bank

The bundled original `public/reference/rainbow-bridge.jpg` shows the timber arch bearing at masonry-like bank ends, distinct from its layered timber ribs. The Palace Museum identifies Rainbow Bridge as a timber bridge: https://www.dpm.org.cn/collection/paint/228226.html . The pale grey brick color is the requested interpretation of the abutments; an aged silk image cannot establish their original pigment exactly. The timber arch remains timber, with no midstream masonry pier.

Occupied ground is now 0.42 scene units above the origin; mean water remains -0.045. A nominal adult is 0.85 units / approximately 1.7 metres, making the exposed bank roughly 0.93 metres (three feet). Houses, stands, trees, people, carts and bridge landings share the raised datum. Boat height and water motion retain their original datum; mooring posts and shore rope ends rise with the ground. Uneven earth faces and broken stone patches connect dry ground to below the waterline.

## Quick clothing research

| Evidence | Modeling decision |
| --- | --- |
| National Museum, Northern Song carved brick **Woman arranging her hair**: narrow-sleeved front-opening jacket, visible inner chest garment, long skirt. https://www.chnmuseum.cn/zp/zpml/csp/202008/t20200825_247298.shtml | Distinguish open-front women's outerwear and pale inner layers from men's crossed collars. Retain a long pleated skirt and bun. |
| Henan Museum, Song painted stone female figures: layered shirt/outer robe, pleated skirt and coiffure. https://www.chnmus.net/sitesources/hnsbwy/page_pc/dzjp/mzyp/articlefff41ea9c0a040e5952a76856d08a9d2.html | A separate, genuinely open outer-coat mesh with two visible front edges. This is one Song clothing variant, not a uniform worn by every woman. |
| Palace Museum study discusses long and short *beizi*, side openings, different hairstyles and clothing linked to occupation. https://www.dpm.org.cn/forum_detail/99722.html | Keep garment lengths and headwear varied. The current knee-length open coat is an interpretation; exact period, length and hairstyle varied. |
| National Museum costume exhibition discusses Tang/Song *futou*, round-neck robes and belts as antecedents of later dress. https://www.chnmuseum.cn/portals/0/web/zt/202102gdfsh/ | Round collars for formal robes; crossed collars and shorter tunics for other roles. The scholar now wears a soft cap; projecting hat wings remain restricted to the formal attendant variant. |
| Direct inspection of the bundled original bridge crop | Workers retain short tunics, visible trousers, headwraps or practical hats, and role-specific loads. These shapes come from the painting, not from modern fantasy costume. |

Colors are artistic interpretations in the existing palette, rather than claims about the precise dyes of individual people. The scene remains stylized ink-and-wash geometry.

## Detail budgets

Figures now select their own geometry budget by projected pixel height: coarse below 32 pixels, medium between that and 90, close detail at 90+. Hysteresis retains coarse up to 36 and close down to 72 to avoid rapid switching. This works for both perspective distance and orthographic zoom; it does not lower the resolution of the entire painting. Near figures have smoother heads and garment surfaces, shaped noses, eyelid/brow/ear relief, layered collars and fingers. Small silhouettes omit those details. All budgets preserve the same skeletal joints and route clearance.

See the associated [review and stills](../../../docs/reviews/2026-10-20-foundations-clothing/README.md).
