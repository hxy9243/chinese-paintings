# Bridge landing flicker — debug report

- **Symptom:** the bridge-to-bank connection flashes as the camera turns.
- **Root cause:** both 0.06-thick landing boxes were centered at `GROUND_Y - 0.03`. Their upper faces were therefore exactly coplanar with the bank mesh. A raycast against the actual batched scene measured a zero surface gap. Camera-dependent depth ties exposed alternating ground and timber fragments.
- **Fix:** seat the landing boxes 0.015 model units higher, with their lower portions still buried in the terrain. Their upper faces now have a distinct depth. The bridge arch, route layout and painting shaders are unchanged.
- **Regression test:** `artworks/qingming/tests/bridgeLanding.test.ts` raycasts the rendered static geometry at three lateral positions on each landing. It failed before the fix with `surface gap: expected 0 to be greater than 0.01`; it passes with the new separation.
- **Visual evidence:** [before/after landing crops](comparison.jpg), sampled at yaw -30°, 0° and +30°, pitch -12°, fixed scene time 8. The former striped/missing landing face is solid at all three sampled angles. Both browser runs completed without page errors.
- **Validation:** full 44-check unit/geometry suite and combined production build passed.
- **Status:** DONE. Self-reviewed locally; no website deployment.

Before source: `611e136`. This report accompanies the landing correction commit; the comparison is a mechanical crop of actual browser captures, not a generated illustration.
