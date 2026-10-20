# Combined Chinese Painting Project

## Confirmed decisions

- Create this new public GitHub repository as the umbrella for both artworks. This replaces the earlier proposal to extend the existing Qingming repository in place.
- Use **`thousand-miles`** consistently for the 千里江山图 directory, project identifier, and viewer route.
- Use Git subtree for migration. Preserve Qingming's existing history; squash the Thousand Miles import while retaining its current tracked artifacts.
- Include the current uncommitted brush/mineral experiment in an isolated Thousand Miles migration snapshot. Leave both original working directories and their remotes unchanged.
- Develop both artworks in this combined repository after migration; retain the original repositories as historical records rather than ongoing synchronization targets.
- Build a Chinese-first bilingual artwork gallery. Review it locally before any website publication.
- Aim for detailed, editable 3D with bounded camera movement. Sharing infrastructure alone does not establish reference-level visual quality.

## 1. Repository foundation — complete

- Initialize the public `hxy9243/chinese-paintings` repository with this plan, a README, and directory placeholders.
- The initial repository milestone contained only the plan and scaffold; artwork imports and geometry work are now the active follow-up milestone. Website deployment remains deferred.
- Verify public visibility, pushed commit identity, canonical artwork naming, and a clean local checkout.

## 2. Preserve and import the artworks

- Record the current source commits and working-tree state before importing.
- Remove each artwork's scaffold placeholder directory immediately before its subtree import, because `git subtree add` requires an absent destination prefix.
- Import Qingming into `artworks/qingming/` with Git subtree without squash, retaining its history.
- Prepare Thousand Miles in a separate temporary clone. Overlay reviewed current edits and new brush-study files, then commit that isolated snapshot without modifying the original checkout.
- Import that snapshot into `artworks/thousand-miles/` with `git subtree add --squash`.
- Preserve films, model exports, reference images, licenses, study galleries, and historical manifests byte-for-byte. Keep recorded validation evidence separate from new migration results.
- Record source commits, snapshot changes, and artifact checksums in a migration record. Keep the original Thousand Miles repository available for pre-import history.
- Preserve each artwork's dependency lockfile initially; do not couple migration to dependency upgrades.

## 3. Shared infrastructure and reusable assets

### Gallery and tooling

- Put a buildless gallery in `apps/gallery/` and shared navigation, artwork metadata, and styles in `packages/gallery-shell/`.
- Provide root commands for dependency installation, development, production builds, tests, and artwork-specific validation after the imports exist.
- Serve the gallery and Thousand Miles source directly in development; proxy Qingming's Vite server under `/qingming/`.
- Produce one root `dist/` for production. Exclude development tools, dependencies, caches, runtime logs, and raw frame sequences from the website output.
- Make capture and browser-check scripts accept configurable artwork URLs while retaining standalone defaults.
- Preserve scene-specific capture interfaces and historical evidence. Document any path adaptation separately from past manifests.

### Modeling and assets

- Use `packages/scene-kit/` for reusable geometry and behavior that has been demonstrated in both artworks.
- Candidate components include roofs, timber members, pavilions, railings, tree forms, leaf sprays, boats, articulated people, and instancing helpers.
- Separate geometry generation from each artwork's materials, terrain queries, placement, clipping, and traffic rules before extracting it.
- Keep shared model and texture dependencies together in `assets/`, with source, license/provenance, scale, orientation, and intended use recorded.
- Preserve procedural source as editable masters; treat GLB exports as portable model artifacts, not replacements for custom shaders or procedural motion.
- Prove reuse with a small component in both scenes before expanding the shared library. Do not turn every scene object into a framework during migration.

### Painting and production methods

- Use `packages/painting-kit/` for reusable seeded brush maps, pigment textures, and surface-attached painting utilities once both artworks can consume them safely.
- Keep the current ink renderers and artistic presets separate initially.
- Document reference-led modeling, stable brush coordinates, camera studies, capture, export, performance measurements, and visual review in `docs/workflows/`.
- Keep documentation and runnable tools in the repository so future reusable agent skills can reference a maintained workflow.

## 4. Gallery and navigation

- Use “画中行 · Living Paintings” as the initial gallery title.
- Show two large still previews with Chinese-first bilingual labels and “进入画境 / Enter scene” links. Do not initialize WebGL or fetch large model/film downloads on the homepage.
- Serve `/` as the gallery, `/qingming/` as Qingming, and `/thousand-miles/` as Thousand Miles.
- Include Thousand Miles film and study links, and keep model downloads within the artwork pages.
- Add compact home/artwork navigation to both viewers and the study pages without replacing their controls.
- Preserve artwork query options and fragments. Redirect legacy root `?view=3d` links to the Qingming viewer while retaining their query and fragment.
- Use warm paper tones, restrained ink typography, responsive previews, accessible links, and keyboard-visible focus.

## 5. Visual development after migration

- Active revision: [geometry, reference landmarks, varied people and traffic, and screen-space LOD](GEOMETRY_REVISION.md). Correct the house axes and great bare tree near the bridge before the shader work.
- Start with one small Qingming market-and-boat passage as a separate study rather than replacing an accepted scene immediately.
- Combine modeled structures and moving subjects with authored or source-derived painted surfaces. Concentrate geometric detail on silhouettes, depth, focal structures, and visible moving objects.
- Establish bounded camera views, a production still, and a short motion excerpt before expanding the scene.
- Inspect close detail, occlusion, texture stability, figure motion, camera limits, and measured performance. Extend the shared toolkit only where the pilot demonstrates reusable behavior.
- Reference: https://x.com/wl561618/status/2112027192716935334/video/2 . Its visible detail is an artistic target; its production method and 3D interactivity have not been established.

## Validation and rollout

- Verify subtree contents and artifact checksums, and confirm both original working directories remain unchanged.
- Run Qingming's existing unit/browser tests and production build, plus Thousand Miles geometry, quick scene, and brush-study checks.
- Test integrated production output: direct entry, refresh, artwork switching, legacy links, query options, references, study pages, films, and model downloads.
- Review desktop/mobile screenshots and matched scene captures. Verify pause, camera controls, and Thousand Miles deterministic replay; use an explicit fixed seed for comparable Qingming captures.
- Confirm the homepage loads without either 3D scene or large downloadable artifacts.
- Keep new validation outputs separate from historical reports and manifests.
- GitHub source publication is authorized for this repository. Website deployment remains local-review-first; do not alter the existing live Qingming site as part of repository creation.
