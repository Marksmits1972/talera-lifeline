/** TALERA canonical social state, one memoryId. No demo seeding or poll loops. */
const EMPTY=Object.freeze({hearted:false,heartCount:0,comments:[],commentCount:0});
const clone=x=>structuredClone(x);
const normalise=input=>{const x=input||{},comments=Array.isArray(x.comments)?x.comments.map(c=>({...c})):[];return {hearted:!!x.hearted,heartCount:Math.max(0,Number(x.heartCount)||0),comments,commentCount:Math.max(0,Number(x.commentCount??comments.length)||0)}};
export class SocialController{
 #adapter;#clock;#cache=new Map();#pending=new Map();#listeners=new Set();#active=null;#epoch=0;#settleTimer=null;#timer;#ttlMs;#settleMs;#mutating=new Set();#closed=false;
 constructor(adapter,{ttlMs=60000,settleMs=170,clock=()=>Date.now(),timer=globalThis}={}){if(!adapter?.findStoryId||!adapter?.fetchSnapshot)throw Error('Social adapter vereist findStoryId en fetchSnapshot');this.#adapter=adapter;this.#ttlMs=ttlMs;this.#settleMs=settleMs;this.#clock=clock;this.#timer=timer}
 subscribe(fn){if(typeof fn!=='function')throw TypeError('Listener');this.#listeners.add(fn);fn(this.current());return ()=>this.#listeners.delete(fn)}
 #emit(){const view=this.current();for(const fn of this.#listeners)fn(view)}
 get activeMemoryId(){return this.#active}
 current(){const c=this.#active===null?null:this.#cache.get(this.#active);return {memoryId:this.#active,status:c?.status||'idle',storyId:c?.storyId||null,data:clone(c?.data||EMPTY),error:c?.error||null,updatedAt:c?.updatedAt||0}}
 select(memoryId){if(this.#closed)throw Error('SocialController is disposed');if(typeof memoryId!=='string'||!memoryId.trim())throw Error('memoryId is verplicht');if(this.#active===memoryId)return this.current();this.#active=memoryId;this.#epoch++;if(this.#settleTimer!==null)this.#timer.clearTimeout(this.#settleTimer);this.#emit();const desired=memoryId;this.#settleTimer=this.#timer.setTimeout(()=>{this.#settleTimer=null;if(this.#active===desired)void this.load(desired)},this.#settleMs);return this.current()}
 openComments(){const v=this.current();if(v.memoryId!==null)void this.load(v.memoryId);return v}
 invalidate(memoryId){this.#cache.delete(memoryId);if(this.#active===memoryId)this.#emit()}
 async load(memoryId){
  if(this.#closed)return null;if(!memoryId)throw Error('memoryId is verplicht bij laden');
  const cached=this.#cache.get(memoryId);if(cached?.status==='ready'&&this.#clock()-cached.updatedAt<this.#ttlMs)return clone(cached.data);
  if(this.#pending.has(memoryId))return this.#pending.get(memoryId);
  this.#cache.set(memoryId,{status:'loading',storyId:cached?.storyId||null,data:cached?.data||clone(EMPTY),updatedAt:cached?.updatedAt||0,error:null});if(this.#active===memoryId)this.#emit();
  const task=(async()=>{const storyId=await this.#adapter.findStoryId(memoryId);const data=storyId?normalise(await this.#adapter.fetchSnapshot({memoryId,storyId})):normalise(await this.#adapter.loadLocal?.(memoryId));const cur=this.#cache.get(memoryId);if(cur?.status!=='mutating')this.#cache.set(memoryId,{status:'ready',storyId:storyId||null,data,updatedAt:this.#clock(),error:null});if(this.#active===memoryId)this.#emit();return clone(data)})().catch(error=>{const prev=this.#cache.get(memoryId);this.#cache.set(memoryId,{...prev,status:'error',error:String(error?.message||error)});if(this.#active===memoryId)this.#emit();return null}).finally(()=>this.#pending.delete(memoryId));
  this.#pending.set(memoryId,task);return task;
 }
 async mutate(operation){
  const memoryId=this.#active;if(!memoryId)throw Error('Geen actieve herinnering');if(!this.#adapter.commit)throw Error('Schrijven is niet geconfigureerd');
  const key=memoryId+':'+(operation.type||'');if(this.#mutating.has(key))return {duplicate:true};this.#mutating.add(key);
  try{const old=this.#cache.get(memoryId),storyId=old?.storyId||await this.#adapter.findStoryId(memoryId);if(!storyId)throw Error('Deze lokale herinnering heeft geen deelbare serverreacties');const fresh=normalise(old?.data);if(operation.type==='toggle-heart'){fresh.hearted=!fresh.hearted;fresh.heartCount=Math.max(0,fresh.heartCount+(fresh.hearted?1:-1))}
   this.#cache.set(memoryId,{status:'mutating',storyId,data:fresh,updatedAt:this.#clock(),error:null});if(this.#active===memoryId)this.#emit();
   const response=await this.#adapter.commit({memoryId,storyId,operation});if(response?.snapshot)this.#cache.set(memoryId,{status:'ready',storyId,data:normalise(response.snapshot),updatedAt:this.#clock(),error:null});else this.#cache.set(memoryId,{status:'ready',storyId,data:fresh,updatedAt:this.#clock(),error:null});if(this.#active===memoryId)this.#emit();return {ok:true}
  }catch(error){this.#cache.delete(memoryId);if(this.#active===memoryId)this.#emit();await this.load(memoryId);return {ok:false,error:String(error?.message||error)}}finally{this.#mutating.delete(key)}
 }
 dispose(){this.#closed=true;if(this.#settleTimer!==null)this.#timer.clearTimeout(this.#settleTimer);this.#listeners.clear()}
}
export {EMPTY as EMPTY_SOCIAL};