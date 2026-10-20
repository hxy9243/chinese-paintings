# Geometry and motion review

This review records source commit `748afcb`; [review.json](review.json) contains the source and artifact hashes. Rendering was checked locally in Chromium, using the unchanged Qingming painting shaders.

- [Reference / before / revised layout](layout-comparison.jpg)
- [Revised overview](overview.png)
- [Great bare tree and foreground buildings](landmark-tree.png)
- [Twelve figure types](figures.png)
- [Eight-second motion sample](motion.mp4), with [decoded contact sheet](motion-contact.jpg)

Validation: 43 unit and geometry checks passed across the full suite, followed by the traffic checks again after the final vehicle scale correction. All six desktop/mobile Chromium interaction tests passed. The combined static build and its legacy entry route and figure-study page were checked separately. Both imported viewers loaded without page or resource errors in the integrated review.

The near and far crowd samples contain 125,736 and 23,040 triangles respectively, an 81.7% reduction. Architecture and vegetation also switch geometry levels. These counts do not establish a frame-rate improvement.

Repeated absolute scene time after a forward seek produced identical sampled pixels in the tested browser/GPU environment. The encoded sample has 96 frames at 12 fps, is 1232 × 744, and fully decodes. It is an offline capture, not a realtime frame-rate demonstration.

The house axes and explicit old tree address hand-read landmarks in the reference. The models remain stylized, and the composition is still an interpretation rather than an exact registration. Historical reconstruction and the finer painted surface detail in the reference video have not been established by these checks.
