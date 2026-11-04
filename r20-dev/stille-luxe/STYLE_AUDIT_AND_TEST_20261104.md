# TALERA — Stille luxe | Audit en oplevercontrole (04-11-2026)

## Status
**Afzonderlijke stijlstaging gebouwd en in Cloudflare gepubliceerd. Nog NIET definitief geaccepteerd door de producteigenaar.** Alleen de GitHub-stijlbranch en een NIEUWE Worker zijn gewijzigd. Alle bestaande V9, V8, V7, V6, V5, R20, V61, V56 en Free→Premium-bronnen/Workers bleven ongemoeid.

**Testlink:** https://talera-v9-stille-luxe-stijlstaging-20261104.mark-a39.workers.dev/

**Nieuwe Worker:** `talera-v9-stille-luxe-stijlstaging-20261104`  
**Actuele Worker-versie:** `45d125cb-76a5-4b50-a1b5-234171936a5d`  
**Deployment:** `91d683f5-ce1b-4689-9210-e284c70aab9d`  
**GitHub-branch:** `style/talera-stille-luxe-v9-20261104`

## Technische uitgangspositie (live geverifieerd via Cloudflare API)
- De V9 Worker `talera-v61-r20-definitief-verwijderen-v9-20261104` heeft ongewijzigd versie `683c6aaf-8dd0-42de-b6e4-f3bd80d7de06`.
- De keten van servicebindings is: stijlstaging → `V9_BASE` → V9 → `V8_BASE` → V8 → V7 → V6 → V5 → beschermd R20 → V61 → V56. De stijlstaging heeft **slechts één nieuwe binding** toegevoegd, maar de bestaande diepe afhankelijkheidsketen blijft een onderhoudsaandachtspunt.
- Nooit `wrangler.jsonc` op repo-root gebruiken voor deze staging: dat bestand verwijst naar de oudere `talera-timeline-prototype`, niet naar de V9-keten.
- Geen D1-, R2-, IndexedDB-, serviceworker-, gegevens-, Premium- of accountmutaties uitgevoerd.

## Leidend merkbesluit
Google Drive-document `TALERA — DEFINITIEVE MERKSTIJL — STILLE LUXE + 1% LIME` van 4 november 2026: gewone pagina's wit `#FFFFFF`, ondersteunend ivoor `#F7F5F0`, inkt `#304653`, secundair `#718D9A`, nevelblauw `#B5C6CD`, optioneel lime `#B8D943` maximaal 1% zichtbaar. Geen nieuwe kleuren of fontdownload; bestaande systeemfontstack.

De originele schermreferenties en kleurenkaart zijn afzonderlijk in Drive teruggevonden. De originele PWA-drieluikvorm komt uit de daadwerkelijk bestaande `TALERA_V3_OFFICIAL_ICONS` in V56, **niet** uit het oudere afwijkende swoosh-beeldmerk `BRAND_PNG_BASE64`.

## Compacte visuele bron-audit
| Plek | Bevestigde bevinding | Veilige aanpak in staging |
|---|---|---|
| Oudere V56 Worker | Multipart bron bevat ~89 tekstuele `<style>`-blokken in verschillende routes/templates en veel tegenstrijdige kleurcodes, o.a. `#0F2747`, `#337CCA`, `#E7A98B`, `#F7F4EF` | Kleuren van HTML-stijlblokken op normale pagina's tijdens het renderen waar herkenbaar genormaliseerd |
| R20-presentatie- en editorlaag | ~7 tekstuele stijlblokken met aanvullende selectors, dynamische weergave en `!important`, oude tinten o.a. `#173D52`, `#FBFAF7` | Geen structurele wijzigingen aan beschermde opname-/presentatieregels |
| Oude tijdlijn | Helderblauwe selected-staten voor `.age-row.selected`, `.story.active`, `.month-point.active` en `.nav-item.selected`, plus gradient achter tijdlijnitems | Gerichte semantische kleur-, rand- en achtergrondregels in centraal CSS |
| Logo-assets | Oude swoosh-asset en originele officiële V3-drieluik PNG's (180/192/512) bestaan naast elkaar | Alleen originele V3-panelen herkleuren; routevorm, silhouet en witte achtergrond blijven rastermatig gelijk |
| Typografie | Diverse historische fontgroottes, typen en gewichtsniveaus | Eén gedeelde systeemfontstack en hiërarchie voor headings, labels, input en knoppen |

**BELANGRIJKE grens van deze eerste veilige stijlrelease:** de historische V56/R20-CSS is in de **beschermde** bronsystemen niet fysiek verwijderd. De staging herschrijft in-place een set bekende kleurcodes in teruggegeven HTML en voegt één compacte centrale CSS-stijlbron toe. Door runtime door JavaScript geïnjecteerde stijlen, onherkende kleurcodes en niet bezochte routes zijn niet bewezen volledig geharmoniseerd. Noem dit dus nog geen afgeronde diepgaande bronrefactor of volledige CSS-opschoning. Een refactor van de oorspronkelijke diepe keten is risicovol en valt buiten de expliciet beschermde functionele code; eerst echte schermacceptatie is nodig.

## Gewijzigde bestanden, uitsluitend op nieuwe stijlbranch
- `r20-dev/stille-luxe/stille-luxe.css` — centrale tokens, typografie, buttons, daadwerkelijke UI-selectors en bestaande originele drieluik-logo als CSS-headericoon.
- `r20-dev/stille-luxe/stille-luxe.worker.mjs` — één nieuwe Cloudflare staging, laat originele V9 onaangeroerd, normaliseert bekende CSS-tinten, voegt stijl in normale HTML toe, beheert manifest/icons.
- `r20-dev/stille-luxe/STYLE_AUDIT_AND_TEST_20261104.md` — dit audit-/controleverslag.
- `r20-dev/stille-luxe/sync-style.mjs`, `stille-luxe.test.mjs`, `smoke-live.mjs` en de exclusieve GitHub Actions-workflow — onderhoudbare, alleen-lezen veiligheidstests.

Geen nieuwe externe fonts, frameworks, credentials, betaalde API's of datastructuren.

## Logo-proef
De bestaande oorspronkelijke `/talera-brand-v3-180.png`, `192.png` en `512.png` zijn technisch gecontroleerd via Cloudflare runtime PNG-decode → chromatische blauwherkleuring → PNG-encode. Voor alle formaten werd een geldig PNG-header/resultaat met dezelfde pixelafmetingen teruggegeven. Witte routepixels worden niet geometrisch gewijzigd; perceptuele verificatie op echte schermen blijft open. De nieuwe staging onderschept app-icons en stuurt het manifest naar de nieuw herkleurde iconen.

## Vervolgcontroles op 4 november — echte staging en veilige CSS
- De producteigenaar heeft de nieuwe styling globaal op iPhone bekeken en meldde geen zichtbare vreemde afwijkingen. Dit is een eerste visuele beoordeling, geen volledige expliciete eindacceptatie van alle schermen.
- De staging is opnieuw gepubliceerd op **hetzelfde** testadres; geen nieuwe Worker of gebruikersorigin.
- Het CSS-vervangingsproces houdt volledige inline `<script>`-blokken intact, en slaat gevoelige player-, foto-, vertel-, swipe- en opname-CSS-selectors over, óók wanneer gewone navigatie-CSS in hetzelfde stylesheet staat.
- `r20-dev/stille-luxe/sync-style.mjs --check` bevestigt dat `stille-luxe.css` de enige te bewerken stijlbron is en de Worker slechts een gegenereerde ingesloten kopie gebruikt.
- `r20-dev/stille-luxe/stille-luxe.test.mjs` bevat onafhankelijke regressiecontroles met fictieve HTML en PNG-fixtures; geen privéfoto's of accountgegevens.
- De GitHub Actions-workflow `.github/workflows/talera-stille-luxe-check.yml` test alleen deze branch en voert geen deployment of gegevensmutatie uit.
- Publieke read-only HTTP-smoketests van 8 routes/icoonformaten: **8/8 PASS** op https://github.com/Marksmits1972/talera-lifeline/actions/runs/41890127603 (basisstaging voor veilige CSS-doorwerking). Na de nieuwste patch draait dezelfde controle opnieuw.
- De Cloudflare-API bevestigt de actuele stagingbinding `V9_BASE` naar exact de beschermde V9 en de originele V9-deploymentversie `683c6aaf-8dd0-42de-b6e4-f3bd80d7de06` nog intact.

## Reële testresultaten
| Controle | Feitelijke status |
|---|---|
| Cloudflare Worker-upload / scriptcompilatie | GESLAAGD, zonder API-fouten |
| Ingeschakeld eigen workers.dev-subdomein | BEVESTIGD |
| V9_BASE servicebinding naar exacte V9 | BEVESTIGD |
| GitHub-workerbron identiek aan Cloudflare script-readback | BEVESTIGD |
| Oorspronkelijke V9 deployment-versie intact | BEVESTIGD |
| Originele iconenverwerking 180, 192, 512 | GESLAAGD in geïsoleerde runtimeproef |
| Live HTTP-routes (home, Mijn leven, editor, presentatie, manifest, iconen) | 8/8 PASS in GitHub Actions; URL vanuit webzoektool niet bereikbaar |
| Visuele schermrendering / echte screenshotvergelijking | NIET volledig automatisch geverifieerd; eerste iPhone-beoordeling gebruiker: geen opvallende afwijkingen |
| iPhone safe areas, mobile overflow, werkelijke CSS-cascade en logo-uitstraling | OPEN: handmatige toestelcontrole |
| Herinnering aanmaken/bewerken/verwijderen, foto, swipe, audio, vertelstart, video, delen, back-up | NIET end-to-end in de nieuwe staging getest; absoluut niet claimen als geslaagd |
| Free→Premium-werkstroom | NIET aangeraakt |
| Handmatige Free-back-up | De V9-notities melden dat automatische/handmatige back-upexport in de relevante V61-keten nog niet geactiveerd was; niet als werkend claimen |

## Terugval en browserverdeling
**Onaangetast V9-hersteladres:** https://talera-v61-r20-definitief-verwijderen-v9-20261104.mark-a39.workers.dev/

**Beschermde R20-Worker:** `talera-pwa-v61-r20-goedgekeurd-herstelpunt-20261104` (niet overschreven).

Elk workers.dev-hostname heeft een eigen browserorigin en dus andere lokale IndexedDB. Nieuwe staging toont bestaande persoonlijke herinneringen van V9 niet automatisch. Niet de geïnstalleerde PWA verwijderen, niets wissen en geen persoonlijke bibliotheek migreren voor een visuele test.

## Openstaande acceptatie en beperkingen
1. Gebruiker opent **alleen de afzonderlijke stijlstaging** op de eigen iPhone en beoordeelt hoofdscherm, Mijn leven, editor, instellingen en presentatieregeling; vergelijk met officiële inspiratiesheet.
2. Eerst zichtbare lay-out, logo, wit/inkt, mobiele afmetingen en navigatie beoordelen. Geen zware privédata-upload nodig; begin met minimale fictieve testinhoud.
3. Daarna volledige regressie inclusief V7/V8/V9 en bruikbaarheid back-up, delen en instellingen, voor zover aanwezig.
4. De `/present`-route is bewust van generieke CSS-herkleuring uitgezonderd om de goedgekeurde R20-presentatie en V7/V8 fixes niet te beschadigen; presentatiechroming is dus nog NIET als geharmoniseerd geaccepteerd.
5. Na een geslaagde controle kan besloten worden of diepere bronopschoning veilig kan worden uitgevoerd. V9/R20 blijven intussen onaangeroerd.
