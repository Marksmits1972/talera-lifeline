// Standalone F5 QA recovery screen. The approved TALERA /mijn-leven, /tell
// and /present HTML/CSS/JS are never modified or injected with this page.
// Auth and private IndexedDB namespace are supplied only by verified Worker session.
export function localBackupPage(dbName){
 if(typeof dbName!=='string'||!/^talera-free-local-[a-f0-9]{32}-v1$/.test(dbName))
  throw Error('TALERA_BACKUP_NO_VERIFIED_LOCAL_SCOPE');
 return `<!doctype html>
<html lang="nl"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>TALERA Free – lokale back-up (test)</title>
<style>
body{font:16px system-ui,-apple-system,sans-serif;margin:0;background:#f7f5f0;color:#071a3d}
main{max-width:620px;margin:28px auto;padding:18px;line-height:1.48}
section{background:white;border:1px solid #b9c6d8;border-radius:12px;padding:20px;margin:20px 0}
h1{font-size:1.55rem}h2{font-size:1.2rem}button,.save{display:inline-block;background:#23497e;color:white;border:0;padding:12px 16px;border-radius:9px;font:inherit;cursor:pointer;text-decoration:none}
button:disabled{opacity:.45;cursor:default}input[type=file]{display:block;max-width:100%;margin:12px 0}
label{display:block;margin:12px 0}.note{font-size:.93rem}output{display:block;white-space:pre-wrap;margin:12px 0;padding:12px;background:#eef2f7;border-radius:8px}
</style></head>
<body><main id="talera-free-backup" data-database="${dbName}">
<a href="/mijn-leven">Terug naar Mijn leven</a>
<h1>Lokale back-up en herstel – besloten proef</h1>
<p>Deze functie werkt uitsluitend met de lokale herinneringen van je ingelogde Free-account op dit toestel. We uploaden geen foto's, video's of audio.</p>
<p><strong>Privacy:</strong> het exportbestand is <strong>niet versleuteld</strong> en bevat volledige originele media en stemopnamen. Bewaar het op een privéplek in Bestanden, niet in een gedeelde map. TALERA kan niet garanderen waar Safari of iCloud een bestand bewaart.</p>
<section><h2>1. Back-up maken</h2>
<p>Maak eerst een archief en sla het daarna zelf op. Je huidige herinneringen blijven op dit toestel staan.</p>
<button type="button" id="make-backup">Maak back-up</button>
<a id="save-backup" class="save" download hidden>Bewaar back-upbestand</a>
<output id="export-status" role="status">Nog geen back-up gemaakt.</output>
</section>
<section><h2>2. Herstellen (alleen met toestemming)</h2>
<p>Kies zelf een eerder opgeslagen .talera-bestand. TALERA controleert de inhoud en eventuele conflicten <em>vóór</em> er iets aan je herinneringen wordt toegevoegd.</p>
<label>Back-upbestand <input type="file" id="restore-file" accept=".talera,application/octet-stream"></label>
<label><input type="checkbox" id="other-origin"> Ik geef toestemming om ook een archief van een andere of onbekende TALERA-webversie te controleren en eventueel te herstellen.</label>
<button type="button" id="preview-restore">Controleer herstelbestand</button>
<output id="restore-status" role="status">Er is nog niets gecontroleerd.</output>
<label><input type="checkbox" id="confirm-restore"> Ik heb de samenvatting gecontroleerd en kies er zelf voor deze herinneringen toe te voegen.</label>
<button type="button" id="run-restore" disabled>Herstel herinneringen</button>
</section>
<p class="note">Bij ontbrekende doelopslag, beschadigde bestanden, dubbele ID's of onvoldoende opslagruimte stopt het herstel zonder bestaande herinneringen te overschrijven. Verwijder je oude app of media nooit totdat je de herstelde herinneringen zelf hebt gecontroleerd.</p>
</main>
<script type="module" src="/__f5/backup-controller.mjs"></script>
</body></html>`;
}
