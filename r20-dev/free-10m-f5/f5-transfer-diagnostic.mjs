// Opt-in technical checkpoints only. No SDP, addresses, secrets, media or account identifiers.
export const DIAG_LIMIT=64,DIAG_TTL=300000;
export const INVITATION_TTL=600000,VERIFICATION_TTL=600000;
const PHASES=new Set([
 'SELECTED_LOCAL_HOST','SELECTED_LOCAL_SRFLX','SELECTED_LOCAL_PRFLX','SELECTED_LOCAL_RELAY','SELECTED_REMOTE_HOST','SELECTED_REMOTE_SRFLX','SELECTED_REMOTE_PRFLX','SELECTED_REMOTE_RELAY','ROUTE_LOCAL','ROUTE_STUN','ROUTE_OPEN','LOCAL_HOST','LOCAL_SRFLX','REMOTE_HOST','REMOTE_SRFLX','DIAG_HTTP','RETRY_BEGIN','RETRY_HTTP','RETRYOFFER_HTTP','RETRYJOIN_HTTP','START','ACCOUNT_BEGIN','ACCOUNT_OK','ACCOUNT_HTTP','ACCOUNT_ERROR','CREATE_BEGIN','CREATE_HTTP','CREATE_OK',
 'DISCOVER_BEGIN','DISCOVER_HTTP','DISCOVER_FOUND','DISCOVER_EMPTY','DISCOVER_ERROR','OFFER_BEGIN','OFFER_HTTP','OFFER_OK',
 'LOCAL_OFFER_BEGIN','LOCAL_OFFER_OK','REMOTE_OFFER_BEGIN','REMOTE_OFFER_OK','LOCAL_ANSWER_BEGIN','LOCAL_ANSWER_OK',
 'JOIN_BEGIN','JOIN_HTTP','JOIN_OK','POLL_HTTP','ANSWER_RECEIVED','REMOTE_ANSWER_BEGIN','REMOTE_ANSWER_OK',
 'GATHER_NEW','GATHER_GATHERING','GATHER_COMPLETE','ICE_NEW','ICE_CHECKING','ICE_CONNECTED','ICE_COMPLETED','ICE_DISCONNECTED','ICE_FAILED','ICE_CLOSED',
 'PEER_NEW','PEER_CONNECTING','PEER_CONNECTED','PEER_DISCONNECTED','PEER_FAILED','PEER_CLOSED',
 'CANDIDATE_HOST','CANDIDATE_SRFLX','CANDIDATE_PRFLX','CANDIDATE_RELAY','CANDIDATE_UNKNOWN',
 'CANDIDATE_MDNS','CANDIDATE_IPV4','CANDIDATE_IPV6','CANDIDATE_ADDRESS_UNKNOWN','CANDIDATE_UDP','CANDIDATE_TCP','CANDIDATE_OTHER',
 'REPLACE_REQUEST','REPLACE_OFFER','REPLACE_ANSWER','REPLACE_OPEN','REPAIR_REQUEST','REPAIR_OFFER','REPAIR_ANSWER','REPAIR_APPLIED','RECOVERY_WAIT','RECOVERY_OK','RECOVERY_TIMEOUT','PAGE_HIDDEN','PAGE_VISIBLE','NETWORK_ONLINE','NETWORK_OFFLINE','CHANNEL_CREATED','CHANNEL_OPEN','CHANNEL_CLOSE','VERIFICATION_READY','APPROVED','OTHER_READY','TRANSFER_START','TRANSFER_DONE',
 'ERROR_TIMEOUT','ERROR_NETWORK','ERROR_ACCOUNT','ERROR_PAIR','ERROR_PROTOCOL','ERROR_CONFLICT','ERROR_STORAGE','ERROR_OTHER','ERROR_OPERATION','ERROR_INVALID_STATE','ERROR_PERMISSION','ERROR_UNSUPPORTED','ERROR_TYPE','ERROR_ABORT','ERROR_SECURITY','STOPPED'
]);
export function validDiagnosticEvents(events){
 return Array.isArray(events)&&events.length<=DIAG_LIMIT&&events.every(e=>Array.isArray(e)&&e.length===3&&
  Number.isSafeInteger(e[0])&&e[0]>=0&&e[0]<=1800000&&PHASES.has(e[1])&&Number.isSafeInteger(e[2])&&e[2]>=0&&e[2]<=600);
}
const MILESTONES=new Set(['START','CREATE_OK','OFFER_OK','JOIN_OK','ROUTE_LOCAL','ROUTE_STUN','ROUTE_OPEN','CHANNEL_OPEN','VERIFICATION_READY','APPROVED','OTHER_READY','TRANSFER_START','TRANSFER_DONE','REPAIR_REQUEST','REPAIR_APPLIED','RECOVERY_OK','RECOVERY_TIMEOUT','REPLACE_REQUEST','REPLACE_OPEN']);
export function newDiagnostic(role,now=()=>performance.now()){
 const start=now(),events=[];
 return {role,events,mark(phase,detail=0){
  const event=[Math.min(1800000,Math.max(0,Math.round(now()-start))),phase,detail];
  if(!validDiagnosticEvents([event]))return;
  const previous=events.at(-1);
  if(previous&&previous[1]===phase&&previous[2]===detail)return;
  // Keep the start and latest checkpoints; never unbounded.
  if(events.length>=DIAG_LIMIT){
   const drop=events.findIndex((e,i)=>i>0&&!MILESTONES.has(e[1]));
   events.splice(drop>0?drop:1,1);
  }
  events.push(event);
 }};
}
export function safeCandidateKinds(candidate){
 if(!candidate)return [];
 const values=String(candidate.candidate||'').split(/\s+/),type=String(candidate.type||values[7]||'').toUpperCase();
 const address=String(candidate.address||values[4]||'');
 const family=address.endsWith('.local')?'MDNS':/^\d{1,3}(?:\.\d{1,3}){3}$/.test(address)?'IPV4':address.includes(':')?'IPV6':'ADDRESS_UNKNOWN';
 const protocol=String(candidate.protocol||values[2]||'').toUpperCase();
 return ['CANDIDATE_'+(['HOST','SRFLX','PRFLX','RELAY'].includes(type)?type:'UNKNOWN'),'CANDIDATE_'+family,'CANDIDATE_'+(['UDP','TCP'].includes(protocol)?protocol:'OTHER')];
}
export function diagnosticError(error){
 const raw=String(error?.message||'');
 const names={OperationError:'OPERATION',InvalidStateError:'INVALID_STATE',NotAllowedError:'PERMISSION',NotSupportedError:'UNSUPPORTED',TypeError:'TYPE',AbortError:'ABORT',SecurityError:'SECURITY',NetworkError:'NETWORK'};
 const kind=/TIMEOUT/.test(raw)?'TIMEOUT':/NETWORK/.test(raw)?'NETWORK':/ACCOUNT/.test(raw)?'ACCOUNT':/PAIR/.test(raw)?'PAIR':/PROTOCOL/.test(raw)?'PROTOCOL':/SECURITY/.test(raw)?'SECURITY':/CONFLICT|EXISTING_CONTENT|DUPLICATE/.test(raw)?'CONFLICT':/STORAGE|Quota|MEMORY/.test(raw)?'STORAGE':(Object.hasOwn(names,error?.name)?names[error.name]:'OTHER');
 return 'ERROR_'+kind;
}
