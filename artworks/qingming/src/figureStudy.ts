import * as THREE from 'three';
import { person } from './bridgeStudy';
import { FIGURE_TYPES } from './figureTypes';
const host=document.querySelector<HTMLElement>('#figures')!,labels=host.querySelector('.labels')!;
const names=['商贩','脚夫','书生','船工','旅人','店主','妇人','老者','孩童','工匠','侍从','提篮人'];
FIGURE_TYPES.forEach((p,i)=>{const label=document.createElement('span');label.textContent=names[i];const small=document.createElement('small');small.textContent=p.name;label.append(small);labels.append(label);});
const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setClearColor(0xeee5cb);renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));host.prepend(renderer.domElement);
const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-3.6,3.6,1.05,-1.05,.1,30);
camera.position.set(0,1.6,8);camera.lookAt(0,.1,0);
const figures=FIGURE_TYPES.map((_,i)=>{const p=person(new THREE.Group(),i,true,2);scene.add(p);p.position.set((i%6-2.5)*1.2,.44-Math.floor(i/6)*1.12,0);p.rotation.y=.22;return p;});
function render(seconds:number){
 figures.forEach((p,i)=>{const phase=seconds*3+i*.7;p.getObjectByName('left-leg')!.rotation.x=Math.sin(phase)*.24;p.getObjectByName('right-leg')!.rotation.x=-Math.sin(phase)*.24;p.getObjectByName('left-arm')!.rotation.x=-Math.sin(phase)*.17;p.getObjectByName('right-arm')!.rotation.x=Math.sin(phase)*.17;p.getObjectByName('head')!.rotation.y=Math.sin(seconds*.4+i)*.12;});
 renderer.render(scene,camera);
}
function resize(){renderer.setSize(host.clientWidth,host.clientHeight);render(0);}
new ResizeObserver(resize).observe(host);resize();
(window as unknown as {figureStudy:unknown}).figureStudy={frame:render,types:FIGURE_TYPES.map(p=>p.name)};
if(!new URLSearchParams(location.search).has('capture')){const animate=(t:number)=>{render(t/1000);requestAnimationFrame(animate);};requestAnimationFrame(animate);}
