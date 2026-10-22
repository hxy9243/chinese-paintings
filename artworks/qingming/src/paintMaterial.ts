import * as THREE from "three";
import {
  paletteAmount,
  palettePaper,
  paletteInk,
  indigoPigment,
  silkPigment,
  PALETTES,
  currentArtStyleUniforms,
} from "./scenePalette";
import { roadUniforms, roadShader } from "./roadSurface";
import { riverShader } from "./riverSurface";

// Geometry-space pigment stays attached while subjects and camera move.
// Supports the 5 living-scroll art styles with Song tile/timber grain and 5-tone ink AO.
export const paintingAmount = { value: 1 };
export const waterTime = { value: 0 };

function classifySurface(color: number, ground: boolean, bank: boolean, water: boolean, foliage: boolean): number {
  if (water) return 4;
  if (foliage) return 3;
  if (ground || bank) return 0;
  // Tile roofs (charcoal/warm gray/brown-gray)
  if (color === 0x786746 || color === 0x8b7854 || color === 0x64665f || color === 0x66675f) return 1;
  // Plaster / lime walls
  if (color === 0xc8b486 || color === 0xc5b58b) return 2;
  // Timber, bamboo, hulls, and props
  return 5;
}

export function paintMaterial(
  color: number,
  ground = false,
  bank = false,
  water = false,
  foliage = false,
) {
  const surfaceKind = classifySurface(color, ground, bank, water, foliage);
  return new THREE.ShaderMaterial({
    clipping: true,
    uniforms: {
      pigment: { value: new THREE.Color(silkPigment(color)) },
      alternatePigment: { value: new THREE.Color(indigoPigment(color)) },
      paletteAmount,
      palettePaper,
      paletteInk,
      styleSurface: currentArtStyleUniforms.styleSurface,
      styleFinish: currentArtStyleUniforms.styleFinish,
      surfaceKind: { value: surfaceKind },
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
    transparent: ground,
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
      uniform vec3 pigment;uniform vec3 alternatePigment;uniform float paletteAmount;uniform vec3 palettePaper;uniform vec3 paletteInk;
      uniform vec4 styleSurface;uniform vec4 styleFinish;uniform float surfaceKind;
      uniform vec3 roadPigment;uniform vec3 alternateRoadPigment;uniform float bank;
      uniform float painting;uniform float ground;uniform float water;uniform float waterTime;
      varying vec3 point;varying vec3 facing;varying vec3 brushPoint;
      float hash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
      float noise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
        return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
          mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
      ${roadShader}
      ${riverShader}
      void main(){
        #include <clipping_planes_fragment>
        vec3 stroke=brushPoint;
        vec3 n=normalize(facing);
        float aoStrength=styleSurface.x, tileDetail=styleSurface.y, mineralSat=styleSurface.z, shadowContrast=styleSurface.w;
        float wash=noise(stroke*1.8)*.62+noise(stroke*7.5)*.38;
        vec3 sunDir=normalize(vec3(-.58,1.,.74));
        float sunDot=max(0.,dot(n,sunDir));
        float shade=.68+.32*sunDot;
        vec3 paper=palettePaper;
        float mineralMix=clamp(max(paletteAmount,mineralSat),0.,1.);
        vec3 localPigment=mix(pigment,alternatePigment,mineralMix);
        // Xieyi Splash-Ink (mineralSat < 0) pulls pigments into 5-tone pine-soot ink washes
        if(mineralSat<0.){
          float lum=clamp(dot(localPigment,vec3(.299,.587,.114))*1.12,.08,.94);
          vec3 shuimoTone=mix(paletteInk*1.15,paper,pow(lum,.88));
          localPigment=mix(localPigment,shuimoTone,clamp(-mineralSat,0.,.82));
        }
        vec2 scrollCoord=vec2(point.x*.64278761+point.z*.76604444,-point.x*.76604444+point.z*.64278761);
        if(bank>.5){
          float roadWear=wornRoad(scrollCoord);
          // Organic courtyard & crossroads earth modulation breaks sterile flat planes
          float yardPatch=noise(vec3(scrollCoord*.38,1.7))*.5+noise(vec3(scrollCoord*1.9,4.2))*.5;
          vec3 rPigment=mix(roadPigment,alternateRoadPigment,mineralMix);
          if(mineralSat<0.)rPigment=mix(rPigment,mix(paletteInk,paper,.68),clamp(-mineralSat,0.,.75));
          localPigment=mix(localPigment,rPigment,roadWear*.58+smoothstep(.52,.82,yardPatch)*.24);
        }
        // Two translucent pigment glazes over raw silk substrate
        float glaze=noise(stroke*vec3(2.1,3.8,2.6));
        float second=noise(stroke*9.2+vec3(17.,4.,9.));
        float groundSoft=ground>.5 ? .22 : 1.;
        float rim=(1.-smoothstep(.025,.09,abs(glaze-.53)))*groundSoft;
        float dry=smoothstep(.66,.88,second)*(.065+.08*max(0.,styleFinish.z-.5))*groundSoft;
        vec3 refSilk=vec3(.78,.68,.46);
        vec3 transmission=clamp(localPigment/refSilk,vec3(.015),vec3(1.25));
        vec3 firstGlaze=paper*pow(transmission,vec3(.46+glaze*.18*groundSoft));
        vec3 painted=firstGlaze*pow(transmission,vec3(.28+second*.18*groundSoft));
        painted=mix(painted,paper,.025+wash*.075*groundSoft+dry);
        painted*=.95+glaze*.15*groundSoft-rim*(.075+.09*max(0.,styleFinish.z-.4));

        // Material-specific Song brushwork & surface relief
        if(surfaceKind>.5 && surfaceKind<1.5){
          // Song Xiaowa (小瓦) semi-cylindrical tile courses & lap shadows
          float course=sin((stroke.x+stroke.z*.15)*56.);
          float lap=sin((stroke.z-stroke.x*.15)*26.+floor((stroke.x+stroke.z*.15)*8.9)*1.57);
          float trough=smoothstep(-.2,.75,-course)*.20*tileDetail;
          float ridgeHighlight=smoothstep(.65,.98,course)*.08*tileDetail;
          float joint=smoothstep(.86,.99,lap)*.11*tileDetail;
          painted=mix(painted,paletteInk,clamp(trough+joint,0.,.42));
          painted=mix(painted,paper,ridgeHighlight);
        } else if(surfaceKind>1.5 && surfaceKind<2.5){
          // Plaster walls: base dampness & deep under-eave ink shadow (Mo Fen Wu Se)
          float heightAboveGround=max(0.,point.y-.42);
          float baseWeathered=1.-smoothstep(0.,.42,heightAboveGround);
          float eaveShadow=smoothstep(.82,1.35,heightAboveGround)*(1.-abs(n.y));
          painted=mix(painted,paletteInk,clamp((baseWeathered*.16+eaveShadow*.34)*aoStrength,0.,.48));
        } else if(surfaceKind>4.5){
          // Timber & woven bamboo mats: directional dry-brush fibers (feibai)
          float fiber=sin((stroke.x*18.+stroke.y*34.+stroke.z*18.)+glaze*2.5);
          float underArch=clamp(-n.y,0.,1.)*.32*aoStrength;
          painted*=1.-smoothstep(.45,.95,fiber)*.08*tileDetail-underArch;
        }

        // Five-Tone Ink AO & Directional Raking Light
        float cavity=(1.-sunDot)*shadowContrast*.26 + clamp(-n.y,0.,1.)*aoStrength*.28;
        painted=mix(painted,paletteInk,clamp(cavity,0.,.52));
        // Subtle warm raking highlight on sunlit roofs & bridge timbers in high-contrast styles
        float sunHighlight=pow(sunDot,3.)*max(0.,shadowContrast-.75)*.14;
        painted=mix(painted,paper*1.06,clamp(sunHighlight,0.,.18));

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
          vec3 jadeTint=mineralSat>.4 ? vec3(.34,.58,.54) : vec3(.46,.57,.44);
          vec3 bed=mix(localPigment,jadeTint,.24+underwash*.20+max(0.,mineralSat)*.18);
          vec3 sky=mix(paper,vec3(.68,.79,.74),.35);
          float shallows=1.-smoothstep(.1,1.6,-shore);
          painted=mix(bed,sky,.18+fresnel*.42+flow*.10);
          painted=mix(painted,paper,shallows*(.12+underwash*.18));
          // Rainbow Bridge timber arch & moored hull reflection wash in water
          float bridgeDist=abs(river.x-8.95+river.y*.20);
          float bridgeRefl=(1.-smoothstep(1.1,2.8,bridgeDist))*(1.-shallows*.55);
          painted=mix(painted,mix(paletteInk,vec3(.38,.31,.21),.55),bridgeRefl*(.20+.12*shadowContrast));
          float light=pow(max(0.,dot(reflect(-normalize(vec3(-.4,1.,.6)),normal),eye)),55.);
          float caustic=pow(.5+.5*sin(river.x*15.+sin(river.y*9.-waterTime*.7)*1.8-waterTime),16.);
          painted+=vec3(.16,.18,.15)*light*.8;
          painted=mix(painted,paper,caustic*(.035+shallows*.08));
          float ripple=sin(river.y*35.+sin(river.x*2.3-waterTime*.6)*1.7+waterTime*.45);
          painted=mix(painted,paper,smoothstep(.94,1.,ripple)*smoothstep(.50,.73,flow)*.19);
        }
        if(bank>.5){
          float wet=1.-smoothstep(-.15,.75,shore);
          painted*=1.-wet*(.11+noise(vec3(river*9.,2.))*.14);
          painted=mix(painted,paper,wet*noise(vec3(river*4.,9.))*.15);
        }
        // Depth-layered far-bank river mist in world scroll coordinates (scrollCoord.y < 0 is far bank)
        if(styleFinish.y>.35){
          float farMist=smoothstep(2.,-13.,scrollCoord.y)*(.65+.35*noise(vec3(scrollCoord*.22,3.1)));
          float riverMist=water>.5 ? (.22+.18*noise(vec3(river*.35,1.7))) : 0.;
          painted=mix(painted,mix(paper,vec3(.92,.94,.91),.35),clamp((farMist*.48+riverMist)*max(0.,styleFinish.y-.2),0.,.58));
        }
        vec3 result=mix(localPigment*shade,painted,painting);
        float scroll=scrollCoord.x;
        float depth=scrollCoord.y;
        vec2 q=abs(vec2(scroll+10.,depth))-vec2(33.,19.);
        float boundary=max(q.x,q.y);
        float outward=max(boundary,0.);
        float absorption=.85+.3*noise(vec3(river*.65,7.));
        float alpha=ground>.5 ? 1.-smoothstep(0.,5.5,outward*absorption) : 1.;
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
    uniforms: {
      painting: paintingAmount,
      fade: { value: fade },
      paletteInk,
      styleLineWeight: currentArtStyleUniforms.styleLineWeight,
    },
    vertexShader: `
      #include <clipping_planes_pars_vertex>
      varying vec3 point;varying vec3 strokePoint;
      void main(){vec4 world=modelMatrix*vec4(position,1.);point=world.xyz;strokePoint=position;
        vec4 mvPosition=viewMatrix*world;gl_Position=projectionMatrix*mvPosition;
        #include <clipping_planes_vertex>
      }`,
    fragmentShader: `
      #include <clipping_planes_pars_fragment>
      uniform float painting;uniform float fade;uniform vec3 paletteInk;uniform float styleLineWeight;
      varying vec3 point;varying vec3 strokePoint;
      void main(){
        #include <clipping_planes_fragment>
        float grain=fract(sin(dot(floor(strokePoint*95.),vec3(127.1,311.7,74.7)))*43758.5453);
        float flow=.5+.5*sin(strokePoint.x*41.+strokePoint.y*29.+strokePoint.z*37.);
        float opacity=mix(.65,(.30+flow*.42+grain*.18)*styleLineWeight,painting);
        if(painting>.5 && grain>.91)opacity*=.20;
        gl_FragColor=vec4(paletteInk,clamp(opacity*fade,0.,1.));
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
}

/** Fast, low-allocation calligraphic edge subdivision with compact segment counts. */
export function brushEdges(geometry: THREE.BufferGeometry) {
  const source = new THREE.EdgesGeometry(geometry, 24),
    pos = source.getAttribute("position"),
    arr = pos.array as Float32Array;
  const points: number[] = [];
  for (let i = 0; i < pos.count; i += 2) {
    const i3 = i * 3;
    const ax = arr[i3], ay = arr[i3 + 1], az = arr[i3 + 2];
    const bx = arr[i3 + 3], by = arr[i3 + 4], bz = arr[i3 + 5];
    const dx = bx - ax, dy = by - ay, dz = bz - az;
    const dist = Math.hypot(dx, dy, dz);
    const count = Math.max(1, Math.min(5, Math.ceil(dist / 0.35)));
    for (let j = 0; j < count; j++) {
      const t0 = j / count, t1 = (j + 1) / count;
      const w0 = Math.sin(t0 * count * 2.1 + i) * Math.sin(t0 * Math.PI);
      const w1 = Math.sin(t1 * count * 2.1 + i) * Math.sin(t1 * Math.PI);
      points.push(
        ax + dx * t0 + 0.0035 * w0,
        ay + dy * t0 + 0.0045 * w0,
        az + dz * t0 + 0.003 * w0,
        ax + dx * t1 + 0.0035 * w1,
        ay + dy * t1 + 0.0045 * w1,
        az + dz * t1 + 0.003 * w1,
      );
    }
  }
  source.dispose();
  return new THREE.BufferGeometry().setAttribute(
    "position",
    new THREE.Float32BufferAttribute(points, 3),
  );
}
