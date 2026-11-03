import * as THREE from 'three';

export const WATER_VIEW=Object.freeze({elevationDegrees:45,azimuthDegrees:-45,projection:'orthographic',halfHeight:550,worldUp:[0,0,1],anatomicalTop:[0,1,0]});
const C=Math.SQRT1_2,Z=new THREE.Vector3(0,0,1),Y=new THREE.Vector3(0,1,0),X=new THREE.Vector3(1,0,0);
const tiltQ=new THREE.Quaternion(),bankQ=new THREE.Quaternion();
// Route coordinates are measured on the picture. This basis embeds them in
// one horizontal water plane, compensating only positions for foreshortening.
// Bodies keep their true proportions and are never flattened or billboarded.
export function waterToWorld([u,v,z=0]){return[C*u-v,C*u+v,z];}
export function worldToWater([x,y,z=0]){return[C*(x+y),(y-x)*.5,z];}
export function swimmerOrientation(heading,tilt,bank,target=new THREE.Quaternion()){
  const [x,y]=waterToWorld([Math.cos(heading),Math.sin(heading)]),yaw=Math.atan2(y,x)-Math.PI;
  return target.setFromAxisAngle(Z,yaw).multiply(tiltQ.setFromAxisAngle(Y,tilt)).multiply(bankQ.setFromAxisAngle(X,bank));
}
export function createWaterCamera(aspect){
  const h=WATER_VIEW.halfHeight,camera=new THREE.OrthographicCamera(-h*aspect,h*aspect,h,-h,1,4000),distance=1800;
  camera.up.set(0,0,1);camera.position.set(distance*.5,-distance*.5,distance*C);camera.lookAt(0,0,0);return camera;
}
export function resizeWaterCamera(camera,aspect){const h=WATER_VIEW.halfHeight;camera.left=-h*aspect;camera.right=h*aspect;camera.top=h;camera.bottom=-h;camera.updateProjectionMatrix();}
export function describeWaterCamera(camera){return{projection:camera.isOrthographicCamera?'orthographic':'perspective',position:camera.position.toArray(),up:camera.up.toArray(),
  elevationDegrees:THREE.MathUtils.radToDeg(Math.atan2(camera.position.z,Math.hypot(camera.position.x,camera.position.y))),azimuthDegrees:THREE.MathUtils.radToDeg(Math.atan2(camera.position.y,camera.position.x))};}
