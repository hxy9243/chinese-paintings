import * as THREE from "three";
import { BOATS, shoreDepth } from "./passageLayout";
import { boatPose } from "./passageLife";
import { scrollPoint } from "./scrollLayout";
import { palettePaper } from "./scenePalette";

const SEGMENTS = 24,
  LIFETIME = 22;
const CORNERS = [
  [0, -1],
  [1, -1],
  [0, 1],
  [1, -1],
  [1, 1],
  [0, 1],
];
// Two broken, soft ribbons follow the history of each moving stern. Moored
// boats deliberately produce no propulsive trail. All buffers are reused.
export function createBoatWakes() {
  const positions = new THREE.Float32BufferAttribute(
    new Float32Array(BOATS.length * 2 * SEGMENTS * 6 * 3),
    3,
  ).setUsage(THREE.DynamicDrawUsage);
  const opacities = new THREE.Float32BufferAttribute(
    new Float32Array(positions.count),
    1,
  ).setUsage(THREE.DynamicDrawUsage);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", positions);
  geometry.setAttribute("opacity", opacities);
  geometry.setAttribute(
    "across",
    new THREE.Float32BufferAttribute(
      Float32Array.from(
        { length: positions.count },
        (_, i) => CORNERS[i % 6][1],
      ),
      1,
    ),
  );
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    clipping: true,
    uniforms: { palettePaper },
    vertexShader: `
      #include <clipping_planes_pars_vertex>
      attribute float opacity;attribute float across; varying float fade; varying vec3 brush;varying float widthCoord;
      void main(){fade=opacity;brush=position;widthCoord=across;
        vec4 mvPosition=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*mvPosition;
        #include <clipping_planes_vertex>
      }`,
    fragmentShader: `
      #include <clipping_planes_pars_fragment>
      uniform vec3 palettePaper; varying float fade; varying vec3 brush;varying float widthCoord;
      void main(){
        #include <clipping_planes_fragment>
        float grain=fract(sin(dot(floor(brush*80.),vec3(127.1,311.7,74.7)))*43758.5453);
        float softEdge=1.-smoothstep(.15,1.,abs(widthCoord));
        gl_FragColor=vec4(mix(palettePaper,vec3(.44,.50,.38),.12),fade*(.65+grain*.35)*softEdge);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = "boat-wakes";
  mesh.frustumCulled = false;
  // Both water and wakes are transparent. Their geometry centers differ, so
  // distance sorting alone can place the opaque part of the wash over a wake.
  // Depth testing still keeps these marks beneath hulls, banks, and the bridge.
  mesh.renderOrder = 1;
  return {
    mesh,
    update(time: number) {
      let vertex = 0;
      BOATS.forEach((boat, index) => {
        const current = boatPose(index, time),
          direction = index % 2 ? -1 : 1;
        const history = Array.from({ length: SEGMENTS + 1 }, (_, j) =>
          boatPose(index, time - (j / SEGMENTS) * LIFETIME),
        );
        for (const side of [-1, 1])
          for (let j = 0; j < SEGMENTS; j++) {
            for (const [offset, edge] of CORNERS) {
              const age = ((j + offset) / SEGMENTS) * LIFETIME;
              const sample = history[j + offset],
                s = sample.s - direction * boat.length * 0.55;
              const width = 0.028 + age * 0.003;
              const d =
                sample.d +
                side * (boat.width * 0.46 + age * 0.022) +
                edge * width +
                Math.sin(age * 0.8 - time * 0.45 + index) * 0.025;
              const point = scrollPoint(s, d);
              const onWater =
                d > shoreDepth("far", s) + 0.03 &&
                d < shoreDepth("near", s) - 0.03;
              const continuous = Math.abs(sample.s - current.s) < 10;
              positions.setXYZ(vertex, point.x, -0.012, point.z);
              opacities.setX(
                vertex++,
                onWater && continuous
                  ? (1 - age / LIFETIME) ** 1.7 *
                      (0.33 + Math.sin(age * 2.2 + index) * 0.1)
                  : 0,
              );
            }
          }
      });
      positions.needsUpdate = true;
      opacities.needsUpdate = true;
    },
  };
}
