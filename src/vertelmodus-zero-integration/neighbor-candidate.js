function taleraGoToNeighbor(direction){
 const current=runtime.currentMemory();
 if(!current||!Number.isFinite(current.ms))return;
 const sign=direction<0?-1:1;
 let low=0,high=24*60*60*1000,found=null;
 // Find the first new memory reached in this time direction; no extra timeline model.
 for(let i=0;i<20;i++){
  const next=runtime.nearestMemory(current.ms+sign*high);
  if(next&&next.id!==current.id){found=next;break}
  high*=2;
 }
 if(!found)return;
 for(let i=0;i<36;i++){
  const middle=low+(high-low)/2,other=runtime.nearestMemory(current.ms+sign*middle);
  if(other&&other.id!==current.id){found=other;high=middle}else low=middle;
 }
 if(found&&found.id!==current.id){
  runtime.setCenter(found.ms);
  runtime.writeMemory(found);
  runtime.draw();
 }
}