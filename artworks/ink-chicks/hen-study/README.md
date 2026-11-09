# Mother hen — forward feeding posture, v14

Open `/ink-chicks/hen-study/` through the gallery development server.
The same model and movement rig are used in the mother-and-eight-chicks page.

1. **Model:** inspect the unpainted barrel, breast, neck, skull, wings, tail,
   and contoured three-segment legs and spreading toes from different angles.
2. **Brushwork:** switch on fixed pigment coordinates from the supplied ink
   painting. Both flanks share the same brush treatment.
3. **Compare:** lean the whole model into the feeding pose beside the original
   painting, with the head tucked nearer the shoulders and breast.
4. **Refinement:** compare the archived v11 narrow neck with the fuller feather mantle.

The lower movement study has eight views, clay/ink switching and six actions.
Walking uses alternating planted feet and head hold/thrust phases. Feeding has
three different bouts with two, three or four short pecks. The hen lowers once,
holds near the floor between strikes, and raises once at the end. Coordinated
joint rotations bend the feathered neck through eight groups as the whole body
leans forward and crouches. The hips lower over planted feet; wings and tail
follow the torso. That posture then stays steady through the small pecks.
The chicks retain their v13 bout structure and independent timing.

`src/model.js` shapes the rounded shoulder and breast. `src/neck.js` builds
the asymmetric feather mantle, layered tips and shoulder anchoring over the
eight-group cervical chain. `src/motion.js` defines
joint articulation and ground contacts. `src/behavior.js` contains authored
feeding timing. `src/previous-model.js` preserves the rejected comparison.
The sources and limits of the reconstruction are in `MOTION_REFERENCES.md`.

Mechanical validation: `npm run test:chicks` from the repository root.
The production browser integration check is `npm run test:chicks:browser`
after `npm run build`. The older v14 films, scripts and model exports remain
in the original `chinese_painting` checkout; they are not duplicated here.
The editable JavaScript defines the actions rather than baked animation tracks.
