# 画中行 · Living Paintings

Editable, code-driven interpretations of Chinese paintings, with shared modeling assets, painting tools, and production workflows.

## Artworks

| Artwork | Directory | Planned viewer URL |
| --- | --- | --- |
| 清明上河图 · Rainbow Bridge | `artworks/qingming/` | `/qingming/` |
| 千里江山图 · A Thousand Miles of Rivers and Mountains | `artworks/thousand-miles/` | `/thousand-miles/` |

**Status:** repository scaffold and implementation plan. The existing artwork projects have not been imported, and this repository does not yet contain a runnable gallery or viewer.

The canonical directory and route name for 千里江山图 is **`thousand-miles`**.

## Structure

```text
apps/gallery/             Chinese-first bilingual gallery
artworks/qingming/        Qingming scene and its project records
artworks/thousand-miles/  Blue-green landscape and its project records
packages/gallery-shell/  Shared navigation, project metadata, and styles
packages/scene-kit/      Reusable modeling and behavior modules
packages/painting-kit/   Reusable brush and pigment utilities
assets/                 Shared models and textures with provenance
scripts/                Development, build, capture, and validation tools
docs/                   Architecture, migration, and production workflows
```

See [the implementation plan](docs/PLAN.md) for migration, sharing, visual direction, and validation.

## Development direction

Both artworks use Three.js. Shared building blocks will accept materials, dimensions, placement, and scene constraints from each artwork. Composition, artistic treatment, and scene-specific behavior remain with the artwork.

The visual target is detailed, editable 3D with bounded camera movement, combining modeled structures and moving subjects with authored or source-derived painted surfaces. A small visual pilot will establish the achievable result before broad scene upgrades.

Publishing this source repository does not deploy a website. The existing Qingming website remains unchanged; the combined gallery will be reviewed locally first.
