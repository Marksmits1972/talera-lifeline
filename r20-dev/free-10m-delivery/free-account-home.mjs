// One SQL-backed Durable Object per Free account, no central D1.
import {DurableObject} from 'cloudflare:workers';
import {validatedDate} from './free-account-router.mjs';
export class FreeAccountHome extends DurableObject {
 async getBirthDate(){
  const value=await this.ctx.storage.get('birthdate');
  return value===undefined?null:validatedDate(value);
 }
 async setBirthDate(value){
  const validated=validatedDate(value);
  await this.ctx.storage.put('birthdate',validated);
  // Only acknowledge SUCCESS once the per-account persistent write completes.
  return {saved:true,birthDate:validated};
 }
}
