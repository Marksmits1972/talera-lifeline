/** TALERA clean WhatsApp share state machine. No Cloudflare Access redirect. */
export const SHARE_DURATIONS=Object.freeze([1,24,168,720]);
export const validateDuration=h=>{if(!SHARE_DURATIONS.includes(Number(h)))throw Error('Ongeldige geldigheidsduur');return Number(h)};
const uniqueRequestId=()=>crypto.randomUUID();
export class ShareController {
  #adapter;#view={state:'idle',memoryId:null,durationHours:168,invite:null,error:null};
  #listeners=new Set();#request=0;#pending=null;#requestId=null;
  constructor(adapter){if(!adapter?.publish||!adapter?.createInvite)throw Error('Share adapter vereist publish/createInvite');this.#adapter=adapter}
  subscribe(fn){this.#listeners.add(fn);fn(this.current());return ()=>this.#listeners.delete(fn)}
  current(){return structuredClone(this.#view)}
  #emit(){const v=this.current();for(const fn of this.#listeners)fn(v)}
  open(memoryId){if(!memoryId)throw Error('memoryId verplicht');this.#request++;this.#pending=null;this.#requestId=null;this.#view={state:'needs-consent',memoryId,durationHours:168,invite:null,error:null};this.#emit()}
  setDuration(hours){const durationHours=validateDuration(hours);if(this.#view.durationHours===durationHours)return;this.#request++;this.#pending=null;this.#requestId=null;this.#view={...this.#view,durationHours,invite:null,state:'needs-consent',error:null};this.#emit()}
  async prepare({consent=false}={}){
    if(!consent)throw Error('Expliciete toestemming voor tijdelijk delen is vereist');
    if(!this.#view.memoryId)throw Error('Geen herinnering gekozen');
    if(this.#view.state==='ready')return this.current();
    if(this.#pending)return this.#pending;
    const memoryId=this.#view.memoryId,durationHours=this.#view.durationHours,version=++this.#request;
    this.#requestId ||= uniqueRequestId();const requestId=this.#requestId;
    this.#view={...this.#view,state:'preparing',error:null};this.#emit();
    const task=(async()=>{
      const published=await this.#adapter.publish({memoryId,consent:true,requestId});
      if(version!==this.#request)return this.current();
      if(!published?.storyId)throw Error('Publicatie leverde geen storyId op');
      const invite=await this.#adapter.createInvite({memoryId,storyId:published.storyId,requestId,durationHours});
      if(version!==this.#request){
        if(invite?.shareId&&this.#adapter.revokeInvite)await this.#adapter.revokeInvite({shareId:invite.shareId}).catch(()=>{});
        return this.current();
      }
      if(!invite?.url||Number(invite.durationHours)!==durationHours)throw Error('Uitnodiging is niet voor de gekozen termijn bevestigd');
      this.#view={...this.#view,state:'ready',invite:{...invite},error:null};this.#emit();return this.current();
    })().catch(error=>{if(version===this.#request){this.#view={...this.#view,state:'error',invite:null,error:String(error?.message||error)};this.#emit()}return this.current()}).finally(()=>{if(version===this.#request)this.#pending=null});
    this.#pending=task;return task;
  }
  whatsappUrl(){
    if(this.#view.state!=='ready'||!this.#view.invite)throw Error('Uitnodiging nog niet gereed');
    const url=this.#view.invite.url;if(!/^https:\/\//.test(url))throw Error('Onveilige uitnodigingslink');
    // De kaart bevat de titel en TALERA al: geen tweede introductietekst.
    // WhatsApp toont de URL zelf mogelijk alsnog naast de kaart.
    return 'https://wa.me/?text='+encodeURIComponent(url);
  }
  close(){this.#request++;this.#pending=null;this.#requestId=null;this.#view={state:'idle',memoryId:null,durationHours:168,invite:null,error:null};this.#emit()}
}