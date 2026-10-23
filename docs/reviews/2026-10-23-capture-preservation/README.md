# Qingming capture-support archive

Preserved on 2026-10-23 at the user's request to push still-local agent work.
The layout implementation from this task is superseded. This branch archives
completed capture support and evidence; it is not a layout update or a proposal
to merge older scene geometry into current main.

## Preserved work

- Original commit `7ca818d414bb0f1bd493fc235dc3b7ccd114d44e` adds
  [`scripts/review-qingming-composition.mjs`](../../../scripts/review-qingming-composition.mjs).
  The original commit remains in this branch's ancestry unchanged.
- Three screenshots captured from scene revision
  `07b8344638046848e5925c5881810815ff8bd8ec` on 2026-10-21:
  [bird's-eye](birds-eye.png), [composition view](composition-view.png), and
  [bend detail](bend-detail.png).
- [Original capture metrics](review.json), including camera settings, scene
  inventory, actual revision, and browser errors. The recorded dirty state is
  the then-untracked capture script; scene geometry had not changed.

These images are unchanged-main baseline evidence. They must not be described
as the approved-plan layout implementation, which never started in this task.

## Validation completed during the original task

- `npm test -- --testTimeout=60000` in `artworks/qingming`: 88 tests across
  22 files passed. The project's default timeout was not changed.
- `npm run build` in `artworks/qingming`: passed, with the existing large-chunk
  warning.
- Chromium, local HTTP, and WebGL2 worked in the selected cloud environment.
- The capture script rendered the actual app with its ink, water, and silk
  palette. All visible bend chunks were refined, and all three screenshots
  were inspected. The capture report contains no browser errors.
- Astra inspected the original painting crops and reviewed the current code.
  No scene geometry was modified by either agent.

## Historical handoff and access barrier

The task inspected both repository Chicago reference crops, but could not
retrieve the approved two-panel plan or optional historical patch through the
supported Library workflow. The download proxy returned HTTP 403 for the
provided transfer hosts. Library's image read yielded OCR and an image pointer,
without viewable pixels. A subsequent handoff archive attempt on 2026-10-22
also failed in the current supported download helper; no archive bytes were
written locally. The transfer stopped without another escalation or alternate
transfer route.

An attempted Library upload of the baseline images and support patch failed
before upload preparation with `hosted apps tools/list request failed: network`.
No Library deliverable IDs were confirmed. These are historical blockers; this
preservation pass did not retry those operations.

The review identified fixed bend-building angles, shallow foreground groups,
and rounded outer fade framing as areas to compare against the approved plan.
Those observations were not implemented here and are not instructions to
resume the superseded work.

## Reusing the capture script

From the repository root, with Qingming dependencies installed and Chromium
available:

```sh
npm run build --prefix artworks/qingming
REVIEW_DIR=/tmp/qingming-capture PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium node scripts/review-qingming-composition.mjs
```

The script starts a local preview on port 4185, uses SwiftShader, and captures
three real-app views. It records the checkout revision and working-tree state.
Choose a new output directory so the archived baseline stays intact. Captures
from a newer checkout describe that checkout, not this historical scene.

## Preservation scope

Remote main was `5fdddcfea9425ec1e9a0454f031857a0d6b903e7` when this archive was
prepared. The new preservation branch starts from the original capture-support
commit and adds this archive only. No main merge, deployment, modeling, or
reference-download retry was part of the preservation request. Credentials,
signed transfer URLs, helper copies, dependencies, caches, and duplicate
deliverable copies are excluded.
