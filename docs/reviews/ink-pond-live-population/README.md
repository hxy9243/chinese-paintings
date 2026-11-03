# Live population changes

New animals are prepared in dormant slots at loading. Changing a count retains the canvas, graphics buffers, pigment atlas, existing poses, cached paths, weather, disturbances, camera and playback state. Each new animal is placed completely outside the current camera edge, including its antennae and claws, and follows its own birth-time route into view. Removing one disables its complete slot immediately.

Node checks verify model identity, surviving poses, deterministic history, unchanged cached simulation work, water and current preservation. Browser checks verify identical canvas pixels at the instant of an addition, actual entry into the frame twelve painting seconds later, immediate clearing on removal, the same behavior after orbit/zoom, an empty pond, maximum counts, and continued playback. No browser errors were recorded. Software-rendered synchronous edits measured 8–82 ms in this run; a large burst includes more animals than a single slider step. These are local measurements, not a cross-device frame-rate guarantee.

The 48-frame excerpt samples entry over 7.68 painting seconds at 6.25 fps. It is an offline contact-sheet/motion diagnostic, not a real-time playback benchmark. Decoded opening and late samples were inspected: the new fish enters head first at the left edge and the shrimp enters from the opposite edge; the existing swimmers continue their paths. `review.json` records current scene hashes, latency measurements and the immutable still.

Reproduce from the repository root with the local gallery running:

```sh
npm run test:pond
node scripts/review-pond-population.mjs --film
npm run build
node scripts/check-gallery-build.mjs
```

The earlier interactive review remains historical. Current packaged-page checks are recorded separately in `../ink-pond-interactive/production-build.json`.
