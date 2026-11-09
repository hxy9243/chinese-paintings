import * as THREE from 'three';
import paintedUrl from '../references/hen-and-chicks.jpg?url';
import {createReferenceHenRig} from '../hen-study/src/motion.js';
const ELEVATION=Math.asin(.42),COS=Math.cos(ELEVATION),SPAN=232;
export async function createHenRenderer({antialias=false}={}){
 const renderer=new THREE.WebGLRenderer({alpha:true,antialias,preserveDrawingBuffer:false});renderer.setPixelRatio(1);renderer.setClearColor(0,0);renderer.outputColorSpace=THREE.SRGBColorSpace;
 const source=await new THREE.TextureLoader().loadAsync(paintedUrl);source.colorSpace=THREE.SRGBColorSpace;source.minFilter=THREE.LinearFilter;source.magFilter=THREE.LinearFilter;
 const scene=new THREE.Scene(),rig=createReferenceHenRig(source);scene.add(rig.root);
 scene.add(new THREE.HemisphereLight('#ffffff','#78715b',2.7));const key=new THREE.DirectionalLight('#fff8e6',2.7);key.position.set(-3,5,6);scene.add(key);
 const camera=new THREE.OrthographicCamera(-SPAN/2,SPAN/2,SPAN/2,-SPAN/2,.1,1000);
 // Same ground projection as the existing flock. The painted reference model
 // supplies the anatomy, wings, head, tail and stable pigment coordinates.
 const target=new THREE.Vector3(0,66*COS,-66*.42);camera.position.copy(target).add(new THREE.Vector3(0,Math.sin(ELEVATION)*350,Math.cos(ELEVATION)*350));camera.lookAt(target);
 return{rig,render(pose,resolution=2){const size=Math.ceil(SPAN*resolution);if(renderer.domElement.width!==size)renderer.setSize(size,size,false);rig.update(pose);renderer.render(scene,camera);return renderer.domElement;},span:SPAN,getError:()=>renderer.getContext().getError(),dispose(){renderer.dispose();}};
}
