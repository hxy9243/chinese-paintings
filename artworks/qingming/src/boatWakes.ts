import * as THREE from "three";
import { BOATS, shoreDepth } from "./passageLayout";
import { boatPose } from "./passageLife";
import { scrollPoint } from "./scrollLayout";
import { palettePaper } from "./scenePalette";
import { waterHeight } from "./riverSurface";

const SEGMENTS = 40,
  LIFETIME = 34,
  LAYERS = 4;
const CORNERS = [
  [0, -1],
  [1, -1],
  [0, 1],
  [1, -1],
  [1, 1],
  [0, 1],
];
// Three spreading stern ridges and a curved bow wave on each side follow
// the analytic water surface. Moored boats produce no propulsive trail.
// All buffers are reused.
export function createBoatWakes() {
  const positions = new THREE.Float32BufferAttribute(
    new Float32Array(BOATS.length * 2 * LAYERS * SEGMENTS * 6 * 3),
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
        vec2 river=vec2(brush.x*.64278761+brush.z*.76604444,-brush.x*.76604444+brush.z*.64278761);
        vec2 q=abs(river)-vec2(16.,8.);
        float boundary=length(max(q,0.))+min(max(q.x,q.y),0.)-6.;
        float soak=1.-smoothstep(0.,5.5,max(boundary,0.));
        gl_FragColor=vec4(mix(palettePaper,vec3(.63,.77,.70),.16),fade*(.65+grain*.35)*softEdge*soak);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = "boat-wakes";
  mesh.frustumCulled = false;
  // Both water and wakes are transparent. Their geometry centers differ, so
  // distance sorting alone can place the opaque part of the wash over a wake.
  // Depth testing keeps these marks beneath hulls and the bridge; the channel
  // mask below keeps them off the banks.
  mesh.renderOrder = 1;
  return {
    mesh,
    update(time: number) {
      let vertex = 0;
      BOATS.forEach((boat, index) => {
        const current = boatPose(index, time);
        const history = Array.from({ length: SEGMENTS + 1 }, (_, j) =>
          boatPose(index, time - (j / SEGMENTS) * LIFETIME),
        );
        for (const side of [-1, 1])
          for (let layer = 0; layer < LAYERS; layer++)
            for (let j = 0; j < SEGMENTS; j++) {
              for (const [offset, edge] of CORNERS) {
                const age = ((j + offset) / SEGMENTS) * LIFETIME;
                const bow = layer === 3;
                const sample = bow ? current : history[j + offset];
                const fraction = age / LIFETIME;
                const along = bow ? boat.length*.51-fraction*1.7 : -(boat.length*.5+layer*.1);
                const spread=bow?Math.sin(fraction*Math.PI*.5)*boat.width*.72:boat.width*(.32+layer*.15)+age*(.018+layer*.014);
                const width=bow?.035+fraction*.025:.035+age*.0025+layer*.007;
                const across=side*spread+edge*width+Math.sin(age*.8-time*.45+index)*.018;
                const s=sample.s+along*Math.cos(sample.angle)-across*Math.sin(sample.angle),
                  d=sample.d+along*Math.sin(sample.angle)+across*Math.cos(sample.angle);
                const point = scrollPoint(s, d);
                const onWater =
                  d > shoreDepth("far", s) + 0.08 &&
                  d < shoreDepth("near", s) - 0.08;
                const continuous = Math.abs(sample.s - current.s) < 10;
                const crest =
                  0.01 + Math.sin(age * 1.1 - time * 0.8 + layer) * 0.005;
                positions.setXYZ(
                  vertex,
                  point.x,
                  waterHeight(s, d, time) + crest,
                  point.z,
                );
                const fade = bow
                  ? Math.sin(fraction * Math.PI) ** 0.6 * 0.49
                  : (1 - fraction) ** 1.5 *
                    (0.46 - layer * 0.07 + Math.sin(age * 2.2 + index) * 0.09);
                opacities.setX(vertex++, onWater && continuous ? fade : 0);
              }
            }
      });
      positions.needsUpdate = true;
      opacities.needsUpdate = true;
    },
  };
}
