# Bridge market density and purposeful activity

Scene source: `b149516`. The [record](review.json) contains source and artifact hashes, scene metadata and validation results.

- [Bridge before/after](bridge-comparison.jpg), with the same camera, seed and scene time
- [Four activity poses](actions.jpg)
- [Current bridge](bridge.png), [overview](overview.png)
- [Four-second motion sample](motion.mp4), [decoded contact sheet](motion-contact.jpg)

## What people are doing

Sixteen counters replace four. Sixty-four people occupy the edge market: sixteen sellers, sixteen buyers, sixteen river watchers and sixteen people making conversational gestures. The sampled span also contains eight passing walkers, bringing the visible bridge population to about 72. Passing walkers circulate along the bridge-aligned street; the total pool of walkers rises from 36 to 60 while retaining 24 bank walkers.

Sellers bend toward wares, turn toward buyers and offer a cup. Buyers look down and reach during the same transaction phase. River watchers lean at the hips, look down, point and look along the river. Conversational figures nod, turn and gesture. Shoulder, elbow, head and hip joints move independently. Feet remain planted while upper bodies turn; different stall groups use different timing. The serving cup is attached to the hand rig; the old fixed torso tray was removed after close-up review exposed it floating during the new gestures. These are staged offering/reaching actions, not simulated object ownership transfers.

Bridge displays vary between ceramics, baskets, food and cloth. Four cloth shelters punctuate the two rows. Counter models follow the arch slope. The cart corridor and both passing foot lanes remain clear; the previous landing-flicker correction remains intact.

## Playback and inspection

Play/Pause is visible at the bottom-right of the scene. Reduced-motion users retain an initially paused view. Delayed frames now advance the analytic animation by the full elapsed visible time; an artificial 0.08-second cap previously slowed the scene. Visibility changes reset the frame clock so time spent in a hidden tab is excluded.

Open `/qingming/figure-study.html` and use **动作** to inspect enlarged seller, buyer, river-watcher and conversation motions. Front, side and back views remain available; choosing a character restores the walking/model study. The four close-up images use the same action function as the bridge, with an inspection camera orientation.

The approaches retain the same warm earth palette, with subtle broken wheel wear and sparse shoulder aggregate. [Road-surface evidence](../../ROAD_SURFACE.md) explains the Shuntian Gate archaeological basis and the limit of applying it to Rainbow Bridge. No continuous stone-paving grid is assumed.

## Verification and limits

The full 48-check suite passed. Twelve activity, rendered-rig and geometry-LOD checks passed again after the serving-cup correction. All six desktop/mobile interaction tests passed, followed by two playback/interaction checks after clock visibility handling. The combined build passed. The activity selector/back view/gallery return were checked at 390 pixels without horizontal overflow or page errors.

The integrated capture loaded both artworks without page/resource errors and reproduced identical sampled pixels after a forward/backward time seek. The movie fully decodes to 48 frames at 12 fps, 1232 × 744, four seconds. It is an offline time-addressed sample, not a realtime performance benchmark. Near/far geometry still changes to genuinely simpler models.

Self-review covers production stills, the enlarged action models and decoded motion samples. The scene remains stylized and the motion is cyclic staging. It does not recreate every painted figure or the painting's specific boat incident. No independent artistic review or parity with the reference video is claimed. Painting shaders remain unchanged; website deployment is deferred.
