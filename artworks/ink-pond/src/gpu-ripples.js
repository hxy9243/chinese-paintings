import * as THREE from 'three';
import {RIPPLE_STYLE} from './ripples.js';
import {RAIN_STYLE} from './rain.js';

export function createGpuRipples(uniforms){
  const capacity=RIPPLE_STYLE.maxRings+RAIN_STYLE.maxRings;
  Object.assign(uniforms,{rippleRings:{value:Array.from({length:capacity},()=>new THREE.Vector4())},rippleTraits:{value:Array.from({length:capacity},()=>new THREE.Vector4())},rippleEnabled:{value:1}});
  const positions=[],uv=[],ids=[],indices=[],ends=[0];
  for(let ring=0;ring<capacity;ring++){
    const start=positions.length/3,segments=ring<RIPPLE_STYLE.maxRings?96:48;
    for(let i=0;i<=segments;i++)for(let side=0;side<2;side++){positions.push(0,0,0);uv.push(i/segments,side*2-1);ids.push(ring);}
    for(let i=0;i<segments;i++){const a=start+i*2;indices.push(a,a+1,a+2,a+1,a+3,a+2);}
    ends.push(indices.length);
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setAttribute('ringIndex',new THREE.Float32BufferAttribute(ids,1));geometry.setIndex(indices);
  const material=new THREE.ShaderMaterial({uniforms,transparent:true,depthTest:false,depthWrite:false,side:THREE.DoubleSide,toneMapped:false,
    vertexShader:`attribute float ringIndex;uniform vec4 rippleRings[${capacity}];uniform vec4 rippleTraits[${capacity}];uniform vec2 resolution;varying vec2 waterPoint;varying float index;varying float ringWidth;varying float waterCoverage;
      void main(){index=ringIndex;ringWidth=1.;waterCoverage=1.;vec4 ring=rippleRings[int(ringIndex)];float angle=uv.x*6.283185307;
        vec4 traits=rippleTraits[int(ringIndex)];
        if(ring.w<.00001){waterPoint=vec2(0.);gl_Position=vec4(2.,2.,2.,1.);return;}
        if(traits.x>1.5){
          waterPoint=uv;float width=max(traits.y,.95/(projectionMatrix[0][0]*resolution.x*.5));
          vec2 sideways=normalize(vec2(viewMatrix[0][0],viewMatrix[1][0]))*uv.y*width;
          float height=traits.z+uv.x*traits.w;vec2 drift=vec2(.70710678)*height*.08;
          gl_Position=projectionMatrix*viewMatrix*vec4(ring.xy+sideways+drift,height,1.);return;
        }
        float width=traits.x>.5?traits.y:9.+ring.z*.008;
        if(traits.x>.5){width=max(width,1.1/(projectionMatrix[0][0]*resolution.x*.5));waterCoverage=max(.85,sqrt(min(1.,traits.y/width)));}
        ringWidth=width;
        float radius=max(.05,ring.z+uv.y*width*3.);waterPoint=ring.xy+vec2(cos(angle),sin(angle))*radius;
        gl_Position=projectionMatrix*viewMatrix*vec4(waterPoint,0.,1.);}`,
    fragmentShader:`uniform vec4 rippleRings[${capacity}];uniform vec4 rippleTraits[${capacity}];uniform float rippleEnabled;uniform float ownerMode;uniform float formOnly;uniform vec3 paperTone;varying vec2 waterPoint;varying float index;varying float ringWidth;varying float waterCoverage;
      void main(){vec4 ring=rippleRings[int(index+.5)];if(rippleEnabled<.5||ring.w<.0001||ownerMode>.5||formOnly>.5)discard;
        vec4 traits=rippleTraits[int(index+.5)];
        if(traits.x>1.5){
          float opacity=pow(max(0.,sin(waterPoint.x*3.14159265)),.7)*exp(-waterPoint.y*waterPoint.y*2.5)*ring.w*.48;
          gl_FragColor=vec4(.43,.48,.44,opacity);return;
        }
        bool rain=traits.x>.5;
        vec2 delta=waterPoint-ring.xy;float radius=length(delta),width=ringWidth;
        float angle=atan(delta.y,delta.x),seed=dot(ring.xy,vec2(.017,.023));
        float d=radius-ring.z-(rain?.22:.7)*sin(angle*3.+seed)-(rain?.12:.35)*sin(angle*7.-seed);
        float dark=exp(-pow(d/(width*.57),2.))*ring.w*waterCoverage*(rain?.28:.045),light=exp(-pow((d+width*.92)/(width*.48),2.))*ring.w*waterCoverage*(rain?.14:.095);
        float opacity=dark+light-dark*light;if(opacity<.0001)discard;
        vec3 crest=min(vec3(1.),paperTone+vec3(.022,.030,.026));
        gl_FragColor=vec4((vec3(.34,.45,.41)*dark*(1.-light)+crest*light)/opacity,opacity);}`});
  const mesh=new THREE.Mesh(geometry,material);mesh.frustumCulled=false;mesh.renderOrder=2;
  return{method:'gpu-overlay',mesh,update(camera,rings){
    uniforms.rippleRings.value.forEach((value,i)=>{const ring=rings[i];if(ring)value.set(...ring.center,ring.radius,ring.strength);else value.set(0,0,0,0);});
    uniforms.rippleTraits.value.forEach((value,i)=>{const ring=rings[i];value.set(ring?.source==='rain'?(ring.drop?2:1):0,ring?.width??0,ring?.height??0,ring?.length??0);});
    geometry.setDrawRange(0,ends[Math.min(capacity,Math.max(1,rings.length))]);
  },dispose(){geometry.dispose();material.dispose();}};
}
