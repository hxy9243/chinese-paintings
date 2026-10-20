// Hand-read crest landmarks in the unchanged 1779 x 801 source photograph.
// They define editable 3D ridge geometry, not image cards or a projected texture.
const specs=[
 ['left remote',-200,40,24,[[0,334],[20,300],[37,246],[55,253],[72,301],[89,345]],3],
 ['left tall diagonal',-45,52,27,[[165,439],[208,414],[239,376],[284,362],[307,331],[331,323],[350,340],[365,380],[382,399]],5],
 ['left blue front',12,43,23,[[31,507],[60,461],[85,445],[99,411],[112,409],[130,428],[154,450],[179,470]],4],
 ['left green face',34,28,17,[[56,573],[91,523],[130,490],[145,472],[166,472],[188,492],[209,520],[226,557]],4],
 ['left middle blue',7,35,20,[[236,558],[264,516],[289,490],[304,466],[322,461],[341,474],[357,496],[376,527],[388,562]],4],
 ['left middle shoulder',-9,28,18,[[202,465],[252,430],[284,414],[317,410],[342,424],[369,436],[394,488],[414,536]],5],
 ['left low foreground',44,20,13,[[5,713],[35,677],[58,658],[76,636],[94,612],[109,607],[124,620],[142,649],[169,691]],3],
 ['left small front',47,17,11,[[90,726],[108,688],[133,676],[147,656],[169,650],[192,676],[215,714]],3],
 ['inner long sloping crest',15,48,25,[[334,649],[383,585],[421,554],[458,532],[500,497],[534,482],[557,483],[578,497],[611,506],[631,531]],6],
 ['inner overlapping front',40,31,18,[[370,696],[399,638],[426,603],[452,570],[477,550],[496,553],[513,576],[536,608],[552,653]],4],
 ['inner green knuckle',43,22,15,[[457,716],[489,675],[512,646],[536,606],[553,599],[576,613],[600,653],[628,699]],4],
 ['village back hill',7,24,15,[[621,619],[638,585],[652,565],[668,557],[681,562],[699,579],[724,609]],3],
 ['inner foot rocks',56,10,8,[[567,756],[596,721],[614,698],[632,691],[650,701],[671,735],[711,760]],3],
 ['left apron shoulder',50,15,11,[[281,718],[302,673],[319,659],[336,665],[351,699]],2],
 ['left outer back',-100,28,19,[[0,413],[23,382],[45,355],[61,349],[76,361],[93,396]],3],
 ['left upper back',-90,27,19,[[128,402],[147,369],[163,342],[174,340],[190,356],[210,385]],3],
 ['far right tower',-256,65,37,[[1600,322],[1624,267],[1640,205],[1654,186],[1689,176],[1700,160],[1734,155],[1750,197],[1762,240],[1779,251]],5],
 ['right long back shoulder',-95,52,29,[[1320,452],[1363,412],[1395,382],[1414,366],[1446,357],[1480,334],[1510,326],[1538,339],[1558,370],[1586,398]],6],
 ['right remote shoulder',-142,38,24,[[1517,402],[1549,351],[1576,320],[1607,330],[1633,360],[1655,388]],3],
 ['right blue back',-80,45,27,[[1572,453],[1590,419],[1607,381],[1629,351],[1648,342],[1666,364],[1690,386],[1723,387],[1749,422]],5],
 ['right green diagonal',-35,54,27,[[1465,534],[1510,487],[1555,458],[1590,428],[1611,415],[1632,414],[1649,429],[1674,459],[1705,486],[1752,522]],6],
 ['right front crag',29,31,19,[[1495,665],[1525,614],[1553,586],[1568,552],[1586,537],[1600,547],[1623,583],[1644,628],[1671,669]],4],
 ['right low green shoulder',40,24,15,[[1620,725],[1640,676],[1657,654],[1680,650],[1705,667],[1739,696],[1779,724]],5],
 ['right outside back',-100,35,22,[[1718,454],[1736,407],[1748,366],[1764,348],[1779,376]],3],
 ['right small shore hill',50,15,10,[[1370,746],[1398,721],[1419,689],[1438,679],[1454,699],[1475,726]],3],
 ['right apron rocks',60,8,7,[[1681,774],[1694,749],[1713,731],[1731,739],[1749,768]],2],
 ['long low blue island',-240,30,20,[[907,440],[914,416],[930,409],[948,407],[971,413],[1005,409],[1030,397],[1044,406],[1075,409],[1110,406],[1148,399],[1172,383],[1190,380],[1215,395],[1242,407],[1290,417],[1338,432]],4,true],
 ['left foot rock 1',56,10,8,[[17,753],[31,726],[49,720],[68,741],[80,762]],2],
 ['left foot rock 2',60,8,7,[[210,767],[228,744],[242,744],[260,766]],2],
 ['inner foot rock 2',62,8,7,[[730,777],[751,753],[767,755],[787,774]],2],
 ['right low bank rock',20,12,8,[[1170,682],[1190,671],[1210,661],[1224,659],[1244,666],[1255,683]],2]
];
const aspect=1779/801,tan=Math.tan(32*Math.PI/360),length=Math.hypot(29,325),upY=325/length,upZ=-29/length,forwardY=-29/length,forwardZ=-325/length;
// Visible feet read separately from the crest. A crest-only fit left the
// depths arbitrary and stretched the high faces over the foreground hills.
// These are approximate ground contacts in the supplied photo, not surveyed 3D.
export const mountainFeet={
 'left tall diagonal':[400,561],
 'left blue front':[74,610],
 'left green face':[177,630],
 'left middle blue':[337,625],
 'left middle shoulder':[371,575],
 'left low foreground':[90,742],
 'left small front':[175,749],
 'inner long sloping crest':[624,710],
 'inner overlapping front':[423,727],
 'inner green knuckle':[574,735],
 'village back hill':[706,633],
 'inner foot rocks':[640,765],
 'left apron shoulder':[320,724],
 'right long back shoulder':[1402,526],
 'right blue back':[1740,548],
 'right green diagonal':[1590,575],
 'right front crag':[1589,740],
 'right low green shoulder':[1719,770],
 'right small shore hill':[1438,751],
 'long low blue island':[1090,460],
 'right low bank rock':[1220,692],
};
export function referenceGroundDepth(py,height=2){
 const sy=(1-py/801*2)*tan,dy=forwardY+sy*upY,dz=forwardZ+sy*upZ;
 return 220+(height-58)/dy*dz;
}
export function referenceToWorld([px,py],z){
 const sx=(px/1779*2-1)*aspect*tan,sy=(1-py/801*2)*tan,dy=forwardY+sy*upY,dz=forwardZ+sy*upZ,t=(z-220)/dz;
 return{x:t*sx,y:58+t*dy+1.65,z};
}
export const mountainForms=specs.map(([name,z,front,back,trace,folds,offshore=false],i)=>{
 const previousDepth=z,foot=mountainFeet[name];
 if(foot)z=referenceGroundDepth(foot[1])-front;
 const nodes=trace.map((p,j)=>referenceToWorld(p,z+front*(.09*Math.sin(j/(trace.length-1)*Math.PI+i*.7)+.20*(j/(trace.length-1)-.5)*Math.sin(i*1.71)))),minX=Math.min(...nodes.map(p=>p.x)),maxX=Math.max(...nodes.map(p=>p.x)),h=Math.max(...nodes.map(p=>p.y));
 return{name,z,previousDepth,foot:foot||null,front,back,trace,nodes,folds,offshore,i,x:(minX+maxX)/2,h,wx:(maxX-minX)/2+2,wz:Math.max(front,back)};
});
export const peaks=mountainForms.map(f=>[f.x,f.z,f.h,f.wx,f.wz]);
