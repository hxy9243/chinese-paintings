import * as THREE from 'three';
import {createInkAtlas} from './ink-atlas.js';
import {createGpuRipples} from './gpu-ripples.js';

function kindOf(mesh){
  const f=mesh.userData.inkForm;
  if(mesh.userData.inkGlyph||!f&&!mesh.userData.inkStroke)return 7;
  if(mesh.userData.inkStroke)return 6;
  if(f.role==='fish-head')return 0;if(f.role==='fish-body')return 1;if(f.role==='fish-fin')return 2;
  return f.head?3:f.leaf?5:4;
}

function joinedShellNormals(source,target,columns,rows){
  target.set(source);
  // UV seams and collapsed end rings duplicate positions. They must share the
  // same extrusion normal or a diffusion fringe would open hairline cracks.
  for(let row=0;row<rows;row++){
    const first=row*columns*3,last=(row*columns+columns-1)*3;
    if(row===0||row===rows-1){
      for(let axis=0;axis<3;axis++){
        let sum=0;for(let col=0;col<columns-1;col++)sum+=source[first+col*3+axis];
        for(let col=0;col<columns;col++)target[first+col*3+axis]=sum/(columns-1);
      }
    }else for(let axis=0;axis<3;axis++)target[first+axis]=target[last+axis]=(source[first+axis]+source[last+axis])*.5;
  }
  return target;
}
export async function createGpuInk(container,renderer,camera,pond,sharedPaint=null){
  const paint=sharedPaint??await createInkAtlas(),items=[],indices=[];let count=0;
  pond.root.traverse(mesh=>{
    if(!mesh.isMesh||!mesh.visible||!mesh.layers.isEnabled(1))return;
    const g=mesh.geometry,kind=kindOf(mesh),stroke=mesh.userData.inkStroke;
    const rows=stroke||kind===3?g.userData.paintLattice.rows:0,columns=stroke||kind===3?g.userData.paintLattice.columns:0;
    const item={mesh,kind,offset:count,indexStart:indices.length,position:g.attributes.position,normal:g.attributes.normal,uv:g.attributes.uv,rows,columns,
      count:stroke?rows*2:g.attributes.position.count,centers:stroke?new Float64Array(rows*3):null,radii:stroke?new Float32Array(rows):null,
      joinedNormals:kind===3?new Float32Array(g.attributes.normal.array.length):null,normalMatrix:stroke?null:new THREE.Matrix3()};
    if(stroke)for(let row=0;row<rows-1;row++){const n=count+row*2;indices.push(n,n+1,n+2,n+1,n+3,n+2);}
    else for(const index of g.index.array)indices.push(index+count);
    item.indexCount=indices.length-item.indexStart;
    item.opacity=(mesh.userData.paintOpacity??1)*(stroke?.opacity??1);item.seed=(mesh.userData.paintSeedOffset??0)+(mesh.userData.inkForm?.seed??stroke?.seed??0);
    items.push(item);count+=item.count;
  });
  const positions=new Float32Array(count*3),normals=new Float32Array(count*3),uvs=new Float32Array(count*2),meta=new Float32Array(count*4),animalIds=new Float32Array(count),depthLayers=new Float32Array(count),tones=new Float32Array(count*3);
  for(const item of items)for(let i=0;i<item.count;i++){
    const at=item.offset+i;uvs.set(item.kind===6?[Math.floor(i/2)/(item.rows-1),i%2]:[item.uv.getX(i),item.uv.getY(i)],at*2);
    meta.set([item.kind,((item.seed%4)+4)%4+(item.mesh.userData.paintUvTurn??0),item.opacity,0],at*4);animalIds[at]=item.mesh.userData.animalIndex??0;
    depthLayers[at]=item.mesh.userData.waterDepthLayer??0;
    const color=item.mesh.userData.paintColor??[.073,.077,.068],strength=item.kind>=6?.28:1;
    tones.set(color.map((value,k)=>[.073,.077,.068][k]*(1-strength)+value*strength),at*3);
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.BufferAttribute(positions,3).setUsage(THREE.DynamicDrawUsage));
  geometry.setAttribute('normal',new THREE.BufferAttribute(normals,3).setUsage(THREE.DynamicDrawUsage));
  geometry.setAttribute('uv',new THREE.BufferAttribute(uvs,2));geometry.setAttribute('paintMeta',new THREE.BufferAttribute(meta,4).setUsage(THREE.DynamicDrawUsage));
  geometry.setAttribute('animalId',new THREE.BufferAttribute(animalIds,1));geometry.setIndex(indices);
  geometry.setAttribute('waterLayer',new THREE.BufferAttribute(depthLayers,1));
  geometry.setAttribute('paintTone',new THREE.BufferAttribute(tones,3));
  const uniforms={animalActive:{value:pond.animals.map(a=>a.active?1:0)},pigment:{value:paint.atlas},paper:{value:paint.paper},paperTone:{value:new THREE.Vector3(243/255,237/255,223/255)},
    waterLayerCount:{value:Math.max(1,pond.animals.length)},wash:{value:.42},formOnly:{value:0},ownerMode:{value:0},hideFine:{value:0},resolution:{value:new THREE.Vector2(1,1)},cssResolution:{value:new THREE.Vector2(1,1)}};
  const water=createGpuRipples(uniforms);
  const vertexShader=`attribute vec4 paintMeta;attribute float animalId;attribute float waterLayer;attribute vec3 paintTone;varying vec3 inkTone;varying vec2 brushUv;varying vec4 brush;varying vec3 facing;varying float animal;varying float coverage;
    uniform vec2 resolution;uniform vec2 cssResolution;uniform float formOnly;uniform float waterLayerCount;uniform float animalActive[${Math.max(1,pond.animals.length)}];
    void main(){if(animalActive[int(animalId+.5)]<.5){gl_Position=vec4(2.,2.,2.,1.);return;}brushUv=uv;brush=paintMeta;inkTone=paintTone;animal=animalId;coverage=1.;vec4 mv=modelViewMatrix*vec4(position,1.);
      vec4 clip=projectionMatrix*mv;facing=normalize(normalMatrix*normal);
      if(paintMeta.x>5.5&&paintMeta.x<6.5){
        vec4 ahead=projectionMatrix*(mv+vec4(mat3(modelViewMatrix)*normal,0.));
        vec2 tangent=(ahead.xy/ahead.w-clip.xy/clip.w)*resolution;
        vec2 perpendicular=vec2(-tangent.y,tangent.x)/max(.0001,length(tangent));
        float viewDepth=projectionMatrix[3][3]>.5?1.:max(1.,-mv.z);
        float pixels=paintMeta.w*projectionMatrix[1][1]/viewDepth*resolution.y*.5;
        float width=max(1.30,pixels);coverage=sqrt(min(1.,pixels/width));
        clip.xy+=perpendicular*(uv.y*2.-1.)*width/resolution*clip.w;facing=vec3(0.,0.,1.);
      }
      // A small paper-space bleed gives the feather room outside the true
      // volume. It is still the same depth-tested surface in the same batch.
      if(paintMeta.x>2.5&&paintMeta.x<3.5&&formOnly<.5)
        clip.xy+=facing.xy*2.2/cssResolution*clip.w;
      // Reserve a disjoint depth interval for each complete animal. The
      // positive scale retains all real surface/self-occlusion within that
      // interval, while another swimmer cannot cut through its body or limbs.
      // XY, silhouette, normals, articulation and pigment coverage stay intact.
      clip.z=clip.z*(.72/waterLayerCount)+clip.w*(.80-1.60*(waterLayer+.5)/waterLayerCount);
      gl_Position=clip;
    }`;
  const fragmentShader=`uniform sampler2D pigment;uniform sampler2D paper;uniform vec3 paperTone;uniform float wash;uniform float formOnly;uniform float ownerMode;uniform float hideFine;
    uniform vec2 resolution;uniform vec2 cssResolution;
    varying vec3 inkTone;varying vec2 brushUv;varying vec4 brush;varying vec3 facing;varying float animal;varying float coverage;
    void main(){vec3 n=normalize(facing);bool filament=brush.x>5.5&&brush.x<6.5;
      if(ownerMode>.5){gl_FragColor=vec4((brush.x+1.)/255.,(animal+1.)/255.,0.,1.);return;}
      if(formOnly>.5){float lit=.40+.60*abs(dot(n,normalize(vec3(-.35,.6,1.))));gl_FragColor=vec4(vec3(.46,.51,.47)*lit,1.);return;}
      vec2 markUv=brushUv;
      if(brush.x>2.5&&brush.x<3.5&&fract(brush.y)>.001)markUv.y=fract(markUv.y+fract(brush.y));
      vec2 uv=(vec2(floor(brush.y+.0001),brush.x)+clamp(markUv,vec2(.004),vec2(.996)))/vec2(4.,8.);
      vec4 pigmentSample=texture2D(pigment,uv);float deposit=pigmentSample.a;
      float alpha=clamp(deposit*brush.z*(.67+wash*.93)*(.40+.60*sqrt(abs(n.z))),0.,.97);
      if(brush.x>2.5&&brush.x<3.5){
        // Keep volume in the silhouette, foreshortening and depth, without a
        // smooth, view-lit stripe. Only the narrow wet rim follows the normal;
        // its uneven softness is seeded in surface UVs, never frame noise.
        float rim=smoothstep(.035,.42+.18*pigmentSample.b,abs(n.z));
        float ends=smoothstep(0.,.065,brushUv.x)*smoothstep(0.,.055,1.-brushUv.x);
        alpha=clamp(deposit*brush.z*(.85+wash*.95)*(.025+.975*rim)*ends,0.,.94);
      }
      if(filament){alpha*=coverage*(1.-smoothstep(.32,.51,abs(brushUv.y-.5)));if(hideFine>.5)alpha=0.;}
      vec2 paperUv=vec2(gl_FragCoord.x,resolution.y-gl_FragCoord.y)/resolution*cssResolution/512.;
      vec3 sheet=paperTone+(texture2D(paper,paperUv).r-.5)*.024;
      gl_FragColor=vec4(mix(sheet,inkTone,alpha),1.);
    }`;
  const material=new THREE.ShaderMaterial({uniforms,vertexShader,fragmentShader,side:THREE.DoubleSide,depthWrite:true,depthTest:true,blending:THREE.NoBlending,toneMapped:false});
  const scene=new THREE.Scene(),batch=new THREE.Mesh(geometry,material);scene.add(water.mesh);
  batch.frustumCulled=false;batch.renderOrder=1;scene.add(batch);
  // Paper, ink and a faint water overlay. No refraction target is needed.
  // There is no full-screen blur chain or GPU readback during playback.
  const paperMaterial=new THREE.ShaderMaterial({depthTest:false,depthWrite:false,toneMapped:false,
    uniforms:{paper:uniforms.paper,paperTone:uniforms.paperTone,cssResolution:uniforms.cssResolution,ownerMode:uniforms.ownerMode,formOnly:uniforms.formOnly},
    vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,1.,1.);}',
    fragmentShader:`uniform sampler2D paper;uniform vec3 paperTone;uniform vec2 cssResolution;uniform float ownerMode;uniform float formOnly;varying vec2 vUv;
        void main(){vec3 color=paperTone+(texture2D(paper,vec2(vUv.x,1.-vUv.y)*cssResolution/512.).r-.5)*.024;
        gl_FragColor=vec4(ownerMode>.5?vec3(0.):color,1.);}`});
  const paperMesh=new THREE.Mesh(new THREE.PlaneGeometry(2,2),paperMaterial);paperMesh.frustumCulled=false;paperMesh.renderOrder=-1;scene.add(paperMesh);
  const canvas=renderer.domElement;canvas.tabIndex=0;
  canvas.setAttribute('aria-label','Living ink painting of fish and shrimp. Drag to rotate the pond; scroll or pinch to zoom. Click for ripples. Arrow keys rotate; Home resets the view.');container.append(canvas);
  let width=1,height=1,scale=1,stats={},formOnly=false;
  function resize(w,h,s=scale){width=Math.round(w);height=Math.round(h);scale=s;renderer.setSize(Math.round(width*scale),Math.round(height*scale),false);uniforms.resolution.value.set(canvas.width,canvas.height);uniforms.cssResolution.value.set(width,height);}
  function updateGeometry(){
    pond.root.updateMatrixWorld(true);
    for(const item of items){
      if(!pond.animals[item.mesh.userData.animalIndex]?.active)continue;
      const src=item.position.array,ns=item.joinedNormals?joinedShellNormals(item.normal.array,item.joinedNormals,item.columns,item.rows):item.normal.array,m=item.mesh.matrixWorld.elements;
      if(item.kind===6){
        const cols=item.columns,centers=item.centers,radii=item.radii,worldScale=Math.hypot(m[0],m[1],m[2]);
        for(let row=0;row<item.rows;row++){
          let x=0,y=0,z=0;for(let col=0;col<cols-1;col++){const a=(row*cols+col)*3;x+=src[a];y+=src[a+1];z+=src[a+2];}
          x/=cols-1;y/=cols-1;z/=cols-1;centers.set([x,y,z],row*3);
          const a=row*cols*3;radii[row]=Math.hypot(src[a]-x,src[a+1]-y,src[a+2]-z)*2*worldScale;
        }
        for(let row=0;row<item.rows;row++){
          const a=row*3,prev=Math.max(0,row-1)*3,next=Math.min(item.rows-1,row+1)*3;
          const x=centers[a],y=centers[a+1],z=centers[a+2],nx=centers[next]-centers[prev],ny=centers[next+1]-centers[prev+1],nz=centers[next+2]-centers[prev+2];
          for(let side=0;side<2;side++){
            const at=item.offset+row*2+side,b=at*3;
            positions[b]=m[0]*x+m[4]*y+m[8]*z+m[12];positions[b+1]=m[1]*x+m[5]*y+m[9]*z+m[13];positions[b+2]=m[2]*x+m[6]*y+m[10]*z+m[14];
            normals[b]=m[0]*nx+m[4]*ny+m[8]*nz;normals[b+1]=m[1]*nx+m[5]*ny+m[9]*nz;normals[b+2]=m[2]*nx+m[6]*ny+m[10]*nz;meta[at*4+3]=radii[row];
          }
        }
      }else{const nm=item.normalMatrix.getNormalMatrix(item.mesh.matrixWorld).elements;for(let i=0;i<item.count;i++){
        const a=i*3,b=(item.offset+i)*3,x=src[a],y=src[a+1],z=src[a+2],nx=ns[a],ny=ns[a+1],nz=ns[a+2];
        positions[b]=m[0]*x+m[4]*y+m[8]*z+m[12];positions[b+1]=m[1]*x+m[5]*y+m[9]*z+m[13];positions[b+2]=m[2]*x+m[6]*y+m[10]*z+m[14];
        normals[b]=nm[0]*nx+nm[3]*ny+nm[6]*nz;normals[b+1]=nm[1]*nx+nm[4]*ny+nm[7]*nz;normals[b+2]=nm[2]*nx+nm[5]*ny+nm[8]*nz;
      }}
    }
    geometry.attributes.position.needsUpdate=true;geometry.attributes.normal.needsUpdate=true;geometry.attributes.paintMeta.needsUpdate=true;
  }
  function draw(wash=.42){
    const started=performance.now(),rings=pond.rippleSample(),rain=pond.rainSample?.()??[];pond.animals.forEach((a,i)=>{uniforms.animalActive.value[i]=a.active?1:0;});updateGeometry();uniforms.wash.value=wash;uniforms.formOnly.value=formOnly?1:0;
    renderer.info.autoReset=false;renderer.info.reset();water.update(camera,[...rings,...rain]);
    renderer.setRenderTarget(null);renderer.setClearColor(0xf3eddf,1);renderer.clear();renderer.render(scene,camera);
    stats={renderer:'Batched GPU wet ink on articulated 3D surfaces',p5PigmentAtlas:true,readbacksPerFrame:0,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,vertices:count,renderScale:scale,gpuMemory:{...renderer.info.memory},cpuDrawMs:performance.now()-started,depthOwnership:true,animalOcclusion:'Persistent disjoint water-depth intervals; true self-occlusion within each swimmer',translucentDiffusion:true,diffusion:'p5 wet pigment with feathered coverage',carapaceInk:'Irregular loaded brush strokes, dilute wash, backruns and surface-seeded wet rim',individualPigmentTints:true,waterRipples:{enabled:uniforms.rippleEnabled.value>.5,activeRings:rings.length,sharedPerspective:true,throughBodies:true,refractionCssPixels:0,method:water.method},stableDithering:true,formOnly};
  }
  function read(){const gl=renderer.getContext(),data=new Uint8Array(canvas.width*canvas.height*4);gl.readPixels(0,0,canvas.width,canvas.height,gl.RGBA,gl.UNSIGNED_BYTE,data);return data;}
  function diagnoseOcclusion(wash){
    draw(wash);const before=read();uniforms.ownerMode.value=1;draw(wash);const owners=read();uniforms.ownerMode.value=0;uniforms.hideFine.value=1;draw(wash);const after=read();uniforms.hideFine.value=0;draw(wash);
    const w=canvas.width,h=canvas.height;let comparedInteriorPixels=0,changedInteriorPixels=0;
    for(let y=4;y<h-4;y++)for(let x=4;x<w-4;x++){
      const at=(y*w+x)*4,kind=owners[at],animal=owners[at+1];if(kind<1||kind>6||animal<1)continue;
      let inside=true;for(let dy=-4;dy<=4&&inside;dy++)for(let dx=-4;dx<=4;dx++)if(dx*dx+dy*dy<=16){const b=((y+dy)*w+x+dx)*4;if(owners[b]!==kind||owners[b+1]!==animal){inside=false;break;}}
      if(!inside)continue;comparedInteriorPixels++;if(Math.max(Math.abs(before[at]-after[at]),Math.abs(before[at+1]-after[at+1]),Math.abs(before[at+2]-after[at+2]))>1)changedInteriorPixels++;
    }
    return{comparedInteriorPixels,changedInteriorPixels,maskErosionRadius:4,offlineReadbackOnly:true};
  }
  function diagnoseRipples(wash){
    const enabled=uniforms.rippleEnabled.value;uniforms.rippleEnabled.value=1;draw(wash);const before=read();
    uniforms.ownerMode.value=1;draw(wash);const owners=read();uniforms.ownerMode.value=0;uniforms.rippleEnabled.value=0;draw(wash);const after=read();
    uniforms.rippleEnabled.value=enabled;draw(wash);let bodyPixels=0,paperPixels=0,maxBodyDifference=0,maxPaperDifference=0;
    for(let at=0;at<before.length;at+=4){const delta=Math.max(...[0,1,2].map(k=>Math.abs(before[at+k]-after[at+k]))),body=owners[at]>0;
      if(body){maxBodyDifference=Math.max(maxBodyDifference,delta);if(delta>2)bodyPixels++;}
      else{maxPaperDifference=Math.max(maxPaperDifference,delta);if(delta>2)paperPixels++;}
    }
    return{bodyPixels,paperPixels,maxBodyDifference,maxPaperDifference,offlineReadbackOnly:true};
  }
  // Offline ownership inspection: isolate each complete swimmer through index
  // ranges, using exactly the same geometry and shaders as the normal picture.
  function diagnoseAnimalLayers(wash){
    const savedOwner=uniforms.ownerMode.value,savedWater=uniforms.rippleEnabled.value,masks=[];
    uniforms.rippleEnabled.value=0;uniforms.ownerMode.value=1;draw(wash);const combined=read();
    for(let animal=0;animal<pond.animals.length;animal++){
      const parts=items.filter(item=>item.mesh.userData.animalIndex===animal);
      if(!parts.length){masks.push(null);continue;}
      const start=parts[0].indexStart,end=parts.at(-1).indexStart+parts.at(-1).indexCount;
      geometry.setDrawRange(start,end-start);draw(wash);masks.push(read());
    }
    geometry.setDrawRange(0,Infinity);uniforms.ownerMode.value=0;draw(wash);const combinedInk=read();
    const overlap=new Uint8Array(canvas.width*canvas.height);let overlapPixels=0,wrongOwnerPixels=0;
    for(let pixel=0;pixel<overlap.length;pixel++){
      const at=pixel*4;let covered=0,front=-1,layer=-Infinity;
      for(let animal=0;animal<masks.length;animal++)if(masks[animal]?.[at]){
        covered++;if(pond.animals[animal].waterDepthLayer>layer){layer=pond.animals[animal].waterDepthLayer;front=animal;}
      }
      if(covered<2)continue;overlap[pixel]=1;overlapPixels++;
      if(combined[at+1]-1!==front)wrongOwnerPixels++;
    }
    let frontPaintComparedPixels=0,hiddenInkLeakPixels=0;
    for(let animal=0;animal<masks.length;animal++)if(masks[animal]){
      const parts=items.filter(item=>item.mesh.userData.animalIndex===animal),start=parts[0].indexStart,end=parts.at(-1).indexStart+parts.at(-1).indexCount;
      geometry.setDrawRange(start,end-start);draw(wash);const isolated=read();
      for(let pixel=0;pixel<overlap.length;pixel++){
        const at=pixel*4;if(!overlap[pixel]||combined[at+1]-1!==animal||masks[animal][at]>6)continue;
        frontPaintComparedPixels++;
        if(Math.max(...[0,1,2].map(k=>Math.abs(isolated[at+k]-combinedInk[at+k])))>1)hiddenInkLeakPixels++;
      }
    }
    geometry.setDrawRange(0,Infinity);uniforms.ownerMode.value=savedOwner;uniforms.rippleEnabled.value=savedWater;draw(wash);
    const pairs=[];
    for(let a=0;a<masks.length;a++)for(let b=a+1;b<masks.length;b++){
      if(!masks[a]||!masks[b])continue;
      let bodyOverlapPixels=0,allOverlapPixels=0;const owners={},allOwners={};
      for(let at=0;at<combined.length;at+=4){
        const ka=masks[a][at],kb=masks[b][at];if(!ka||!kb)continue;
        allOverlapPixels++;const owner=combined[at+1]-1;allOwners[owner]=(allOwners[owner]??0)+1;
        if(ka>6||kb>6)continue;
        bodyOverlapPixels++;owners[owner]=(owners[owner]??0)+1;
      }
      if(allOverlapPixels)pairs.push({a,b,bodyOverlapPixels,allOverlapPixels,owners,allOwners});
    }
    return{overlapPixels,wrongOwnerPixels,frontPaintComparedPixels,hiddenInkLeakPixels,pairs,offlineReadbackOnly:true};
  }
  return{canvas,resize,draw,describe:()=>stats,diagnoseOcclusion,diagnoseAnimalLayers,diagnoseRipples,setRipples(value){uniforms.rippleEnabled.value=value?1:0;},setPaperTone(rgb){uniforms.paperTone.value.set(...rgb.map(x=>x/255));},setFormOnly(value){formOnly=Boolean(value);},setRenderScale(value){resize(width,height,value);},
    dispose(){geometry.dispose();material.dispose();paperMesh.geometry.dispose();paperMaterial.dispose();water.dispose();if(!sharedPaint)paint.dispose();}};
}
