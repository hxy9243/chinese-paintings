# Reference-led geometry revision, second review

The scene captures use source commit `a1671d7`. The [record](review.json) contains source hashes, artifact hashes, camera samples and mechanical checks. The painting shaders remain unchanged. A subsequent CSS adjustment only wraps the figure viewer controls on narrow screens; it was checked at 390 pixels without overflow or page errors.

- [Figures before and after](figure-comparison.jpg)
- [Individual porter close-up](porter-close.png)
- [Painting / previous scene / revised scene](layout-comparison.jpg)
- [Default overview](overview.png), [bridge close view](bridge.png), [near-quay tree](landmark-tree.png)
- [Four-second motion sample](motion.mp4), [decoded contact sheet](motion-contact.jpg)

The layout comparison preserves the old and revised renderer's same seed 9243, scene time 8, angle 0 and zoom 1.25. The source strip retains the painting's own perspective; it is not an exact registration with the 3D scene. The default overview uses angle 30. The bridge and tree close views use angle 30, pitch -12, zoom 2.5; these are closer inspection views, not the default camera.

## What was corrected

The foreground hall and adjoining wings now use perpendicular ridge axes. Seven additional roof groups bring the placed groups to 26. Eight named trees are reserved before market allocation; the near-quay old tree has a curved, tapering trunk and continuous branches. The small near-landing shelter and the western foreground roof were moved clear of walking routes.

Twelve rebuilt people have smaller heads, shaped bodies, garment seams and folds, collars, modeled hands, facial features, hats, footwear and carrying equipment. The porter's bent arm reaches the yoke. Transport roles use working figures. Thirty-two observers face the bridge rails, and each bank stall has a vendor, including seated and reaching poses.

Six different assortments replace identical five-sphere stall displays. Four bridge-edge counters, woven baskets, dishes, jars, cloth, hanging food, awning seams and fringe, timber crossings, joint blocks, pegs and lashings add modeled detail. Central passing lanes remain clear.

## Checks and visual limits

The full 43-check suite passed, followed by eight activity and actual-geometry detail checks after the final grip/transport correction. All six desktop/mobile interaction checks and the combined build passed. The integrated capture loaded both paintings without page or resource errors. The figure viewer's enlargement, back view and return to the complete gallery were exercised.

A repeated timestamp after a forward seek reproduced the same sampled pixels on this browser/GPU. Close and far crowd samples contain 1,309,300 and 40,916 triangles; distant geometry is genuinely reduced. These values do not establish realtime frame rate. The offline movie fully decodes to 48 frames at 12 fps, 1232 × 744, four seconds.

Self-review: the figures and perpendicular building groups are visibly improved, and the new viewer exposes the actual geometry. The scene still lacks the painting's tightly interwoven crowd, varied individual actions and fine linework. Faces and clothing remain stylized; the walk cycle has no articulated knees. The painting's specific boat-and-bridge incident is not reconstructed by the existing circulating boat traffic. This revision does not establish parity with the reference video or exact historical reconstruction. Shader work and website deployment remain deferred.
