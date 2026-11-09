# 画中行 · Living Paintings

Editable, code-driven interpretations of Chinese paintings, with shared modeling assets, painting tools, and production workflows.

## Artworks

| Artwork | Directory | Planned viewer URL |
| --- | --- | --- |
| 清明上河图 · Rainbow Bridge | `artworks/qingming/` | `/qingming/` |
| 千里江山图 · A Thousand Miles of Rivers and Mountains | `artworks/thousand-miles/` | `/thousand-miles/` |
| 鱼虾清趣 · Fish & Shrimp | `artworks/ink-pond/` | `/ink-pond/` |
| 群雏 · A Mother and Eight Chicks | `artworks/ink-chicks/` | `/ink-chicks/` |

**Status:** four paintings are available in the local gallery. 鱼虾清趣 adds drag-to-orbit viewing, fish and shrimp population controls, rain, ink strength and swimming speed. The local gallery and viewers run from this repository; Qingming now combines modeled geometry with seeded street crowds, layered pigment, drifting river washes, and fading boat wakes. Its historical palette and local visual review are documented under `artworks/qingming/docs/`.

The canonical directory and route name for 千里江山图 is **`thousand-miles`**.

## Structure

```text
apps/gallery/             Chinese-first bilingual gallery
artworks/qingming/        Qingming scene and its project records
artworks/thousand-miles/  Blue-green landscape and its project records
artworks/ink-pond/        Interactive wet-ink fish and shrimp painting
artworks/ink-chicks/      Paper, painted chicks and an articulated ink hen
packages/gallery-shell/  Shared navigation, project metadata, and styles
packages/scene-kit/      Reusable modeling and behavior modules
packages/painting-kit/   Reusable brush and pigment utilities
assets/                 Shared models and textures with provenance
scripts/                Development, build, capture, and validation tools
docs/                   Architecture, migration, and production workflows
```

## Run locally

Requires Node.js 22.12+ and Python 3 for the original landscape utilities.

```sh
npm ci
npm run dev
# http://127.0.0.1:5180/
npm test
npm run build
```

The repository is a single npm project: every dependency is declared in the root `package.json` and installed into the root `node_modules`. Run all commands from the repository root.

Qingming also runs independently with `npm run qingming:dev`.
Its existing Chromium suite runs with `npm run test:e2e` after `npx playwright install chromium`.
Thousand Miles is served with `npm run thousand-miles:start`; its study and capture commands remain in its own README.

Fish and shrimp controls and renderer details are in [the pond README](artworks/ink-pond/README.md). Run `npm run test:pond` for its population checks.

The mother and eight chicks use an orbitable paper scene, adjustable ink and texture, and independent movement. See [the flock README](artworks/ink-chicks/README.md). Run `npm run test:chicks` for movement checks and `npm run test:chicks:browser` after building for gallery and control checks.

See [the implementation plan](docs/PLAN.md) for migration, sharing, visual direction, and validation.

## Development direction

All four artworks use Three.js. Shared building blocks will accept materials, dimensions, placement, and scene constraints from each artwork. Composition, artistic treatment, and scene-specific behavior remain with the artwork.

The visual target is detailed, editable 3D with bounded camera movement, combining modeled structures and moving subjects with authored or source-derived painted surfaces. A small visual pilot will establish the achievable result before broad scene upgrades.

Publishing this source repository does not deploy a website. The existing Qingming website remains unchanged; the combined gallery will be reviewed locally first.
