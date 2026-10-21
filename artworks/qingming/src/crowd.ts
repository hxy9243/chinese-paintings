import * as THREE from "three";
import { FIGURE_HEIGHT } from "./figures";
import { projectedHeightPixels, type DetailLevel } from "../../../packages/scene-kit/lod";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { FIGURE_TYPES, figureDetail } from "./figureTypes";

// Logical articulated actors feed compact instance buffers. Each level owns
// genuinely different geometry; distant detail is not just a smaller framebuffer.
export function createCrowd(parent: THREE.Group,
  prototype: (variant: number, detail: DetailLevel) => THREE.Group) {
  const templates = FIGURE_TYPES.map((_, i) => [0, 1, 2].map(l => prototype(i, l as DetailLevel)));
  const actors: THREE.Group[] = [];
  const pools: { source: THREE.Mesh | THREE.Line; variant: number; level: DetailLevel;
    bone: string; local: THREE.Matrix4; geometry?: THREE.InstancedBufferGeometry;
    attribute?: THREE.InstancedBufferAttribute; drawable?: THREE.Mesh | THREE.LineSegments; actors?: THREE.Group[] }[] = [];
  templates.forEach((levels, variant) => levels.forEach((template, level) => {
    template.updateMatrixWorld(true);
    template.traverse(n => {
      if (!(n instanceof THREE.Mesh || n instanceof THREE.Line)) return;
      let bone: THREE.Object3D = n.parent!;
      while (bone !== template && !bone.name) bone = bone.parent!;
      pools.push({source:n, variant, level:level as DetailLevel,
        bone:bone === template ? "" : bone.name,
        local:bone.matrixWorld.clone().invert().multiply(n.matrixWorld)});
    });
  }));
  const buckets=new Map<string,typeof pools>();
  for(const p of pools){
    const key=[p.variant,p.level,p.bone,(p.source.material as THREE.Material).uuid,p.source instanceof THREE.Line].join(":");
    const entries=buckets.get(key)??[];entries.push(p);buckets.set(key,entries);
  }
  pools.length=0;
  for(const entries of buckets.values()){
    const p=entries[0];const geos=entries.map(e=>{
      let geo=e.source.geometry.clone();if(geo.index){const flat=geo.toNonIndexed();geo.dispose();geo=flat;}
      return geo.applyMatrix4(e.local);
    });
    const geometry=mergeGeometries(geos);geos.forEach(g=>g.dispose());
    if(!geometry)throw Error("Incompatible crowd geometry attributes");
    const source=p.source instanceof THREE.Line?new THREE.LineSegments(geometry,p.source.material):new THREE.Mesh(geometry,p.source.material);
    pools.push({...p,source,local:new THREE.Matrix4()});
  }
  return {
    add(owner: THREE.Object3D, variant: number, name: string) {
      variant = variant % templates.length;
      function skeleton(source: THREE.Group): THREE.Group {
        const node = new THREE.Group(); node.name=source.name;
        node.position.copy(source.position); node.quaternion.copy(source.quaternion); node.scale.copy(source.scale);
        source.children.filter(n => n instanceof THREE.Group).forEach(n => node.add(skeleton(n as THREE.Group)));
        return node;
      }
      const actor=skeleton(templates[variant][2]); actor.name=name;
      actor.userData.variant=variant; actor.userData.figureType=FIGURE_TYPES[variant].name;
      actor.userData.detail=1;actor.userData.bones={};
      actor.traverse(n=>{if(n.name)actor.userData.bones[n.name]=n;});
      owner.add(actor); actors.push(actor); return actor;
    },
    finish() {
      for (const pool of pools) {
        pool.actors=actors.filter(a=>a.userData.variant===pool.variant);
        const count=pool.actors.length;
        if (!count) continue;
        const geo=new THREE.InstancedBufferGeometry().copy(pool.source.geometry as THREE.InstancedBufferGeometry);
        geo.instanceCount=0;
        const attr=new THREE.InstancedBufferAttribute(new Float32Array(count*16),16).setUsage(THREE.DynamicDrawUsage);
        geo.setAttribute("crowdMatrix",attr); pool.geometry=geo;pool.attribute=attr;
        const material=(pool.source.material as THREE.ShaderMaterial).clone();
        material.uniforms=(pool.source.material as THREE.ShaderMaterial).uniforms;
        material.vertexShader="attribute mat4 crowdMatrix;\n"+material.vertexShader
          .replace("modelMatrix*vec4(position,1.)","modelMatrix*crowdMatrix*vec4(position,1.)")
          .replace("mat3(modelMatrix)*normal","mat3(modelMatrix*crowdMatrix)*normal");
        material.fragmentShader=material.fragmentShader.replace("void main(){",`void main(){
          float edgeS=point.x*.64278761+point.z*.76604444;
          float edgeD=-point.x*.76604444+point.z*.64278761;
          if(length(vec2(max(0.,abs(edgeS)-16.),max(0.,abs(edgeD)-8.)))>6. && length(vec2(max(0.,abs(edgeS+40.)-17.),max(0.,abs(edgeD+10.)-22.)))>6.)discard;
        `);
        const drawable=pool.source instanceof THREE.Line ? new THREE.LineSegments(geo,material) : new THREE.Mesh(geo,material);
        drawable.name="animated-crowd"; drawable.userData.level=pool.level;
        drawable.frustumCulled=false; parent.add(drawable);pool.drawable=drawable;
      }
      templates.flat().forEach(t=>t.traverse(n=>{if(n instanceof THREE.Mesh||n instanceof THREE.Line)n.geometry.dispose();}));
      pools.forEach(p=>p.source.geometry.dispose());
    },
    update(camera?: THREE.Camera, viewportHeight=800, preview=false) {
      parent.updateMatrixWorld(true);
      const inverse=parent.matrixWorld.clone().invert(), matrix=new THREE.Matrix4(), center=new THREE.Vector3(),scale=new THREE.Vector3();
      const frustum=new THREE.Frustum(),sphere=new THREE.Sphere();
      if(camera){camera.updateMatrixWorld();frustum.setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));}
      for(const actor of actors) {
        if(!camera){actor.userData.inView=true;continue;}
        actor.getWorldPosition(center);actor.getWorldScale(scale);
        const ortho=camera as THREE.OrthographicCamera,perspective=camera as THREE.PerspectiveCamera;
        const pixels=projectedHeightPixels({height:FIGURE_HEIGHT*scale.y,viewportHeight,zoom:ortho.zoom??1,
          orthographicSpan:ortho.isOrthographicCamera?ortho.top-ortho.bottom:undefined,
          distance:center.distanceTo(camera.position),verticalFov:perspective.fov});
        actor.userData.detail=preview?0:figureDetail(pixels,actor.userData.detail);
        sphere.center.copy(center);sphere.center.y+=FIGURE_HEIGHT*scale.y*.5;sphere.radius=FIGURE_HEIGHT*scale.y*.85;
        actor.userData.inView=frustum.intersectsSphere(sphere);
      }
      for(const pool of pools) {
        if(!pool.attribute||!pool.geometry||!pool.drawable)continue;
        let count=0;
        for(const actor of pool.actors??[]) {
          if(actor.userData.detail!==pool.level||actor.userData.inView===false)continue;
          let visible=true;
          for(let n:THREE.Object3D|null=actor;n;n=n.parent)visible&&=n.visible;
          if(!visible)continue;
          const bone=pool.bone?actor.userData.bones[pool.bone] as THREE.Group:actor;
          matrix.multiplyMatrices(inverse,bone.matrixWorld).multiply(pool.local);
          matrix.toArray(pool.attribute.array,count++*16);
        }
        pool.geometry.instanceCount=count;pool.drawable.visible=count>0;
        pool.attribute.needsUpdate=true;
      }
    },
    metadata() {
      return {variants:templates.length,levels:[0,1,2].map(level=>({level,actors:actors.filter(a=>a.userData.detail===level).length,visibleActors:actors.filter(a=>a.userData.detail===level&&a.userData.inView!==false).length,
        triangles:pools.filter(p=>p.level===level&&p.source instanceof THREE.Mesh&&p.geometry).reduce((n,p)=>n+(p.geometry!.index?.count??p.geometry!.attributes.position.count)/3*p.geometry!.instanceCount,0)}))};
    },
    actors,
  };
}
