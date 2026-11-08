// Smooth seeded variation is sampled by absolute time. No per-frame randomness
// moves the pigment or changes the result of a backward seek.
const CLAW_YAW=[.160,.310,.420],LEG_YAW=[.180,.320,.460],CLAW_PITCH=[.065,.100,.150],LEG_PITCH=[.114,.225,.330];
function hash(cell,seed){let n=(cell+Math.imul(seed|0,374761393))|0;n=Math.imul(n^(n>>>13),1274126177);return((n^(n>>>16))>>>0)/2147483648-1;}
function noise(t,seed){const k=Math.floor(t),u=t-k,w=u*u*u*(u*(u*6-15)+10),a=hash(k,seed);return a+(hash(k+1,seed)-a)*w;}
function smooth(a,b,x){const u=Math.max(0,Math.min(1,(x-a)/(b-a)));return u*u*u*(u*(u*6-15)+10);}
export function clawGesture(time,key){
  const period=11+(hash(0,key+401)*.5+.5)*7,u=((time/period+hash(0,key+409)*.5+.5)%1+1)%1;
  return smooth(.08,.30,u)*(1-smooth(.45,.76,u));
}
function rotation(out,at,yaw,pitch){
  const cy=Math.cos(yaw),sy=Math.sin(yaw),cp=Math.cos(pitch),sp=Math.sin(pitch);
  out[at]=cy*cp;out[at+1]=-cy*sp;out[at+2]=sy;out[at+3]=sp;out[at+4]=cp;out[at+5]=0;out[at+6]=-sy*cp;out[at+7]=sy*sp;out[at+8]=cy;
}
function centerAt(mesh,row,out,at){
  const p=mesh.geometry.attributes.position.array,columns=mesh.geometry.userData.paintLattice.columns;
  out[at]=out[at+1]=out[at+2]=0;
  for(let c=0;c<columns-1;c++)for(let k=0;k<3;k++)out[at+k]+=p[(row*columns+c)*3+k]/(columns-1);
}
function transformVertex(output,normals,at,m,offset,origin,target){
  const x=output[at]-origin[0],y=output[at+1]-origin[1],z=output[at+2]-origin[2],o=offset;
  output[at]=target[0]+m[o]*x+m[o+1]*y+m[o+2]*z;
  output[at+1]=target[1]+m[o+3]*x+m[o+4]*y+m[o+5]*z;
  output[at+2]=target[2]+m[o+6]*x+m[o+7]*y+m[o+8]*z;
  const nx=normals[at],ny=normals[at+1],nz=normals[at+2];
  normals[at]=m[o]*nx+m[o+1]*ny+m[o+2]*nz;normals[at+1]=m[o+3]*nx+m[o+4]*ny+m[o+5]*nz;normals[at+2]=m[o+6]*nx+m[o+7]*ny+m[o+8]*nz;
}
export function createAppendageMotion(meshes,fallbackSeed=4317){
  const antennae=[],groups=new Map();
  for(const mesh of meshes){
    const tag=mesh.userData.waterAppendage;if(!tag)continue;
    if(tag.kind==='antenna'){
      const {rows,columns}=mesh.geometry.userData.paintLattice;
      antennae.push({mesh,index:tag.index,columns,rows,weights:Float64Array.from({length:rows},(_,i)=>Math.pow(i/(rows-1),1.45))});
    }else if(['claw','front-leg','finger'].includes(tag.kind)){
      const limb=tag.kind==='finger'?tag.limb:tag,key=`${limb.pair}:${limb.side}`;
      if(!groups.has(key)){
        const count=limb.jointCount;
        groups.set(key,{...limb,arm:null,fingers:[],base:new Float64Array(count*3),posed:new Float64Array(count*3),matrices:new Float64Array((count-1)*9),fingerMatrix:new Float64Array(9)});
      }
      const group=groups.get(key);if(tag.kind==='finger')group.fingers.push({mesh,finger:tag.finger});else group.arm=mesh;
    }
  }
  const limbs=[...groups.values()].filter(g=>g.arm);
  for(const g of limbs){
    g.origins=Array.from({length:g.jointCount},(_,i)=>g.base.subarray(i*3,i*3+3));
    g.targets=Array.from({length:g.jointCount},(_,i)=>g.posed.subarray(i*3,i*3+3));
    const uv=g.arm.geometry.attributes.uv;
    g.vertexSegments=Uint8Array.from({length:uv.count},(_,i)=>Math.min(g.jointCount-2,Math.floor(uv.getX(i)*(g.jointCount-1)+1e-6)));
  }
  return motion=>{
    if(!motion)return;const time=motion.time,seed=motion.seed??fallbackSeed;
    for(const {mesh,index,columns,rows,weights} of antennae){
      const out=mesh.geometry.attributes.position.array,key=seed+index*137,drag=(motion.speed-24)*.85,turn=motion.turn*105;
      // Evaluate once per cross-section; the circular tube vertices move as a
      // unit and keep their thickness while the flagellum develops tiny bends.
      for(let row=0;row<rows;row++){
        const s=row/(rows-1),f=weights[row],tip=s*s*s;
        const dx=f*(drag+18*Math.sin(time*.9-s*2+index)+14*noise(time*.91-s*.4,key+11))+tip*7*noise(time*2.1-s*.8,key+17);
        const dy=f*(5*Math.sin(time*.75-s*1.9+index*.6)+5*noise(time*1.37-s*.5,key+23))+tip*2.5*noise(time*2.7-s*.9,key+29);
        const dz=f*(turn+28*Math.sin(time*1.05-s*3.4+index*1.7)+10*Math.sin(time*2.1-s*5.2+index)+24*noise(time*.8-s*.72,key+31))+tip*9*noise(time*2.4-s*.6,key+37);
        for(let c=0;c<columns;c++){const at=(row*columns+c)*3;out[at]+=dx;out[at+1]+=dy;out[at+2]+=dz;}
      }
    }
    for(const g of limbs){
      const {arm,base,posed,matrices,fingerMatrix}=g,count=g.jointCount,segments=count-1,key=seed+g.pair*163+g.side*13,isClaw=g.kind==='claw';
      const rows=arm.geometry.userData.paintLattice.rows;
      for(let j=0;j<count;j++)centerAt(arm,Math.round(j/segments*(rows-1)),base,j*3);
      posed[0]=base[0];posed[1]=base[1];posed[2]=base[2];let yaw=0,pitch=0;
      const activity=.65+.35*(noise(time*.23,key+71)*.5+.5),pace=isClaw?1.05:1.70;
      const fold=isClaw?clawGesture(time,key):0;
      for(let j=0;j<segments;j++){
        const jointSeed=key+j*31;
        yaw+=(isClaw?CLAW_YAW:LEG_YAW)[j]*activity*(.68*noise(time*.57*pace-j*.13,jointSeed+1)+.32*noise(time*1.43*pace-j*.08,jointSeed+9));
        pitch+=(isClaw?CLAW_PITCH:LEG_PITCH)[j]*activity*(.7*noise(time*.86*pace-j*.11,jointSeed+19)+.3*noise(time*2.1*pace-j*.07,jointSeed+27));
        // Occasional reach-and-fold gestures keep the shoulder quiet while
        // the long forearm closes at its elbow and the wrist follows through.
        // Both sides bend inward in their own time, maintaining rigid lengths.
        if(isClaw){yaw+=g.side*[-.10,.83,-.32][j]*fold;pitch+=[.025,.07,-.03][j]*fold;}
        if(!isClaw&&j<2)yaw+=(j===0?.14:.08)*Math.sin(time*1.7+key*.13-j*.55);
        yaw=Math.max(isClaw?-.98:-.75,Math.min(isClaw?.98:.75,yaw));
        pitch=Math.max(isClaw?-.20:g.pair===0?-.28:-.42,Math.min(isClaw?.28:.42,pitch));
        const at=j*9,from=j*3,to=from+3;rotation(matrices,at,yaw,pitch);
        const x=base[to]-base[from],y=base[to+1]-base[from+1],z=base[to+2]-base[from+2];
        posed[to]=posed[from]+matrices[at]*x+matrices[at+1]*y+matrices[at+2]*z;
        posed[to+1]=posed[from+1]+matrices[at+3]*x+matrices[at+4]*y+matrices[at+5]*z;
        posed[to+2]=posed[from+2]+matrices[at+6]*x+matrices[at+7]*y+matrices[at+8]*z;
      }
      const positions=arm.geometry.attributes.position.array,normals=arm.geometry.attributes.normal.array,uv=arm.geometry.attributes.uv;
      for(let vertex=0;vertex<uv.count;vertex++){
        const segment=g.vertexSegments[vertex];
        transformVertex(positions,normals,vertex*3,matrices,segment*9,g.origins[segment],g.targets[segment]);
      }
      const pinch=Math.max(-.10,Math.min(.40,(isClaw?.24:.21)*noise(time*1.05*pace,key+301)+(isClaw?.11:.09)*noise(time*2.8*pace,key+311)+fold*.12));
      for(const {mesh,finger} of g.fingers){
        // Both pincer fingers inherit the same articulated wrist, then open
        // independently around its new tip, keeping the attachment exact.
        rotation(fingerMatrix,0,yaw+finger*pinch,pitch);
        const p=mesh.geometry.attributes.position.array,n=mesh.geometry.attributes.normal.array;
        for(let at=0;at<p.length;at+=3)transformVertex(p,n,at,fingerMatrix,0,g.origins[count-1],g.targets[count-1]);
      }
    }
  };
}
