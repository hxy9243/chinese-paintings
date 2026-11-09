export const HEN_SCALE=54,GROUND_OFFSET=66,GROUND_DEPTH=.42,REAR_OFFSET=3.24;
export function henFootHome(pose,side){
 const spread=side*13.77;
 return{x:pose.x+Math.cos(pose.heading)*spread-Math.sin(pose.heading)*REAR_OFFSET,
  y:pose.y+GROUND_OFFSET-Math.sin(pose.heading)*spread*GROUND_DEPTH-Math.cos(pose.heading)*REAR_OFFSET*GROUND_DEPTH};
}
