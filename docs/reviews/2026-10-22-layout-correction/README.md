# Bridge, bank and western-street correction

This revision corrects the three spatial errors in the preceding render. The prior layout passed collision tests but did not preserve the relationships between objects. These renders come from the Three.js scene.

## Corrected relationships

1. The main boat's keel is perpendicular to the bridge axis and passes through the centre of the arch. Its bow and stern extend on opposite sides of the bridge. The former heading was only about 13 degrees from the bridge axis. The boat retains its gentle local drift; this revision does not add a complete navigation route through the river bend. Sail lowering now uses distance across the bridge, rather than horizontal scroll position.
2. The near shoreline's misplaced tip was removed. The projecting bank now meets the near abutment, with its water-facing section beneath the landing. The visible bridge landing anchors were retained. A small approach house and the connecting lane were moved to preserve dry ground and an open route.
3. Opposing rows of rectangular houses now face a continuous western street, approximately 4.4–4.5 units wide. The street reaches the crossroads and continues between the foreground roof groups. Foreground houses face the cross street. The nearby tree, ox cart and residents were adjusted to clear those routes.

The original uploaded crossroads screenshot and annotated plan were recovered and inspected alongside the repository's Chicago bridge crop. The reference has locally varying perspective; secondary footprints remain a 3D interpretation. The new regression checks test the actual boat/bridge orientation, the bank's relationship to the abutment, continuous facing frontage, and clear street/crossroads geometry.

## Renders

- `full-layout.jpg`: complete scene.
- `crossroads.jpg`: opposing house rows and the crossing.
- `boat-close.jpg`: boat through the arch.
- `bridge-topology.jpg`: higher view of the crossing and landing support.
- `scaffold-and-bridge.jpg`: bridge approach and surrounding buildings.
- `painting-edge.jpg`: retained shared paper fade.

From the repository root, run `npm test --prefix artworks/qingming` and `npm run build --prefix artworks/qingming`. To reproduce these images, run `REVIEW_OUTPUT=docs/reviews/2026-10-22-layout-correction REVIEW_VIEWS=full-layout,crossroads,boat-close,bridge-topology,scaffold-and-bridge,painting-edge node scripts/review-qingming-reconstruction.mjs` with Chromium installed. An existing executable can be selected with `PLAYWRIGHT_CHROMIUM_EXECUTABLE`.

No push or merge was performed. The review archive contains the complete patch against main commit `5fdddcfea9425ec1e9a0454f031857a0d6b903e7`, not only this correction's incremental changes.
