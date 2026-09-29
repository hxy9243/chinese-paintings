# 清明小景 · The Living Handscroll

A small, bilingual 2.5D scene-building toy inspired by the Rainbow Bridge passage in Zhang Zeduan’s **Along the River During the Qingming Festival**.

## Run

Node.js 22.12+ (Node 24 recommended).

```sh
npm ci
npm run dev
```

Open the local address printed by Vite. To try it on a phone on the same network, use the network address. Production sharing requires HTTPS; image download remains available when native sharing is unsupported.

```sh
npm test
npx playwright install chromium
npm run test:e2e
npm run build
npm run preview
```

Deploy the generated `dist/` directory on a static HTTPS host. Vite uses relative asset URLs so deployment beneath a subdirectory is supported. No backend, credentials, or accounts are needed. The private Sites hosting project is recorded in `.openai/hosting.json`. Public access remains disabled.

## Play

New games begin with five editable houses and shops on the two riverbanks. Existing saved compositions, including empty ones, are preserved. Choose one of eight objects, tap a valid spot, and confirm. Tap an existing object to move it, switch its variation, or remove it. Buildings and stands attract a small population that follows the banks and crosses the bridge. Use the three-part guide or choose Free play.

- Drag the background to pan; pinch or scroll to zoom.
- Undo/redo also support Ctrl/Cmd+Z and Shift+Ctrl/Cmd+Z.
- Pause freezes inhabitants; reduced-motion preference starts paused.
- Reference composition temporarily displays a separate authored arrangement.
- The original opens the sourced painting detail for comparison.
- The 3D study includes varied courtyard/shop/warehouse architecture, shoreline planting, 36 walkers, drifting boats, and animated river ripples. Pause life freezes the motion; reduced-motion preference starts paused.
- Share exports a 1080 × 1920 keepsake, with optional closer framing.
- Local saves stay on this browser/device; a play link does **not** transfer the scene.
- Invalid existing saves are retained until the user chooses to back them up and save the new composition.

## Structure

- `src/passageLayout.ts`: shared shorelines, bank-aligned building footprints, bridge landings, and relative scale for the 3D study.
- `src/model.ts`: asset catalog, scene geometry, footprints, placement rules, validated versioned saves.
- `src/Scene.tsx`: PixiJS world, depth, bridge occlusion, inhabitants, camera and pointer gestures.
- `src/App.tsx`: bilingual editor, guide, history, persistence, dialogs and export.
- `public/art/`: optimized production artwork. `art-sources/`: generated source artwork.
- `docs/ART_DIRECTION.md`: provenance, production decisions and limitations.
- `docs/IMAGE_PROMPTS.md`: built-in image-generation prompt set.

Artwork packaging is reproducible with `node scripts/package-art.mjs`. It resizes/encodes source files for delivery; it does not generate new artwork.

## Scope and validation limits

This is a simplified artistic interpretation, not an exact reconstruction. Terrain, bridge and paths are fixed. The inhabitants use small code-drawn ink figures in three clothing colors, with walking/idle motion. There is no live 3D, modular construction, economy, cloud save or multiplayer.

Automated Chromium tests cover desktop and phone-sized touch contexts. Physical iOS Safari/Android Chrome performance, operating-system share sheets, and a five-person usability trial require real devices and participants. The 30 fps target must not be treated as physically verified merely because automated tests pass.
