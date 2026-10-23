import * as THREE from "three";

/** One modest-resolution pass: pigment spread and silk grain, not a global blur. */
export function createInkFinish(renderer: THREE.WebGLRenderer) {
  const target = new THREE.WebGLRenderTarget(1, 1, { depthBuffer: true });
  const material = new THREE.ShaderMaterial({
    depthTest: false,
    depthWrite: false,
    uniforms: {
      source: { value: target.texture },
      texel: { value: new THREE.Vector2(1, 1) },
      paper: { value: new THREE.Color(0xeee5cb) },
      strength: { value: 0.65 },
      sky: { value: 0 },
      inverseProjection: { value: new THREE.Matrix4() },
      cameraWorld: { value: new THREE.Matrix4() },
    },
    vertexShader: `varying vec2 uvPoint;void main(){uvPoint=uv;gl_Position=vec4(position.xy,0.,1.);}`,
    fragmentShader: `uniform sampler2D source;uniform vec2 texel;uniform vec3 paper;uniform float strength;uniform float sky;uniform mat4 inverseProjection;uniform mat4 cameraWorld;varying vec2 uvPoint;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
      vec3 background(vec2 uv){
        if(sky<.5)return paper;
        vec4 ray=inverseProjection*vec4(uv*2.-1.,1.,1.);
        vec3 dir=normalize((cameraWorld*vec4(ray.xyz/ray.w,0.)).xyz);
        float height=max(0.,dir.y);
        vec3 blue=mix(paper,vec3(.43,.66,.79),smoothstep(-.03,.48,dir.y)*.67);
        vec2 q=dir.xz/max(.16,height)*1.6;
        float cloud=noise(q)*.57+noise(q*2.1)*.28+noise(q*4.3)*.15;
        float wash=smoothstep(.46,.72,cloud)*smoothstep(.015,.16,height);
        return mix(blue,vec3(.94,.92,.83),wash*.8);
      }
      vec3 samplePaper(vec2 uv){vec4 c=texture2D(source,uv);return c.rgb+background(uv)*(1.-c.a);}
      void main(){
        vec2 pixel=uvPoint/texel;
        vec2 jitter=(vec2(hash(floor(pixel/2.)),hash(floor(pixel/2.)+71.))-.5)*texel*strength;
        vec2 p=uvPoint+jitter;
        vec3 core=samplePaper(p),wash=core*4.,bleed=core;
        float edge=0.;
        for(int i=0;i<8;i++){
          float a=float(i)*.785398;
          vec3 neighbor=samplePaper(p+vec2(cos(a),sin(a))*texel*(1.1+strength));
          // Limit diffusion across high-contrast fine linework.
          float contrast=length(core-neighbor);
          wash+=mix(neighbor,core,smoothstep(.12,.40,contrast));
          bleed=min(bleed,neighbor);edge+=contrast;
        }
        wash/=12.;
        vec3 color=mix(core,wash,strength*.40);
        color=mix(color,bleed,strength*.13);
        // Broad capillary bleed is confined to the translucent outer wash.
        // Fine figures and architecture retain their small-radius treatment.
        vec3 halo=vec3(0.);
        for(int i=0;i<16;i++){
          float a=float(i)*.392699;
          vec2 direction=vec2(cos(a),sin(a));
          float radius=14.+float(i%4)*16.;
          vec4 neighbor=texture2D(source,p+direction*texel*radius*(.6+strength));
          halo+=neighbor.rgb+background(p+direction*texel*radius*(.6+strength))*(1.-neighbor.a);
        }
        halo/=16.;
        float outer=(1.-smoothstep(.25,.94,texture2D(source,p).a));
        color=mix(color,min(background(p),halo),outer*min(1.,strength*1.4));
        float pooled=smoothstep(.06,.32,edge/8.);
        color*=1.-pooled*strength*.055;
        float grain=hash(pixel)*.6+hash(floor(pixel*.4))*.4;
        float fibers=sin(pixel.y*2.1+sin(pixel.x*.06))*.5+.5;
        float presence=smoothstep(.01,.22,length(core-paper));
        color*=1.-presence*strength*(grain*.047+fibers*.022);
        gl_FragColor=vec4(color,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const scene = new THREE.Scene(),
    camera = new THREE.Camera();
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
  scene.add(quad);
  return {
    setPaper(color: number) {
      material.uniforms.paper.value.set(color);
    },
    resize(width: number, height: number) {
      // Cap the offscreen pass independently of high-DPI phone screens.
      const ratio = Math.min(renderer.getPixelRatio(), 1.5);
      target.setSize(Math.round(width * ratio), Math.round(height * ratio));
      material.uniforms.texel.value.set(1 / target.width, 1 / target.height);
    },
    render(world: THREE.Scene, view: THREE.Camera, amount: number) {
      if (amount === 0) {
        renderer.setRenderTarget(null);
        renderer.render(world, view);
        return;
      }
      material.uniforms.strength.value = amount;
      material.uniforms.sky.value = view instanceof THREE.PerspectiveCamera ? 1 : 0;
      material.uniforms.inverseProjection.value.copy(view.projectionMatrixInverse);
      view.updateMatrixWorld();
      material.uniforms.cameraWorld.value.copy(view.matrixWorld);
      renderer.setRenderTarget(target);
      renderer.render(world, view);
      renderer.setRenderTarget(null);
      renderer.render(scene, camera);
    },
    dispose() {
      target.dispose();
      quad.geometry.dispose();
      material.dispose();
    },
  };
}
