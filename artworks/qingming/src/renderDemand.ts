/** Render invalidations and the settle window; no idle GPU work when paused. */
export class RenderDemand {
  private dirty=true;
  private interacting=false;
  private refineAt=0;
  private lastPreview:boolean|undefined;
  invalidate(now:number,preview=false){this.dirty=true;if(preview)this.refineAt=now+180;}
  interaction(active:boolean,now:number){this.interacting=active;this.invalidate(now,true);}
  takeFrame(now:number,animated:boolean,pending:boolean){
    const preview=this.interacting||now<this.refineAt;
    const draw=this.dirty||animated||pending||preview!==this.lastPreview;
    this.dirty=false;this.lastPreview=preview;
    return {draw,preview};
  }
  nextDelay(now:number,animated:boolean,pending:boolean):number|null {
    if(this.dirty||pending)return 0;
    if(animated)return 33;
    if(!this.interacting&&now<this.refineAt)return Math.ceil(this.refineAt-now);
    return null;
  }
}
