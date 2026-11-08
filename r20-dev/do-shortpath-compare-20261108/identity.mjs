// Deterministic IDs, scoped only to synthetic TALERA proof accounts.
export const DEMO_ACCOUNT=/^demo-[a-z0-9_-]{1,48}$/;
export const DEMO_STORY=/^story-[a-z0-9_-]{1,48}$/;
export const DEMO_MEDIA=/^media-[a-z0-9_-]{1,48}$/;
function check(pattern,value,label){
 if(typeof value!=='string'||!pattern.test(value))throw new Error('INVALID_'+label);
 return value;
}
export const objectName=(accountId)=>'talera-do-owner-v1:'+check(DEMO_ACCOUNT,accountId,'ACCOUNT');
export function objectStub(env,accountId){
 const eu=env.ACCOUNT_HOME.jurisdiction('eu');
 return eu.get(eu.idFromName(objectName(accountId)));
}
export const mediaKey=(accountId,storyId,mediaId)=>
 'demo/v1/'+check(DEMO_ACCOUNT,accountId,'ACCOUNT')+'/'+
 check(DEMO_STORY,storyId,'STORY')+'/'+
 check(DEMO_MEDIA,mediaId,'MEDIA')+'.txt';
export const storyId=id=>check(DEMO_STORY,id,'STORY');
export const accountId=id=>check(DEMO_ACCOUNT,id,'ACCOUNT');
export const mediaId=id=>check(DEMO_MEDIA,id,'MEDIA');
