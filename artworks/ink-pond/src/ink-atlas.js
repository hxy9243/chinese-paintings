import p5 from 'p5';
import * as THREE from 'three';
import {hash,noise,fishBodyInk,paperFields} from './ink-fields.js';

// A loaded brush is pulled along the carapace through a dilute wash. Work in
// circular coordinates so its blooms join across the closed shell's UV seam.
// The two strokes have different paths and widths; a pair of constant bands
// around a cylinder reads as a highlight on a polished object instead of ink.
function carapaceInk(t,angle,seed){
  const c=Math.cos(angle),s=Math.sin(angle);
  const cloud=noise(t*4.2+c*.8,s*1.8+c*.7,seed+101);
  const wet=noise(t*8+c*2,s*4+c,seed+113);
  const fibers=noise(t*31+c*5,s*19+c*7,seed+127);
  const bend=(noise(t*4,1,seed+139)-.5)*.65+.13*Math.sin(t*9+seed);
  const distance=center=>Math.atan2(Math.sin(angle-center),Math.cos(angle-center));
  const width=.55+.28*noise(t*5,2,seed+149);
  const loaded=Math.exp(-Math.pow(Math.abs(distance(.45+bend))/width,2.6));
  const second=Math.exp(-Math.pow(Math.abs(distance(-1.18-bend*.55))/(.40+.20*wet),2.2));
  const length=.60+.40*Math.sin(Math.PI*(.10+t*.85));
  const core=loaded*(.60+.40*cloud)*length+second*(.26+.24*wet);
  // A watery outer wash, pigment accumulated at irregular drying fronts, and
  // pale backruns inside it. The grain stays attached to this individual head.
  const wash=.055+.16*cloud+.065*wet;
  const tide=Math.exp(-Math.pow((loaded-.32)/.16,2))*(.035+.065*wet);
  const backrun=Math.max(0,wet-.57)*.30*(1-loaded*.60);
  const deposit=(wash+.88*core+tide-backrun)*(.89+.19*fibers);
  return {deposit:Math.max(.045,Math.min(.95,deposit)),edge:wet};
}

// Generate the p5 pigment deposits once. Their UV coordinates travel with the
// actual 3D surfaces; neither paper nor pigment is regenerated during playback.
export async function createInkAtlas(){
  return new Promise(resolve=>new p5(p=>{
    p.setup=()=>{
      p.noCanvas();p.noLoop();
      const side=128,columns=4,rows=8,image=p.createImage(side*columns,side*rows);image.loadPixels();
      for(let kind=0;kind<rows;kind++)for(let variant=0;variant<columns;variant++){
        const seed=kind*13+variant*31+7;
        for(let y=0;y<side;y++)for(let x=0;x<side;x++){
          const t=x/(side-1),v=y/(side-1),angle=v*Math.PI*2,dorsal=Math.cos(angle);
          const cloud=noise(t*6,Math.cos(angle)*2+Math.sin(angle)*1.1,seed);
          const grain=noise(t*95,v*50,seed+19),bloom=noise(t*13,v*8,seed+41);
          let alpha,head;
          if(kind===0)alpha=.026+.30*Math.max(0,dorsal)**3*Math.max(0,(t-.48)/.52);
          else if(kind===1)alpha=fishBodyInk(t,angle,seed);
          else if(kind===2)alpha=(.24+.30*cloud)*(.80+.20*Math.sin(t*Math.PI));
          else if(kind===3){
            head=carapaceInk(t,angle,seed);alpha=head.deposit;
          }else if(kind===4)alpha=.27+.34*cloud+.065*dorsal;
          else if(kind===5)alpha=.23+.29*cloud;
          else if(kind===6)alpha=.87+.10*Math.sin(t*41+seed);
          else alpha=.95;
          if(kind<6&&kind!==3){alpha*=.87+.16*grain;alpha*=bloom>.75?.84:1;}
          const speckle=hash(x+y*side+seed*1000),quantized=Math.floor(Math.max(0,Math.min(.95,alpha))*96+speckle)/96;
          const at=((kind*side+y)*image.width+variant*side+x)*4;
          image.pixels[at]=22;image.pixels[at+1]=23;image.pixels[at+2]=head?Math.round(head.edge*255):21;
          image.pixels[at+3]=Math.round(quantized*255);
        }
      }
      image.updatePixels();
      const atlas=new THREE.CanvasTexture(image.canvas);atlas.flipY=false;atlas.colorSpace=THREE.NoColorSpace;
      atlas.minFilter=THREE.LinearFilter;atlas.magFilter=THREE.LinearFilter;atlas.generateMipmaps=false;
      const paperImage=p.createImage(512,512);paperImage.loadPixels();
      for(let i=0;i<512*512;i++){
        const field=paperFields((i%512)/512,Math.floor(i/512)/512);
        paperImage.pixels.set([field.fibre,field.cloud,field.foxing].map(v=>Math.round(v*255)).concat(255),i*4);
      }
      paperImage.updatePixels();
      const paper=new THREE.CanvasTexture(paperImage.canvas);paper.colorSpace=THREE.NoColorSpace;
      paper.wrapS=paper.wrapT=THREE.RepeatWrapping;paper.generateMipmaps=false;
      resolve({atlas,paper,dispose(){atlas.dispose();paper.dispose();p.remove();}});
    };
  }));
}
