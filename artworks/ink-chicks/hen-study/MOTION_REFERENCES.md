# Hen anatomy and movement references — updated 9 November 2026

The anatomical rebuild separates neutral anatomy from the supplied painting's low,
diagonal feeding pose. The painting supplies the ink language and pigment;
photographic and skeletal references inform the body and joints.

## Visual anatomy

- Gary Crossey, **Black Hen side view**, 27 February 2015, CC BY-SA 4.0:
  https://commons.wikimedia.org/wiki/File:Black_Hen_side_view.JPG
  Visually inspected in the browser. Rounded, roughly horizontal body; small
  head on a feathered neck; folded wings; raised tail rooted at the rump.
  The photo is linked for comparison, not incorporated into the artwork.
- PoultryHub, **Skeletal system**:
  https://www.poultryhub.org/anatomy-and-physiology/body-systems/skeletal-system
  Visually inspected the fowl skeleton. A long cervical chain connects the
  small skull to a comparatively rigid trunk. The femur, tibia, hock and
  tarsometatarsus form a bent chain, rather than a two-bar stick leg.
- University of Kentucky / Extension, **Avian skeletal system**:
  https://poultry.extension.org/articles/poultry-anatomy/avian-skeletal-system/
  and **External anatomy of chickens**:
  https://poultry.extension.org/articles/poultry-anatomy/external-anatomy-of-chickens/
  Used to distinguish the high knee from the hock, and to check shank, toes,
  comb, wattles and female feather forms.

## Movement

- Pratt (1982), **Saccadic eye movements are coordinated with head movements
  in walking chickens**, Journal of Experimental Biology:
  https://pubmed.ncbi.nlm.nih.gov/7086341/
  Walking head movement has hold and thrust phases. The experiment used
  four-week-old Leghorns, not an adult-hen motion-capture performance.
- Salim Da, **Brown hen walking in a garden pathway**:
  https://www.pexels.com/video/brown-hen-walking-in-a-garden-pathway-35089340/
  Visually inspected the moving silhouette. Feathers obscure parts of the
  legs, so this clip is not sufficient by itself to establish leg anatomy.
- Yash Kanbargi, **Hen and chicks pecking**:
  https://www.pexels.com/video/hen-and-chicks-pecking-11636663/
  Visually inspected raised and lowered neck positions. The neck reaches
  forward and down while the torso remains comparatively steady. A feeding
  bout can include several low pecks before the hen raises her head.
- Picard et al. (1997), **Picorage et préhensibilité des particules alimentaires
  chez les volailles**:
  https://productions-animales.org/article/view/4016
  Intermittent visually anticipated pecking. Time spent with a stationary
  head during pecking is not a claim about upright posture throughout the day.

## Authored implementation and limits

### Feeding research revisited for v13

- Yo et al. (1997), **Feed pecking in young chickens: new techniques of
  evaluation**: https://pubmed.ncbi.nlm.nih.gov/9177550/
  In the studied young chicks, much of a continuous feeding session consisted
  of a stationary head and inspection between pecks. This supports distinct
  low holds rather than uninterrupted bobbing; the reported proportions are
  not generalized to adult hens or all feeding conditions.
- Martaresche et al. (2000), **Time structure of behavioral patterns related
  to feed pecking in chicks**: https://pubmed.ncbi.nlm.nih.gov/11110997/
  The abstract describes inspection and steady-head phases around exploratory
  and consumatory pecks. Our short strikes and intervening pauses reflect
  that distinction; their exact timing is authored for the artwork.
- van der Leeuw, Bout and Zweers (2001), **Control of the Cranio-Cervical System
  During Feeding in Birds**: https://doi.org/10.1093/icb/41.6.1352
  The abstract distinguishes coordinated chicken neck-joint rotations from
  the successive rolling pattern described for anseriform birds. The revised
  rig blends fixed-length joint poses together instead of solving a different
  rolling neck curve at every instant. It is not a biomechanical reconstruction
  of the study's measured joints.
- Anurag Gusain, **Hen with chicks in natural habitat**:
  https://www.pexels.com/video/hen-with-chicks-in-natural-habitat-29229108/
  Playback and selected raised/lowered frames were inspected in the browser.
  The head stays close to the breast during the short feeding reach; neck
  plumage blends into the body. Chicks alternate low feeding and raised
  observation independently. No timing measurements were extracted from this
  video and no video frames are included in the artwork.

### Implementation

The user-supplied painting was re-inspected for v14 after feedback that the
stationary torso and hooked neck did not match its feeding silhouette. The
reference shows a broad diagonal mass: the breast lowers, the back and tail
rise, and the head remains integrated with the feathered shoulder. The new
posture rotates the upper body about the hips by an authored 0.55 radians,
with a small crouch and forward shift. These values are artistic choices, not
measurements extracted from the painting. Wings, tail, shoulder and skull
share that frame; the leg solver keeps the feet planted. The remaining neck
reach is shorter and continues forward rather than curling back under the head.
The small ground strikes retain this leaned posture until the bout ends.

- A rounded barrel, breast, rump, folded wings, overlapping tail feathers,
  skull, short beak, small comb and wattles are separately editable volumes.
- A broad feather mantle bends over eight fixed-length cervical
  groups. The original painting, re-inspected for
  v12, supplies the heavy curved plumage: a deep nape, overlapping rounded tips,
  a full breast and raised forequarters. The lowest feathers are anchored in
  the torso, while the upper ruff cradles the skull. For feeding, coordinated
  rotations lower the head along a short forward reach without an initial
  upward kick. Low inspection and contact poses differ only slightly.
  It is a simplified cervical chain, not a literal vertebral count.
- Each leg retains femur, tibia and shank lengths. Contoured feathered thighs
  and drumsticks cover the upper joints; rounded hocks meet tapered shanks.
  Four arched toes spread from a foot pad, with separate claws and restrained
  toe flexion during swing. Grounded feet retain their world targets.
  A continuous reach solve replaces stepped angle adjustments.
- The walking study holds the head in world space during part of each half
  stride, then advances it quickly. The body continues moving underneath.
- Three feeding variants contain three, four and two ground contacts. A hen
  bout lasts 6.5 seconds including raised observation; a chick bout lasts 4.5.
  Each lowers once, makes short strikes from a held low posture, then raises
  once. Separate lowering and strike channels keep the body settled between
  pecks. The chick head adjustment uses existing painted pose landmarks and
  a feathered neck blend; exact pixel-level ground contact is approximate.
  The flock selects bouts independently. These are authored movements, not
  measured adult-hen biomechanics or motion capture.
- Ink coordinates are fixed to surfaces and symmetric across the flanks.
  Feathers use different regions of the user-supplied painting. No downloaded
  photographs or video frames are baked into the material.
- The 12-fps exposures, independent chick behavior, protected calligraphy,
  collision spacing, off-paper travel and deterministic seeking remain.
- Collision circles are deliberately conservative. Close maternal food-call
  interactions are not simulated by this version.

The pre-v14 source is preserved in `../archive/v13/`, the pre-v13 motion source
in `../archive/v12/`, and the earlier
v11 source in `../archive/v11/`. The static study's
Refinement button displays its geometry beside the anatomical rebuild. Review
reports separate mechanical checks from visual judgment. The model remains a
stylized interpretation; passing tests does not establish artistic acceptance.
