// A feeding bout has one lowering and one recovery. Short strikes happen
// from a held low inspection pose, rather than repeating the full descent.
// Timings are authored for 12 held frames/s, informed by feeding studies.
const clamp=x=>Math.max(0,Math.min(1,x));
const smooth=x=>{x=clamp(x);return x*x*(3-2*x);};
export const HEN_PECK_PERIOD=6.5,CHICK_PECK_PERIOD=4.5;
const HEN_BOUTS=[
 {lower:[.50,1.17],contacts:[1.50,2.25,3.17],raise:[3.75,4.42]},
 {lower:[.42,1.08],contacts:[1.33,2.08,2.92,3.67],raise:[4.25,4.92]},
 {lower:[.67,1.33],contacts:[1.67,2.75],raise:[3.33,4.00]},
];
const CHICK_BOUTS=[
 {lower:[.25,.75],contacts:[1.00,1.67,2.42],raise:[2.92,3.42]},
 {lower:[.17,.67],contacts:[.92,1.50,2.17,2.83],raise:[3.33,3.83]},
 {lower:[.33,.83],contacts:[1.08,2.00],raise:[2.50,3.00]},
];
export function feedingAt(elapsed,kind='hen',variation=0){
 const period=kind==='hen'?HEN_PECK_PERIOD:CHICK_PECK_PERIOD;
 const cycle=Math.floor(Math.max(0,elapsed)/period),recipes=kind==='hen'?HEN_BOUTS:CHICK_BOUTS;
 const recipe=recipes[((cycle+variation)%recipes.length+recipes.length)%recipes.length];
 const t=((elapsed%period)+period)%period,[downStart,downEnd]=recipe.lower,[upStart,upEnd]=recipe.raise;
 const feedLower=smooth((t-downStart)/(downEnd-downStart))*(1-smooth((t-upStart)/(upEnd-upStart)));
 let feedStrike=0,contactIndex=-1;
 for(const [i,c] of recipe.contacts.entries()){
  // One frame of approach, a contact exposure, two of recoil. The head then
  // holds low long enough to inspect the next patch of food.
  const strike=t<c?smooth((t-(c-1/12))/(1/12)):t<c+1/12?1:1-smooth((t-c-1/12)/(2/12));
  if(strike>feedStrike){feedStrike=strike;contactIndex=i;}
 }
 feedStrike*=feedLower;
 const stage=t<=downStart?'watch':t<downEnd?'lower':t>=upEnd?'watch':t>=upStart?'raise':feedStrike>.001?'peck':'inspect';
 return{feedLower,feedStrike,peck:feedLower*(.90+.10*feedStrike),feedStage:stage,contactIndex,contacts:recipe.contacts.length,period};
}
// Scalar compatibility for existing captures; animation also consumes the two
// separate channels so the torso does not bob on every small head strike.
export const henPeckAt=(elapsed,variation=0)=>feedingAt(elapsed,'hen',variation).peck;
export const chickPeckAt=(elapsed,variation=0)=>feedingAt(elapsed,'chick',variation).peck;
