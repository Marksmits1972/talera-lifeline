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
[hidden]{display:none!important}button:disabled{opacity:.45;cursor:default}
label{display:block;margin:12px 0}
.file-choose{position:relative;display:flex;align-items:center;justify-content:center;box-sizing:border-box;min-height:60px;width:100%;max-width:430px;margin:16px 0 8px;padding:14px 18px;border-radius:9px;background:#23497e;color:#fff;font-size:1.06rem;font-weight:700;cursor:pointer;text-align:center}
.file-choose:focus-within{outline:3px solid #819fce;outline-offset:3px}
.file-choose input[type=file]{position:absolute;inset:0;width:100%;height:100%;margin:0;opacity:0;cursor:pointer}
.file-hint{font-size:.95rem;overflow-wrap:anywhere;margin:8px 0 18px}
.file-hint[data-selected="yes"]{font-weight:600;color:#23497e}
h3{font-size:1.07rem;margin:18px 0 10px}
details{margin-top:14px}summary{cursor:pointer;color:#23497e;font-weight:600}details output{font-size:.9rem;overflow-wrap:anywhere}.note{font-size:.93rem}output{display:block;white-space:pre-wrap;margin:12px 0;padding:12px;background:#eef2f7;border-radius:8px}output:empty{display:none}
#transfer-qr{display:block;width:min(100%,260px);height:auto;margin:12px auto;image-rendering:pixelated;border:1px solid #b9c6d8}
#transfer-camera{display:block;max-width:100%;max-height:300px;margin:12px auto;border-radius:9px;background:#111}
#transfer-input{display:block;box-sizing:border-box;max-width:100%;font:inherit;padding:12px;margin-top:8px;border:1px solid #b9c6d8;border-radius:9px}
</style></head>
<body><main id="talera-free-backup" data-database="${dbName}">
<a href="/mijn-leven">Terug naar Mijn leven</a>
<h1>Back-ups</h1>
<p>Je herinneringen blijven in deze app. Een back-upbestand bewaar je zelf.</p>
<p class="note">Een back-up bevat je foto's, video's en geluid. Het bestand is niet versleuteld: bewaar het privé.</p>
<section id="device-transfer"><h2>Verbind apparaten</h2>
<p>Open TALERA op beide apparaten met hetzelfde account. Houd beide schermen open, liefst op hetzelfde wifi-netwerk.</p>
<button type="button" id="transfer-receive">Ontvangen op dit apparaat</button>
<button type="button" id="transfer-send">Versturen vanaf dit apparaat</button>
<details id="transfer-manual-receive"><summary>Handmatig verbinden als alternatief</summary>
<button type="button" id="transfer-receive-manual">Ontvangen met een verbindingscode</button></details>
<div id="transfer-pair" hidden><p id="transfer-waiting">Wachten op je andere apparaat. Open TALERA daar en kies Versturen vanaf dit apparaat.</p>
<div id="transfer-pair-manual" hidden><p>Scan de QR-code vanuit TALERA op het andere apparaat of voer deze code in:</p><canvas id="transfer-qr" role="img" aria-label="Tijdelijke TALERA-verbindingscode" hidden></canvas><output id="transfer-code"></output></div></div>
<div id="transfer-join" hidden>
<div id="transfer-found" hidden><p>Ontvangend apparaat gevonden op jouw account.</p><button type="button" id="transfer-connect-found">Verbinden</button></div>
<button type="button" id="transfer-search">Opnieuw zoeken</button>
<details id="transfer-manual-send"><summary>Handmatig verbinden als alternatief</summary><button type="button" id="transfer-scan">Scan QR-code</button> <button type="button" id="transfer-scan-stop" hidden>Camera sluiten</button><video id="transfer-camera" autoplay muted playsinline hidden></video><label>Verbindingscode<input id="transfer-input" autocomplete="off" autocapitalize="none" spellcheck="false" maxlength="25"></label><button type="button" id="transfer-connect">Verbinden met code</button></details></div>
<output id="transfer-status" role="status" aria-live="polite"></output>
<div id="transfer-verify" hidden><p>Controleer of dezelfde beveiligingscode op beide schermen staat.</p><output id="transfer-verify-code" style="font-size:1.55rem;font-weight:700;letter-spacing:.1em;text-align:center"></output></div>
<button type="button" id="transfer-approve" hidden>Codes zijn gelijk — bevestig verbinding</button>
<button type="button" id="transfer-import" hidden>Herinneringen toevoegen</button>
<button type="button" id="transfer-cancel" hidden>Stoppen</button>
<details id="transfer-diagnosis"><summary>Technische diagnose bij verbindingsproblemen</summary>
<p class="note">Schakel dit op beide apparaten in vóór het verbinden. Alleen technische statussen worden maximaal vijf minuten via hetzelfde account gedeeld. Geen foto's, IP-adressen, wachtwoorden of verbindingscodes.</p>
<label><input type="checkbox" id="transfer-diagnostic-enable"> Tijdelijke diagnose inschakelen</label>
<div id="transfer-diagnostic-panel" hidden><button type="button" id="transfer-diagnostic-refresh">Diagnose van beide apparaten ophalen</button>
<button type="button" id="transfer-diagnostic-copy">Diagnose kopiëren</button>
<output id="transfer-diagnostic-status" role="status"></output>
<pre id="transfer-diagnostic-report" style="white-space:pre-wrap;overflow-wrap:anywhere;font-size:.88rem;max-height:340px;overflow:auto" tabindex="0"></pre></div></details>
<p class="note">Lukt verbinden niet? Gebruik de bestaande back-up hieronder. Er wordt niets overschreven.</p>
</section>
<section><h2>Back-up maken</h2>
<p>Maak een back-up en tik daarna op 'Bewaar bestand'. Bewaar <strong>TALERA-back-up.talera</strong> in dezelfde eigen map in Bestanden. Kies 'Vervang' als je telefoon dit vraagt.</p>
<button type="button" id="make-backup" disabled>Back-up maken</button>
<a id="save-backup" class="save" download hidden>Bewaar bestand</a>
<output id="export-status" role="status"></output>
<details id="export-details" hidden><summary>Technische details bekijken</summary><output id="export-details-text"></output></details>
</section>
<section><h2>Back-up terugzetten</h2>
<p>Volg de stappen van boven naar beneden. Er wordt niets teruggezet zonder jouw bevestiging.</p>
<h3>Stap 1 — Kies een back-upbestand</h3>
<p>Selecteer het .talera-bestand dat je hebt bewaard.</p>
<label class="file-choose"><span>Kies back-upbestand</span><input type="file" id="restore-file" aria-label="Kies back-upbestand" accept=".talera,application/octet-stream"></label>
<p id="selected-file" class="file-hint" role="status" aria-live="polite">Nog geen back-upbestand gekozen.</p>
<div id="backup-step-check" hidden>
<h3>Stap 2 — Controleer het bestand</h3>
<label><input type="checkbox" id="other-origin"> Back-up uit een andere TALERA-versie toestaan</label>
<button type="button" id="preview-restore" disabled>Bestand controleren</button>
</div>
<output id="restore-status" role="status"></output>
<div id="backup-step-confirm" hidden>
<h3>Stap 3 — Herinneringen terugzetten</h3>
<p id="restore-hint" role="status"></p>
<label><input type="checkbox" id="confirm-restore" disabled> Ik heb de controle gelezen en wil deze herinneringen terugzetten.</label>
<button type="button" id="run-restore" disabled>Herinneringen terugzetten</button>
</div>
<details id="restore-details" hidden><summary>Technische details bekijken</summary><output id="restore-details-text"></output></details>
</section>
<p class="note">Bestaande herinneringen worden niet overschreven. Verwijder je oude app pas na controle van het herstel.</p>
</main>
<script type="module" src="/__f5/backup-controller.mjs"></script>
<script type="module" src="/__f5/f5-transfer-controller.mjs"></script>
</body></html>`;
}
