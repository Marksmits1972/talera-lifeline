/* Inside original async publish(g), preserve all original validation, uploads and indexeddb.
 * Replace navigate only AFTER verified persisted record; route to actual Mijn leven. */
const persisted=await mem.get(row.id);
if(!persisted||persisted.id!==row.id)throw Error('De herinnering kon na het bewaren niet worden teruggevonden.');
/* cleanup existing draft as in V3 */
location.assign('/mijn-leven?published='+encodeURIComponent(row.id));
