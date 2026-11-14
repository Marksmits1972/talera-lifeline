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
<title>TALERA – Back-ups</title>
<style>
body{font:16px system-ui,-apple-system,sans-serif;margin:0;background:#f7f5f0;color:#071a3d}
main{max-width:620px;margin:28px auto;padding:18px;line-height:1.48}
section{background:white;border:1px solid #b9c6d8;border-radius:12px;padding:20px;margin:20px 0}
h1{font-size:1.55rem}h2{font-size:1.2rem}button,.save{display:inline-block;background:#23497e;color:white;border:0;padding:12px 16px;border-radius:9px;font:inherit;cursor:pointer;text-decoration:none}
[hidden]{display:none!important}button:disabled{opacity:.45;cursor:default}input[type=file]{display:block;max-width:100%;margin:12px 0}
label{display:block;margin:12px 0}.note{font-size:.93rem}output{display:block;white-space:pre-wrap;margin:12px 0;padding:12px;background:#eef2f7;border-radius:8px}output:empty{display:none}
</style></head>
<body><main id="talera-free-backup" data-database="${dbName}">
<a href="/mijn-leven">Terug naar Mijn leven</a>
<h1>Back-ups</h1>
<p>Je herinneringen blijven in deze app. Een back-upbestand bewaar je zelf.</p>
<p class="note">Een back-up bevat je foto's, video's en geluid. Het bestand is niet versleuteld: bewaar het privé.</p>
<section><h2>Back-up maken</h2>
<p>Maak een back-up en tik daarna op 'Bewaar bestand'.</p>
<button type="button" id="make-backup" disabled>Back-up maken</button>
<a id="save-backup" class="save" download hidden>Bewaar bestand</a>
<output id="export-status" role="status"></output>
</section>
<section><h2>Back-up terugzetten</h2>
<p>Kies een bewaard back-upbestand en controleer het voordat je het terugzet.</p>
<label>Kies bestand <input type="file" id="restore-file" accept=".talera,application/octet-stream"></label>
<label><input type="checkbox" id="other-origin"> Back-up uit een andere TALERA-versie toestaan</label>
<button type="button" id="preview-restore" disabled>Bestand controleren</button>
<output id="restore-status" role="status"></output>
<label><input type="checkbox" id="confirm-restore"> Ik heb de controle gelezen en wil deze herinneringen terugzetten.</label>
<button type="button" id="run-restore" disabled>Herinneringen terugzetten</button>
</section>
<p class="note">Bestaande herinneringen worden niet overschreven. Verwijder je oude app pas na controle van het herstel.</p>
</main>
<script type="module" src="/__f5/backup-controller.mjs"></script>
</body></html>`;
}
