import * as THREE from "three";
import { currentArtStyleUniforms, paletteInk } from "./scenePalette";

/** Fast single-pass calligraphic contour, capillary wash bleed, river mist, and woven silk finish. */
export function createInkFinish(renderer: THREE.WebGLRenderer) {
  const target = new THREE.WebGLRenderTarget(1, 1, { depthBuffer: true });
  const material = new THREE.ShaderMaterial({
    depthTest: false,
    depthWrite: false,
    uniforms: {
      source: { value: target.texture },
      texel: { value: new THREE.Vector2(1, 1) },
      paper: { value: new THREE.Color(0xeee5cb) },
      inkColor: paletteInk,
      styleFinish: currentArtStyleUniforms.styleFinish,
      strength: { value: 0.65 },
      sky: { value: 0 },
      inverseProjection: { value: new THREE.Matrix4() },
      cameraWorld: { value: new THREE.Matrix4() },
    },
    vertexShader: `varying vec2 uvPoint;void main(){uvPoint=uv;gl_Position=vec4(position.xy,0.,1.);}`,
    fragmentShader: `uniform sampler2D source;uniform vec2 texel;uniform vec3 paper;uniform vec3 inkColor;uniform vec4 styleFinish;uniform float strength;uniform float sky;uniform mat4 inverseProjection;uniform mat4 cameraWorld;varying vec2 uvPoint;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
      float luma(vec3 c){return dot(c,vec3(.299,.587,.114));}
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
        float contourStrength=styleFinish.x, mistDensity=styleFinish.y, washBleed=styleFinish.z, silkGrain=styleFinish.w;
        vec2 pixel=uvPoint/texel;
        vec2 jitter=(vec2(hash(floor(pixel/2.)),hash(floor(pixel/2.)+71.))-.5)*texel*strength*.65;
        vec2 p=uvPoint+jitter;
        vec3 core=samplePaper(p),wash=core*4.,bleed=core;
        float edge=0.;
        float lCore=luma(core);
        float gx=0.,gy=0.;
        for(int i=0;i<8;i++){
          float a=float(i)*.785398;
          vec2 dir=vec2(cos(a),sin(a));
          vec3 neighbor=samplePaper(p+dir*texel*(1.05+strength*.75));
          float contrast=length(core-neighbor);
          wash+=mix(neighbor,core,smoothstep(.10,.36,contrast));
          bleed=min(bleed,neighbor);
          edge+=contrast;
          float ln=luma(neighbor)-lCore;
          gx+=ln*dir.x;gy+=ln*dir.y;
        }
        wash/=12.;
        vec3 color=mix(core,wash,clamp(strength*washBleed*.58,0.,.78));
        color=mix(color,bleed,clamp(strength*washBleed*.26,0.,.42));

        // Calligraphic Sobel edge reinforcement with dry-brush feibai modulation
        float sobel=sqrt(gx*gx+gy*gy);
        float brushBreak=.52+.48*noise(pixel*.18);
        float inkLine=smoothstep(.028,.19,sobel)*contourStrength*brushBreak*strength;
        color=mix(color,inkColor,clamp(inkLine*.52,0.,.72));

        // Fast 4-tap capillary outer wash halo (4x faster than 16-tap ring)
        vec3 halo=vec3(0.);
        for(int i=0;i<4;i++){
          float a=float(i)*1.570796+.39;
          vec2 offset=vec2(cos(a),sin(a))*texel*22.*(.6+strength);
          vec4 neighbor=texture2D(source,p+offset);
          halo+=neighbor.rgb+background(p+offset)*(1.-neighbor.a);
        }
        halo*=.25;
        float outer=(1.-smoothstep(.25,.94,texture2D(source,p).a));
        color=mix(color,min(background(p),halo),outer*min(1.,strength*1.4));

        // Wet-edge pigment ring (水渍)
        float pooled=smoothstep(.04,.24,edge/8.);
        color*=1.-pooled*strength*(.045+.085*washBleed);

        // Atmospheric Bian River morning mist veiling the upper/far bank
        float mistBand=smoothstep(.32,.92,uvPoint.y)*(.58+.42*noise(uvPoint*vec2(6.,3.5)+vec2(1.3,.7)));
        color=mix(color,mix(paper,vec3(.92,.94,.91),.3),clamp(mistBand*mistDensity*strength*.48*(1.-outer),0.,.62));

        // Authentic two-axis Song woven silk grain (绢本经纬纹理) & aged scroll vignette
        float grain=hash(pixel)*.55+hash(floor(pixel*.45))*.45;
        float warp=sin(pixel.y*2.35+sin(pixel.x*.07))*.5+.5;
        float weft=sin(pixel.x*2.15+cos(pixel.y*.07))*.5+.5;
        float weave=warp*.65+weft*.35;
        float presence=smoothstep(.01,.22,length(core-paper))+.35*max(0.,silkGrain-1.);
        color*=1.-presence*strength*silkGrain*(grain*.048+weave*.036);
        if(silkGrain>1.1){
          vec2 vig=uvPoint*2.-1.;
          float patina=dot(vig,vig)*(silkGrain-1.)*.18;
          color=mix(color,paper*.84,clamp(patina,0.,.22));
        }
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
