# 清明小景 · Living Ink

An interactive 3D ink study of the Rainbow Bridge passage in Zhang Zeduan’s **Along the River During the Qingming Festival**.

The home page opens the 3D scene directly. Older `?view=3d` links still work. The former 2D painting editor has been removed; existing browser save data is not changed.

## Run

Node.js 22.12+ (Node 24 recommended).

```sh
npm ci
npm run dev
npm test
npx playwright install chromium
npm run test:e2e
npm run build
```

Open the local address printed by Vite. The private Sites project is recorded in `.openai/hosting.json`; public access remains disabled.

## Explore

- Drag to turn and tilt; use the three sliders for ±30° rotation on each axis.
- Right-drag to pan; pinch or scroll to zoom. Reset restores the authored view.
- Focus on the bridge, far-bank shops, river bend, or whole passage.
- Horse carts travel one way along the open main street and over the bridge. Boats pass in opposite lanes and enter from both sides.
- People walk, pause independently, and browse 28 market stands in small groups. Standing figures, boat crews, and drivers also have gentle idle motion.
- Pause life freezes the whole scene. Reduced-motion preference starts paused.
- Compare the ink treatment with the plain model, and adjust ink softness.
- Open the reference crop to compare with the original painting.

## Structure

- `src/Mock3D.tsx`: bilingual interface, camera, and animation clock.
- `src/bridgeStudy.ts`: modeled bridge, buildings, trees, horse carts, figures, and boats.
- `src/passageLayout.ts`: bank outlines, building footprints, bridge landings, and boat sizes.
- `src/passageLife.ts`: walking routes, horse-cart motion, river traffic, ripples, and planting.
- `src/peopleMotion.ts` and `src/crowd.ts`: individual activity schedules and shared animated figure geometry.
- `src/passageSpace.ts`: shared placement clearances and reserved traffic routes.
- `src/paintMaterial.ts` and `src/inkFinish.ts`: pigment and ink rendering.
- `docs/3D_STUDY.md`: implementation notes and historical changes.

This is an artistic interpretation of the supplied passage. Automated checks cover geometry, animation, and desktop/mobile Chromium interactions. Physical iOS/Android performance remains unmeasured.
