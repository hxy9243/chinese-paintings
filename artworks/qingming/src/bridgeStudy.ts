import * as THREE from "three";
import {buildConstruction, buildOrnateGate, boatCrewStations, addCrewEquipment, buildLoweringRig, updateLoweringRig} from "./referenceDetails";
import {setScenePalette,getScenePalette,type ScenePalette} from "./scenePalette";
import { buildReferenceTree, buildReferenceBoat, addReferenceArchitecture, type TreeForm } from "./referenceAssets";
import { REFERENCE_AZIMUTH, scrollPoint } from "./scrollLayout";
import {
  paintMaterial,
  paintingAmount,
  waterTime,
  createDryInk,
  brushEdges,
} from "./paintMaterial";
import {
  shoreDepth,
  HALLS,
  BOATS,
  BRIDGE,
  bridgeHeight,
  bridgePoint,
  GROUND_Y,
  PERSON_SCALE,
  PERSON_WIDTH_SCALE,
  BRIDGE_RAIL_HEIGHT,
  MIN_EAVE_HEIGHT,
  REFERENCE_TREE,
} from "./passageLayout";
import {
  BUILDING_KINDS,
  NATURE,
  CARTS,
  CART_KINDS,
  cartPose,
  FEATURE_TREES,
  MARKET,
  STATIC_PEOPLE,
  WALKER_COUNT,
  BRIDGE_WALKERS,
  BRIDGE_OBSERVERS,
  RIPPLE_COUNT,
  boatPose,
  walkPose,
  residentPose,
  observerPose,
  SHOP_VISITORS,
  shopperPose,
  riverRipple,
  type BuildingKind,
} from "./passageLife";
import { MOORED_BOATS, mooredBoatPose, mooringAnchor } from "./moorings";
import { MAIN_STREET, segmentDistance } from "./passageSpace";
import { createCrowd } from "./crowd";
import { FIGURE_TYPES } from "./figureTypes";
import { buildFigure, FIGURE_HEIGHT } from "./figures";
import { marketStall, bridgeMarket, marketParasol, MARKET_TYPES } from "./marketModels";
import { chooseDetail, projectedHeightPixels, type DetailLevel } from "../../../packages/scene-kit/lod";
import { idleMotion } from "./peopleMotion";
import { bridgeActivity, bridgeRole, bridgeVariant } from "./bridgeActivity";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { createBoatWakes } from "./boatWakes";
import { bankSection, buildBankFace, buildBridgeFoundations } from "./riverbanks";
import { riverGeometry, waterHeight } from "./riverSurface";

// A shallow, camera-constrained diorama. Hidden façades are intentionally plain.
// The original passage runs from the near lower-left approach to the far upper-right.
export const VIEW_ANGLE = REFERENCE_AZIMUTH;
export const DEFAULT_VIEW_ANGLE = 0;
export const CAMERA_LIMITS = { yaw: 85, pitchMin: -27, pitchMax: 45, roll: 45 } as const;
// Elevation ranges from 8° to 80° above ground.
export const ELEVATION = THREE.MathUtils.degToRad(55);
const ink = createDryInk();
const riverInk = createDryInk(0.38);
const mat = paintMaterial;
const wood = mat(0x9f814f),
  dark = mat(0x514a3b),
  plaster = mat(0xc8b486),
  roof = mat(0x786746);
const linen = mat(0xc7b991),
  green = mat(0x858167),
  pale = mat(0xa49e7e);
function mesh(
  parent: THREE.Object3D,
  geo: THREE.BufferGeometry,
  material: THREE.Material,
  x = 0,
  y = 0,
  z = 0,
  outline = true,
) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  parent.add(m);
  if (outline) m.add(new THREE.LineSegments(brushEdges(geo), ink));
  return m;
}
function box(
  p: THREE.Object3D,
  w: number,
  h: number,
  d: number,
  x: number,
  y: number,
  z: number,
  m = wood,
) {
  return mesh(p, new THREE.BoxGeometry(w, h, d), m, x, y, z);
}
function beam(
  p: THREE.Object3D,
  a: number[],
  b: number[],
  r = 0.035,
  m = wood,
) {
  const from = new THREE.Vector3(...a),
    to = new THREE.Vector3(...b),
    delta = to.clone().sub(from);
  const obj = mesh(
    p,
    new THREE.CylinderGeometry(r * 0.8, r, delta.length(), 5),
    m,
    ...from.clone().add(to).multiplyScalar(0.5).toArray(),
  );
  obj.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    delta.normalize(),
  );
  return obj;
}
let geometryDetail: DetailLevel = 2;
// Curved, asymmetric forks replace radial branch sprays and billboard crowns.
function characterTree(parent: THREE.Object3D,x:number,z:number,form:TreeForm,seed:number,leafy=false){
  const tree=buildReferenceTree(form,seed,geometryDetail,Math.abs(seed-REFERENCE_TREE.s)<.001,leafy?"full":"bare");
  tree.position.set(x,GROUND_Y,z);parent.add(tree);return tree;
}
function tree(parent:THREE.Object3D,x:number,z:number,leafy:boolean){
  const tree=buildReferenceTree('sapling',x+z*.37,geometryDetail,false,leafy?"full":"bare");
  tree.position.set(x,GROUND_Y,z);parent.add(tree);return tree;
}
function riversideNature(parent: THREE.Group) {
  for (const n of NATURE) {
    const p = scrollPoint(n.s, n.d);
    if (n.kind === "bare" || n.kind === "spring") {
      const t =
        n.kind === "spring"
          ? tree(parent, p.x, p.z, true)
          : characterTree(
              parent,
              p.x,
              p.z,
              n.s < 0 ? "sapling" : "pollard",
              n.s,
            );
      t.scale.set(n.size * 0.85, n.size * 1.1, n.size * 0.85);
      continue;
    }
    const g = new THREE.Group();
    g.position.set(p.x, GROUND_Y, p.z);
    g.scale.setScalar(n.size);
    parent.add(g);
    if (n.kind === "rock") {
      const rock = mesh(
        g,
        new THREE.DodecahedronGeometry(0.16, 0),
        pale,
        0,
        0.07,
        0,
      );
      rock.scale.set(1.6, 0.6, 0.9);
    } else if (n.kind === "reed") {
      for (let j = 0; j < 9; j++) {
        const angle = j * 2.4,
          reach = 0.09 + j * 0.007;
        beam(
          g,
          [Math.sin(j) * 0.055, 0, Math.cos(j) * 0.055],
          [
            Math.cos(angle) * reach,
            0.13 + (j % 3) * 0.07,
            Math.sin(angle) * reach,
          ],
          0.005,
          green,
        );
      }
    } else {
      beam(g, [0, 0, 0], [0.12, 1.3, 0], 0.07);
      for (let j = 0; j < 9; j++) {
        const a = j * 2.4,
          x = Math.cos(a) * 0.65,
          z = Math.sin(a) * 0.65;
        beam(g, [0.12, 1.05, 0], [x, 1.5 + (j % 3) * 0.12, z], 0.02);
        for (let strand = 0; strand < (geometryDetail===0?2:5); strand++) {
          const pts = [];
          for (let k = 0; k <= 9; k++) {
            const t = k / 9;
            pts.push(
              new THREE.Vector3(
                x + Math.cos(a) * t * 0.22 + strand * 0.035,
                1.6 + (j % 3) * 0.12 - t * t * (0.8 + strand * 0.12),
                z + Math.sin(a) * t * 0.23,
              ),
            );
          }
          g.add(
            new THREE.Line(
              new THREE.BufferGeometry().setFromPoints(pts),
              riverInk,
            ),
          );
          for (let k = 1; k < 10; k++) {
            const v = pts[k];
            beam(
              g,
              v.toArray(),
              [v.x + 0.03, v.y - 0.085, v.z + 0.025],
              0.013,
              green,
            );
          }
        }
      }
    }
  }
}
function horseCart(parent: THREE.Group, index: number) {
  const layout = CARTS[index],kind=CART_KINDS[index];
  const g = new THREE.Group();
  g.position.copy(scrollPoint(layout.s, layout.d));
  g.position.y = GROUND_Y;
  g.rotation.y = REFERENCE_AZIMUTH - layout.angle;
  g.scale.setScalar(0.4);
  parent.add(g);
  g.userData.trafficKind=kind;
  const animal=new THREE.Group();animal.name="draught-animal";g.add(animal);
  const donkey=kind==="donkey-cart" || kind==="pack-horse";
  const coat = donkey ? pale : index % 2 ? dark : wood;
  // Horse faces local +x: rounded barrel, sloping neck, muzzle and alert ears.
  const body = mesh(animal, new THREE.SphereGeometry(1, 10, 7), coat, 0.65, 0.65, 0);
  body.scale.set(0.48, 0.22, 0.2);
  const headGroup = new THREE.Group();
  g.add(headGroup);
  beam(headGroup, [0.9, 0.68, 0], [1.12, 1.03, 0], 0.13, coat);
  const head = mesh(
    headGroup,
    new THREE.SphereGeometry(1, 8, 6),
    coat,
    1.22,
    1.02,
    0,
  );
  head.scale.set(0.24, 0.12, 0.105);
  for (const z of [-0.075, 0.075])
    beam(headGroup, [1.12, 1.1, z], [1.07, donkey ? 1.43 : 1.26, z], donkey ? 0.035 : 0.025, coat);
  for(const side of [-1,1]){
    mesh(headGroup,new THREE.SphereGeometry(.016,6,4),dark,1.28,1.065,side*.102,false);
    beam(headGroup,[1.36,.99,side*.08],[1.06,1.07,side*.086],.009,dark);
  }
  beam(headGroup,[1.12,.95,-.11],[1.12,.95,.11],.012,linen);
  const legs: THREE.Group[] = [];
  for (const x of [0.35, 0.94])
    for (const z of [-0.14, 0.14]) {
      const leg = new THREE.Group();
      leg.position.set(x, 0.59, z);
      leg.name = "horse-leg";
      g.add(leg);
      beam(leg, [0, 0, 0], [0.02, -0.29, 0], 0.04, coat);
      beam(leg, [0.02, -0.29, 0], [0, -0.555, 0], 0.029, coat);
      box(leg, 0.105, 0.06, 0.075, 0.025, -0.56, 0, coat);
      legs.push(leg);
    }
  if(kind==="ox-cart")for(const side of [-1,1]){
    beam(headGroup,[1.1,1.1,side*.07],[1.07,1.24,side*.18],.025,linen);
    beam(headGroup,[1.07,1.24,side*.18],[1.18,1.28,side*.21],.014,linen);
  }
  beam(animal, [0.22, 0.72, 0], [0.04, 0.35, 0.03], 0.055, dark);
  beam(animal, [0.94, 0.88, 0], [1.05, 1.12, 0], 0.045, dark);
  const wheels: THREE.Group[] = [];
  if(kind!=="pack-horse") {
  // Two wooden shafts visibly join harness and cart.
  for (const z of [-0.24, 0.24]) {
    beam(g, [-1.1, 0.38, z], [0.85, 0.47, z], 0.025);
    beam(g, [0.82, 0.48, z], [0.82, 0.84, z * 0.7], 0.018, dark);
    beam(g, [-0.58, 0.86, z / 2], [1.3, 1.02, z / 3], 0.008, dark);
  }
  box(g, 1.05, 0.1, 0.64, -0.85, 0.43, 0);
  for (const z of [-0.31, 0.31]) {
    box(g, 1.08, 0.23, 0.04, -0.85, 0.58, z);
    const wheel = new THREE.Group();
    wheel.position.set(-0.94, 0.3, z * 1.28);
    wheel.name = "cart-wheel";
    g.add(wheel);
    mesh(wheel, new THREE.TorusGeometry(0.29, 0.025, 5, 16), dark);
    for (let j = 0; j < 10; j++) {
      const a = (j / 10) * Math.PI * 2;
      beam(
        wheel,
        [0, 0, 0],
        [Math.cos(a) * 0.28, Math.sin(a) * 0.28, 0],
        0.012,
      );
    }
    wheels.push(wheel);
  }
  if (index % 2) {
    const canopy = mesh(
      g,
      new THREE.CylinderGeometry(0.34, 0.34, 0.85, 12, 1, true, 0, Math.PI),
      linen,
      -0.96,
      0.65,
      0,
    );
    canopy.rotation.z = Math.PI / 2;
  } else
    for (let i = 0; i < 3; i++) {
      const sack = mesh(
        g,
        new THREE.SphereGeometry(0.2, 7, 5),
        linen,
        -1.13 + i * 0.23,
        0.65,
        0,
      );
      sack.scale.set(0.8, 0.8, 1.25);
    }
  } else {
    // Independent laden pack donkey: saddlebags replace the cart, not just its color.
    for(const side of [-1,1]){
      const bag=mesh(animal,new THREE.SphereGeometry(1,10,7),linen,.6,.64,side*.23);
      bag.scale.set(.26,.19,.14);
      for(const x of [.4,.6,.8])beam(animal,[x,.82,side*.2],[x,.49,side*.29],.008,dark);
      if(side===1){
        const bundle=mesh(animal,new THREE.CylinderGeometry(.12,.12,.52,8),linen,.6,.92,0);
        bundle.rotation.z=Math.PI/2;
      }
      beam(animal,[.39,.78,side*.19],[.79,.51,side*.33],.014,dark);
    }
  }
  if(kind==="handcart"){
    animal.removeFromParent();headGroup.removeFromParent();legs.forEach(leg=>leg.removeFromParent());
    legs.length=0;
    // Handles reach the porter's hands; no invisible horse is rendered.
    for(const side of [-1,1])beam(g,[-.4,.43,side*.24],[.58,.54,side*.24],.024,wood);
  }
  if(kind==="pack-horse")beam(g,[1.3,1.02,0],[1.9,.78,.13],.008,dark);
  animal.scale.y=1.6;headGroup.scale.y=1.6;
  legs.forEach(leg=>{leg.position.y*=1.6;leg.scale.y=1.6;});
  const animated = [...legs, ...wheels, headGroup];
  animated.forEach((part) => g.remove(part));
  batchStatic(g);
  animated.forEach((part) => {
    batchStatic(part);
    if(kind!=="handcart"||part!==headGroup)g.add(part);
  });
  // Clip the traffic to the same rounded ground boundary. Each train wraps
  // only after its entire horse, cart and driver have left that boundary.
  const materials = new Map<THREE.Material, THREE.ShaderMaterial>();
  g.traverse((n) => {
    if (!(n instanceof THREE.Mesh || n instanceof THREE.Line)) return;
    const original = n.material as THREE.ShaderMaterial;
    let material = materials.get(original);
    if (!material) {
      material = original.clone();
      material.uniforms = original.uniforms;
      material.fragmentShader = material.fragmentShader.replace(
        "void main(){",
        `void main(){
        float roadS=point.x*.64278761+point.z*.76604444;
        float roadD=-point.x*.76604444+point.z*.64278761;
        if(length(vec2(max(0.,abs(roadS)-16.),max(0.,abs(roadD)-8.)))>6.)discard;
      `,
      );
      materials.set(original, material);
    }
    n.material = material;
  });
  g.name = "horse-cart";
  return { group: g, legs, wheels, head: headGroup };
}
// Batch the static model: details should not require hundreds of draw calls.
function batchStatic(group: THREE.Group) {
  group.updateWorldMatrix(true, true);
  const inverse = group.matrixWorld.clone().invert();
  const batches = new Map<
    THREE.Material,
    { geometries: THREE.BufferGeometry[]; lines: boolean }
  >();
  group.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh || obj instanceof THREE.Line)) return;
    const material = obj.material as THREE.Material;
    let geometry = obj.geometry.clone();
    if (obj instanceof THREE.Line && !(obj instanceof THREE.LineSegments)) {
      const source = geometry.getAttribute("position"),
        positions: number[] = [];
      for (let i = 0; i < source.count - 1; i++)
        for (const index of [i, i + 1])
          positions.push(
            source.getX(index),
            source.getY(index),
            source.getZ(index),
          );
      geometry.dispose();
      geometry = new THREE.BufferGeometry().setAttribute(
        "position",
        new THREE.Float32BufferAttribute(positions, 3),
      );
    }
    if (geometry.index) {
      const flat = geometry.toNonIndexed();
      geometry.dispose();
      geometry = flat;
    }
    geometry.applyMatrix4(inverse.clone().multiply(obj.matrixWorld));
    geometry.deleteAttribute("uv");
    const batch = batches.get(material) ?? {
      geometries: [],
      lines: obj instanceof THREE.Line,
    };
    batch.geometries.push(geometry);
    batches.set(material, batch);
  });
  group.traverse((obj) => {
    if (obj instanceof THREE.Mesh || obj instanceof THREE.Line)
      obj.geometry.dispose();
  });
  group.clear();
  batches.forEach(({ geometries, lines }, material) => {
    const merged = mergeGeometries(geometries);
    geometries.forEach((g) => g.dispose());
    if (merged) {
      const drawable = lines ? new THREE.LineSegments(merged, material) : new THREE.Mesh(merged, material);
      const uniforms=(material as THREE.ShaderMaterial).uniforms;
      if(uniforms?.ground?.value)drawable.renderOrder=uniforms.water?.value ? -3 : -2;
      group.add(drawable);
    }
  });
}
export function person(parent: THREE.Object3D, variant: number, walking = false, detail: DetailLevel = 2) {
  return buildFigure(parent, variant, walking, detail, batchStatic);
}

// Authored in the horizontal/depth basis of the supplied crop, not repeated districts.
function bank(parent: THREE.Group, side: "near" | "far") {
  const shape = new THREE.Shape();
  const direction = side === "far" ? 1 : -1;
  const coast: number[][] = [];
  for(let s=-29;s<=29.001;s+=.2)
    coast.push([s,bankSection(side,s,0).d]);
  // Continue dry land beyond the crop without joining the opposite bank.
  const back=side==="far"?-60:24;
  const expanded=[...coast,[29,back],[-29,back]];
  expanded.forEach(([x,z],i)=>{
    const p=scrollPoint(x,z);
    if(i===0)shape.moveTo(p.x,-p.z);else shape.lineTo(p.x,-p.z);
  });
  shape.closePath();
  const ground = mesh(
    parent,
    new THREE.ShapeGeometry(shape),
    mat(0xb09a6d, true, true),
    0,
    GROUND_Y,
    0,
    false,
  );
  ground.rotation.x = -Math.PI / 2;
  const face=buildBankFace(side);batchStatic(face);parent.add(face);
  const marks: THREE.Vector3[] = [];
  for(let s=-21.8;s<21.8;s+=.16){
    if(Math.sin(s*5.1)+Math.sin(s*13.)<-.3)continue;
    for(const t of [0,.10]){
      const d=bankSection(side,s+t,0).d-direction*.012;
      const p=scrollPoint(s+t,d);p.y=GROUND_Y+.006;marks.push(p);
    }
  }
  const contour = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(marks),createDryInk(.12));
  parent.add(contour);

}
export function hall(
  parent: THREE.Group,
  s: number,
  d: number,
  w: number,
  depth: number,
  h: number,
  turn = 0,
  kind: BuildingKind = "dwelling",
  gableRoof = false,
) {
  h = Math.max(h, MIN_EAVE_HEIGHT);
  const g = new THREE.Group();
  parent.add(g);
  g.position.copy(scrollPoint(s, d));
  g.position.y = GROUND_Y;
  g.rotation.y = turn;
  if (kind === "ornate-gate") { g.add(buildOrnateGate(w,depth,h)); return g; }
  if (kind === "construction") {
    g.add(buildConstruction(w,depth,h));return g;
  }
  if (kind === "upper-storey") {
    g.name="two-storey-balcony-house";
    const floor=h+.12;
    // Open ground-floor shop and visible floor beams; the upper hall is narrower
    // than the balcony envelope so screens and railing have genuine depth.
    box(g,w,.09,depth,0,.045,0,plaster);
    for(let x=-w/2;x<=w/2+.001;x+=w/4)for(const z of [-depth*.43,depth*.43])
      beam(g,[x,0,z],[x,floor,z],.047,dark);
    box(g,w,.10,depth,0,floor,0,wood);
    box(g,w,h*.6,.06,0,h*.3,-depth*.43,plaster);
    for(const x of [-w*.25,w*.25])box(g,w*.35,.08,.55,x,.51,0,wood);
    for(const side of [-1,1]){
      box(g,.055,h*.62,depth*.84,side*w*.5,h*.31,0,plaster);
      for(let bay=0;bay<3;bay++){
        const x=(bay-1)*w*.29;
        if(bay===1)continue;
        box(g,w*.22,h*.3,.035,x,h*.15,depth*.43,wood);
        for(let slat=0;slat<5;slat++)beam(g,[x-w*.1+slat*w*.05,h*.3,depth*.43],[x-w*.1+slat*w*.05,h*.8,depth*.43],.008,dark);
      }
    }
    const upper=hall(new THREE.Group(),0,0,w*.88,depth*.69,h*.89,0,"gallery",true);
    upper.position.set(0,floor+.05,-depth*.055);g.add(upper);
    for(const side of [-1,1]){
      for(let j=0;j<=16;j++){
        const x=-w*.49+j*w*.98/16;
        beam(g,[x,floor,side*depth*.48],[x,floor+.39,side*depth*.48],.012,dark);
      }
      for(const y of [.16,.4])beam(g,[-w*.49,floor+y,side*depth*.48],[w*.49,floor+y,side*depth*.48],.018);
      for(const x of [-w*.49,w*.49])for(const y of [.16,.4])
        beam(g,[x,floor+y,-depth*.48],[x,floor+y,depth*.48],.018);
    }
    // Open shutters and a hanging sign identify the occupied upper storey.
    for(const x of [-w*.27,w*.27]){
      const shutter=box(g,.29,.5,.035,x,floor+.68,depth*.31,wood);shutter.rotation.y=.4;
    }
    box(g,.22,.47,.025,w*.36,.92,depth*.48,linen);
    return g;
  }
  if (kind === "compound") {
    const rear = hall(g, 0, 0, w * 0.9, depth * 0.35, h, 0, "dwelling");
    rear.position.set(0, 0, -depth * 0.28);
    const wing = hall(g, 0, 0, depth * 0.5, w * 0.27, h * 0.74, Math.PI/2, "warehouse");
    wing.position.set(-w * 0.31, 0, depth * 0.14);
    // Low yard wall and a recessed gate rather than another enclosed hall.
    box(
      g,
      w * 0.55,
      h * 0.27,
      0.08,
      w * 0.17,
      h * 0.135,
      depth * 0.42,
      plaster,
    );
    const gateH=MIN_EAVE_HEIGHT*.94;
    box(g, 0.38, gateH, 0.06, w * 0.16, gateH/2, depth * 0.43, dark);
    box(g, 0.53, 0.065, 0.28, w * 0.16, gateH+.035, depth * 0.42, roof).name="entry-lintel";
    for(const side of [-1,1])beam(g,[w*.16+side*.23,0,depth*.42],[w*.16+side*.23,gateH,depth*.42],.02,dark);
    for (let i = 0; i < 3; i++)
      mesh(
        g,
        new THREE.CylinderGeometry(0.11, 0.09, 0.17, 8),
        linen,
        w * 0.12 + i * 0.24,
        0.085,
        0,
      );
    return g;
  }
  if (kind === "courtyard") {
    for (const side of [-1, 1]) {
      const wing = hall(g, 0, 0, depth * 0.92, w * 0.27, h * 0.86, Math.PI/2);
      wing.position.set(side * w * 0.34, 0, 0);
    }
    const rear = hall(g, 0, 0, w * 0.36, depth * 0.28, h);
    rear.position.set(0, 0, -depth * 0.35);
    for (const side of [-1, 1])
      box(
        g,
        w * 0.1,
        MIN_EAVE_HEIGHT*.94,
        0.1,
        side * w * 0.18,
        MIN_EAVE_HEIGHT*.47,
        depth / 2,
        plaster,
      );
    box(g, w * 0.24, 0.07, 0.34, 0, MIN_EAVE_HEIGHT*.94+.035, depth / 2, roof).name="entry-lintel";
    return g;
  }
  if (kind === "openhall") {
    // Open-front trading shelter: daylight between posts, benches and a back screen.
    box(g, w, h * 0.72, 0.045, 0, h * 0.36, -depth / 2, wood);
    for (const side of [-1, 1]) {
      box(g, 0.045, h * 0.46, depth, (side * w) / 2, h * 0.23, 0, plaster);
      box(g, w * 0.36, 0.07, depth * 0.22, side * w * 0.25, h * 0.25, 0, wood);
    }
    for (let i = 0; i <= 4; i++) {
      const x = -w / 2 + (i * w) / 4;
      beam(g, [x, 0, depth / 2], [x, h, depth / 2], 0.032);
      beam(
        g,
        [x, h * 0.72, depth / 2],
        [x + 0.13, h * 0.94, depth / 2],
        0.016,
        dark,
      );
    }
  } else if(kind==='shed') {
    box(g,w,h,depth,0,h/2,0,wood);
  } else {
    // Front/rear bays are recessed between posts. A complete solid box here
    // erased the open screens, doorways and porch depth visible in the crop.
    box(g,w,.08,depth,0,.04,0,plaster);
    for(const side of [-1,1]){
      if(gableRoof||kind==='warehouse'||kind==='shop'){
        // Leave the gable entrance open; its dark back panel is recessed.
        for(const end of [-1,1])box(g,.055,h,depth*.36,side*w/2,h/2,end*depth*.32,plaster);
        box(g,.055,h*.12,depth*.28,side*w/2,h*.94,0,plaster);
      }else box(g,.055,h,depth,side*w/2,h/2,0,plaster);
      const bays=Math.max(2,Math.ceil(w/.7)),bay=w/bays,z=side*depth/2;
      for(let i=0;i<=bays;i++){
        const x=-w/2+i*bay;box(g,.04,h,.045,x,h/2,z,dark);
        if(i<bays){
          const cx=x+bay/2;
          if(i!==Math.floor(bays/2))box(g,bay-.045,h*.25,.04,cx,h*.125,z,kind==='warehouse'?wood:plaster);
          box(g,bay-.045,h*.12,.04,cx,h*.94,z,plaster);
          const doorway=i===Math.floor(bays/2);
          box(g,bay-.07,h*(doorway?.88:.5),.025,cx,h*(doorway?.44:.5),z-side*.15,dark);
          if(i!==Math.floor(bays/2))box(g,bay*.72,h*.22,.026,cx,h*.37,z-side*.035,wood);
        }
      }
      box(g,w,.045,.05,0,h*.88,z,dark);
    }
  }
  // Low shop/warehouse gables contrast with broad hipped dwelling roofs.
  // Restrained concave eaves follow the crop rather than pagoda silhouettes.
  const gabled = gableRoof || kind === "warehouse" || kind === "shop" || kind === "shed";
  const e = w / 2 + 0.2,
    f = depth / 2 + 0.23;
  const r = gabled ? e : w * 0.29;
  const y = h + 0.1,
    top = h + Math.min(0.64, depth * (gabled ? 0.28 : 0.23));
  const roofY = (t: number) =>
    top + (y - top) * t - Math.sin(t * Math.PI) * 0.065;
  const positions: number[] = [];
  const triangle = (a: number[], b: number[], c: number[]) =>
    positions.push(...a, ...b, ...c);
  for (const side of [-1, 1]) {
    for (let row = 0; row < 10; row++) {
      const t = row / 10,
        u = (row + 1) / 10;
      const a = r + (e - r) * t,
        b = r + (e - r) * u;
      const A = [-a, roofY(t), side * f * t],
        B = [a, roofY(t), side * f * t];
      const C = [b, roofY(u), side * f * u],
        D = [-b, roofY(u), side * f * u];
      triangle(A, B, C);
      triangle(A, C, D);
      if (!gabled) {
        const P = [side * a, roofY(t), -f * t],
          Q = [side * a, roofY(t), f * t];
        const R = [side * b, roofY(u), f * u],
          S = [side * b, roofY(u), -f * u];
        triangle(P, Q, R);
        triangle(P, R, S);
      }
      beam(
        g,
        [-b, roofY(u) + 0.012, side * f * u],
        [b, roofY(u) + 0.012, side * f * u],
        0.005,
        dark,
      );
    }
    for (let i = 0; i <= Math.ceil(w * 10); i++) {
      const x = -e + (2 * e * i) / Math.ceil(w * 10),
        rx = THREE.MathUtils.clamp(x, -r, r);
      const points = Array.from({ length: 11 }, (_, j) => {
        const t = j / 10;
        return new THREE.Vector3(
          rx + (x - rx) * t,
          roofY(t) + 0.008,
          side * f * t,
        );
      });
      g.add(
        new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), ink),
      );
    }
    beam(g, [-e, y - 0.025, side * f], [e, y - 0.025, side * f], 0.027, wood);
    for (let x = -w / 2; x <= w / 2; x += 0.22)
      beam(
        g,
        [x, y - 0.055, side * (f - 0.2)],
        [x, y - 0.025, side * f],
        0.017,
        wood,
      );
    if (gabled) {
      const end = new THREE.BufferGeometry().setAttribute(
        "position",
        new THREE.Float32BufferAttribute(
          [
            (side * w) / 2,
            h,
            -depth / 2,
            (side * w) / 2,
            top - 0.04,
            0,
            (side * w) / 2,
            h,
            depth / 2,
          ],
          3,
        ),
      );
      end.computeVertexNormals();
      mesh(g, end, kind === "warehouse" ? wood : plaster);
      beam(g, [side * e, y, -f], [side * e, top, 0], 0.024, dark);
      beam(g, [side * e, top, 0], [side * e, y, f], 0.024, dark);
    }
  }
  const geo = new THREE.BufferGeometry().setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geo.computeVertexNormals();
  mesh(g, geo, kind === "shed" ? linen : roof);
  beam(g, [-r, top + 0.025, 0], [r, top + 0.025, 0], 0.028, dark);
  const close=new THREE.Group();close.name='close-only-joinery';g.add(close);
  if(kind!=='shed')addReferenceArchitecture(close,w,depth,h,gabled);
  if (kind === "openhall") {
    beam(
      g,
      [-w / 2, h * 0.9, depth / 2],
      [w / 2, h * 0.9, depth / 2],
      0.035,
      dark,
    );
    return g;
  }
  if (kind === "shed") {
    // Rough vertical boards, a low door, and uneven straw at the eaves.
    for (let x = -w / 2; x < w / 2; x += 0.13)
      beam(g, [x, 0, depth / 2 + 0.02], [x, h, depth / 2 + 0.02], 0.009, dark);
    box(
      g,
      w * 0.24,
      h * 0.90,
      0.028,
      -w * 0.12,
      h * 0.45,
      depth / 2 + 0.04,
      dark,
    );
    for (let x = -e; x < e; x += 0.055)
      for (const side of [-1, 1])
        beam(
          g,
          [x, y + 0.03, side * (f - 0.13)],
          [x + 0.015, y - 0.055 - Math.sin(x * 61) * 0.025, side * f],
          0.008,
          linen,
        );
    return g;
  }
  const frontBays=Math.max(2,Math.ceil(w/.7));
  for (let i = 0; i <= frontBays; i++) {
    const x = -w / 2 + (i * w) / frontBays;
    box(g, 0.037, h, 0.035, x, h / 2, depth / 2 + 0.018, dark);

  }
  for (const side of [-1, 1])
    for (let z = -depth / 2; z <= depth / 2; z += 0.5)
      if(!gabled||Math.abs(z)>depth*.14)box(g, 0.035, h, 0.032, (side * w) / 2, h / 2, z, dark);
  for(let i=0;i<frontBays;i++)if(i!==Math.floor(frontBays/2)){
    const bay=w/frontBays;
    box(g,bay,.032,.035,-w/2+(i+.5)*bay,h*.28,depth/2+.04,dark);
  }
  if (kind === "shop") {
    // Hanging shop board and small wares remain within the roof overhang.
    beam(
      g,
      [-w * 0.36, h * 0.9, depth / 2],
      [-w * 0.36, h * 0.9, depth / 2 + 0.2],
      0.016,
      dark,
    );
    box(g, 0.18, h * 0.38, 0.025, -w * 0.36, h * 0.68, depth / 2 + 0.19, linen);
    for (let i = 0; i < 5; i++) {
      const x = -w * 0.34 + i * w * 0.17;
      mesh(
        g,
        new THREE.CylinderGeometry(0.055, 0.045, 0.09, 8),
        i % 2 ? linen : wood,
        x,
        h * 0.27,
        depth / 2 + 0.14,
      );
    }
    // Deep dark shop bays, counter, and a restrained cloth valance under the eaves.
    for (const x of [-w * 0.3, 0, w * 0.3]) {
      box(g, w * 0.25, h * 0.7, 0.025, x, h * 0.42, depth / 2 + 0.05, dark);
      box(g, w * 0.25, h * 0.23, 0.16, x, h * 0.12, depth / 2 + 0.07, wood);
    }
    const awning = box(g, w * 0.94, 0.035, 0.38, 0, h * 0.96, depth / 2, linen);
    awning.rotation.x = 0.12;
    box(g, w * 0.94, 0.09, 0.025, 0, h * 0.90, depth / 2 + 0.18, linen);
    box(g, 0.14, h * 0.57, 0.035, -w * 0.41, h * 0.65, depth / 2 + 0.09, linen);
  } else if (kind === "gallery") {
    // Balcony corner posts and hanging lanterns distinguish larger tea halls.
    for (const x of [-w * 0.44, w * 0.44]) {
      beam(g, [x, 0, depth / 2 + 0.12], [x, h, depth / 2 + 0.12], 0.032);
      box(g, 0.14, 0.19, 0.12, x, h * 0.76, depth / 2 + 0.13, linen);
    }
    // Screened single-storey veranda: the canopy and central doorway
    // have the same adult clearance as the adjoining shop bays.
    const bay=w/frontBays;
    for(let i=0;i<frontBays;i++)if(i!==Math.floor(frontBays/2)){
      const cx=-w/2+(i+.5)*bay;
      box(g,bay-.06,h*.3,.025,cx,h*.5,depth/2+.05,dark);
      for(let j=0;j<4;j++)box(g,.025,h*.3,.03,cx+(j-1.5)*bay*.2,h*.5,depth/2+.08,wood);
      for(const y of [.36,.64])beam(g,[cx-bay*.43,h*y,depth/2+.08],[cx+bay*.43,h*y,depth/2+.08],.012,wood);
    }
    box(g,w+.25,.055,depth+.28,0,h*.98,0,roof);
  } else if (kind === "warehouse") {
    for (const side of [-1, 1]) {
      box(
        g,
        w * 0.26,
        h * 0.8,
        0.03,
        side * w * 0.2,
        h * 0.4,
        depth / 2 + 0.055,
        dark,
      );
      for (let i = 0; i < 5; i++)
        box(
          g,
          0.035,
          h * 0.78,
          0.035,
          side * w * 0.2 - w * 0.11 + i * w * 0.055,
          h * 0.4,
          depth / 2 + 0.08,
          wood,
        );
    }
  } else {
    for (const x of [-w * 0.27, w * 0.27]) {
      box(g, w * 0.2, h * 0.34, 0.025, x, h * 0.57, depth / 2 + 0.055, dark);
      for (let i = -2; i <= 2; i++)
        box(
          g,
          0.016,
          h * 0.33,
          0.02,
          x + i * w * 0.037,
          h * 0.57,
          depth / 2 + 0.075,
          linen,
        );
      beam(
        g,
        [x - w * 0.1, h * 0.57, depth / 2 + 0.08],
        [x + w * 0.1, h * 0.57, depth / 2 + 0.08],
        0.012,
        linen,
      );
    }
  }
  return g;
}
function workingBoat(
  parent: THREE.Group,
  s: number,
  d: number,
  length: number,
  width: number,
  cabin: boolean,
  turn: number,
) {
  const g = new THREE.Group();
  g.position.copy(scrollPoint(s, d));
  g.rotation.y = turn;
  parent.add(g);
  const style=cabin?'cabin':length>5?'freight':length<3.8?'skiff':'canopy';
  g.userData.boatStyle=style;
  for(const detail of [0,2] as const){
    const model=buildReferenceBoat(length,width,style,detail);model.name='boat-detail-'+detail;
    addCrewEquipment(model,length,width,style);
    batchStatic(model);g.add(model);
  }
  if(style==="freight" || style==="cabin"){
    const rig=buildLoweringRig(length,width);
    // Batch each rigid part separately so the hinge and sail remain articulated.
    for(const name of ["mast-tabernacle","folding-mast-spar","battened-sail"])
      batchStatic(rig.getObjectByName(name) as THREE.Group);
    g.add(rig);
  }
  return g;
}
export function createBridgeStudy(seed = Math.floor(Math.random() * 10000)) {
  const group = new THREE.Group();
  const river = mesh(group, riverGeometry(), mat(0xcfbd8e, true, false, true), 0, 0, 0, false);
  river.name = "river-surface";
  bank(group, "far");
  bank(group, "near");
  const bridge = new THREE.Group();
  bridge.position.copy(scrollPoint(BRIDGE.center.s, BRIDGE.center.d));
  bridge.rotation.y = REFERENCE_AZIMUTH - BRIDGE.angle;
  group.add(bridge);
  const height = bridgeHeight,
    half = BRIDGE.length / 2;
  // Broad transverse decking seated on five longitudinal timber ribs.
  for (let i = 0; i < 56; i++) {
    const dx = BRIDGE.length / 56,
      x = -half + (i + 0.5) * dx;
    const plank = box(
      bridge,
      dx + 0.008,
      0.09,
      BRIDGE.width,
      x,
      height(x) - 0.045,
      0,
    );
    plank.rotation.z = Math.atan2(height(x + dx / 2) - height(x - dx / 2), dx);
  }
  // Staggered overlapping timber courses give the open arch its deep structure.
  for (const z of [-0.88, -0.44, 0, 0.44, 0.88]) {
    for (let layer = 0; layer < 3; layer++) {
      const count = 10,
        step = BRIDGE.length / count;
      for (let i = 0; i < count; i++) {
        const a = -half + i * step,
          b = Math.min(half, a + step * 1.24);
        const inset = 0.14 + layer * 0.105;
        beam(
          bridge,
          [a, height(a) - inset, z],
          [b, height(b) - inset, z],
          0.064,
          layer === 1 ? dark : wood,
        );
      }
    }
  }
  // Paired outer arch bands and transverse tie logs; no piers in the channel.
  for (let i = 0; i < 24; i++) {
    const a = -half + (i * BRIDGE.length) / 24,
      b = a + BRIDGE.length / 24;
    for (const side of [-1, 1]) {
      const z = side * (BRIDGE.width / 2 + 0.035);
      for (const inset of [0.12, 0.38])
        beam(
          bridge,
          [a, height(a) - inset, z],
          [b, height(b) - inset, z],
          0.052,
        );
      if (i % 2 === 0)
        beam(
          bridge,
          [a, height(a) - 0.38, z],
          [b, height(b) - 0.12, z],
          0.038,
          dark,
        );
    }
    if (i % 2 === 0)
      beam(
        bridge,
        [a, height(a) - 0.25, -BRIDGE.width / 2 - 0.12],
        [a, height(a) - 0.25, BRIDGE.width / 2 + 0.12],
        0.065,
      );
  }
  for (let i = 0; i <= 16; i++) {
    const x = -half + (i * BRIDGE.length) / 16;
    beam(
      bridge,
      [x, height(x) - 0.13, -BRIDGE.width / 2],
      [x, height(x) - 0.13, BRIDGE.width / 2],
      0.045,
    );
    for (const z of [-BRIDGE.width / 2, BRIDGE.width / 2]) {
      beam(bridge, [x, height(x), z], [x, height(x) + BRIDGE_RAIL_HEIGHT, z], 0.021);
      if (i < 16) {
        const next = x + BRIDGE.length / 16;
        for (const rail of [BRIDGE_RAIL_HEIGHT / 2, BRIDGE_RAIL_HEIGHT])
          beam(
            bridge,
            [x, height(x) + rail, z],
            [next, height(next) + rail, z],
            0.018,
          );
      }
    }
  }
  const foundations=buildBridgeFoundations();batchStatic(foundations);bridge.add(foundations);
  // Timber bearing sills rest on pale masonry abutments at both ends.
  for (const side of [-1, 1]) {
    box(
      bridge,
      0.6,
      0.22,
      BRIDGE.width + 0.18,
      side * half,
      GROUND_Y - 0.12,
      0,
      dark,
    );
    box(
      bridge,
      0.9,
      0.06,
      BRIDGE.width,
      side * (half + 0.38),
      // The board top must clear the bank: coplanar surfaces flicker on orbit.
      GROUND_Y - 0.015,
      0,
    );
  }
  // Compacted-earth approaches: broken wheel wear, retaining one ground palette.
  // Interpretation informed by Song road traces at Shuntian Gate, not proof of
  // the material at this bridge. No continuous stone-paving pattern is assumed.
  const roadInk=createDryInk(.17),rutPositions:number[]=[];
  for(const side of [-1,1])for(let x=half+.9;x<16;x+=.18){
    const centre=bridgePoint(side*x);if(Math.abs(centre.d)>13.3)continue;
    for(const lane of [-.16,.16])for(const end of [0,1]){
      const p=bridgePoint(side*(x+end*.12),lane+.018*Math.sin(x*1.7));
      const point=scrollPoint(p.s,p.d);rutPositions.push(point.x,GROUND_Y+.008,point.z);
    }
    if(Math.floor(x*10)%7===0)for(const shoulder of [-1,1]){
      const p=bridgePoint(side*x,shoulder*(1.45+.13*Math.sin(x*2.3))),point=scrollPoint(p.s,p.d);
      if(Math.abs(p.d)<13.3)mesh(group,new THREE.DodecahedronGeometry(.015,0),plaster,point.x,GROUND_Y+.008,point.z,false).scale.y=.25;
    }
  }
  group.add(new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(rutPositions,3)),roadInk));
  const bridgeCounters=bridgeMarket(bridge,height,BRIDGE.width,BRIDGE.length);
  const detailedBuildings: {root:THREE.Group; base:THREE.Group; fine:THREE.Group; coarse:THREE.Group; height:number; detail:DetailLevel}[]=[];
  for (const [index,h] of HALLS.entries()) {
    const root=new THREE.Group();root.name="reference-building";
    root.position.copy(scrollPoint(h.s,h.d));root.position.y=GROUND_Y;
    root.rotation.y=REFERENCE_AZIMUTH-h.angle+(h.side==="near"?Math.PI:0);
    const base=hall(new THREE.Group(),0,0,h.width,h.depth,h.height,0,BUILDING_KINDS[index],h.gable);
    base.position.set(0,0,0);
    const fine=new THREE.Group();fine.name="close-architecture";root.add(fine);
    base.updateMatrixWorld(true);
    const closeParts:THREE.Object3D[]=[];
    base.traverse(n=>{if(n.name==='close-only-joinery')closeParts.push(n);});
    for(const part of closeParts){const matrix=part.matrixWorld.clone();part.removeFromParent();part.applyMatrix4(matrix);fine.add(part);}
    batchStatic(base);root.add(base);
    // Recessed lattice screens, brackets and stacked wares add real depth.
    for(let x=-h.width*.4;x<h.width*.45;x+=.55){
      for(const side of [-1,1]){
        beam(fine,[x,h.height-.14,side*h.depth*.48],[x+.1,h.height-.03,side*(h.depth*.5+.1)],.012,dark);
        box(fine,.17,.035,.22,x,h.height-.06,side*h.depth*.5,wood);
      }
      if(index%3!==2)for(const dx of [-.06,0,.06])beam(fine,[x+dx,h.height*.4,h.depth*.5+.035],[x+dx+.05,h.height*.7,h.depth*.5+.035],.004,linen);
    }
    if(index%3===0)for(let j=0;j<3;j++){
      const crate=box(fine,.19,.17,.17,-h.width*.32+j*.2,.085,h.depth*.5+.12,wood);
      beam(crate,[-.095,-.085,.086],[.095,.085,.086],.009,dark);
    }
    batchStatic(fine);
    const coarse=new THREE.Group();coarse.name="distant-architecture";root.add(coarse);
    // Same footprint and roof envelope, but no rafters, tile ribs or lattice.
    box(coarse,h.width,h.height,h.depth,0,h.height/2,0,plaster);
    const w=h.width/2+.2,d=h.depth/2+.23,y=h.height+.08,top=h.height+Math.min(.64,h.depth*.23),ridge=h.gable?w:w*.58;
    const vertices=[-w,y,-d,w,y,-d,w,y,d,-w,y,d,-ridge,top,0,ridge,top,0];
    const roofGeo=new THREE.BufferGeometry();roofGeo.setAttribute("position",new THREE.Float32BufferAttribute(vertices,3));
    roofGeo.setIndex([0,4,5,0,5,1,3,2,5,3,5,4,0,3,4,1,5,2]);roofGeo.computeVertexNormals();mesh(coarse,roofGeo,roof);
    box(coarse,h.width*.55,h.height*.5,.025,0,h.height*.38,h.depth/2+.02,dark);batchStatic(coarse);
    if(BUILDING_KINDS[index]==="ornate-gate" || BUILDING_KINDS[index]==="construction" || BUILDING_KINDS[index]==="upper-storey"){
      coarse.traverse(n=>{if(n instanceof THREE.Mesh || n instanceof THREE.Line)n.geometry.dispose();});coarse.clear();
      coarse.add(base.clone());
    }
    fine.visible=false;coarse.visible=false;
    detailedBuildings.push({root,base,fine,coarse,height:BUILDING_KINDS[index]==="upper-storey"?top+h.height+.17:BUILDING_KINDS[index]==="ornate-gate"?h.height+1.5:BUILDING_KINDS[index]==="construction"?h.height+1.15:top,detail:1});
  }
  const vegetationLevels=[0,1,2].map(level=>{
    geometryDetail=level as DetailLevel;const plants=new THREE.Group();plants.name="vegetation-detail-"+level;
    for (const {s,d,size,form} of FEATURE_TREES){
      const p=scrollPoint(s,d),t=characterTree(plants,p.x,p.z,form,s,true);
      t.scale.set(size*1.15,size*1.5,size*1.15);t.rotation.y=s*.31;
    }
    riversideNature(plants);batchStatic(plants);return plants;
  });geometryDetail=2;
  const vendorSites: {position:THREE.Vector3;turn:number;shop:number}[]=[];
  MARKET.forEach(({ s, d, parasol: covered, size }, i) => {
    const p = scrollPoint(s, d);
    const lateral =
      -(s - BRIDGE.center.s) * Math.sin(BRIDGE.angle) +
      (d - BRIDGE.center.d) * Math.cos(BRIDGE.angle);
    const turn =
      segmentDistance({ s, d }, MAIN_STREET) < 5.5
        ? REFERENCE_AZIMUTH - BRIDGE.angle + (lateral > 0 ? Math.PI : 0)
        : REFERENCE_AZIMUTH + (d > 0 ? Math.PI : 0);
    const shopRoot=new THREE.Group();shopRoot.position.set(p.x,GROUND_Y,p.z);shopRoot.rotation.y=turn;shopRoot.scale.set(.55*size,.72,.55*size);group.add(shopRoot);
    const shaded=covered || (size<1 && i%4===1);
    marketStall(shopRoot,i,!shaded && i%3===0);
    shopRoot.updateMatrixWorld(true);
    vendorSites.push({position:shopRoot.localToWorld(new THREE.Vector3(-.22,0,-.58)),turn,shop:i});
    if (shaded) marketParasol(shopRoot, i+(size<1?Math.floor(i/4):0), size < 1);
  });
  batchStatic(group);
  detailedBuildings.forEach(b=>group.add(b.root));
  vegetationLevels.forEach(g=>group.add(g));
  let plantDetail:DetailLevel=1;
  const carts = CARTS.map((_, i) => horseCart(group, i));
  const boats = BOATS.map((b) => {
    const vessel = workingBoat(
      group,
      b.s,
      b.d,
      b.length,
      b.width,
      b.cabin,
      REFERENCE_AZIMUTH + Math.PI / 2 - b.angle,
    );
    vessel.name = "working-boat";

    return vessel;
  });
  const moored = MOORED_BOATS.map((b) => {
    const vessel = workingBoat(
      group,
      b.s,
      b.d,
      b.length,
      b.width,
      b.cabin,
      REFERENCE_AZIMUTH + Math.PI / 2 - b.angle,
    );
    vessel.name = "moored-boat";

    return vessel;
  });
  const mooringPosts = new THREE.Group();
  group.add(mooringPosts);
  const ties = moored.flatMap((vessel, index) =>
    [-1, 1].map((side) => {
      const anchor = mooringAnchor(index, side),
        point = scrollPoint(anchor.s, anchor.d);
      beam(
        mooringPosts,
        [point.x, GROUND_Y-0.14, point.z],
        [point.x, GROUND_Y+0.24, point.z],
        0.028,
        dark,
      );
      const geometry = new THREE.BufferGeometry().setAttribute(
        "position",
        new THREE.Float32BufferAttribute(new Float32Array(9 * 3), 3).setUsage(
          THREE.DynamicDrawUsage,
        ),
      );
      const rope = new THREE.Line(geometry, ink);
      rope.name = "mooring-line";
      rope.frustumCulled = false;
      group.add(rope);
      return { vessel, index, side, point, rope };
    }),
  );
  batchStatic(mooringPosts);
  const boatLayouts = [...BOATS, ...MOORED_BOATS];
  const rippleGeometry = new THREE.BufferGeometry();
  const ripplePositions = new THREE.Float32BufferAttribute(
    new Float32Array(RIPPLE_COUNT * 8 * 3),
    3,
  );
  ripplePositions.setUsage(THREE.DynamicDrawUsage);
  rippleGeometry.setAttribute("position", ripplePositions);
  const ripples = new THREE.LineSegments(rippleGeometry, riverInk);
  ripples.name = "river-ripples";
  ripples.frustumCulled = false;
  ripples.renderOrder = 1;
  group.add(ripples);
  const wakes = createBoatWakes();
  group.add(wakes.mesh);
  const crowd = createCrowd(group, (i, level) => person(new THREE.Group(), i, true, level));
  const addPerson = (parent: THREE.Object3D, i: number, name: string) => {
    const p = crowd.add(parent, i, name);
    p.scale.multiply(new THREE.Vector3(PERSON_WIDTH_SCALE,PERSON_SCALE,PERSON_WIDTH_SCALE));
    return {
      group: p,
      left: p.getObjectByName("left-leg")!,
      right: p.getObjectByName("right-leg")!,
      leftArm: p.getObjectByName("left-arm")!,
      rightArm: p.getObjectByName("right-arm")!,
      head: p.getObjectByName("head")!,
      torso: p.getObjectByName("torso")!,
      leftElbow: p.getObjectByName("left-forearm")!,
      rightElbow: p.getObjectByName("right-forearm")!,
    };
  };
  const people = Array.from({ length: WALKER_COUNT }, (_, i) =>
    addPerson(group, i, "walking-person"),
  );
  const residents = STATIC_PEOPLE.map((_, i) =>
    addPerson(group, i, "resident-person"),
  );
  const observers = Array.from({ length: BRIDGE_OBSERVERS }, (_, i) =>
    (()=>{const p=addPerson(group,bridgeVariant(i),"bridge-observer");p.group.userData.activity=bridgeRole(i);return p;})(),
  );
  const shoppers = SHOP_VISITORS.map((_, i) =>
    addPerson(group, i, "shop-visitor"),
  );
  const vendors=vendorSites.map((_,i)=>addPerson(group,i%2?5:9,"market-vendor"));
  const drivers = carts.map((c,i)=>{
    const driver=addPerson(c.group,CART_KINDS[i]==="pack-horse"?4:3,"cart-driver");driver.group.scale.multiplyScalar(1/c.group.scale.x);return driver;
  });
  const crew = [...boats, ...moored].flatMap((b, i) =>
    boatCrewStations(boatLayouts[i].length,boatLayouts[i].width,b.userData.boatStyle).map((station,j) => ({
      rig: addPerson(b, station.role==="passenger"?[0,6,4][j%3]:3, "boat-crew"),
      station, boat: i,
    })),
  );
  const buildingPeople=[
    {building:8,x:-.8,y:HALLS[8].height+.17,z:HALLS[8].depth*.39,variant:6},
    {building:8,x:.7,y:HALLS[8].height+.17,z:HALLS[8].depth*.39,variant:0},
    {building:HALLS.length-1,x:.25,y:2.073,z:HALLS.at(-1)!.depth*.41,variant:9},
  ].map(site=>({...site,rig:addPerson(detailedBuildings[site.building].root,site.variant,"building-occupant")}));
  crowd.finish();
  function animatePerson(
    p: (typeof people)[number],
    id: number,
    time: number,
    pose: ReturnType<typeof walkPose>,
  ) {
    const idle = idleMotion(id, time, seed),
      stride = pose.moving ? Math.sin(pose.stride + id) : 0;
    p.group.position.copy(scrollPoint(pose.s, pose.d));
    p.group.position.y = pose.y + idle.breath + Math.abs(stride) * 0.003;
    p.group.rotation.set(
      0,
      REFERENCE_AZIMUTH - pose.angle + Math.PI / 2 + idle.look,
      idle.lean,
    );
    p.torso.rotation.set(0,0,0);p.leftElbow.rotation.set(0,0,0);p.rightElbow.rotation.set(0,0,0);
    const profile=FIGURE_TYPES[p.group.userData.variant % FIGURE_TYPES.length];
    const holding=['ledger','scroll','cup'].includes(profile.load);
    const loaded=profile.load==='baskets',elder=profile.name==='elder';
    const step=loaded?.30:elder?.24:.42;
    p.left.rotation.x=stride*step;p.right.rotation.x=-stride*step;
    p.leftArm.rotation.x=holding?-.12-stride*.035:loaded?-.22-stride*.06:-stride*.26;
    p.rightArm.rotation.x=holding?-.12+stride*.035:loaded?.015+stride*.008:stride*.26;
    p.head.rotation.y=idle.look*1.8;
    p.head.rotation.x=loaded?.13:elder?.09:0;
    // Looking over the bridge rail and reaching toward wares are distinct from
    // a walking cycle. Offsets are derived from absolute time, including seeks.
    if(p.group.name==='bridge-observer'){
      const a=bridgeActivity(id-200,time,seed);
      p.group.rotation.set(0,REFERENCE_AZIMUTH-BRIDGE.angle-a.facing+Math.PI/2,0);
      p.torso.rotation.set(a.torso,a.twist,0);
      p.leftArm.rotation.set(a.leftArm,0,a.leftSpread);
      p.rightArm.rotation.set(a.rightArm,0,a.rightSpread);
      p.leftElbow.rotation.x=a.leftElbow;p.rightElbow.rotation.x=a.rightElbow;
      p.head.rotation.set(a.headPitch,a.headTurn,0);
      p.left.rotation.x=0;p.right.rotation.x=0;
    }else if(!pose.moving&&p.group.name==='shop-visitor'){
      p.rightArm.rotation.x=-.65+Math.sin(time*.55+id)*.09;
      p.head.rotation.x=.16;p.head.rotation.y+=.12;
    }

  }
  return {
    group,
    metadata() {
      const mainStreet=people.slice(0,BRIDGE_WALKERS).map(p=>{
        const {x,z}=p.group.position;
        const s=x*Math.cos(REFERENCE_AZIMUTH)-z*Math.sin(REFERENCE_AZIMUTH)-BRIDGE.center.s;
        const d=x*Math.sin(REFERENCE_AZIMUTH)+z*Math.cos(REFERENCE_AZIMUTH)-BRIDGE.center.d;
        return s*Math.cos(BRIDGE.angle)+d*Math.sin(BRIDGE.angle);
      });
      const passingPeople=mainStreet.filter(x=>Math.abs(x)<BRIDGE.length/2).length;
      const approachPeople=mainStreet.filter(x=>Math.abs(x)>=BRIDGE.length/2&&Math.abs(x)<13.5).length;
      const roles=observers.reduce((counts,p)=>{
        const role=p.group.userData.activity as string;counts[role]=(counts[role]??0)+1;return counts;
      },{} as Record<string,number>);
      return {boatCrews:[...boats,...moored].map((b,i)=>({style:b.userData.boatStyle,count:crew.filter(c=>c.boat===i).length,roof:crew.filter(c=>c.boat===i&&c.station.role==="roof").length})),landmarks:["two-storey-balcony-house","ornate-street-gate"],crowd:crowd.metadata(),seed,palette:getScenePalette(),vegetationLevel:plantDetail,
        buildings:detailedBuildings.map(b=>b.detail),traffic:CART_KINDS,bridgeCounters,
        marketTypes:MARKET_TYPES,referenceTrees:FEATURE_TREES.map(t=>t.id),
        streetLife:{walkers:people.length,mainStreetWalkers:BRIDGE_WALKERS,approachPeople,
          bridgeWalkingDensity:passingPeople/BRIDGE.length,
          streetWalkingDensity:approachPeople/(27-BRIDGE.length)},
        bridgeLife:{stands:bridgeCounters.length,stationaryPeople:observers.length,passingPeople,roles}};
    },
    setPalette(value:ScenePalette){setScenePalette(value);},
    setPainting(enabled: boolean) {
      paintingAmount.value = enabled ? 1 : 0;
    },
    update(time: number, camera?: THREE.Camera, viewportHeight = 800, preview=false) {
      waterTime.value = time;
      wakes.update(time);
      const ortho=camera as THREE.OrthographicCamera|undefined;
      if(camera){
        const screen=(height:number,center:THREE.Vector3)=>projectedHeightPixels({height,viewportHeight,zoom:ortho?.zoom??1,
          orthographicSpan:ortho?.isOrthographicCamera?ortho.top-ortho.bottom:undefined,
          distance:center.distanceTo(camera.position),verticalFov:(camera as THREE.PerspectiveCamera).fov});
        for(const b of detailedBuildings){
          b.detail=chooseDetail(screen(b.height,b.root.position)/3,b.detail);
          b.base.visible=b.detail>0;b.fine.visible=b.detail===2;b.coarse.visible=b.detail===0;
        }
        plantDetail=chooseDetail(screen(FIGURE_HEIGHT*PERSON_SCALE,new THREE.Vector3()),plantDetail);
      }
      if(preview){plantDetail=0;for(const b of detailedBuildings){b.base.visible=false;b.fine.visible=false;b.coarse.visible=true;b.detail=0;}}
      vegetationLevels.forEach((g,i)=>g.visible=i===plantDetail);
      carts.forEach((cart, i) => {
        const pose = cartPose(i, time),
          stride = pose.moving ? pose.traveled * 15 : time * 2.4;
        cart.group.position.copy(scrollPoint(pose.s, pose.d));
        cart.group.position.y = pose.y;
        cart.group.rotation.set(
          0,
          REFERENCE_AZIMUTH - pose.angle,
          Math.atan(pose.slope),
          "YXZ",
        );
        cart.legs.forEach((leg, j) => {
          leg.rotation.z =
            Math.sin(stride + (j === 0 || j === 3 ? 0 : Math.PI)) *
            (pose.moving ? 0.23 : pose.turning ? 0.12 : 0);
        });
        cart.wheels.forEach((wheel, j) => {
          wheel.rotation.z =
            -pose.traveled / (0.7 * 0.29) +
            (pose.turning ? (pose.angle - CARTS[i].angle) * (j ? 1 : -1) : 0);
        });
        cart.head.position.y = Math.sin(stride) * 0.012;
      });
      people.forEach((p, i) =>
        animatePerson(p, i, time, walkPose(i, time, seed)),
      );
      residents.forEach((p, i) =>
        animatePerson(p, i + 100, time, residentPose(i, time, seed)),
      );
      observers.forEach((p, i) =>
        animatePerson(p, i + 200, time, observerPose(i, time, seed)),
      );
      shoppers.forEach((p, i) =>
        animatePerson(p, i + 300, time, shopperPose(i, time, seed)),
      );
      vendors.forEach((p,i)=>{
        const site=vendorSites[i],idle=idleMotion(i+700,time,seed),seated=i%6===1 || i%6===4;
        p.group.position.copy(site.position);p.group.position.y+=idle.breath-(seated?.10:0);
        p.group.rotation.set(.04,site.turn+idle.look,0);
        p.head.rotation.set(.17,idle.look,0);
        p.leftArm.rotation.x=-.75+Math.sin(time*.6+i)*.08;
        p.rightArm.rotation.x=-1.05+Math.sin(time*.6+i+.5)*.13;
        p.left.rotation.x=seated?-.9:0;p.right.rotation.x=seated?-.9:0;
      });
      drivers.forEach((p, i) => {
        const idle = idleMotion(i + 400, time, seed);
        const kind=CART_KINDS[i];
        // Seat the hips at the cart/saddle height instead of putting the feet
        // on the seat, which made the taller drivers float above the vehicle.
        const parentScale=carts[i].group.scale.y;
        const seatHeight=(kind==="pack-horse"?.9*1.6:.52)*parentScale;
        const localHeight=kind==="handcart"||kind==="pack-horse"?0:(seatHeight-.22*PERSON_SCALE)/parentScale;
        p.group.position.set(kind==="handcart"?.5:kind==="pack-horse"?1.9:-.42,localHeight+idle.breath,0);
        const walking=kind==="handcart"||kind==="pack-horse",stride=walking?Math.sin(time*3+i)*.32:0;
        p.left.rotation.x=walking?stride:-.8;p.right.rotation.x=walking?-stride:-.8;
        p.leftArm.rotation.x=walking?-.5:-.35;p.rightArm.rotation.x=walking?-.5:-.35;
        p.group.rotation.set(
          idle.lean,
          Math.PI / 2 + idle.look,
          idle.lean * 0.5,
        );
      });
      crew.forEach(({ rig: p, station }, i) => {
        const idle = idleMotion(i + 500, time, seed),pull=Math.sin(time*.9+i)*.12;
        p.group.position.set(station.x,station.y+idle.breath,station.z);
        p.group.rotation.set(station.role==="haul"?.14+pull:idle.lean,station.facing+idle.look,idle.lean);
        p.leftArm.rotation.x=station.role==="passenger"?-.18:-.85-pull;
        p.rightArm.rotation.x=station.role==="roof"?-1.35:-.72+pull;
        p.leftElbow.rotation.x=-.35;p.rightElbow.rotation.x=-.45;
        p.head.rotation.y=idle.look;
      });
      buildingPeople.forEach(({rig:p,...site},i)=>{
        const idle=idleMotion(i+900,time,seed);
        p.group.position.set(site.x,site.y+idle.breath,site.z);
        p.group.rotation.y=i>1?Math.PI/2:0;
        p.rightArm.rotation.x=i>1?-1.3+Math.sin(time*1.5+i)*.28:-.6;
        p.leftArm.rotation.x=-.65;p.head.rotation.y=idle.look;
      });
      for(const vessel of [...boats,...moored])for(const child of vessel.children){
        if(child.name.startsWith('boat-detail-'))child.visible=child.name==='boat-detail-'+(plantDetail===0?0:2);
      }
      boats.forEach((vessel, i) => {
        const pose = boatPose(i, time);
        const rig=vessel.getObjectByName("lowering-sail-rig");
        if(rig)updateLoweringRig(rig,Math.abs(pose.s-BRIDGE.center.s));
        vessel.visible = Math.abs(pose.s) < 25 + BOATS[i].length * 0.62 && Math.abs(pose.d) < 23 + BOATS[i].length * 0.62;
        vessel.position.copy(scrollPoint(pose.s, pose.d));
        vessel.position.y = pose.y;
        vessel.rotation.set(
          pose.pitch,
          REFERENCE_AZIMUTH + Math.PI / 2 - pose.angle,
          pose.roll,
        );
      });
      moored.forEach((vessel, i) => {
        const pose = mooredBoatPose(i, time);
        vessel.position.copy(scrollPoint(pose.s, pose.d));
        vessel.position.y = pose.y;
        vessel.rotation.set(
          pose.pitch,
          REFERENCE_AZIMUTH + Math.PI / 2 - pose.angle,
          pose.roll,
        );
      });
      // Lines follow the gently bobbing boats while their shore posts stay fixed.
      ties.forEach(({ vessel, index, side, point, rope }) => {
        const b = MOORED_BOATS[index];
        vessel.updateWorldMatrix(true, false);
        const start = vessel.localToWorld(
          new THREE.Vector3(b.width * 0.5, 0.3, side * b.length * 0.31),
        );
        const end = new THREE.Vector3(point.x, GROUND_Y+0.2, point.z),
          positions = rope.geometry.getAttribute("position");
        for (let i = 0; i <= 8; i++) {
          const t = i / 8,
            p = start.clone().lerp(end, t);
          p.y -= Math.sin(t * Math.PI) * 0.06;
          positions.setXYZ(i, p.x, p.y, p.z);
        }
        positions.needsUpdate = true;
      });
      crowd.update(camera, viewportHeight, preview);
      for (let i = 0; i < RIPPLE_COUNT; i++) {
        const ripple = riverRipple(i, time);
        for (let segment = 0; segment < 4; segment++)
          for (let end = 0; end < 2; end++) {
            const t = (segment + end) / 4,
              s = ripple.s + t * ripple.length;
            const far = shoreDepth("far", s),
              near = shoreDepth("near", s);
            const d=far+(near-far)*ripple.fraction+Math.sin(t*Math.PI*2+i)*.025;
            const p=scrollPoint(s,d);
            ripplePositions.setXYZ(i * 8 + segment * 2 + end, p.x, waterHeight(s,d,time)+.008, p.z);
          }
      }
      ripplePositions.needsUpdate = true;
    },
  };
}
