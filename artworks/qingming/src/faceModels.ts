import * as THREE from "three";
import { FIGURE_TYPES } from "./figureTypes";
import { paintMaterial } from "./paintMaterial";

type P = [number, number, number];
const eyeWhite = paintMaterial(0xb9b39f),
  iris = paintMaterial(0x51483b),
  lip = paintMaterial(0xa0806d),
  crease = paintMaterial(0x756252);
const widths = [
  1, 1.04, 0.94, 1.06, 0.97, 1.08, 0.94, 0.96, 1.03, 1.01, 0.95, 1.05,
];
const jaws = [
  1.04, 1.08, 0.94, 1.12, 0.96, 1.1, 0.89, 0.92, 0.82, 1.04, 0.96, 1.06,
];
export function faceProfile(variant: number) {
  const index = variant % FIGURE_TYPES.length,
    role = FIGURE_TYPES[index].name;
  return {
    width: widths[index],
    jaw: jaws[index],
    age: role === "elder" ? 70 : role === "child" ? 9 : 26 + ((index * 7) % 23),
    nose:
      role === "child"
        ? 0.66
        : role === "elder"
          ? 1.13
          : 1 + ((index % 3) - 1) * 0.08,
    smile:
      role === "woman" || role === "shopkeeper"
        ? 0.0012
        : role === "elder"
          ? -0.0004
          : 0.0003,
  };
}
const rings = [
  [-0.049, 0.009, 0.011],
  [-0.042, 0.019, 0.019],
  [-0.029, 0.026, 0.024],
  [-0.013, 0.032, 0.028],
  [0.006, 0.035, 0.03],
  [0.026, 0.034, 0.029],
  [0.043, 0.026, 0.024],
  [0.053, 0.006, 0.008],
];
function radii(y: number, variant: number) {
  const p = faceProfile(variant);
  let a = rings[0],
    b = rings[1];
  for (let i = 1; i < rings.length; i++) {
    a = rings[i - 1];
    b = rings[i];
    if (y <= b[0]) break;
  }
  const t = THREE.MathUtils.clamp((y - a[0]) / (b[0] - a[0]), 0, 1);
  const jaw = THREE.MathUtils.lerp(
    p.jaw,
    1,
    THREE.MathUtils.smoothstep(y, -0.04, 0.005),
  );
  return {
    x: THREE.MathUtils.lerp(a[1], b[1], t) * p.width * jaw,
    z: THREE.MathUtils.lerp(a[2], b[2], t),
  };
}
const gauss = (
  x: number,
  y: number,
  cx: number,
  cy: number,
  sx: number,
  sy: number,
) => Math.exp(-(((x - cx) / sx) ** 2 + ((y - cy) / sy) ** 2));
/** Shared by the sculpt and its features, so eyelids and lips lie on the skin. */
export function faceDepth(x: number, y: number, variant: number) {
  const r = radii(y, variant),
    p = faceProfile(variant);
  const front = Math.sqrt(Math.max(0, 1 - (x / r.x) ** 2));
  const base = -0.004 + r.z * front;
  let z = base;
  z +=
    0.0033 *
    (gauss(x, y, -0.018, -0.005, 0.012, 0.016) +
      gauss(x, y, 0.018, -0.005, 0.012, 0.016));
  z -=
    0.0027 *
    (gauss(x, y, -0.014, 0.012, 0.009, 0.006) +
      gauss(x, y, 0.014, 0.012, 0.009, 0.006));
  z +=
    p.nose *
    (0.005 * gauss(x, y, 0, 0.008, 0.0045, 0.018) +
      0.009 * gauss(x, y, 0, -0.009, 0.006, 0.0055));
  z += 0.002 * gauss(x, y, 0, -0.027, 0.014, 0.009);
  return base + (z - base) * front ** 3;
}
export function buildCloseFace(
  parent: THREE.Group,
  variant: number,
  materials: {
    skin: THREE.ShaderMaterial;
    skinLight: THREE.Material;
    hair: THREE.Material;
    cloth: THREE.Material;
  },
) {
  const group = new THREE.Group();
  group.name = "individual-face";
  group.userData.profile = faceProfile(variant);
  parent.add(group);
  const mesh = (
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    at: P = [0, 0, 0],
    scale?: P,
  ) => {
    const o = new THREE.Mesh(geometry, material);
    o.position.set(...at);
    if (scale) o.scale.set(...scale);
    group.add(o);
    return o;
  };
  const oval = (at: P, size: P, material: THREE.Material) =>
    mesh(new THREE.SphereGeometry(1, 20, 12), material, at, size);
  const stroke = (points: P[], radius: number, material: THREE.Material) =>
    mesh(
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p))),
        16,
        radius,
        5,
        false,
      ),
      material,
    );
  const onSkin = (x: number, y: number, lift = 0.0006): P => [
    x,
    y,
    faceDepth(x, y, variant) + lift,
  ];
  const vertices: number[] = [],
    indices: number[] = [];
  const around = 64,
    rows = 48;
  for (let j = 0; j <= rows; j++) {
    const y = -0.049 + (j / rows) * 0.102,
      r = radii(y, variant);
    for (let i = 0; i <= around; i++) {
      const a = (i / around) * Math.PI * 2,
        x = Math.sin(a) * r.x,
        front = Math.max(0, Math.cos(a));
      const base = -0.004 + Math.cos(a) * r.z;
      const sculpt =
        faceDepth(x, y, variant) -
        (-0.004 + r.z * Math.sqrt(Math.max(0, 1 - (x / r.x) ** 2)));
      vertices.push(x, y, base + sculpt * (front > 0 ? 1 : 0));
    }
  }
  for (let j = 0; j < rows; j++)
    for (let i = 0; i < around; i++) {
      const a = j * (around + 1) + i,
        b = a + around + 1;
      indices.push(a, a + 1, b, a + 1, b + 1, b);
    }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(vertices, 3),
  );
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  // Smooth the duplicated seam at the back of the head.
  const normals = geometry.getAttribute("normal");
  for (let j = 0; j <= rows; j++) {
    const a = j * (around + 1),
      b = a + around,
      n = new THREE.Vector3()
        .fromBufferAttribute(normals, a)
        .add(new THREE.Vector3().fromBufferAttribute(normals, b))
        .normalize();
    normals.setXYZ(a, n.x, n.y, n.z);
    normals.setXYZ(b, n.x, n.y, n.z);
  }
  const faceSkin = (materials.skin as THREE.ShaderMaterial).clone();
  faceSkin.uniforms = (materials.skin as THREE.ShaderMaterial).uniforms;
  // A broader directional wash makes the sculpt readable without hard outlines.
  faceSkin.fragmentShader = faceSkin.fragmentShader.replace(
    "vec3 result=mix(localPigment*shade,painted,painting);",
    `
    vec3 result=mix(localPigment*shade,painted,painting);
    result*=.72+.28*max(0.,dot(normalize(facing),normalize(vec3(-.65,.6,1.))));`,
  );
  mesh(geometry, faceSkin).name = "sculpted-head";
  oval([0, 0.029, -0.015], [0.034, 0.027, 0.028], materials.hair).name =
    "hairline";
  for (const side of [-1, 1]) {
    const x = side * 0.014,
      y = 0.012;
    // Narrow almond-shaped eye openings follow the recessed socket, not floating spheres.
    const eyeVertices: number[] = [...onSkin(x, y, 0.001)],
      eyeIndices: number[] = [];
    const rim: P[] = [];
    for (let i = 0; i <= 32; i++) {
      const a = (i / 32) * Math.PI * 2,
        dx = Math.cos(a) * 0.0072,
        dy = Math.sin(a) * 0.00165;
      const point = onSkin(x + dx, y + dy + side * dx * 0.06, 0.001);
      rim.push(point);
      eyeVertices.push(...point);
      if (i < 32) eyeIndices.push(0, i + 1, i + 2);
    }
    const eye = new THREE.BufferGeometry();
    eye.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(eyeVertices, 3),
    );
    eye.setIndex(eyeIndices);
    eye.computeVertexNormals();
    mesh(eye, eyeWhite).name = "almond-eye";
    oval(onSkin(x, y, 0.0017), [0.00135, 0.00155, 0.00055], iris).name = "iris";
    stroke(rim.slice(0, 17), 0.00065, crease).name = "upper-eyelid";
    stroke(rim.slice(16), 0.0004, lip);
    stroke(
      [
        onSkin(x - side * 0.008, 0.022),
        onSkin(x, 0.025),
        onSkin(x + side * 0.009, 0.022),
      ],
      0.00065,
      materials.hair,
    ).name = "eyebrow";
    const earX = side * 0.035 * faceProfile(variant).width;
    oval([earX, -0.004, -0.003], [0.006, 0.011, 0.005], materials.skin).name =
      "ear";
    stroke(
      [
        [earX + side * 0.002, 0.002, 0.001],
        [earX + side * 0.003, -0.004, 0.002],
        [earX, -0.009, 0.001],
      ],
      0.0008,
      lip,
    );
    oval(
      onSkin(side * 0.0047, -0.011, 0.0005),
      [0.0023, 0.002, 0.0015],
      faceSkin,
    ).name = "nose-wing";
    stroke(
      [onSkin(side * 0.003, -0.013), onSkin(side * 0.006, -0.0135)],
      0.00035,
      crease,
    ).name = "nostril";
    if (faceProfile(variant).age > 50) {
      stroke(
        [onSkin(side * 0.022, 0.009), onSkin(side * 0.027, 0.007)],
        0.00035,
        crease,
      );
      stroke(
        [
          onSkin(side * 0.008, -0.016),
          onSkin(side * 0.012, -0.023),
          onSkin(side * 0.013, -0.03),
        ],
        0.00035,
        lip,
      );
    }
  }
  const noseMarker = new THREE.Group();
  noseMarker.name = "shaped-nose";
  group.add(noseMarker);
  const smile = faceProfile(variant).smile;
  stroke(
    [
      onSkin(-0.01, -0.027 + smile),
      onSkin(-0.004, -0.0265),
      onSkin(0, -0.027),
      onSkin(0.004, -0.0265),
      onSkin(0.01, -0.027 + smile),
    ],
    0.00065,
    lip,
  ).name = "upper-lip";
  stroke(
    [
      onSkin(-0.008, -0.028 + smile),
      onSkin(0, -0.03),
      onSkin(0.008, -0.028 + smile),
    ],
    0.0009,
    lip,
  ).name = "lower-lip";
  stroke(
    [
      onSkin(-0.008, -0.0278 + smile, 0.001),
      onSkin(0, -0.0281, 0.001),
      onSkin(0.008, -0.0278 + smile, 0.001),
    ],
    0.00035,
    crease,
  );
  const role = FIGURE_TYPES[variant % FIGURE_TYPES.length].name;
  if (["elder", "scholar", "merchant"].includes(role)) {
    const beard = role === "elder" ? paintMaterial(0x9d9885) : materials.hair;
    const mass = mesh(
      new THREE.ConeGeometry(0.008, 0.024, 20),
      beard,
      [0, -0.045, 0.023],
      [1, 1, 0.38],
    );
    mass.rotation.x = Math.PI;
    mass.name = "beard-volume";
    for (let j = 0; j < 11; j++) {
      const x = (j - 5) * 0.00135;
      stroke(
        [
          onSkin(x, -0.033),
          [x * 0.7, -0.043, 0.026],
          [x * 0.2, -0.055 + Math.sin(j * 2.4) * 0.0015, 0.023],
        ],
        0.00025,
        beard,
      ).name = "beard-strand";
    }
    for (const side of [-1, 1])
      stroke(
        [
          onSkin(side * 0.002, -0.02),
          onSkin(side * 0.005, -0.0205),
          onSkin(side * 0.009, -0.022),
        ],
        0.00055,
        beard,
      );
  }
  return group;
}
