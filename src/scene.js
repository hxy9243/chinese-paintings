import * as THREE from 'three';
import {naturalPalette} from './natural-palette.js';
import {createMaterials} from './materials.js';
import {buildTerrain,terrainHeight,peaks,terrainBounds} from './terrain.js';
import {foothills} from './lowlands.js';
import {buildForest,buildRocks} from './forest.js';
import {buildRoads} from './roads.js';
import {house,pavilion,buildBridge,batchGroup} from './architecture.js';
import {box,pipe,taperedTube} from './geometry.js';
export function buildLandscape(){
 const root=new THREE.Group();root.name='Blue and green waterways — reference-inspired 3D landscape';const materials=createMaterials();
 materials.rangeMiddle=materials.stone.clone();materials.rangeMiddle.name='Faint distant olive shore';materials.rangeFar=materials.stone.clone();materials.rangeFar.name='Pale remote shore';
 const land=buildTerrain(materials);root.add(land.group);const forest=buildForest(materials);root.add(forest.group);const rocks=buildRocks(materials);root.add(rocks.mesh);
 const bridge=buildBridge(materials);root.add(bridge.group);
 const sites=[[-120,-23,.85,.1],[-110,-31,.72,-.15],[-102,-19,.75,.15],[-30,18,.78,.2],[-34,5,.65,.15],[100,-13,.80,-.25],[112,-20,.75,-.2],[115,18,.68,-.2]];
 const villages=new THREE.Group();villages.name='Shore settlements and terraces';
 const roads=buildRoads(materials);villages.add(roads.group);
 for(const [x,z,s,a]of sites){const h=house(materials,x,z,s,a);villages.add(h);const plinth=box(9*s,.50,7*s,materials.stone,x,h.position.y-.16,z,'House stone terrace');plinth.rotation.y=a;villages.add(plinth);}
 const overlook=pavilion(materials,{width:6.5,depth:4.5,height:2.6,attic:true,name:'Left bank overlook pavilion'});overlook.position.set(-46,terrainHeight(-46,-14)+.3,-14);overlook.rotation.y=.12;villages.add(overlook);root.add(villages);
 const boats=new THREE.Group();boats.name='Two small moored skiffs';
 for(const [x,z,a]of [[41,48,.12],[65,36,-.2]]){
  const boat=new THREE.Group();boat.name='Moored wooden skiff';boat.position.set(x,.10,z);boat.rotation.y=a;
  const shape=new THREE.Shape();shape.moveTo(-2.4,0);shape.quadraticCurveTo(0,-.85,2.4,0);shape.quadraticCurveTo(0,.85,-2.4,0);const geo=new THREE.ExtrudeGeometry(shape,{depth:.32,bevelEnabled:true,bevelSize:.06,bevelThickness:.05,bevelSegments:2,steps:1});geo.rotateX(-Math.PI/2);boat.add(new THREE.Mesh(geo,materials.timberDark));for(const xx of [-1,0,1])boat.add(box(.16,.10,1.0,materials.timber,xx,.35,0,'Skiff seat'));boats.add(boat);
 }root.add(boats);
 const figures=new THREE.Group();figures.name='Small bridge figures';
 for(const t of [.19,.62,.74]){
  const p=bridge.point(t),g=new THREE.Group();g.position.copy(p);g.position.y+=.18;g.add(new THREE.Mesh(new THREE.CylinderGeometry(.12,.22,.80,8).translate(0,.42,0),materials.robe));g.add(new THREE.Mesh(new THREE.SphereGeometry(.13,8,6).translate(0,.96,0),materials.plaster));g.add(new THREE.Mesh(new THREE.ConeGeometry(.25,.13,12).translate(0,1.12,0),materials.timberDark));figures.add(g);
 }root.add(figures);
 const saved=new Map();root.traverse(o=>{if(o.isMesh)saved.set(o,o.material);});
 const model={root,materials,forest,rocks,roads,bridge,pavilion:bridge.hall,boat:boats.children[0],villages,mountains:land.mountains,water:land.water,backgroundMountains:land.background,saved,height:(x,z)=>Math.max(terrainHeight(x,z),land.background.height(x,z),bridge.ground(x,z)),stats:{...forest.counts,roads:roads.records.length,mountainMasses:peaks.length,lowlandFoothills:foothills.length,terrainBounds,rocks:rocks.records.length,terrainVertices:land.terrain.geometry.attributes.position.count,sourceProjectionPlanes:0,seed:610152,backgroundMountainLayers:land.background.records.length,bridgeLength:bridge.group.userData.length,bridgeSupports:bridge.group.userData.supportCount,shoreBuildings:sites.length+1,revision:'blue-green-10-composition'}};
 return model;
}
export function addAtmosphere(scene){
 scene.background=new THREE.Color(naturalPalette.paper);scene.fog=new THREE.FogExp2(naturalPalette.fog,.0025);
 const sky=new THREE.Mesh(new THREE.SphereGeometry(1250,36,24),new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,uniforms:{horizon:{value:new THREE.Color(naturalPalette.horizon)},zenith:{value:new THREE.Color(naturalPalette.sky)}},vertexShader:'varying vec3 sky;void main(){sky=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'uniform vec3 horizon,zenith;varying vec3 sky;void main(){float t=smoothstep(-.02,.42,normalize(sky).y);gl_FragColor=vec4(mix(horizon,zenith,t),1.);\n #include <colorspace_fragment>\n }'}));sky.name='Distant atmospheric sky';scene.add(sky);
 scene.add(new THREE.HemisphereLight('#dbe3e5','#716552',1.8));scene.add(new THREE.AmbientLight('#d3cbbb',.6));
 const sun=new THREE.DirectionalLight('#fff1c9',2);sun.position.set(-55,95,80);sun.target.position.set(0,0,-20);sun.castShadow=true;Object.assign(sun.shadow.camera,{left:-150,right:150,top:120,bottom:-120,near:1,far:300});sun.shadow.mapSize.set(2048,2048);sun.shadow.bias=-.0002;sun.shadow.normalBias=.04;scene.add(sun,sun.target);
}
