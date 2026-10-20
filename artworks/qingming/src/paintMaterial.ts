import * as THREE from "three";
import {
  paletteAmount,
  palettePaper,
  paletteInk,
  indigoPigment,
  silkPigment,
  PALETTES,
} from "./scenePalette";
import { roadUniforms, roadShader } from "./roadSurface";

// Geometry-space pigment stays attached while subjects and camera move.
// No screen-space noise animation or extra postprocessing framebuffer is needed.
export const paintingAmount = { value: 1 };
export const waterTime = { value: 0 };
export function paintMaterial(
  color: number,
  ground = false,
  bank = false,
  water = false,
) {
  return new THREE.ShaderMaterial({
    clipping: true,
    uniforms: {
      pigment: { value: new THREE.Color(silkPigment(color)) },
      alternatePigment: { value: new THREE.Color(indigoPigment(color)) },
      paletteAmount,
      palettePaper,
      bank: { value: bank ? 1 : 0 },
      ...roadUniforms,
      roadPigment: { value: new THREE.Color(PALETTES.silk.road) },
      alternateRoadPigment: {
        value: new THREE.Color(PALETTES["indigo-amber"].road),
      },
      painting: paintingAmount,
      ground: { value: ground ? 1 : 0 },
      water: { value: water ? 1 : 0 },
      waterTime,
    },
    transparent: ground,
    side: THREE.DoubleSide,
    vertexShader: `
      #include <clipping_planes_pars_vertex>
      varying vec3 point; varying vec3 facing; varying vec3 brushPoint;
      void main(){vec4 world=modelMatrix*vec4(position,1.);point=world.xyz;brushPoint=position;
        facing=normalize(mat3(modelMatrix)*normal);
        vec4 mvPosition=viewMatrix*world;gl_Position=projectionMatrix*mvPosition;
        #include <clipping_planes_vertex>
      }`,
    fragmentShader: `
      #include <clipping_planes_pars_fragment>
      uniform vec3 pigment;uniform vec3 alternatePigment;uniform float paletteAmount;uniform vec3 palettePaper;
      uniform vec3 roadPigment;uniform vec3 alternateRoadPigment;uniform float bank;
      uniform float painting;uniform float ground;uniform float water;uniform float waterTime;
      varying vec3 point;varying vec3 facing;varying vec3 brushPoint;
      float hash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
      float noise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
        return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
          mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
      ${roadShader}
      void main(){
        #include <clipping_planes_fragment>
        vec3 stroke=brushPoint;
        float wash=noise(stroke*1.8)*.55+noise(stroke*6.5)*.3+noise(stroke*31.)*.15;
        float shade=.75+.25*max(0.,dot(normalize(facing),normalize(vec3(-.6,1.,.8))));
        vec3 paper=palettePaper;
        vec3 localPigment=mix(pigment,alternatePigment,paletteAmount);
        if(bank>.5){vec2 p=vec2(point.x*.64278761+point.z*.76604444,-point.x*.76604444+point.z*.64278761);
          localPigment=mix(localPigment,mix(roadPigment,alternateRoadPigment,paletteAmount),wornRoad(p)*.55);}
        // Two translucent pigment glazes over the substrate. Broad washes and
        // finer sediment use independent scales, with darker drying rims.
        float glaze=noise(stroke*vec3(2.1,3.8,2.6));
        float second=noise(stroke*8.7+vec3(17.,4.,9.));
        float rim=1.-smoothstep(.025,.09,abs(glaze-.53));
        float grain=noise(stroke*vec3(115.,67.,92.));
        float sediment=smoothstep(.48,.77,second)*smoothstep(.24,.72,grain);
        float dry=smoothstep(.70,.88,grain)*.055;
        vec3 transmission=clamp(localPigment/max(paper,vec3(.01)),vec3(.015),vec3(1.2));
        vec3 firstGlaze=paper*pow(transmission,vec3(.48+glaze*.18));
        vec3 painted=firstGlaze*pow(transmission,vec3(.30+second*.17));
        painted=mix(painted,paper,.025+wash*.08+dry);
        painted*=.94+glaze*.16-rim*.07-sediment*.11;
        painted*=.91+.09*max(0.,dot(normalize(facing),normalize(vec3(-.6,1.,.8))));
        if(water>.5){
          vec2 river=vec2(point.x*.64278761+point.z*.76604444,-point.x*.76604444+point.z*.64278761);
          // Flow advects broad glazes rather than flashing specular highlights.
          float flow=noise(vec3((river.x-waterTime*.045)*.8,river.y*1.8,4.));
          float underwash=noise(vec3((river.x-waterTime*.024)*.35,river.y*.8,19.));
          float ripple=sin(river.y*37.+sin(river.x*2.3-waterTime*.6)*1.7+waterTime*.45);
          float broken=smoothstep(.51,.73,flow);
          painted=mix(localPigment,paper,.08+underwash*.15);
          painted*=.84+underwash*.19+flow*.12;
          painted=mix(painted,paper,smoothstep(.91,1.,ripple)*broken*.12);
          painted*=1.-smoothstep(.015,.055,abs(flow-.52))*.045;
        }
        vec3 result=mix(localPigment*shade,painted,painting);
        float scroll=point.x*.64278761+point.z*.76604444;
        float depth=-point.x*.76604444+point.z*.64278761;
        float edge=min((22.-abs(scroll))/2.,(14.-abs(depth))/1.3);
        float alpha=ground>.5 ? smoothstep(0.,1.,edge+(wash-.5)*.3) : 1.;
        gl_FragColor=vec4(result,alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
}

export function createDryInk(fade = 1) {
  return new THREE.ShaderMaterial({
    clipping: true,
    transparent: true,
    depthWrite: false,
    uniforms: { painting: paintingAmount, fade: { value: fade }, paletteInk },
    vertexShader: `
      #include <clipping_planes_pars_vertex>
      varying vec3 point;varying vec3 strokePoint;
      void main(){vec4 world=modelMatrix*vec4(position,1.);point=world.xyz;strokePoint=position;
        vec4 mvPosition=viewMatrix*world;gl_Position=projectionMatrix*mvPosition;
        #include <clipping_planes_vertex>
      }`,
    fragmentShader: `
      #include <clipping_planes_pars_fragment>
      uniform float painting;uniform float fade;uniform vec3 paletteInk;varying vec3 point;varying vec3 strokePoint;
      void main(){
        #include <clipping_planes_fragment>
        float grain=fract(sin(dot(floor(strokePoint*95.),vec3(127.1,311.7,74.7)))*43758.5453);
        float flow=.5+.5*sin(strokePoint.x*41.+strokePoint.y*29.+strokePoint.z*37.);
        float opacity=mix(.65,.28+flow*.40+grain*.18,painting);
        if(painting>.5 && grain>.92)opacity*=.22;
        gl_FragColor=vec4(paletteInk,opacity*fade);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
}

/** Subdivide rigid edges into short, slightly wavering pen strokes. */
export function brushEdges(geometry: THREE.BufferGeometry) {
  const source = new THREE.EdgesGeometry(geometry, 22),
    pos = source.getAttribute("position");
  const points: number[] = [];
  for (let i = 0; i < pos.count; i += 2) {
    const a = new THREE.Vector3().fromBufferAttribute(pos, i),
      b = new THREE.Vector3().fromBufferAttribute(pos, i + 1);
    const count = Math.max(1, Math.min(28, Math.ceil(a.distanceTo(b) / 0.09)));
    const drift = new THREE.Vector3(0.004, 0.005, 0.003);
    for (let j = 0; j < count; j++)
      for (const t of [j / count, (j + 1) / count]) {
        const p = a.clone().lerp(b, t);
        p.addScaledVector(
          drift,
          Math.sin(t * count * 2.1 + i) * Math.sin(t * Math.PI),
        );
        points.push(...p.toArray());
      }
  }
  source.dispose();
  return new THREE.BufferGeometry().setAttribute(
    "position",
    new THREE.Float32BufferAttribute(points, 3),
  );
}
