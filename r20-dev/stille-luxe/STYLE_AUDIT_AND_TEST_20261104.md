# TALERA — Stille luxe | Audit en oplevercontrole (04-11-2026)

## Status
**Afzonderlijke stijlstaging gebouwd en in Cloudflare gepubliceerd. Nog NIET definitief geaccepteerd door de producteigenaar.** Alleen de GitHub-stijlbranch en een NIEUWE Worker zijn gewijzigd. Alle bestaande V9, V8, V7, V6, V5, R20, V61, V56 en Free→Premium-bronnen/Workers bleven ongemoeid.

**Testlink:** https://talera-v9-stille-luxe-stijlstaging-20261104.mark-a39.workers.dev/

**Nieuwe Worker:** `talera-v9-stille-luxe-stijlstaging-20261104`  
**Actuele Worker-versie:** `bc36d913-49f8-4f4d-b00d-3d5894a11146`  
**Deployment:** `a613561d-e799-47ff-a032-5ee9e9a5bda6`  
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

## Visuele browsercontrole (anoniem, geen eigen data)
- GitHub Actions [run 41891355982](https://github.com/Marksmits1972/talera-lifeline/actions/runs/41891355982) rapporteerde succes voor Node-regressie, CSS-bronconsistentie, **8/8 echte HTTP-routes** én het vastleggen van vijf schermafbeeldingen met een lege tijdelijke browser.
- De screenshots omvatten 393×852 pixels voor start, Mijn leven, /tell en /present en 1280×800 voor Mijn leven.
- Een vorige afbeelding liet ten onrechte **donkerblauwe tekst op de voorbeeldfoto** zien doordat de algemene h1-kleur de fototitel overschreef. Dit is visueel en in tests opgelost: fotokoppen weer **wit #FFFFFF**; gewone paginatitels blijven **inkt #304653**.
- De eerste korte /tell-screenshot toonde slechts de laadindicator. Met langere afzonderlijke browsercontrole verscheen het bestaande scherm **Add photos / Tell without photos**; dit was een te vroege screenshot, geen bewijs van een functionele blokkade.
- De automatische browser toont bij een leeg profiel standaard Engelstalige labels. Dat is geen taalkeuze van de iPhone-gebruiker en deze stijlronde past geen taal- of accountinstellingen aan.
- Headless screenshots zijn **geen bewijs voor iOS Safari touch, echte audio/video, swipe of gegevensherstel**. Die blijven afzonderlijke acceptatietests.
- Kleine vierkantjes op enkele screenshot-iconen kunnen ontstaan door niet beschikbare platform-glyphs in headless Linux; de werkelijke iPhone-iconen vereisen nog beoordeling voordat ze als defect of hersteld worden beschreven.

## Vervolgronde: donkere hero + schermgroep editor/datum
- **Eigendomskeuze in echte iPhone-vergelijking:** de producteigenaar verkiest de beeldvullende foto met donkere bovenzone boven de variant met witte mast/header.
- Daarom wordt in de losse staging uitsluitend het foto-gebaseerde beginscherm/Mijn leven met `data-talera-hero="true"` gemarkeerd: iOS theme-color en lege hero-achtergrond `#304653`, transparante mast, witte TALERA-tekst en fototitel. Andere gewone pagina's blijven wit `#FFFFFF`, inclusief formulieren.
- De oorspronkelijke drie-panelen-logo-asset blijft intact en verschijnt als klein herkenbaar beeldmerk naast de naam. Taalkeuze blijft op haar oorspronkelijke plaats.
- Het herkende lege home-beeld gebruikt een **egale** merkblauwe achtergrond, niet het oude decoratieve verloop.
- **Volgende schermgroep in dezelfde ronde:** bestaande native editor en datumvenster. Aangepast zijn alleen gerichte tekst-, knop-, label-, invoer- en dialoogkleuren; niet de editor-layout, vertelmodus, video, tijdcodes of media-acties.
- De officiële overdracht beschrijft **acht technische fasen (0–7)**, niet vier. Voor praktische schermcontrole volgen we vier logische schermgroepen: (1) Start/Mijn leven, (2) Herinnering maken en datum, (3) Delen/berichten/meldingen, (4) Meer/instellingen/ondersteuning. Deze indeling vervangt de oorspronkelijke technische fasen niet.
- Een anonieme headless /tell-screenshot toont soms uitsluitend `TALERA openen – Concepten controleren`. Dat is **geen** bevestigde productfout, maar de editor is hiermee evenmin end-to-end op iPhone getest.
- De bijgewerkte code staat op `style/talera-stille-luxe-v9-20261104`, is opnieuw gepubliceerd op hetzelfde stagingadres en behoudt V9-versie `683c6aaf-8dd0-42de-b6e4-f3bd80d7de06`.
- Deze wijziging is geen finale acceptatie voor alle vier schermgroepen; groepen 3 en 4 plus volledige iPhone-regressie blijven open.

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


## Gerichte presentatiecorrectie — witte iPhone-statusstrook (04-11-2026)

**Visueel oordeel:** op de iPhone-screenshot is de foto horizontaal en onderaan al randloos. Het witte vlak zit bovenaan ter hoogte van de iOS-statusbalk, niet als afgeronde fotokaart. Geen wijziging aan object-fit, fotokader, tijdlijn of bediening nodig.

**Gecontroleerde historische bron:** in de V56-presentatiewrapper stond `TALERA_PRESENTATIE_V15_HEAD` met `apple-mobile-web-app-status-bar-style=default`; de oudere PWA-manifestkleuren waren wit. Apple documenteert dat `default` de webinhoud ONDER de statusbalk begint en `black-translucent` de webinhoud onder de statusbalk laat doorlopen. Zie Apple "Supported Meta Tags" en "Configuring Web Applications".

**Reparatie uitsluitend in afzonderlijke stijlstaging**: voor GET `/present` en `/present/` worden in de HTML-`<head>` de drie metadata ingesteld op `apple-mobile-web-app-capable=yes`, `apple-mobile-web-app-status-bar-style=black-translucent`, `theme-color=#304653`. De oorspronkelijke `viewport-fit=cover` blijft. **Alle HTML na `</head>` blijft exact gelijk aan V9**; geen nieuwe CSS, geen JS, geen voorstelling van een andere mediaplayer. Andere PWA-schermen en het witte manifest blijven ongewijzigd.

**Toetsing:** automatische Node-regressietest met originele speler-body en scripts, dubbele tags en tweede rendering; live alleen-lezen vergelijking van de volledige body van `/present` tussen V9 en deze staging is opgenomen in `smoke-live.mjs`. 
**Controle na publicatie:** GitHub Actions [run 41897293077](https://github.com/Marksmits1972/talera-lifeline/actions/runs/41897293077) toont **13/13 Node-tests**, **8/8 echte HTTP-controles**, inclusief een byte-voor-byte vergelijking van alles na de `</head>` in `/present` tegen beschermde V9. De iPhone-statuszone kan alleen op een werkelijk iOS-standalone toestel beoordeeld worden. V9 is ongewijzigd.

**iPhone-standalone statusgedrag kan niet via Linux-screenshot bewezen worden** en moet op toestel worden nagekeken. Het OS kan de statusbalkconfiguratie bij starten/installeren vastleggen. De gebruiker mag daarom de bestaande geïnstalleerde PWA NIET verwijderen voor deze test: lokale Free-herinneringen kunnen anders verloren gaan.


## Extra herstel — witte strook onderaan iOS-presentatie (4 november 2026)
De producteigenaar bevestigde via een eigen iPhone-screenshot dat de eerdere `black-translucent`-statusbalk het fotobeeld bovenaan verlengde, maar dat daarna **onderaan circa één bovenste safe-area-hoogte** als wit vlak zichtbaar werd. De R20/V56-presentatiebasis bevat `.app{height:100dvh!important}`; de volledige `main`, `.memory-space` en `.photo-stage` zijn afhankelijk van de apphoogte. In iOS-standalone kan de translucente statusbalk de oorspronkelijke viewportberekening overhouden.

De afzonderlijke stijlstaging injecteert daarom alleen op `/present` en `/present/` in de HTML-`<head>` een compacte style-tag `talera-present-ios-edge-to-edge`. Binnen `@supports (-webkit-touch-callout:none)` én `@media(display-mode:standalone)` wordt de bestaande apphoogte gelijk aan `calc(100dvh + env(safe-area-inset-top,0px))`; de bodyachtergrond krijgt inktblauw `#304653` als fallback. Dit rekt de bestaande fotocontainer mee op **zonder zijn eigen foto-/swipe-/tijdcode-CSS te wijzigen**. Er zijn geen scripts, foto-data, opslagvelden, handelingen of bestaande Workers veranderd.

Regressietests controleren dat deze regel exact één keer binnen een presentatie-`<head>` verschijnt, andere routes onaangeroerd blijven en de hele HTML-body van de live V9-presentatie byte-voor-byte identiek blijft. **Nog open:** daadwerkelijke visuele iPhone-standalone controle op volledig beeld tot achter de onderste schermrand, ook bij het terugkeren vanuit een foto; automatische desktop/headless tests kunnen dat specifieke iOS-viewportgedrag niet reproduceren. De gebruiker hoeft de PWA niet te verwijderen.


## Correctie op eerdere misdiagnose — foto i.p.v. kleurvlak (04-11-2026)

De iPhone-screenshot na het vorige herstel bewijst dat er nog altijd een effen antracietkleurige strook onder de foto te zien was. De eerdere CSS probeerde het scherm te vergroten maar voegde **zelf** `html,body{background:#304653!important}` toe. Dit was niet conform de goedgekeurde presentatiemodus: beeld is de enige zichtbare achtergrond. Het werkelijke probleem in de beschermde V56/R20-presentatiecode is bovendien `.app{overflow:hidden!important}` terwijl de foto's binnen `.photo-stage` op 100% van die container zijn gepositioneerd. Het vorige vergroten van de fotolaag werd daarom door de appcontainer afgekapt, zodat onderaan juist het eigen kleurvlak zichtbaar werd.

**Uitgevoerde correctie in uitsluitend de losse stijlstaging:**
- In de iOS-standalone `/present`-`<head>`-stijl zijn de extra antracietkleurige `html/body`-achtergronden verwijderd.
- De afsluiting `overflow:hidden!important` op de presentatie-`.app` is lokaal vervangen door `overflow:visible!important`; `main` en `.memory-space` zijn eveneens niet-afkappend. Gewone appschermen, andere browsers en de originele Workers blijven onaangetast.
- De bestaande `.photo-stage` wordt vanaf `top:0` beeldvullend gerenderd met **96 CSS-pixels overscan** onderaan als veilige compensatie voor niet-nul/lege iOS safe-area-insets. Hierin zitten de reeds bestaande actieve foto-, backdrop- en fotostrip-elementen; geen wijziging van de tijdlijn, captions, bediening, fotoduplicatiecorrecties of vertelengine.
- Het volledige HTML-fragment na `</head>` is op live V9 en staging gelijk. CSS-regressietests controleren expliciet dat de extra presentatie-<style> geen `background` bevat en dat app en stage niet meer afknippen.
- **GitHub Actions:** 13/13 unit/regressietests, 8/8 live HTTP-controles, bronconfiguratie en anonieme screenshots zijn geslaagd in [run 41922520650](https://github.com/Marksmits1972/talera-lifeline/actions/runs/41922520650) (na staging-deployment). De Cloudflare Worker-versie is `415b1087-fa98-4c23-bfc3-e693f665ec18` en de beschermde V9-versie `683c6aaf-8dd0-42de-b6e4-f3bd80d7de06`.

**Nog NIET bevestigd:** of iOS standalone op het toestel daadwerkelijk tot de fysieke onderrand foto laat zien. Een GitHub Actions/Linux-browser kan de iOS-standalone safe-area-compositor niet volledig reproduceren. Bevestiging vereist één schermafbeelding uit dezelfde testversie op de eigen iPhone; daarom geen claim 'visueel definitief opgelost' totdat dat duidelijk is. Geen herinstallatie of wissen van browseropslag.


## Correctie WebKit iOS 26 — statusbalk en onderrand (4 november 2026)

De gebruiker leverde twee iPhone-screenshots van dezelfde staging met een identieke strook van ongeveer 60 CSS-pixels onder zowel de presentatie als het gewone begin-/tijdlijnscherm. Het gaat niet om een afwijkend CSS-fotoformaat: de **hele webviewport is circa één statusbalkhoogte korter dan het scherm**. De eerdere presentatie-specifieke CSS-hacks met `overflow:visible`, vergroting van `.photo-stage`, +96px overscan en antracietkleurige achtergrond veranderden die niet-beschilderbare ruimte alleen van kleur, zonder de foto daadwerkelijk naar de onderrand te kunnen laten lopen.

Er bestaat een **gedocumenteerde WebKit-fout**, waarvan de geometrie vrijwel exact overeenkomt met deze screenshots:
- https://bugs.webkit.org/show_bug.cgi?id=313800 — standalone PWA met `black-translucent`, viewport korter dan fysieke schermhoogte met top-inset-delta, buiten CSS bereik.
- https://bugs.webkit.org/show_bug.cgi?id=301994 — iOS 26(.x) reproduceert een ~62px niet-beschilderbare strook; probleem op 21 oktober 2026 nog open.
- https://bugs.webkit.org/show_bug.cgi?id=317153 — Apple meldt dat `black-translucent` voor Home Screen webapps verouderd is.

**Veilige correctie in nieuwe stijlstaging, niet in V9:**
1. De iOS `black-translucent`-meta-instelling wordt op `/present` vervangen door de oorspronkelijke stabiele waarde `default`; kleur van de statusbalk via `theme-color:#304653` gevraagd. De oorspronkelijke `viewport-fit=cover` blijft.
2. De hele extra `talera-present-ios-edge-to-edge`-CSS die `100dvh`, `overflow` en fotolagen manipuleerde is verwijderd; de oorspronkelijke V9 presentatiemodus, mediastructuur en body worden byte-voor-byte behouden.
3. Op gewone home/tijdlijn routes wordt eveneens expliciet `status-bar-style=default` gezet. De grote fotoheader blijft transparant over de foto; de algemene `html/body`-achtergrond wordt weer wit in plaats van antraciet. Dit voorkomt een tweede gekleurde onderrand bij lege pagina's.
4. **Afweging:** deze veilige browsermodus kan op bepaalde iOS-versies weer een statusbalk *boven* de foto laten zien; de transparante foto achter de klok en een volle onderrand zijn met de betreffende WebKit-fout mogelijk niet tegelijk te krijgen. Geen verdere CSS-overflowexperimenten totdat een toestelmeting het gedrag duidelijk bevestigt.
5. **Niet aanpassen, herinstalleren of verwijderen** van de geïnstalleerde PWA: browserorigin en lokale herinneringen blijven beschermd. Een harde app-herstart is wel nuttig omdat de PWA-statusbalk bij starten kan worden vastgelegd.

Dit is de technisch verantwoorde fallback naar een volledig bruikbare onderste schermrand, geen bewijs van een volledige foto onder de iOS-systeembalk aan beide kanten. De echte iPhone-beoordeling blijft een acceptatiepunt.


## Fotovullende bovenkant uit historische versie en adaptieve onderrand (05-11-2026)

**Door gebruiker gekozen uitgangspunt**: historische stijlstaging Cloudflare-versie `2e5252a4-10ac-4ace-880b-95891aecfe53`, uit 4 november 2026 om 20:27 Nederlandse tijd, broncommit `78b0a6e55b0b`. In deze versie stond de foto correct achter de iOS-statusbalk, maar onderaan was een aparte strook zichtbaar. We hebben de bewezen `black-translucent`-head-instelling uit dit commit **specifiek teruggebracht** in de bestaande, nieuwe stijlbranch. We hebben niet de complete historische Worker teruggezet, dus de inmiddels gerealiseerde overige stijlverbeteringen en beschermde V9-functionaliteit blijven behouden.

**Nieuwe aanvullende aanpassing, uitsluitend op `/present`**:
- De iOS-statusbalk wordt `black-translucent`, zodat het fotobeeld weer achter klok, signaal en batterij kan doorlopen.
- Een korte inline `<head>`-stijl gebruikt `--talera-present-edge-color` als kleur van het HTML/body-vlak buiten de foto. Een inline script neemt bij fotoverandering een klein gemiddelde van de **onderste zichtbare strook van de actieve foto** via een tijdelijk canvas (40×8 pixels) en past deze kleur toe op de achtergrondvariabele en `meta[name=theme-color]`. **Er wordt geen foto geüpload, geprojecteerd naar externe diensten of opgeslagen**.
- De actieve bronfoto komt uit de bestaande presentatie-`.photo-stage` met `.photo-layer`-foto's. De code observeert alleen foto-`src`/class/style en hun bestaande scrollpositie, verandert geen bestaande media-, swipe- of tijdcodecode.
- Bij een uitgeschoven tekst/leesweergave (`#memoryStoryScroll.scrollTop > 38` of de bestaande `talera-v14-reading` / `talera-v26-reading`-status) kiest de onderrand **wit `#FFFFFF`**. Bij sluiten schakelt hij terug naar de tint van de huidige foto.
- Op het reguliere beginscherm blijft de HTML/body-achtergrond **wit**, zonder de presentatie-specifieke synchronisatie.

**Beperkingen, eerlijk rapporteren**: JavaScript mag soms een extern geladen foto niet via canvas uitlezen (CORS). Dan gebruikt de presentatie een rustige vaste fallback `#304653`; dat is niet gegarandeerd de perfecte kleur van iedere foto. iOS kan het dynamisch aanpassen van zijn eigen onderste systeemstrook anders behandelen dan de HTML/body-achtergrond: alleen een echte iPhone-test kan aantonen of de systeemstrook bij elke foto en bij het openen van het leesvlak meeverkleurt. We claimen pas 'volledig opgelost' na die visuele test.

**Beschermde onderdelen**: Cloudflare V9-versie `683c6aaf-8dd0-42de-b6e4-f3bd80d7de06` ongewijzigd. De gehele `/present`-body van de werkende V9 wordt in de test byte-voor-byte vergeleken met de nieuwe staging. Geen wijziging aan vertelcyclus, foto/sound, swipes, datamodel, Free/Premium of andere Workers.

**Nieuw staged deployment**: `4c4520c2-50ac-4de0-8cd7-a702313bf7f3`, versie `120fa2cb-4ce9-4e58-99fe-aa2a97a2c2e7`, onder dezelfde bestaande testlink. Regressietest omvat een Node VM-fictieve fotosimulatie die van onderkleur `#60829e` naar **wit** en terug schakelt. Live HTTP-controles worden na publicatie opnieuw uitgevoerd via GitHub Actions [run 41988586149](https://github.com/Marksmits1972/talera-lifeline/actions/runs/41988586149).


## Vervolgronde 5 november 2026 — kleurreacties op iPhone testen

**Afgesproken doel**: op het gewone beginscherm, de bewerk-/importschermen en bij gewone invoer is de onderste ruimte wit. In de presentatie loopt de foto achter de statusbalk bovenaan door; onderaan vraagt TALERA de passende tint van de actieve foto aan iOS, en bij het omhooggeschoven witte tekstpaneel wit. Als de native onderste strook op de telefoon niet tijdig/reproduceerbaar kleurt, gebruiken we in de presentatie het merkinkt `#304653` als vaste fallback. De correcte witte normale schermen blijven dan behouden.

**Gekozen technische basis**: bestaande stijlorigin en de eerder bevestigde historische werkende fotoheader `black-translucent` van Cloudflare `2e5252a4-10ac-4ace-880b-95891aecfe53`. V9-versie `683c6aaf-8dd0-42de-b6e4-f3bd80d7de06` is ongewijzigd.

**Aangepast op 5 november 2026**:
- Een optionele diagnose bij de presentatieroute met `?taleraTintTest=1`. Standaard onzichtbaar; alleen via die URL toont TALERA klein: **gevraagde kleur**, reden (foto, wit paneel of fallback) en de tijd in milliseconden tot het verzoek vanuit de browsercode is verzonden. Dit is **niet** de werkelijk gemeten kleurreactietijd van iOS: alleen een echte visuele iPhone-observatie kan die vaststellen.
- Tijdens een fotoswipe wordt de **zichtbare strip** `.talera-photo-strip.is-visible` gevolgd; daaruit wordt de pagina gekozen die onder het midden van de fotocontainer valt. In de ruststand blijft de huidige basisfoto leidend. Hiermee sluiten we aan bij de originele V7-swipecorrectie in plaats van pagina's te koppelen of te dupliceren.
- De witte paneelstatus schakelt nu vanaf `scrollTop>18` en via de bestaande `talera-v14-reading`/`talera-v26-reading` classes, overeenkomstig de werkelijke leesstatus.
- De kleuren worden lokaal met canvas uit de zichtbare foto benaderd. Bij gebrek aan canvas-toegang wegens cross-origin (CORS) wordt `#304653` gevraagd. Er worden geen foto's gekopieerd, verstuurd, opgeslagen of via nieuwe API's verwerkt.
- Controle na deze aanpassingen: GitHub Actions [run 41991158526](https://github.com/Marksmits1972/talera-lifeline/actions/runs/41991158526), opnieuw gedraaid **na** Cloudflare-publicatie: 14/14 Node-regressietests en 8/8 live HTTP-smoketests, met anonieme desktop/mobile screenshots. Cloudflare-bron teruggelezen en exact met GitHub vergeleken, resultaat is gelijk. Nieuwe stagingversie `85021228-546e-45c2-b067-bc2bccbfbc6c` met deployment `a5f5436d-8500-48ff-a24d-0937f105cc79`, dezelfde bestaande URL.
- Geen aanpassing aan het R20-presentatiebody, foto's, swipes, tijdcodes, opnames, lokale data of Premium-werkstroom. V9/R20-herstelpunten staan ongewijzigd.

**Nog te valideren op een echt geïnstalleerde iPhone**: dat foto achter klok blijft doorlopen, gewone pagina's onderaan wit blijven, bij verschillende foto's de onderstrook daadwerkelijk volgt, en dat het lezen direct naar wit schakelt. **WebKit-bug 301994** meldt voor iOS 26.5.2 dat het onderste kleurgedeelte wordt gecached tot relaunch, ook als `theme-color` en body wijzigen: https://bugs.webkit.org/show_bug.cgi?id=301994. Dit experiment is bedoeld om te meten of en hoe het op deze specifieke iPhone reageert, niet om OS-controle te beloven. PWA nooit verwijderen voor deze test: herinneringen zijn lokaal in browserorigin opgeslagen.


## Correctie statusbalk bij app-opstarten — 5 november 2026

**Aanleiding**: in iPhone-screenshot 09:14 was de hele presentatie-foto zichtbaar TOT aan onder, maar de bovenste statusbalk toonde nog steeds een donkerblauw vlak. Dit was niet omdat een extra foto-overlay ontbrak: **onze eigen geïsoleerde stijl-Worker had een inconsistentie geïntroduceerd**. `/present` vroeg `black-translucent` voor foto achter de klok, maar de Home Screen launcher `/` en de overige hoofdroutes overschreven de webappstatus juist met `default`. iOS kan die opstartinstelling vasthouden terwijl je naar `/present` navigeert. De eerdere automatische onderrandkleur was dus geïmplementeerd zonder de bovenkant stabiel te houden. Dat was een implementatiefout.

**Gerichte fix**: in `updateHtml()` van dezelfde geïsoleerde Worker vraagt nu **iedere reguliere HTML-ingangsroute** hetzelfde `apple-mobile-web-app-status-bar-style=black-translucent` als `/present`. CSS voor reguliere schermen blijft wit, met de bestaande foto-header en transparante mast. Presentatie-vulcanvas, swipe/foto/audio/tekstbron en de tint-metingen zijn ongewijzigd. Tests kijken expliciet naar `/`, `/mijn-leven`, `/tell` en `/meer` en controleren dat er precies één consistente statusbar-metadatawaarde wordt gezet.

**Cloudflare apart stijltestdeployment**: `568a86a6-d070-47e7-8960-25d66bc1b20f`, Worker-versie `b617adc2-6296-4ebc-b261-9c62d15de402`. De oorspronkelijke V9 blijft `683c6aaf-8dd0-42de-b6e4-f3bd80d7de06`; alleen de `V9_BASE` servicebinding is aanwezig. Geen back-up- of data-aanpassingen.

**Niet beloven dat dit bestaande iPhone-installaties corrigeert**: er zijn bekende iOS/WebKit-beperkingen waarbij statusbalkmodus op installatie/startmoment wordt vastgezet. Code- en HTTP-tests bewijzen correcte HTML-output, **niet** de feitelijke iOS fullscreen-chrome. Herstarten zonder verwijderen is de veiligste test. De geïnstalleerde PWA **niet verwijderen**, want lokale herinneringen kunnen daarmee verloren gaan. Referentie: https://bugs.webkit.org/show_bug.cgi?id=316008 (relevantie install-time), https://bugs.webkit.org/show_bug.cgi?id=313800 (onpaintable bottom). Als iOS de oude instelling blijft gebruiken, eerst een niet-destructieve verificatievariant bedenken voor de echte telefoon in plaats van nieuwe fotoposities te hacken.


## Directe kleurwisseling bij begin uitklappen — 05-11-2026

**Aangescherpte gebruikersafspraak:** de kleur mag niet pas op een browser-animatieframe worden bepaald of na aflooptijd van iOS-overname worden gekozen; beide kleuren zijn reeds bij eerste HTML-paint geprogrammeerd. Foto staat bovenaan achter de statusbalk; alleen in de presentatie is de onderrand zwart bij ruststand, en warm papier bij de eerste omhoogbeweging van het verhaal.

**Geïmplementeerd in dezelfde geïsoleerde stijlstaging:**
- De server levert in de presentatiehead direct statische CSS voor **fotostand `#000000`** én voor **leesstand `rgb(var(--talera-present-paper-rgb))`**. De bestaande V9-`--story-neutral` van het uitklapscherm wordt **éénmaal bij het laden**, dus vóór de gebruiker het paneel aanraakt, gelezen en als gedeelde papier-RGB klaargezet (normaliter `247,244,239` = `#F7F4EF`).
- Bij het **eerste** `scrollTop > 0` wordt meteen `data-talera-present-reading="true"` op `html` gezet; vooraf aanwezige CSS schakelt daardoor direct de achtergrond van `html` en `body` om. Geen requestAnimationFrame, timer, afbeeldinganalyse of vertraging bij de overgang. De reeds bestaande V9-leesclassen fungeren als extra vangnet.
- In **dezelfde scroll-handler** wordt zonder wachtrij `meta[name=theme-color]` op exact diezelfde papierkleur gezet als verzoek aan iOS. Wanneer het paneel dichtgaat, schakelen beide direct terug op `#000000`.
- De gewone hoofd-, invoer-, import- en bewerkpagina's hebben een witte pagina-achtergrond. Alle iOS standalone ingangsmeta gebruiken dezelfde eerder op de telefoon bewezen `black-translucent`-statusstand zodat de foto in presentatie achter de klok doorloopt.
- Op `/present` wordt alleen head-CSS/JS geïnjecteerd. Het originele R20/V9-`<body>` blijft byte-voor-byte identiek; de vertelcyclus, tijdlijn en swipes blijven ongewijzigd.

**Validatie:** er is een regressietest die een `scrollTop=1` simuleert, direct het nieuwe HTML-attribuut en dezelfde kleur in `theme-color` toetst, en bewijst dat er nul requestAnimationFrame-calls zijn. De live smoke controleert de voorgeserveerde CSS en oorspronkelijke body. Deze test kan niet garanderen dat de door iOS gereserveerde onderste systeemstrook ook direct een nieuwe kleur krijgt; dat hangt af van iOS-caching en wordt op het toestel gecontroleerd. De webpagina zelf hoeft in ieder geval niet meer op een volgend animatieframe of fotoberekening te wachten.

**Test-Worker-versie:** `d630a9e4-e118-4f77-9217-ef17ec527af1`, deployment `459ea075-8cd1-44ab-a3b3-695d68b2eed0`; beschermde V9 blijft `683c6aaf-8dd0-42de-b6e4-f3bd80d7de06`. GitHub Actions validatierun: https://github.com/Marksmits1972/talera-lifeline/actions/runs/42000020592.


## 5 november 2026 — Vervolgproef: zwarte onderrand vasthouden tot tekstpaneel bijna ondoorzichtig is

**Observatie vanaf iPhone (6 opeenvolgende screenshots, 10:14):** de presentatiefoto stond goed achter de klok; zwarte onderrand is visueel aantrekkelijk. Bij het begin van een leesbeweging werd onderaan echter meteen de lichtgekleurde balk zichtbaar terwijl het verhaalpaneel nog grotendeels transparant over de foto lag. Pas na verder doorscrollen werd het paneel een egaal papierkleurig vlak.

**Oorzaak bevestigd in de originele V56/V28 presentatiecode:** V28 berekent zijn papierlaag met een `smoothstep(scrollTop / 155px)`; onze stijlstaging schakelde de onderrand al bij `scrollTop > 0` om. Bovendien hadden we `html:has(.talera-v26-reading/.talera-v14-reading/.is-reading)` selectors die de onderrand nog vóór de echte paneelverkleuring naar papier forceerden.

**Alleen de bestaande stijlinjectie van het tekstpaneel en onderrand gewijzigd (geen R20/V9-bodywijziging):**
- De V28-papierdekking loopt nu van 0% naar 100% gedurende **100 CSS-pixels** schuiven (in plaats van 155). De originele V28-achtergrond en fotocompositie worden niet herschreven; we overschrijven slechts de drie CSS-variabelen `--talera-v28-paper-alpha`, `--talera-v28-title-color` en `--talera-v28-shadow` uitsluitend op `#memoryCaption`. Tekstcontrast volgt de kortere dekking.
- De zwarte onderrand `#000000` blijft tot **scrollTop = 90 CSS-pixels** intact. Bij dit omslagpunt is de versnelde papierlaag ongeveer 97,2% ondoorzichtig; dan wisselt de onderrand in één keer naar **de bestaande papierkleur uit `--story-neutral`** (normaliter `#F7F4EF`).
- Vroege `:has()` selectors voor de native leesclassen zijn weggehaald; ze zouden deze gewenste latere omschakeling anders tenietdoen. Bij terugswipen naar foto wordt onder de 90px weer zwart gevraagd.
- Dit is een **bewegingsafstand**, geen `setTimeout` of extra tijdvertraging. De reeds aanwezige synchrone scroll handler blijft de kleurcode aan iOS doorgeven.
- Alle wijzigingen staan in `PRESENTATION_BOTTOM_TINT_JS` en `PRESENTATION_BOTTOM_TINT_CSS` in de geïsoleerde styling Worker. **De beschermde `/present` HTML-body, foto's, filmstrip, swipes, narratie, tijdlijn, audio, Free/Premium en andere schermen zijn niet veranderd.**
- Gedekte regressie: bij scrolltop 1/18/56/89 is de kleurcode nog zwart; bij 90 is de papieralpha >97% en verandert het codeverzoek naar de werkelijke papierkleur; bij 100 is de papieralpha volledig; bij terug naar 0 komt zwart terug. GitHub [CI run 42001723783](https://github.com/Marksmits1972/talera-lifeline/actions/runs/42001723783), opnieuw uitgevoerd na aparte testdeployment.
- Cloudflare geïsoleerde stijltestversie `ab1434cc-bb48-4fdd-823f-524af90e12fb`, deployment `bdf279ea-4e68-402a-950f-0f4b968454df`, bestaande staging URL ongewijzigd. De beschermde V9 blijft versie `683c6aaf-8dd0-42de-b6e4-f3bd80d7de06`.

**Nog echte iPhone-acceptatietest nodig**: de eigen PWA-onderrand kan door iOS worden gecached. Een goede code- en live-test bewijst niet dat het OS exact op de gevraagde pixel omschakelt. Als de overgang nog net verkeerd valt, pas alleen beide drempelwaarden (100px/90px) aan, niet de rest van de presentatiemodus.


## 5 november 2026 — Nauwkeuriger afstemmen op vijf opeenvolgende iPhone-beelden

**Gebruikersbeoordeling**: de vorige versie met zwarte rand en versnelde papierkleur is een sterke visuele verbetering. Vijf opeenvolgende iPhone-screenshots van 10:31–10:32 tonen nog twee verbeterpunten: de tekstopmaak wordt midden in de beweging al grijs op een foto die nog zichtbaar doorschijnt; in een bijna papierkleurige stand blijft onderaan nog een zwarte strook die pas op een volgende positie omslaat.

**Zeer gerichte bijstelling, alleen de reeds bestaande `PRESENTATION_BOTTOM_TINT_JS` in de geïsoleerde stijlstaging (geen CSS- of V9-bodywijziging):**
- V28-variabelen die alleen `#memoryCaption` aansturen gaan van 100 CSS-pixels naar **90 CSS-pixels** om sneller visueel papierkleurig te zijn. Oorspronkelijke V28 in de beschermde V9 blijft 155px.
- De omschakeling zwart → oorspronkelijke papierkleur van het onderste iPhone-gebied wordt van `scrollTop=90` naar **`scrollTop=75`** verschoven, op circa **92,6% papierdekking**.
- De titel krijgt zijn donkerblauwe inktkleur later, door de bestaande titelcontrastfactor `(alpha-.26)/.52` te vervangen met `(alpha-.46)/.44`. Zo blijft de kop langer licht boven de herkenbare foto, met donkerblauw pas als het paneel al duidelijk licht is.
- Geen wijziging in foto-overlay, player, tijdlijn, swipe, audioregeling, tekst, andere schermen, home-statusbalk, opgeklapte eindstand of de zwart/papier-eindkleuren. De benodigde papierkleur blijft afkomstig van het V9 `--story-neutral` token.
- Extra regressietests controleren zwarte onderrand tot 74px, witte/papierkleur vanaf 75px, donkere titel pas op lichter papier en volle dekking bij 90px; de originele presentatieroute-body wordt byte-voor-byte tegen V9 gecontroleerd.
- De nieuwe staging heeft Cloudflare versie `8cffa110-f5d8-484e-9e20-308cd423bc50`, deployment `e3f1009d-726e-40d7-8711-9817d71e39c7`, dezelfde staginglink. Beschermde V9 versie `683c6aaf-8dd0-42de-b6e4-f3bd80d7de06` bleef gelijk. Nieuwe GitHub-controle: https://github.com/Marksmits1972/talera-lifeline/actions/runs/42004049810 (opnieuw uitgevoerd na staging).
- **Acceptatie op iPhone blijft doorslaggevend**: iOS kan de kleurwisseling van zijn eigen onderrand vertragen of anders timen dan de webcode. Beoordeel vooral de tussenfase met gedeeltelijk zichtbaar tekstpaneel; gebruik waar mogelijk dezelfde herinnering en dezelfde beweging als op de vijf screenshots.


## 05-11-2026 — Zevental screenshots: iOS neemt papierkleur wel over, maar te laat

**Visuele bevinding uit 7 aangeleverde iPhone-screenshots (10:53–10:54)**:
- Bij de eerste zes screenshots staat onderaan een **zwarte** horizontale native PWA-strook terwijl het lees-/tekstpaneel al steeds lichter wordt. Op het zevende screenshot is de strook eindelijk dezelfde warme papierkleur geworden.
- Daarmee is bevestigd dat de WebKit-kleurwisseling op deze iPhone **kan** volgen, maar vaak later dan de CSS-overgang van TALERA. Het is geen permanent ontbrekende functie en geen reden om de fullscreen-foto of oorspronkelijke presentatie te wijzigen.
- De blauwe selectiemarkeringen en de knop "Kopieer / Zoek op" op sommige screenshots zijn een gewone iOS tekstselectie tijdens aanrakingen; deze screenshots waren **geen** autorisatie om tekstselectie, swipebediening of editgedrag aan te passen.

**Minimale nieuwe afstelling, alleen de inline `PRESENTATION_BOTTOM_TINT_JS` in de afzonderlijke stijl-Worker**:
- Papierdekking van `#memoryCaption`: kortere `smoothstep` van 90 naar **78 CSS-pixels** (originele beschermde V28 blijft 155 pixels).
- Verzoek van de native onderrand `#000000` naar de uit het bestaande scherm gelezen papierkleur (`--story-neutral`): bij `scrollTop >= 60px` in plaats van 75px. Op dat punt is de zichtbare papierlaag al **86,48%** ondoorzichtig, en iOS krijgt eerder tijd om de request te verwerken.
- Titeldonkering op een lichter paneel: kleurprogressie van `(alpha-.46)/.44` naar `(alpha-.62)/.32`; de titel blijft daardoor langer wit over de foto en wordt pas snel donker als de leesachtergrond duidelijk lichter is.
- De bestaande CSS-selectors, layout, fotoheaders, zwarte eindkleur zonder paneel en papier-eindkleur bij geopend paneel zijn **niet** veranderd. Alleen de bestaande drie numerieke afstemmingen + commentaar zijn gewijzigd, zonder aparte nieuwe timers.
- De buitenste iOS-balk blijft platformgestuurd; de daadwerkelijke OS-reactietijd kunnen onze unit- of live HTTP-tests niet meten. Screenshotreeks met langzaam omhoog schuiven is het criterium.

**Technische controle en herstelpunt**: separate Worker `talera-v9-stille-luxe-stijlstaging-20261104`, versie `61c69ff7-895b-4c8a-9ef6-18747626936c`, deployment `e353ae16-ecfa-4b80-bec4-90f8b19e45fb`, GitHub stylebranch `style/talera-stille-luxe-v9-20261104` en CI [run 42006772375](https://github.com/Marksmits1972/talera-lifeline/actions/runs/42006772375). Originele V9 blijft `683c6aaf-8dd0-42de-b6e4-f3bd80d7de06`. Staging is bytegewijs tegen exact de nieuwe GitHub-workerbron gecontroleerd voordat Cloudflare deze versie aannam.


## 05-11-2026 — Definitieve proef gelijkmatige uitfasering van het leesvlak

**Gebruikersobservatie (5 screenshots, 11:01–11:02)**: de dekking van het omhooggetrokken leesvlak lijkt eerst weinig toe te nemen en daarna in weinig scrollpixels ineens grotendeels wit te worden; halverwege oogt de titel onscherp/grijzig door combinatie van een gemengde tekstkleur met nog aanwezige tekstschaduw.

**Alleen geïsoleerde stijl-injectie aangepast**:
- Behoud `SHEET_FADE_PX=78` en `FOOTER_PAPER_AT_PX=60`, want fotovullende statusbalk, zwarte onderrand en de kleurwisseling werken verder zoals bedoeld.
- Het V28-leesvlak gebruikt een CSS-variabele `--talera-v28-paper-alpha` die vanaf `scrollTop=0` tot `scrollTop=78px` **lineair** van 0 naar 1 loopt: `alpha=min(1,scrollTop/78)`. Voorheen gebruikte dit vlak `p*p*(3-2*p)` en nam de dekking aan het begin en einde traag toe, met snelle omslag in het midden.
- Titelleesbaarheid: `--talera-v28-shadow` wordt al vanaf 33% scrollprogressie afgebouwd en is uiterlijk bij 58% volledig verdwenen; pas vanaf 55% wordt de titel van helder wit richting originele inkt `rgb(15,39,71)` bij 78% scrollprogressie gebracht. Daardoor is er nauwelijks overlap tussen halfdonkere titel en vervagende 6px-tekstschaduw.
- De exacte papier-eindkleur blijft afkomstig van het originele V9-token `--story-neutral` (`#F7F4EF` bij standaardweergave); het OS-verzoek voor die kleur blijft op 60px. De eigen iOS-strook kan daardoor iets later zichtbaar meeschakelen dan het webpaneel.
- Enkel de functie `syncSheetAppearance()` in `PRESENTATION_BOTTOM_TINT_JS` is gewijzigd, geen extra CSS-selector, geen timers, geen wijzigingen aan de foto, titelinhoud, swipes, audio, timeline, presentatiebody of overige schermen.
- Nieuw model/regressietest volgt de paper-alpha op **0, 19,5, 39, 58,5 en 78 pixels** met verwachte waarden **0%, 25%, 50%, 75%, 100%**, en controleert dat de vervagende tekstschaduw weg is voordat de titel donkerder wordt.
- GitHub Actions CI: https://github.com/Marksmits1972/talera-lifeline/actions/runs/42007963138. Staging-Worker-versie `bc36d913-49f8-4f4d-b00d-3d5894a11146`, deployment `a613561d-e799-47ff-a032-5ee9e9a5bda6`. Oorspronkelijke V9 Worker-versie `683c6aaf-8dd0-42de-b6e4-f3bd80d7de06` bleef beschermd en onveranderd.

**Acceptatie op echte iPhone**: controleer een normale vloeiende beweging van foto naar papier zonder plotselinge witte omslag en zonder grijs/wazig titelinterval. Na bevestiging dit onderdeel als gekozen versie bevriezen en geen verdere detailtuning.
