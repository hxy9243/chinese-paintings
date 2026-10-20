import * as THREE from "three";

// World-space pigment stays attached to the artwork while the camera moves.
// No screen-space noise animation or extra postprocessing framebuffer is needed.
export const paintingAmount = { value: 1 };
export function paintMaterial(color: number, ground = false) {
  return new THREE.ShaderMaterial({
    clipping: true,
    uniforms: {
      pigment: { value: new THREE.Color(color) },
      painting: paintingAmount,
      ground: { value: ground ? 1 : 0 },
    },
    transparent: ground,
    side: THREE.DoubleSide,
    vertexShader: `
      #include <clipping_planes_pars_vertex>
      varying vec3 point; varying vec3 facing;
      void main(){vec4 world=modelMatrix*vec4(position,1.);point=world.xyz;
        facing=normalize(mat3(modelMatrix)*normal);
        vec4 mvPosition=viewMatrix*world;gl_Position=projectionMatrix*mvPosition;
        #include <clipping_planes_vertex>
      }`,
    fragmentShader: `
      #include <clipping_planes_pars_fragment>
      uniform vec3 pigment;uniform float painting;uniform float ground;
      varying vec3 point;varying vec3 facing;
      float hash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
      float noise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
        return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
          mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
      void main(){
        #include <clipping_planes_fragment>
        float wash=noise(point*2.8)*.65+noise(point*10.)*.25+noise(point*90.)*.1;
        float shade=.75+.25*max(0.,dot(normalize(facing),normalize(vec3(-.6,1.,.8))));
        vec3 paper=vec3(.78,.68,.46);
        float pool=smoothstep(.43,.75,noise(point*15.));
        float dry=smoothstep(.62,.85,noise(point*vec3(90.,35.,65.)));
        vec3 painted=mix(pigment,paper,.03+wash*.12+dry*.12);
        painted*=.86+wash*.23-pool*.12;
        painted*=mix(.96,1.02,max(0.,facing.y));
        vec3 result=mix(pigment*shade,painted,painting);
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
    uniforms: { painting: paintingAmount, fade: { value: fade } },
    vertexShader: `
      #include <clipping_planes_pars_vertex>
      varying vec3 point;
      void main(){vec4 world=modelMatrix*vec4(position,1.);point=world.xyz;
        vec4 mvPosition=viewMatrix*world;gl_Position=projectionMatrix*mvPosition;
        #include <clipping_planes_vertex>
      }`,
    fragmentShader: `
      #include <clipping_planes_pars_fragment>
      uniform float painting;uniform float fade;varying vec3 point;
      void main(){
        #include <clipping_planes_fragment>
        float grain=fract(sin(dot(floor(point*95.),vec3(127.1,311.7,74.7)))*43758.5453);
        float flow=.5+.5*sin(point.x*41.+point.y*29.+point.z*37.);
        float opacity=mix(.65,.28+flow*.40+grain*.18,painting);
        if(painting>.5 && grain>.92)opacity*=.22;
        gl_FragColor=vec4(vec3(.095,.077,.05),opacity*fade);
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
