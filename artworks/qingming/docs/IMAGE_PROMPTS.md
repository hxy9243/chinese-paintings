# Built-in image-generation prompt set

Tool: built-in `image_gen.imagegen`, not the API/CLI fallback. Generated sources are in `art-sources/`; production copies are in `public/art/`. See ART_DIRECTION.md for source attribution and the transparency limitation.

## Art proof

Reference: `public/reference/rainbow-bridge.jpg`.

> Use case: historical-scene. Create an art proof for a 2.5D scene-building game inspired closely by the provided Zhang Zeduan Rainbow Bridge detail. Landscape 2:1 image, 1600x800 composition. Fine irregular brown-black ink lines and pale muted mineral washes on warm light silk. NOT cartoon, NOT glossy 3D, NOT photoreal. Simplify the crowded reference to a serene spacious editable diorama while preserving the characteristic woven-timber arched Rainbow Bridge, diagonal orientation, roof construction and sparse branched trees. Composition: river crosses horizontally through the middle, far bank occupies top 28 percent, near bank bottom 30 percent. A wooden arched Rainbow Bridge diagonally spans from near-bank point at about 52% width 72% height toward far-bank point at 73% width 27% height, with highest arc at 64% width 30% height. Thin brown timber balustrades, no stone bridge, no pagodas. Winding walking lane from bottom left to bridge entrance and from far end to upper right. Put ONE modest Song open-front tiled roof shop on lower left bank, ONE pale cloth canopy vendor stand beside it, ONE sparse branching tree upper left, ONE roofed wooden cargo boat on left river, and three tiny ink-robed people on bridge. Open land remains mostly empty for building. No text, labels, UI, seals or border. View is handscroll oblique aerial view, graceful delicate detailed brushwork, harmonious parchment palette.

## Empty landscape

Reference / edit target: art proof.

> Edit this game art proof into the empty fixed background layer. Preserve EXACT image dimensions, framing, perspective, bridge position and shape, bridge detailed timber construction and railings, riverbanks, river ripples, low bank fences and delicate ink-on-silk style. REMOVE all people including the three on bridge, remove the cargo boat and its wake, remove the entire shop and canopy stall in lower left, remove the large trees in upper left and lower left. Fill removed objects with matching empty silk-toned ground or river ripples as appropriate. Keep only bridge, river, low banks, small grasses and existing tiny shrubs, footpaths and low fences. No buildings, boats, people or tall trees anywhere. The newly empty ground must feel naturally painted, not blurred. No other changes.

## Eight object studies

Each object was generated individually, with the art proof as a style reference. Shared prompt:

> Create a single isolated game asset: [SUBJECT]. Use input as STYLE reference. Fine irregular dark brown ink linework, delicate muted tan and grey washes like Northern Song handscroll painting, silk-hued object surfaces but TRANSPARENT background with real alpha. Oblique aerial view same angle as objects in reference, front and right side visible, horizontal broad composition for boat. Whole object centered with 5 percent transparent padding; object fills most of canvas. No background, paper rectangle, ground scenery, water, drop shadow, text, labels or border. Not 3D, not cartoon, not saturated. Preserve intricate brushwork at small scale. Deliver ONE object only, PNG transparent.

Subjects:

- **shop:** one modest open-front Song dynasty riverside shop, exposed wooden posts, low gray-brown tiled gable roof, small counter and baskets. NO people.
- **house:** one small Song dynasty timber dwelling with low gray-brown tiled gabled roof and plaster walls, similar scale to shop. NO people.
- **bare-tree:** one sparse branching riverbank tree with twisting trunk and fine detailed bare branches, a few subtle tiny leaves. No ground scenery.
- **leaf-tree:** one sparse branching riverbank tree with restrained pale olive small leaves, airy irregular foliage, fine ink branches. No ground scenery.
- **skiff:** one low open wooden Song dynasty river skiff, shallow hull, one oar laid inside, no sail, no people.
- **cargo:** one Song dynasty covered cargo boat with long low wooden hull, woven barrel-shaped bamboo canopy over middle, ropes and baskets, no mast or sail, no people.
- **table:** one simple Song dynasty roadside vendor table displaying pottery bowls, rolled textiles and two wicker baskets on the ground, no awning, no people.
- **canopy:** one simple Song dynasty market stall with pale cloth canopy stretched over four wooden poles, low goods table and baskets, no people.

## Final cleanup for seven opaque outputs

Each opaque asset was edited individually using its generated source as the target. The shop's original alpha output was retained.

> Change ONLY the background. Replace ALL gray checkerboard squares with a perfectly flat, pure white #FFFFFF background, including all gaps within branches, under roofs, and between supports. Preserve the exact ink drawing object, shape, framing and colors. Absolutely NO checkerboard pattern, NO gray squares, NO texture in white background, NO shadow, NO gradient, NO glow. This is an ink illustration on perfectly plain pure white. Do not attempt a transparent background. Pure white background is required.

White backgrounds are composited with multiply blending in the game and catalog; they are not represented as alpha-transparent source files. Rejected checkerboard drafts are excluded from Git and production.
