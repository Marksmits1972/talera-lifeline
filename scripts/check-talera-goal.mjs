#!/usr/bin/env node
/**
 * TALERA scope guard.
 * Verifies that every changed file in a PR belongs to ONE explicitly described task.
 * Does NOT determine whether the goal itself, UX, user approval or iPhone behavior is correct.
 * Built-ins only. Usage:
 *   node scripts/check-talera-goal.mjs --base <SHA> --head <SHA>
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export function nonEmpty(value,min=10){
  return typeof value==='string' && value.trim().length>=min;
}
export function validateOrder(order){
  const errors=[];
  if(!order||typeof order!=='object'||Array.isArray(order))return ['Work-order moet een JSON-object zijn'];
  if(!/^[A-Z0-9]+(?:-[A-Z0-9]+)+$/.test(String(order.id||'')))errors.push('id ontbreekt of is ongeldig');
  if(!['EXPLORE','EXACT_BUILD'].includes(order.phase))errors.push('phase is EXPLORE of EXACT_BUILD');
  if(!nonEmpty(order.goal,40))errors.push('goal ontbreekt of is te algemeen (minimaal 40 tekens)');
  if(!nonEmpty(order.decision_source,15))errors.push('decision_source: bron van gebruikersbesluit ontbreekt');
  if(!nonEmpty(order.baseline?.repository,10))errors.push('baseline.repository ontbreekt');
  if(!/^[0-9a-f]{40}$/.test(String(order.baseline?.commit||'')))errors.push('baseline.commit moet een echte, exacte commit-SHA zijn');
  if(!nonEmpty(order.baseline?.acceptance_status,10))errors.push('baseline.acceptance_status ontbreekt');
  if(!Array.isArray(order.protected_paths)||!order.protected_paths.length||order.protected_paths.some(p=>!nonEmpty(p,2)))errors.push('protected_paths moet benoemen wat intact blijft');
  if(!Array.isArray(order.allowed_files)||!order.allowed_files.length)errors.push('allowed_files mag niet leeg zijn');
  else {
    if(new Set(order.allowed_files).size!==order.allowed_files.length)errors.push('allowed_files bevat dubbelen');
    for(const p of order.allowed_files){
      if(!nonEmpty(p,3)||p.startsWith('/')||p.includes('..')||p.includes('*')||p.endsWith('/'))errors.push('Gebruik uitsluitend EXACTE paden in allowed_files: '+String(p));
      if((order.protected_paths||[]).some(protectedPath=>p===protectedPath||protectedPath.endsWith('/')&&p.startsWith(protectedPath)))errors.push('allowed_files raakt beschermd pad: '+p);
    }
  }
  if(!Array.isArray(order.critical_assumptions)||!order.critical_assumptions.length)errors.push('critical_assumptions ontbreekt');
  else for(const a of order.critical_assumptions){
    if(!nonEmpty(a?.question,10)||!['VERIFIED','NOT_APPLICABLE','OPEN'].includes(a?.status)||!nonEmpty(a?.evidence,10))errors.push('Elke aanname vereist vraag, VERIFIED/NOT_APPLICABLE/OPEN en echt bewijs/reden');
    if(order.phase==='EXACT_BUILD' && a?.status==='OPEN')errors.push('Onbewezen kernvoorwaarde bij EXACT_BUILD: '+a.question);
  }
  if(!Array.isArray(order.acceptance_tests)||!order.acceptance_tests.length||order.acceptance_tests.some(x=>!nonEmpty(x,10)))errors.push('acceptance_tests ontbreekt');
  if(!nonEmpty(order.rollback,10))errors.push('rollback-instructie ontbreekt');
  if(!['PENDING','APPROVED'].includes(order.user_acceptance))errors.push('user_acceptance moet PENDING of APPROVED zijn; GitHub CI verifieert dit NIET');
  return errors;
}
export function checkScope(order,changedFiles){
  const errors=validateOrder(order);
  if(!Array.isArray(changedFiles)||changedFiles.length===0)return [...errors,'Geen gewijzigde bestanden gevonden'];
  const workOrders=changedFiles.filter(x=>/^docs\/work-orders\/TALERA-[A-Z0-9-]+\.json$/.test(x));
  const expected='docs/work-orders/'+String(order?.id||'')+'.json';
  if(workOrders.length!==1||workOrders[0]!==expected)errors.push('Precies één gewijzigde work-order verplicht: '+expected);
  for(const path of changedFiles){
    if(!order?.allowed_files?.includes(path))errors.push('Buiten afgesproken scope: '+path);
  }
  return errors;
}
function arg(name){const idx=process.argv.indexOf(name);return idx>=0?process.argv[idx+1]:undefined;}
function gitChanged(base,head){
  const value=execFileSync('git',['diff','--name-only','--no-renames',base,head],{encoding:'utf8'});
  return value.trim().split('\n').filter(Boolean);
}
export function run(){
  const base=arg('--base')||process.env.TALERA_BASE_SHA;
  const head=arg('--head')||process.env.TALERA_HEAD_SHA;
  if(!base||!head)throw new Error('Gebruik --base en --head met exacte Git commits');
  const changed=gitChanged(base,head);
  const orders=changed.filter(x=>/^docs\/work-orders\/TALERA-[A-Z0-9-]+\.json$/.test(x));
  if(orders.length!==1)throw new Error('Er moet precies één gewijzigde TALERA-work-order zijn, gevonden: '+orders.length);
  const order=JSON.parse(readFileSync(orders[0],'utf8'));
  const errors=checkScope(order,changed);
  if(errors.length)throw new Error('TALERA-DOELBEWAKING GEFAALD:\n- '+errors.join('\n- '));
  console.log('PASS TALERA scopeguard. Doel: '+order.goal);
  console.log('Fase: '+order.phase+' | bestanden binnen scope: '+changed.length);
  console.log('LET OP: inhoudelijke UX, iPhone-acceptatie, productie-veiligheid en expliciet gebruikersakkoord blijven afzonderlijk te toetsen.');
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1]){
  try{run()}catch(error){console.error(error.message);process.exitCode=1;}
}
