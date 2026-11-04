# TALERA — Stille luxe | Audit en oplevercontrole (04-11-2026)

## Status
**Afzonderlijke stijlstaging gebouwd en in Cloudflare gepubliceerd. Nog NIET definitief geaccepteerd door de producteigenaar.** Alleen de GitHub-stijlbranch en een NIEUWE Worker zijn gewijzigd. Alle bestaande V9, V8, V7, V6, V5, R20, V61, V56 en Free→Premium-bronnen/Workers bleven ongemoeid.

**Testlink:** https://talera-v9-stille-luxe-stijlstaging-20261104.mark-a39.workers.dev/

**Nieuwe Worker:** `talera-v9-stille-luxe-stijlstaging-20261104`  
**Actuele Worker-versie:** `61723384-5f9e-4a34-9824-b27453c881ac`  
**Deployment:** `e1756385-133b-4cbb-a944-11f638888a55`  
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
