import * as THREE from "three";
import { paintingBoundaryShader } from "./paintingBoundary";
import {
  paletteAmount,
  palettePaper,
  paletteInk,
  indigoPigment,
  silkPigment,
  PALETTES,
} from "./scenePalette";
import { roadUniforms, roadShader } from "./roadSurface";
import { riverShader } from "./riverSurface";

// Geometry-space pigment stays attached while subjects and camera move.
// No screen-space noise animation or extra postprocessing framebuffer is needed.
export const paintingAmount = { value: 1 };
export const waterTime = { value: 0 };
export function paintMaterial(
  color: number,
  ground = false,
  bank = false,
  water = false,
  foliage = false,
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
      foliage: { value: foliage ? 1 : 0 },
    },
    transparent: true,
    depthWrite: !ground,
    side: THREE.DoubleSide,
    vertexShader: `
      #include <clipping_planes_pars_vertex>
      varying vec3 point; varying vec3 facing; varying vec3 brushPoint;
      uniform float water;uniform float waterTime;uniform float foliage;
      ${riverShader}
      void main(){vec4 world=modelMatrix*vec4(position,1.);point=world.xyz;brushPoint=position;
        facing=normalize(mat3(modelMatrix)*normal);
        if(water>.5){world.y=waterHeight(riverPoint(world.xyz),waterTime);}
        if(foliage>.5){world.x+=sin(waterTime*.85+world.z*2.1+world.y)*.018;world.z+=cos(waterTime*.7+world.x*1.6)*.012;}
        point=world.xyz;
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
      ${paintingBoundaryShader}
      ${roadShader}
      ${riverShader}
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
        vec3 firstGlaze=paper*pow(transmission,vec3(.60+glaze*.18));
        vec3 painted=firstGlaze*pow(transmission,vec3(.36+second*.17));
        painted=mix(painted,paper,.015+wash*.045+dry);
        painted*=.94+glaze*.16-rim*.07-sediment*.11;
        painted*=.91+.09*max(0.,dot(normalize(facing),normalize(vec3(-.6,1.,.8))));
        vec2 river=riverPoint(point);
        float shore=shoreDistance(river);
        if(water>.5){
          float flow=noise(vec3((river.x-waterTime*.06)*.8,river.y*1.8,4.));
          float underwash=noise(vec3(river*.65,19.));
          vec2 slope=vec2(waterHeight(river+vec2(.025,0),waterTime)-waterHeight(river-vec2(.025,0),waterTime),
            waterHeight(river+vec2(0,.025),waterTime)-waterHeight(river-vec2(0,.025),waterTime))/.05;
          vec3 normal=normalize(vec3(-slope.x*.64278761+slope.y*.76604444,1.,-slope.x*.76604444-slope.y*.64278761));
          vec3 eye=normalize(cameraPosition-point);
          float fresnel=pow(1.-max(0.,dot(normal,eye)),3.);
          vec3 bed=mix(localPigment,vec3(.48,.58,.45),.22+underwash*.16);
          vec3 sky=mix(paper,vec3(.69,.80,.75),.35);
          float shallows=1.-smoothstep(.1,1.5,-shore);
          painted=mix(bed,sky,.18+fresnel*.42+flow*.10);
          painted=mix(painted,paper,shallows*(.12+underwash*.18));
          float light=pow(max(0.,dot(reflect(-normalize(vec3(-.4,1.,.6)),normal),eye)),55.);
          float caustic=pow(.5+.5*sin(river.x*15.+sin(river.y*9.-waterTime*.7)*1.8-waterTime),16.);
          painted+=vec3(.16,.18,.15)*light*.8;
          painted=mix(painted,paper,caustic*(.035+shallows*.08));
          float ripple=sin(river.y*35.+sin(river.x*2.3-waterTime*.6)*1.7+waterTime*.45);
          painted=mix(painted,paper,smoothstep(.94,1.,ripple)*smoothstep(.50,.73,flow)*.19);
        }
        if(bank>.5){
          float wet=1.-smoothstep(-.15,.65,shore);
          painted*=1.-wet*(.08+noise(vec3(river*9.,2.))*.12);
          painted=mix(painted,paper,wet*noise(vec3(river*4.,9.))*.15);
        }
        vec3 result=mix(localPigment*shade,painted,painting);
        float alpha=paintingEdgeAlpha(point);
        if(alpha<.001)discard;
        if(bank>.5)alpha*=smoothstep(-.30,.24,shore+(noise(vec3(river*12.,5.))-.5)*.15);
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
      ${paintingBoundaryShader}
      void main(){
        #include <clipping_planes_fragment>
        float grain=fract(sin(dot(floor(strokePoint*95.),vec3(127.1,311.7,74.7)))*43758.5453);
        float flow=.5+.5*sin(strokePoint.x*41.+strokePoint.y*29.+strokePoint.z*37.);
        float opacity=mix(.78,.40+flow*.34+grain*.18,painting);
        if(painting>.5 && grain>.92)opacity*=.22;
        float edgeAlpha=paintingEdgeAlpha(point);
        if(edgeAlpha<.001)discard;
        gl_FragColor=vec4(paletteInk,opacity*fade*edgeAlpha);
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
