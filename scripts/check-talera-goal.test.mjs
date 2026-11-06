import test from 'node:test';
import assert from 'node:assert/strict';
import { validateOrder, checkScope } from './check-talera-goal.mjs';

const order=()=>({
  id:'TALERA-20261106-PROTOCOL',
  phase:'EXACT_BUILD',
  goal:'Maak alleen controleerbare TALERA-samenwerkingsafspraken en een GitHub scopeguard, zonder app-wijzigingen.',
  decision_source:'Gesprek 6 november 2026: gebruiker vraagt expliciet om deze borging.',
  baseline:{
    repository:'Marksmits1972/talera-lifeline',
    commit:'e117272f8d02ee63b660962d57ceb11972be1699',
    acceptance_status:'Eerder werkende productiecode niet functioneel gewijzigd door deze procesbranch.'
  },
  protected_paths:['src/','r20-dev/','wrangler.jsonc','package.json'],
  allowed_files:['AGENTS.md','docs/work-orders/TALERA-20261106-PROTOCOL.json'],
  critical_assumptions:[{question:'Kan dit zonder wijzigingen aan TALERA-appcode?',status:'VERIFIED',evidence:'Deze PR verandert alleen documentatie, standalone controles en de nieuwe workflow.'}],
  acceptance_tests:['Controleer dat geen bestanden buiten de vastgestelde scope zijn aangepast.'],
  rollback:'Sluit de PR of verwijder de procedurele wijzigingen.',
  user_acceptance:'PENDING'
});
test('geldige work-order wordt geaccepteerd, zonder gebruikersakkoord als groen te claimen',()=>{
  const o=order();assert.deepEqual(validateOrder(o),[]);
  assert.deepEqual(checkScope(o,['AGENTS.md','docs/work-orders/TALERA-20261106-PROTOCOL.json']),[]);
});
test('verkeerd pad wordt onverbiddelijk geweigerd',()=>{
  const o=order();
  const e=checkScope(o,['AGENTS.md','docs/work-orders/TALERA-20261106-PROTOCOL.json','src/one-memory-flow.js']);
  assert.ok(e.some(x=>x.includes('Buiten afgesproken scope: src/one-memory-flow.js')));
});
test('verkeerde of ontbrekende work-order wordt geweigerd',()=>{
  const o=order();
  const e=checkScope(o,['AGENTS.md','docs/work-orders/TALERA-OTHER.json']);
  assert.ok(e.some(x=>x.includes('Precies één gewijzigde work-order')));
});
test('onbewezen kernvoorwaarde kan geen EXACT_BUILD passeren',()=>{
  const o=order();o.critical_assumptions[0].status='OPEN';
  assert.ok(validateOrder(o).some(x=>x.includes('Onbewezen kernvoorwaarde')));
});
test('beschermd pad mag niet via allowed_files worden vrijgegeven',()=>{
  const o=order();o.allowed_files.push('src/index.js');
  assert.ok(validateOrder(o).some(x=>x.includes('raakt beschermd pad')));
});
test('een glob of directory is niet exact genoeg',()=>{
  const o=order();o.allowed_files.push('docs/**');
  assert.ok(validateOrder(o).some(x=>x.includes('EXACTE paden')));
});
test('technische aannames, rollback, acceptatie en baseline zijn verplicht',()=>{
  const o=order();o.acceptance_tests=[];o.rollback='';o.baseline.commit='main';o.critical_assumptions=[];
  assert.ok(validateOrder(o).length>=4);
});
