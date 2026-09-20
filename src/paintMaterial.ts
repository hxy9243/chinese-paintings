import * as THREE from "three";

// World-space pigment stays attached to the artwork while the camera moves.
// No screen-space noise animation or extra postprocessing framebuffer is needed.
export const paintingAmount = { value: 1 };
export function paintMaterial(color: number, ground = false) {
  return new THREE.ShaderMaterial({
    uniforms: {
      pigment: { value: new THREE.Color(color) },
      painting: paintingAmount,
      ground: { value: ground ? 1 : 0 },
    },
    transparent: ground,
    side: THREE.DoubleSide,
    vertexShader: `varying vec3 point; varying vec3 facing;
      void main(){vec4 world=modelMatrix*vec4(position,1.);point=world.xyz;
        facing=normalize(mat3(modelMatrix)*normal);gl_Position=projectionMatrix*viewMatrix*world;}`,
    fragmentShader: `uniform vec3 pigment;uniform float painting;uniform float ground;
      varying vec3 point;varying vec3 facing;
      float hash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
      float noise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
        return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
          mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
      void main(){
        float wash=noise(point*2.8)*.65+noise(point*10.)*.25+noise(point*90.)*.1;
        float shade=.75+.25*max(0.,dot(normalize(facing),normalize(vec3(-.6,1.,.8))));
        vec3 paper=vec3(.84,.78,.64);
        vec3 painted=mix(pigment,paper,.04+wash*.10)*( .96+wash*.10 );
        painted*=mix(.96,1.02,max(0.,facing.y));
        vec3 result=mix(pigment*shade,painted,painting);
        float edge=min((8.6-abs(point.x))/1.5,(5.8-abs(point.z))/1.3);
        float alpha=ground>.5 ? smoothstep(0.,1.,edge+(wash-.5)*.3) : 1.;
        gl_FragColor=vec4(result,alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
}
