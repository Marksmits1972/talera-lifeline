// Pure routing module: usable in Node regression and Cloudflare Workers alike.
const ACCOUNT_ID=/^[A-Za-z0-9_-]{1,128}$/;
export function validatedAccountId(input){
 if(typeof input!=='string'||!ACCOUNT_ID.test(input))throw Error('INVALID_ACCOUNT_ID');
 return input;
}
export function validatedDate(input){
 if(typeof input!=='string'||!(/^\d{4}-\d{2}-\d{2}$/).test(input))throw Error('INVALID_BIRTH_DATE');
 const [y,m,d]=input.split('-').map(Number);
 const date=new Date(Date.UTC(y,m-1,d));
 if(y<1900||y>new Date().getUTCFullYear()||date.getUTCFullYear()!==y||
    date.getUTCMonth()!==m-1||date.getUTCDate()!==d||
    input>new Date().toISOString().slice(0,10))throw Error('INVALID_BIRTH_DATE');
 return input;
}
const PREFIX='talera-free-account-v1:';
export function accountHome(env,accountId){
 const id=validatedAccountId(accountId);
 if(!env?.FREE_ACCOUNT?.idFromName||!env.FREE_ACCOUNT.get)throw Error('FREE_ACCOUNT_BINDING_MISSING');
 // There is NO global lookup: same canonical account ID always maps directly
 // to the same Durable Object. Every account has independent persistent storage.
 return env.FREE_ACCOUNT.get(env.FREE_ACCOUNT.idFromName(PREFIX+id));
}
export async function getAccountBirthDate(env,accountId){
 const value=await accountHome(env,accountId).getBirthDate();
 return value===null?null:validatedDate(value);
}
export async function putAccountBirthDate(env,accountId,value){
 return accountHome(env,accountId).setBirthDate(validatedDate(value));
}

