import {languageSpan,languageText,languageBootstrap} from './f5-language.mjs';
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
<title data-talera-text="backup.page.title">${languageText('backup.page.title')}</title>
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
.transfer-actions{display:grid;gap:10px;margin:12px 0}
.transfer-actions button,.transfer-actions .save{width:100%;box-sizing:border-box;text-align:center;min-height:48px}
#transfer-cancel,#transfer-restart,#transfer-search{background:#fff;color:#23497e;border:1px solid #b9c6d8}
#transfer-step{color:#23497e}
#transfer-connection-status{background:#fff4df;color:#624610}
#transfer-qr{display:block;width:min(100%,260px);height:auto;margin:12px auto;image-rendering:pixelated;border:1px solid #b9c6d8}
#transfer-camera{display:block;max-width:100%;max-height:300px;margin:12px auto;border-radius:9px;background:#111}
#transfer-input{display:block;box-sizing:border-box;max-width:100%;font:inherit;padding:12px;margin-top:8px;border:1px solid #b9c6d8;border-radius:9px}
</style></head>
<body><main id="talera-free-backup" data-database="${dbName}">
<a href="/mijn-leven">${languageSpan('backup.page.back')}</a>
<h1>${languageSpan('backup.page.heading')}</h1>
<p>${languageSpan('backup.page.local')}</p>
<section id="device-transfer"><h2>${languageSpan('transfer.page.heading')}</h2>
<h3 id="transfer-step" data-talera-text="transfer.flow.choose">${languageText('transfer.flow.choose')}</h3>
<output id="transfer-status" role="status" aria-live="polite"></output>
<output id="transfer-connection-status" role="status" aria-live="polite" hidden></output>
<div id="transfer-choice">
<p>${languageSpan('transfer.page.instructions')}</p>
<p>${languageSpan('transfer.flow.direction')}</p>
<div class="transfer-actions">
<button type="button" id="transfer-receive">${languageSpan('transfer.page.receive')}</button>
<button type="button" id="transfer-send">${languageSpan('transfer.page.send')}</button>
</div>
<details id="transfer-manual-receive"><summary>${languageSpan('transfer.page.manualReceive')}</summary>
<button type="button" id="transfer-receive-manual">${languageSpan('transfer.page.receiveCode')}</button></details>
<p class="note">${languageSpan('transfer.page.backupFallback')}</p></div>
<div id="transfer-pair" hidden><p id="transfer-waiting">${languageSpan('transfer.page.wait')}</p>
<div id="transfer-pair-manual" hidden><p>${languageSpan('transfer.page.manualInstructions')}</p><canvas id="transfer-qr" role="img" data-talera-aria-label="transfer.page.qrLabel" aria-label="${languageText('transfer.page.qrLabel')}" hidden></canvas><output id="transfer-code"></output></div></div>
<div id="transfer-join" hidden>
<div id="transfer-found" hidden><p>${languageSpan('transfer.page.found')}</p><button type="button" id="transfer-connect-found">${languageSpan('transfer.page.connectFound')}</button></div>
<button type="button" id="transfer-search" hidden>${languageSpan('transfer.page.search')}</button>
<details id="transfer-manual-send"><summary>${languageSpan('transfer.page.manualSend')}</summary><button type="button" id="transfer-scan">${languageSpan('transfer.page.scan')}</button> <button type="button" id="transfer-scan-stop" hidden>${languageSpan('transfer.page.closeCamera')}</button><video id="transfer-camera" autoplay muted playsinline hidden></video><label>${languageSpan('transfer.page.codeLabel')}<input id="transfer-input" autocomplete="off" autocapitalize="none" spellcheck="false" maxlength="25"></label><button type="button" id="transfer-connect">${languageSpan('transfer.page.connectCode')}</button></details></div>
<div id="transfer-verify" hidden><output id="transfer-verify-code" style="font-size:1.55rem;font-weight:700;letter-spacing:.1em;text-align:center"></output></div>
<div class="transfer-actions"><button type="button" id="transfer-approve" hidden>${languageSpan('transfer.page.approve')}</button>
<button type="button" id="transfer-import" hidden>${languageSpan('transfer.page.import')}</button>
<a id="transfer-return" class="save" href="/mijn-leven" hidden>${languageSpan('transfer.flow.return')}</a>
<button type="button" id="transfer-restart" hidden>${languageSpan('transfer.flow.restart')}</button>
<button type="button" id="transfer-cancel" hidden>${languageSpan('transfer.page.stop')}</button></div>
<details id="transfer-diagnosis"><summary>${languageSpan('transfer.page.diagnosticHeading')}</summary>
<p class="note">${languageSpan('transfer.page.diagnosticPrivacy')}</p>
<label><input type="checkbox" id="transfer-diagnostic-enable"> ${languageSpan('transfer.page.diagnosticEnable')}</label>
<div id="transfer-diagnostic-panel" hidden><button type="button" id="transfer-diagnostic-refresh">${languageSpan('transfer.page.diagnosticRefresh')}</button>
<button type="button" id="transfer-diagnostic-copy">${languageSpan('transfer.page.diagnosticCopy')}</button>
<output id="transfer-diagnostic-status" role="status"></output>
<pre id="transfer-diagnostic-report" style="white-space:pre-wrap;overflow-wrap:anywhere;font-size:.88rem;max-height:340px;overflow:auto" tabindex="0"></pre></div></details>
</section>
<div id="backup-file-actions"><p class="note">${languageSpan('backup.page.privacy')}</p>
<section><h2>${languageSpan('backup.page.createHeading')}</h2>
<p>${languageSpan('backup.page.createInstructions',{filename:'TALERA-back-up.talera'},'filename')}</p>
<button type="button" id="make-backup" disabled>${languageSpan('backup.page.createButton')}</button>
<a id="save-backup" class="save" download hidden>${languageSpan('backup.page.saveFile')}</a>
<output id="export-status" role="status"></output>
<details id="export-details" hidden><summary>${languageSpan('backup.page.exportDetails')}</summary><output id="export-details-text"></output></details>
</section>
<section><h2>${languageSpan('backup.page.restoreHeading')}</h2>
<p>${languageSpan('backup.page.restoreInstructions')}</p>
<h3>${languageSpan('backup.page.stepChoose')}</h3>
<p>${languageSpan('backup.page.chooseInstructions')}</p>
<label class="file-choose"><span>${languageSpan('backup.page.fileButton')}</span><input type="file" id="restore-file" data-talera-aria-label="backup.page.fileAria" aria-label="${languageText('backup.page.fileAria')}" accept=".talera,application/octet-stream"></label>
<p id="selected-file" class="file-hint" role="status" aria-live="polite">${languageSpan('backup.page.noFile')}</p>
<div id="backup-step-check" hidden>
<h3>${languageSpan('backup.page.stepCheck')}</h3>
<label><input type="checkbox" id="other-origin"> ${languageSpan('backup.page.otherVersion')}</label>
<button type="button" id="preview-restore" disabled>${languageSpan('backup.page.checkButton')}</button>
</div>
<output id="restore-status" role="status"></output>
<div id="backup-step-confirm" hidden>
<h3>${languageSpan('backup.page.stepConfirm')}</h3>
<p id="restore-hint" role="status"></p>
<label><input type="checkbox" id="confirm-restore" disabled> ${languageSpan('backup.page.confirm')}</label>
<button type="button" id="run-restore" disabled>${languageSpan('backup.page.restoreButton')}</button>
</div>
<details id="restore-details" hidden><summary>${languageSpan('backup.page.restoreDetails')}</summary><output id="restore-details-text"></output></details>
</section>
<p class="note">${languageSpan('backup.page.protection')}</p></div>
</main>
<script>${languageBootstrap(['backup.','transfer.'])}</script>
<script type="module" src="/__f5/backup-controller.mjs"></script>
<script type="module" src="/__f5/f5-transfer-controller.mjs"></script>
</body></html>`;
}
