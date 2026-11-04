# TALERA R20 V5 — herstel toegang tot bestaande /tell-editor

**Nieuwe afzonderlijke link**: https://talera-v61-r20-rechtstreeks-bewerken-v5-20261104.mark-a39.workers.dev/

**Cloudflare Worker**: `talera-v61-r20-rechtstreeks-bewerken-v5-20261104`

**Versie**: `01268c39-a298-40e5-b03e-345d718e3b7c`

**GitHub branch**: `dev/r20-direct-bewerken-v5-20261104`

## Scope

- Alle requests voor `/tell`, `/tell/`, `/tell?edit=<eigen-story-id>`, en routes anders dan `/`, `/mijn-leven`, `/present`, `/present/` worden **zonder enige HTML-injectie of codecontrole** doorgelaten naar het originele goedgekeurde R20-herstelpunt.
- Op de tijdlijn/presentatie is één blijvend potloodje. Bij de klik leest het de *op dat moment actieve* herinnering uit `window.__taleraTimelineRuntime.currentMemory()`. Voor persoonlijk opgeslagen herinneringen verwijst het direct naar `/tell?edit=<storyId>`.
- Voorbeelden ontbreken als persoonlijke opslagrecords. Tijdens de huidige test worden ze niet bewerkt of verwijderd.
- Geen nieuw editorvenster, geen `patchTell`-code vanuit de nieuwe wrapper, geen externe beheermodule, geen V4-contractcheck, geen extra verwijderknop. Verwijderen van gepubliceerde herinneringen wordt apart opgepakt, nadat de bestaande editorroute op de iPhone bewezen werkt.

## Veiligheid en controle

- Cloudflare broncode van V5 is exact teruggelezen en geverifieerd.
- R20, de vertrouwde startlink en V4 zijn elk op hun eerdere Cloudflare-versienummers gebleven.
- Live iPhone-test nog vereist. De externe HTTP-testomgeving kon de workers.dev-host niet bereiken (DNS-beperking), dus **geen live route-test geclaimd**.
- De nieuwe V5-host heeft eigen browseropslag; oorspronkelijke lokale herinneringen op andere ontwikkel-URL's verschijnen daar niet automatisch.

