import * as THREE from "three";
import { paintMaterial, createDryInk } from "./paintMaterial";
import type { DetailLevel } from "../../../packages/scene-kit/lod";

// Observed forms: public/reference/chicago-rainbow-bridge.png. These remain editable
// approximations: the crop does not reveal the concealed sides of buildings/boats.
const timber = paintMaterial(0x917344),
  edge = paintMaterial(0x5e513a),
  board = paintMaterial(0xb29b6b),
  paper = paintMaterial(0xc8b486),
  tile = paintMaterial(0x8e8469),
  recess = paintMaterial(0x655b45),
  reed = paintMaterial(0xb4a178);
const ink=createDryInk(.78);
type P = [number, number, number];
const v = (p: P) => new THREE.Vector3(...p);
function solid(
  g: THREE.Object3D,
  geo: THREE.BufferGeometry,
  mat: THREE.Material,
  p: P = [0, 0, 0],
) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(...p);
  g.add(m);
  return m;
}
function block(
  g: THREE.Object3D,
  w: number,
  h: number,
  d: number,
  p: P,
  mat = timber,
) {
  return solid(g, new THREE.BoxGeometry(w, h, d), mat, p);
}
function rod(g: THREE.Object3D, a: P, b: P, r = 0.012, mat = timber) {
  const A = v(a),
    B = v(b),
    delta = B.clone().sub(A);
  const m = solid(
    g,
    new THREE.CylinderGeometry(r * 0.86, r, delta.length(), 6),
    mat,
    A.clone().add(B).multiplyScalar(0.5).toArray() as P,
  );
  m.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    delta.normalize(),
  );
  return m;
}
function line(g: THREE.Object3D, points: P[]) {
  g.add(
    new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(points.map(v)),
      ink,
    ),
  );
}
function surface(g: THREE.Object3D, positions: number[], mat: THREE.Material) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.computeVertexNormals();
  return solid(g, geo, mat);
}
function quad(out: number[], a: P, b: P, c: P, d: P) {
  out.push(...a, ...b, ...c, ...a, ...c, ...d);
}

export type BoatStyle = "cabin" | "canopy" | "freight" | "skiff";
// Optional working-boat silhouettes; the standard bridge fleet remains unchanged.
export type BoatVariant = "standard" | "open-hold" | "short-reed" | "low-service";
export function buildReferenceBoat(
  length: number,
  width: number,
  style: BoatStyle,
  detail: DetailLevel = 2,
  variant: BoatVariant = "standard",
) {
  const g = new THREE.Group();
  g.name = "reference-boat";
  g.userData.boatStyle = style;
  if (variant !== "standard") g.userData.boatVariant = variant;
  const openHold = variant === "open-hold";
  // Match section boundaries so both detail meshes have a genuinely open deck.
  const holdHalf = length * .56 * (detail === 0 ? .4 : 5 / 12);
  const holdWidth = width * .32;
  // Cross sections give a hollow, flared hull with sheer at both ends. Local z is
  // the keel. Geometry stays inside the navigation envelope used by the routes.
  const n = detail === 0 ? 10 : 24,
    skin: number[] = [],
    deck: number[] = [],
    rails: [P[], P[]] = [[], []];
  const section = (t: number) => {
    const u = Math.abs(t),
      breadth = width * (0.055 + 0.475 * Math.pow(Math.max(0, 1 - u * u), 0.48));
    const sheer = 0.30 + 0.22 * Math.pow(u, 4),
      bottom = -0.15 + 0.39 * Math.pow(u, 5),
      z = t * length * 0.555;
    return { breadth, sheer, bottom, z };
  };
  for (let j = 0; j < n; j++) {
    const a = section(-1 + (2 * j) / n),
      b = section(-1 + (2 * (j + 1)) / n);
    for (const side of [-1, 1]) {
      const A: P = [side * a.breadth, a.sheer, a.z],
        B: P = [side * b.breadth, b.sheer, b.z],
        C: P = [side * b.breadth * 0.64, b.bottom, b.z],
        D: P = [side * a.breadth * 0.64, a.bottom, a.z];
      quad(skin, A, B, C, D);
      quad(
        skin,
        [side * a.breadth * 0.94, a.sheer - 0.018, a.z],
        [side * a.breadth * 0.58, a.bottom + 0.05, a.z],
        [side * b.breadth * 0.58, b.bottom + 0.05, b.z],
        [side * b.breadth * 0.94, b.sheer - 0.018, b.z],
      );
      if (j === 0) rails[side === -1 ? 0 : 1].push(A);
      rails[side === -1 ? 0 : 1].push(B);
      if (detail > 0)
        for (let course = 1; course <= 4; course++) {
          const f = course / 5;
          line(g, [
            [
              side * a.breadth * (1 - f * 0.36),
              a.sheer + (a.bottom - a.sheer) * f,
              a.z,
            ],
            [
              side * b.breadth * (1 - f * 0.36),
              b.sheer + (b.bottom - b.sheer) * f,
              b.z,
            ],
          ]);
        }
    }
    if (openHold && a.z >= -holdHalf - 1e-8 && b.z <= holdHalf + 1e-8) {
      for (const side of [-1, 1])
        quad(deck,
          [side * a.breadth * .88, .335, a.z], [side * holdWidth, .335, a.z],
          [side * holdWidth, .335, b.z], [side * b.breadth * .88, .335, b.z]);
    } else {
    quad(
      deck,
      [-a.breadth * 0.88, 0.335, a.z],
      [a.breadth * 0.88, 0.335, a.z],
      [b.breadth * 0.88, 0.335, b.z],
      [-b.breadth * 0.88, 0.335, b.z],
    );
    }
  }
  surface(g, skin, timber).name = "hollow-planked-hull";
  if(detail>0)for(const side of [-1,1])for(const fraction of [.25,.62]){
    for(let j=0;j<n;j++){
      const a=section(-1+2*j/n),b=section(-1+2*(j+1)/n);
      rod(g,[side*a.breadth*(1-fraction*.36),a.sheer+(a.bottom-a.sheer)*fraction,a.z],
        [side*b.breadth*(1-fraction*.36),b.sheer+(b.bottom-b.sheer)*fraction,b.z],.009,edge);
    }
  }

  surface(g, deck, board).name = "deck";
  for (const rail of rails)
    for (let j = 1; j < rail.length; j++)
      rod(g, rail[j - 1], rail[j], 0.024, edge);
  for (const end of [-1, 1]) {
    const s = section(end);
    rod(g, [-s.breadth, s.sheer, s.z], [s.breadth, s.sheer, s.z], 0.022, edge);
    block(g, width * 0.44, 0.045, length * 0.13, [
      0,
      0.3125,
      end * length * 0.39,
    ]);
  }
  if (detail > 0) {
    for (let j = 0; j <= Math.ceil(length / 0.17); j++) {
      const s = section(-0.91 + (j / Math.ceil(length / 0.17)) * 1.82);
      if (!openHold || Math.abs(s.z) >= holdHalf) line(g, [
        [-s.breadth * 0.87, 0.339, s.z],
        [s.breadth * 0.87, 0.339, s.z],
      ]);
      if (j % 3 === 0)
        for (const side of [-1, 1])
          rod(
            g,
            [side * s.breadth * 0.89, 0.34, s.z],
            [side * s.breadth * 0.97, s.sheer, s.z],
            0.014,
            edge,
          );
    }
    for (const rail of rails)
      for (let j = 3; j < rail.length - 2; j += 3) {
        const a = rail[j];
        rod(g, a, [a[0], a[1] + 0.13, a[2]], 0.012);
      }
    for (const side of [-1, 1]) {
      const points = rails[side === -1 ? 0 : 1]
        .slice(3, -2)
        .map((p) => [p[0], p[1] + 0.13, p[2]] as P);
      for (let j = 1; j < points.length; j++)
        rod(g, points[j - 1], points[j], 0.012);
    }
  }
  if (openHold) {
    const hold = new THREE.Group();
    hold.name = "open-cargo-hold";
    g.add(hold);
    block(hold, holdWidth * 2, .035, holdHalf * 2, [0, .12, 0], recess).name = "hold-floor";
    for (const side of [-1, 1]) {
      block(hold, .035, .23, holdHalf * 2, [side * holdWidth, .235, 0], timber);
      rod(hold, [side * holdWidth, .365, -holdHalf], [side * holdWidth, .365, holdHalf], .025, edge);
    }
    for (const end of [-1, 1])
      block(hold, holdWidth * 2, .23, .035, [0, .235, end * holdHalf], timber);
    if (detail > 0) for (let j = 0; j < 5; j++) {
      const z = (j - 2) * holdHalf * .32;
      block(hold, width * .24, .11, length * .055, [j % 2 ? width * .14 : -width * .12, .19, z], reed);
      line(hold, [[-holdWidth, .143, z], [holdWidth, .143, z]]);
    }
  } else if (variant === "low-service" || (variant !== "short-reed" && style === "cabin")) {
    const cabin = new THREE.Group();
    cabin.name = "timber-cabin";
    g.add(cabin);
    const service = variant === "low-service";
    if (service) {
      cabin.name = "low-service-cabin";
      cabin.scale.set(.9, .60, .64);
      cabin.position.set(0, .36 * (1 - .60), -length * .19);
    }
    const half = length * (style === "freight" ? 0.2 : 0.245),
      cw = width * 0.4,
      base = 0.36,
      eave = 0.87,
      ridge = 1.08;
    for (const side of [-1, 1]) {
      block(cabin, 0.035, 0.18, half * 2, [side * cw, base + 0.09, 0], service ? timber : paper);
      for (let z = -half; z < half + 0.01; z += half / (service ? 3 : 4)) {
        rod(cabin, [side * cw, base, z], [side * cw, eave, z], 0.019, edge);
        if (detail > 0) {
          block(
            cabin,
            0.027,
            service ? 0.21 : 0.29,
            half * (service ? 0.075 : 0.13),
            [side * cw, base + 0.31, z + half * 0.12],
            reed,
          );
          for (let k = 0; k < 4; k++)
            rod(
              cabin,
              [side * (cw + 0.016), base + 0.19 + k * 0.064, z],
              [
                side * (cw + 0.016),
                base + 0.19 + k * 0.064,
                Math.min(half, z + half * 0.18),
              ],
              0.004,
              edge,
            );
        }
      }
      rod(
        cabin,
        [side * cw, base + 0.18, -half],
        [side * cw, base + 0.18, half],
        0.013,
        edge,
      );
      rod(
        cabin,
        [side * cw, eave, -half],
        [side * cw, eave, half],
        0.018,
        edge,
      );
    }
    // Recessed openings, not dark rectangles pasted on a solid house box.
    for (const end of [-1, 1]) {
      block(cabin, cw * 2, 0.16, 0.035, [0, base + 0.08, end * half], service ? timber : paper);
      rod(cabin, [-cw, eave, end * half], [0, ridge, end * half], 0.019, edge);
      rod(cabin, [0, ridge, end * half], [cw, eave, end * half], 0.019, edge);
    }
    const roof: number[] = [];
    for (const side of [-1, 1])
      for (let j = 0; j < 6; j++) {
        const a = j / 6,
          b = (j + 1) / 6,
          Y = (u: number) =>
            ridge - (ridge - eave) * u - 0.035 * Math.sin(u * Math.PI);
        quad(
          roof,
          [side * (cw + 0.07) * a, Y(a), -half - 0.09],
          [side * (cw + 0.07) * b, Y(b), -half - 0.09],
          [side * (cw + 0.07) * b, Y(b), half + 0.09],
          [side * (cw + 0.07) * a, Y(a), half + 0.09],
        );
      }
    surface(cabin, roof, service ? reed : tile);
    if (detail > 0)
      for (let z = -half - 0.08; z <= half + 0.09; z += 0.105)
        for (const side of [-1, 1])
          line(cabin, [
            [0, ridge + 0.008, z],
            [side * cw * 0.6, 0.93, z],
            [side * (cw + 0.07), eave + 0.008, z],
          ]);
    rod(
      cabin,
      [0, ridge + 0.018, -half - 0.1],
      [0, ridge + 0.018, half + 0.1],
      0.025,
      edge,
    );
  } else if (variant === "short-reed" || style !== "skiff") {
    const canopyRoot = variant === "short-reed" ? new THREE.Group() : g;
    if (canopyRoot !== g) {
      canopyRoot.name = "short-reed-cover";
      canopyRoot.position.z = -length * .14;
      g.add(canopyRoot);
    }
    const half = length * (variant === "short-reed" ? .15 : style === "freight" ? .29 : .26),
      radius = width * 0.44,
      rise = style === "freight" ? .65 : .42,
      canopy: number[] = [];
    for (let j = 0; j < 12; j++) {
      const a = (j / 12) * Math.PI,
        b = ((j + 1) / 12) * Math.PI;
      quad(
        canopy,
        [Math.cos(a) * radius, 0.4 + Math.sin(a) * rise, -half],
        [Math.cos(b) * radius, 0.4 + Math.sin(b) * rise, -half],
        [Math.cos(b) * radius, 0.4 + Math.sin(b) * rise, half],
        [Math.cos(a) * radius, 0.4 + Math.sin(a) * rise, half],
      );
    }
    surface(canopyRoot, canopy, reed).name = "woven-canopy";
    if(detail>0){
      const weave:number[]=[];
      for(let z=-half;z<=half;z+=.075)for(let j=0;j<20;j++){
        const p=(a:number):P=>[Math.cos(a)*(radius+.002),.4+Math.sin(a)*(rise+.009),z];
        weave.push(...p(j*Math.PI/20),...p((j+1)*Math.PI/20));
      }
      for(let j=1;j<25;j++){
        const a=j*Math.PI/25;
        weave.push(Math.cos(a)*(radius+.004),.4+Math.sin(a)*(rise+.01),-half,
          Math.cos(a)*(radius+.004),.4+Math.sin(a)*(rise+.01),half);
      }
      canopyRoot.add(new THREE.LineSegments(new THREE.BufferGeometry().setAttribute("position",new THREE.Float32BufferAttribute(weave,3)),createDryInk(.28)));
      // Separate rolled mats and transverse hoop lashings break the uniform cover.
      for(let k=0;k<5;k++){
        const z=-half+2*half*k/4;
        for(const side of [-1,1])rod(canopyRoot,[side*radius,.38,z],[side*radius,.48,z],.012,edge);
      }
    }

    for (let z = -half; z <= half + 0.001; z += half / 4) {
      const points: P[] = Array.from({ length: 17 }, (_, j) => [
        Math.cos((j / 16) * Math.PI) * radius,
        0.4 + Math.sin((j / 16) * Math.PI) * (rise+.005),
        z,
      ]);
      for (let j = 1; j < points.length; j++)
        rod(canopyRoot, points[j - 1], points[j], 0.011, edge);
    }
    if (detail > 0)
      for (let j = 1; j < 12; j++) {
        const a = (j / 12) * Math.PI;
        line(canopyRoot, [
          [Math.cos(a) * radius, 0.4 + Math.sin(a) * (rise+.005), -half],
          [Math.cos(a) * radius, 0.4 + Math.sin(a) * (rise+.005), half],
        ]);
      }
  }
  // Articulated mast and sail are assembled separately in workingBoat.
  const rudder = block(
    g,
    width * 0.19,
    0.24,
    0.045,
    [0, 0.12, -length * 0.58],
    edge,
  );
  rudder.rotation.y = 0.2;
  rod(g, [0, 0.14, -length * 0.58], [0, 0.55, -length * 0.49], 0.018, edge);
  rod(
    g,
    [0, 0.55, -length * 0.49],
    [width * 0.25, 0.53, -length * 0.38],
    0.013,
    edge,
  );
  if (detail > 0) {
    for (const side of [-1, 1]) {
      // Long oars stowed along the hull stay within the tested river clearance.
      rod(
        g,
        [side * width * 0.43, 0.39, -length * 0.43],
        [side * width * 0.58, 0.42, length * 0.35],
        0.01,
        edge,
      );
      const blade = block(
        g,
        width * 0.09,
        0.018,
        length * 0.13,
        [side * width * 0.57, 0.42, length * 0.33],
        board,
      );
      blade.rotation.y = -side * 0.04;
      const coil = new THREE.TorusGeometry(width * 0.095, 0.008, 4, 24);
      const m = solid(g, coil, reed, [
        side * width * 0.23,
        0.366,
        -length * 0.35,
      ]);
      m.rotation.x = Math.PI / 2;
      for (let k = 0; k < 3; k++) {
        const m = solid(
          g,
          new THREE.TorusGeometry(width * (0.04 + k * 0.018), 0.006, 4, 18),
          reed,
          [side * width * 0.23, 0.37, -length * 0.35],
        );
        m.rotation.x = Math.PI / 2;
      }
      const tub = solid(
        g,
        new THREE.CylinderGeometry(
          width * 0.1,
          width * 0.08,
          0.11,
          10,
          1,
          true,
        ),
        board,
        [side * width * 0.22, 0.395, length * 0.32],
      );
      tub.name = "deck-tub";
    }
    if (!openHold && (style === "freight" || style === "skiff"))
      for (let k = 0; k < 3; k++) {
        const z = (k - 1) * length * 0.11;
        block(g, width * 0.42, 0.15, length * 0.085, [0, 0.415, z], reed);
        for (const side of [-1, 1])
          rod(
            g,
            [side * width * 0.18, 0.34, z - length * 0.045],
            [side * width * 0.18, 0.5, z + length * 0.045],
            0.006,
            edge,
          );
      }
  }
  return g;
}
