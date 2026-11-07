# TALERA — QA-verslag diepblauwe stijl, 7 november 2026

## Status
**Staging-kandidaat, geen vervanging van huidige voorkeurs-PWA.**
Gebruiker gaf opdracht om de stijl verder uit te werken terwijl alle boven- en onderbalken ongewijzigd blijven.

- Huidige geregistreerde voorkeur: https://talera-closed-memory-core-test-20261106.mark-a39.workers.dev/mijn-leven
- Alleen-test-staging: https://talera-closed-memory-diepblauw-test-20261107.mark-a39.workers.dev/mijn-leven
- Staging-bron: GitHub branch `feature/deepblue-style-bars-locked-20261107`
- Source worker (in code identiek aan de originele 6 nov functionele basis): `talera-closed-memory-diepblauw-test-20261107`
- Afzonderlijke styleservice: `talera-style-diepblauw-20261107` -> onveranderde `V9_BASE`-keten

## Nieuwe merkkleuren
- Donkerblauw: `#071A3D`
- Middenblauw: `#23497E`
- Lichter blauw: `#5579A9`
- Wit: `#FFFFFF`
- Warm ivoor: `#F7F5F0`
- Limegroen: `#B8D943`, maximaal 1% op het scherm

## Laatste bouwronde
GitHub broncommit: `0f7676b138e634052c9a2e04133a7cd0bc362b97`.
Alleen `BRAND_CSS` is gewijzigd, binnen de reeds bestaande centrale styleservice. Toegevoegd: 28 inhoud-gebonden kleurenregels voor `#sheetBody` (niet de fullscreen presentatietijdlijn) en `#app #main .work` (alleen editorlabels en velden).
Geen CSS voor de vaste boven- of onderbalken, statusbar, presentatie of fullscreen mediacontainers toegevoegd.
Origineel TALERA-logo is eerder al in dezelfde staging geherkleurd, met dezelfde geometrie en witte route.

## Uitgevoerde browsercontroles
Cloudflare Browser Rendering, ieder scenario tegen de oorspronkelijke voorkeursversie vergeleken.

### Vaste balken / layout
- 390x844: `/mijn-leven` mast/navigatie/sheet-handle gelijk; `/tell` header gelijk; `/present?talera_menu=hub` menuheader/presentatie-appbar/social bar gelijk.
- 360x780: dezelfde 3 routes en hun beschermde selectors gelijk.
- 430x932: dezelfde 3 routes en hun beschermde selectors gelijk.
- Computed-style-eigenschappen: `color`, `background`, `display`, `position`, `opacity` en geometrie (x/y/width/height).
- De originele beeldschermafspraken (statusbalk, transparent photo background, zwarte/witte presentatierand) zijn niet gewijzigd in code. De volledige echte iOS-weergave blijft nog een afzonderlijke handmatige controle.

### Browser-JS gelijkheid
Bij vergelijking van alle browser-uitgeleverde `<script>`-inhouden (na normalisatie van de eigen hostnaam):
- `/mijn-leven`: 17 identieke scripts
- `/tell`: 9 identieke scripts
- `/present`: 29 identieke scripts
- `/present?talera_menu=hub`: 29 identieke scripts

Totaal **84 identieke scriptinhouden**. De inhoudelijke kleurwijziging heeft dus geen JS-functionality herschreven.

### Menuflow en behoud bediening
- `Mijn TALERA -> Instellingen`: click werkt, menu toont `data-view=settings`.
- `Mijn TALERA -> Mijn account`: click werkt, menu toont `data-view=account`.
- `/tell`: foto-/videoselectie nog aanwezig, `accept=image/*,video/*`, meerdere bestanden mogelijk, knop voor vertellen zonder foto's aanwezig.
- `/mijn-leven`: jaar-schuifregelaar, hoofdnav, Meer-link en Herinnering maken-actie aanwezig.
- Alleen niet-destructieve DOM-/browser-interacties zijn uitgevoerd; géén persoonlijk account of backend-opslag bewerkt.

### HTML vergelijkingen
- `/present?talera_menu=hub`, `/meldingen` en `/gedeeld`: gelijke nonstyle HTML na alleen normaliseren van hostname, aparte styles en demo-afbeeldings-URL.
- `/mijn-leven` en `/tell`: expliciet versioned icon-hrefs verschillen zoals bedoeld.
- Bij `/present` kunnen doorlooptijd/animatie-status en geselecteerde demoherinneringen verschillen tussen afzonderlijke browsersessies, zonder codeverschil. Alle 29 scripts zijn identiek.

## Nog openstaande controles
- Werkelijke geïnstalleerde iPhone-PWA, inclusief donkere en lichte OS-statusbalken, transparante fotoheader en witte/zwarte presentatierand.
- Complete opnamecyclus: foto-/video-ID tijdstempels, pauzeren, doorgaan, gelijktijdige media, nabewerking, resterende foto's en herafspelen.
- Video-upload met echte video en controle van de inline afspeelcyclus.
- Echte data en verbindingen: deelacties, Free/Premium, back-up en account (niet destructief testen).
- Oplevering van eventuele resterende losse contentvensters aan de hand van gebruikersfeedback.

**Geen productiepromotie, geen herinstallatie PWA en geen wijziging aan originele voorkeurslink.**

## Correctie 7 november — Accountkaart toont nu het officiële logo
- Gebruikersscreenshot `IMG_4425.jpeg`: in Mijn TALERA stond nog een witte letter T op een donkerblauw avatarvlak. De bedoeling was het **bestaande originele TALERA-logo** op diezelfde plaats te gebruiken.
- Oplossing uitsluitend in `TALERA_MORE_CONTENT_ONLY_CSS`: de bestaande `#talera-more-menu .body .avatar` van een tekstuele T op kleurvlak omgezet naar een afbeelding van `/talera-brand-voorstel-d-icon-180.png`, versiegebonden en gekleurd in #071A3D, #23497E, #5579A9; witte route en originele geometrie behouden.
- De avatar blijft exact 52 × 52 CSS-pixels en heeft dezelfde positie in de accountkaart. Tekst-T visueel verborgen door `font-size:0` en `color:transparent`. Accountknopfunctie ongewijzigd. Alleen de afbeelding is vergroot naar 125% van de bestaande resourcegrootte binnen dezelfde vierkante avatar, met een zeer lichte interne rand, zonder kaart- of layoutwijziging.
- GitHub codecommit `15a898fca187a73a87276ae5210bc2ba9e589fe1` (voorafgaande vervangingscommit `d661e3fde2ce2efe9fed1616ea5e5aa691e407f6`). Alleen geïsoleerde branch/staging bijgewerkt. Cloudflare `talera-style-diepblauw-20261107` gewijzigd op 2026-11-07T08:29:12Z.
- Cloudflare Browser Rendering: logo zichtbaar in Mijn TALERA-menu op mobiele breedte 390×844. Computed-style A/B test met de goedgekeurde voorkeursversie: `#talera-more-menu header`, `.headbutton`, `.panel`, `#talera-v15-appbar` en `#talera-v12-reactions-bar` zijn identiek; accountkaart is op dezelfde positie en 354×82 px. De avatar is nog steeds 52×52 px op dezelfde positie, uitsluitend de achtergrondafbeelding en bijbehorende tekstpresentatie zijn gewijzigd.
- Alle boven- en onderbalken inclusief statusbalk, transparante fotobovenkant en zwarte/witte presentatieranden blijven beschermd. Opname-, video-, presentatie- en opslagcode niet gewijzigd.
- De kandidaat-URL blijft `https://talera-closed-memory-diepblauw-test-20261107.mark-a39.workers.dev/mijn-leven`. De werkende voorkeursversie van 6 november blijft intact. Echte iPhone- en volledige opname-/video-regressietests blijven open.

## Ronde 4 — Privacy, abonnement en aanmeldformulier (7 november 2026)

- Voortgebouwd op exact dezelfde beschermde GitHub-branch en geïsoleerde stijl-Worker; geen nieuwe Worker of wijziging aan de officiële huidige voorkeurs-URL.
- Broncommit `a4a0f6647c531f86adf4e10cf3bbbc9fb19d7758`: negen uitsluitend aan `#talera-more-menu .body` gebonden CSS-regels voor de titels en toelichtingen in informatiekaarten, ingevulde formuliervelden, placeholder/focus-kleuren en de wachtwoord-zichtbaarheidsknop. Kleuren `#071A3D` en `#23497E`; bestaande layout en functionele knoppen intact.
- A/B-test Cloudflare Browser Rendering op `/present?talera_menu=hub`: `privacy` en `login` tonen de nieuwe tekstkleur, zonder positie-, maat- of displaywijzigingen. Bij het wachtwoord-oogje is de bedieningszone 48 × 44 CSS-pixels gebleven.
- Responsieve beschermingscontrole geslaagd: Privacy op 360 × 780, Abonnement op 430 × 932, Aanmelden op 390 × 844. Vergelijking op vaste menuheader, terug-/sluitknoppen, paneel, presentatie-appbar en sociale actiebalk: geen berekende stijl- of geometrieverschillen.
- JavaScript-bronvergelijking na deze wijziging: `/mijn-leven` 17, `/tell` 9, `/present` 29, `/present?talera_menu=hub` 29. Alle 84 scripts gelijk aan de geregistreerde voorkeursversie na normalisatie van de hostname. Er is geen extra logica toegevoegd voor presentatie, video, opname, delen, opslag, accounts of betalingen.
- De menuavatar gebruikt het **echte originele TALERA-logo** in diepblauw; de T blijft als verborgen tekst in de bestaande DOM-markup aanwezig (geometrie en bronscripts zijn niet aangepast). Een eventuele toegankelijkheidsverbetering van de semantiek vereist afzonderlijk afgewogen markupwijziging; niet in deze CSS-only stijlronden.
- Echte iPhone-acceptatie, lokaal geïnstalleerde PWA, opnamecyclus, video-upload/playback, rechten en herstel blijven te controleren. Niet claimen dat deze functies volledig zijn getest.

**Status: Styling afgerond voor de onderzochte inhoudsschermen op staging; officiële voorkeurs-PWA ongewijzigd.**

## Laatste opschoon- en controleronde — 7 november 2026

**Status: technische stijlcontrole van de onderzochte schermen geslaagd; kandidaat voor iPhone-eindacceptatie. Nog geen productiepromotie.**

### Laatste gerichte kleurcorrecties
- De helptekst bij voorbeeldcategorieën onder Mijn leven had nog het oude grijsblauw `rgb(88,112,131)`; deze heeft nu `#23497E` via één `#sheetBody .talera-topics-note`-regel. GitHub commit `38739189fd74dd43a925f486958e22b70c33ba1e`.
- De demonstratie-toelichting binnen `#sheetBody .main-only>p.hint` gebruikte nog `rgb(113,141,154)`; ook deze gebruikt nu `#23497E`. GitHub commit `1a063388e8750616681f2299c24835b4493e1c2a`.
- Beide wijzigingen betroffen uitsluitend `BRAND_CSS` in de bestaande aparte teststijl-Worker `talera-style-diepblauw-20261107`; géén JS, routing, opslag, gebruikersdata of nieuwe Worker.
- Foto-overlays met witte tekst zijn bewust wit gebleven.

### Eindcontrole visuele stijl
- In de browserzichtbare inhoudelijke eindteksten op `/mijn-leven`, `/tell` en `/present?talera_menu=hub` zijn de oude vier expliciet geteste grijsblauwe kleurwaarden niet meer aangetroffen.
- A/B-berekeningen op 360×780, 390×844 en 430×932: beschermde boven- en onderbalken op `/mijn-leven`, `/tell` en Mijn TALERA-menu blijven qua onderzochte afmetingen, positie, achtergronden en zichtbaarheid identiek.
- De presentatie zelf is ook in twee standen expliciet gecontroleerd: foto op volledig scherm (`#memoryStoryScroll.scrollTop=0`, `data-talera-present-reading=false`) en leestekst open (`scrollTop=260`, `data-talera-present-reading=true`). Voor `#memoryCaption`, `#memoryStory`, `#memoryStoryMore`, sociale actiebalk, appbar en tijdlijn zijn geen berekende stijlafwijkingen gevonden. De statusbalk- en `theme-color`-metadata zijn in beide standen identiek.
- Het originele TALERA-logo staat in de menu-accountkaart op de plaats van de vorige letter T; de oorspronkelijke geometrie en witte route blijven intact. De accountkaart en de avatargeometrie bleven gelijk.

### Niet-functionele codecontrole
Op 7 november opnieuw de in de browser ontvangen scripts vergeleken met de goedgekeurde basis van 6 november, na normalisatie van de verschillende hostnamen:
- `/mijn-leven`: 17/17 identiek.
- `/tell`: 9/9 identiek.
- `/present`: 29/29 identiek.
- `/present?talera_menu=hub`: 29/29 identiek.

In totaal zijn 84 scriptinhouden gelijk gebleven. Dit bewijst codepariteit op deze routes, maar géén volledige iPhone-regressietest.

### Besluit en resterende acceptatie
- **Nieuwe kandidaat:** https://talera-closed-memory-diepblauw-test-20261107.mark-a39.workers.dev/mijn-leven
- **Huidige officiële voorkeur:** https://talera-closed-memory-core-test-20261106.mark-a39.workers.dev/mijn-leven
- De huidige voorkeur en de oorspronkelijke gedeelde stijl-Worker zijn niet aangepast. Er is geen productiepromotie uitgevoerd.
- Openstaand: handmatige test op een echte iPhone met eigen tijdelijk/testherinnering, foto + video uploaden, één opname met wisselende beelden, pauzeren, beëindigen, afspelen, audiovideo-synchronisatie, werkende inline-video en herhaald weergeven. Verder delen, back-ups en account/Free/Premium waar relevant, zonder destructieve tests.
- Staging draait op een andere origin: bestaande lokale IndexedDB/LocalStorage-herinneringen worden niet automatisch overgenomen. De hoofd-PWA niet verwijderen of herinstalleren wegens risico op verlies van lokale data.
- Pas na expliciete gebruikersgoedkeuring de nieuwe link tot officiële voorkeur promoveren.

## Tijdlijnintensiteit Mijn leven — 7 november 2026

**Status: beperkte stagingwijziging gebouwd en automatisch gecontroleerd; niet als officiële versie gepromoveerd.**

### Gebruikersbesluit
De verticale markeringen in de horizontale jaarbalk op `Mijn leven` moeten de hoeveelheid **eigen** herinneringen per jaar tonen. Lege jaren krijgen fijne streepjes, rijke jaren steviger blokjes. Geen jaartallen op ieder afzonderlijk blokje. De bestaande jaarselectie, voorbeeldverhalen, navigatie en alle media blijven intact. Verander niets waar onzekerheid bestaat.

### Technische uitvoering
- GitHub codecommit: `21a7080d77c04513dddb22a4e3c81bbb042cf80e`.
- Bestaande geïsoleerde stijl-Worker: `talera-style-diepblauw-20261107`. De huidige productie-/voorkeurs-Worker en shared originele stijl-Worker zijn niet gewijzigd.
- In plaats van een tweede tijdlijn of extra JavaScript-laag wordt in uitsluitend de HTML-route `/mijn-leven` de bestaande functie `drawMarks()` binnen `<script id="talera-flow-v17-time">` exact en fail-closed vervangen. Als de originele marker niet meer overeenkomt, wordt niets herschreven.
- Alle andere functies binnen `talera-flow-v17-time`, inclusief jaarverschuiving, voorbeeldherinneringen, jaaroverzicht, sliderbeweging en preview, blijven ongewijzigd.
- Eigen herinneringen komen uit het reeds bestaande `window.TaleraMemories.list()`; referentieherinneringen (`demo: true`) worden alleen van de **intensiteitsberekening** uitgesloten en blijven verder in de app beschikbaar.
- Weergave: 0 eigen = 1px/7px neutrale haarlijn; 1 = 2px/10px lichtblauw; 2–3 = 3px/12px lichtblauw; 4–7 = 4px/14px middenblauw; 8+ = 5px/16px donkerblauw.
- Eén markering per kalenderjaar waar er ruimte is. Voor zeer lange periodes worden meerdere jaren tot één visueel tijdvak gebundeld op basis van de beschikbare breedte (niet op basis van voorbeeldverhalen). De slider blijft op één jaar per stap werken.
- CSS is uitsluitend aan `#sheetBody #v17-timebox .v17-mark.talera-density-*` gekoppeld. Er zijn geen regels toegevoegd voor de fullscreen presentatietijdlijn, PWA-bovenbalken, onderbalken, opname, video of bewaarfuncties.

### Resultaten van automatische controle
- Browser Rendering 390×844 op `/mijn-leven`: zonder eigen herinneringen, 42 fijne neutrale jaarmarkeringen, één per jaar van 1985 t/m 2026. De eerdere versie gaf voor alle 42 jaren een identieke dikke 'has-memory'-markering, mede doordat er 500 demoherinneringen werden meegeteld.
- Test met **tijdelijke in-memory fixtures**, zonder lokale gegevens te bewaren: 1 eigen herinnering (1987) krijgt dichtheid 1; 3 (1992) dichtheid 2; 9 (2004) dichtheid 4. De verwerking gebruikt de eigen herinneringen, niet de demos.
- Een pure test van 1900–2026 op een 314px-tijdlijn leverde 43 samengevoegde markeringen op, zonder de jaarselectie te veranderen. Dit lange bereik is nog niet met echte herinneringen op een iPhone getest.
- Browserjaarselectie: 1985 naar 1995 via bestaand slider-`input`-event werkt, bijbehorende jaarlabel werd 1995; jaarpreview en 'Bewaar een nieuw moment'-actie blijven aanwezig.
- Browser-JS-diff met voorkeursversie: `/mijn-leven` heeft precies **één** aangepast script: `talera-flow-v17-time` (het bedoelde onderdeel). `/tell` 9/9 scripts identiek; `/present` 29/29 identiek; `/present?talera_menu=hub` 29/29 identiek. De overige 16 homeschermscripts zijn ook identiek.
- A/B stijl op 360×780, 390×844 en 430×932: `.mast`, `.flow-nav`, `.sheet-handle`, `#talera-v15-appbar`, `#talera-v12-reactions-bar`, `#memoryStoryScroll`, `#memoryCaption` ongewijzigd qua berekende waarden. De kaart `#v17-timebox` houdt exact dezelfde positie, breedte en hoogte (142px); haar achtergrondkleur/tekst verschilt door de reeds eerder ingevoerde diepblauwe stijl, niet door een nieuwe balkwijziging.

### Niet gewijzigd / nog niet bevestigd
- Niets aan vertelmodus, fotowissels, audio, video, presentatie, WhatsApp, deelpaneel, opgetrokken witte verhaaltekst, boven-/onderbalken, accounts, Free/Premium, API, opslag of gebruikersdata gewijzigd.
- Openstaand: praktijkcontrole met echte eigen herinneringen op de iPhone; bijzondere gevallen zoals lokale jaren vóór 1985, veel verhalen in één jaar en weergave bij toestelrotatie.
- **Nog geen nieuwe officiële voorkeur**: huidige goedgekeurde link blijft `https://talera-closed-memory-core-test-20261106.mark-a39.workers.dev/mijn-leven`. Testkandidaat: `https://talera-closed-memory-diepblauw-test-20261107.mark-a39.workers.dev/mijn-leven`. Verwijder of herinstalleer de PWA niet vanwege lokale gegevens.

## Verwijderde horizontale verbindingslijn — 7 november 2026

Gebruikersverduidelijking: geen doorlopende horizontale lijn op de tijdlijnkaart `Mijn leven → Door de tijd`; uitsluitend losse fijne jaarstreepjes en de aan de hoeveelheid eigen verhalen gekoppelde intensiteitsblokken. De bestaande selecteerbare jaar-cirkel en jaartallen blijven.

- GitHub broncommit: `a680f68831dc49643c878dfefa4ab767a012f8ab` op branch `feature/deepblue-style-bars-locked-20261107`.
- Alleen vijf strikt gescopeerde CSS-regels toegevoegd aan de bestaande `BRAND_CSS` van `talera-style-diepblauw-20261107`: `#sheetBody #v17-timebox .v17-rail-ruler`, `.v17-rail-progress`, `#v17-year-slider::-webkit-slider-runnable-track`, `::-moz-range-track`, `::-moz-range-progress`. Achtergrond transparant, geen rand of schaduw. De losse `.v17-mark.talera-density-*`-regels zijn niet gewijzigd.
- Er zijn GEEN nieuwe Worker-ketens, scripts, uploaders of functionaliteitsaanpassingen gemaakt. Geen wijzigingen aan presentatie, vertelmodus, reacties, WhatsApp, boven-/onderbalken of lokaal opgeslagen herinneringen.
- Deployment op uitsluitend de reeds bestaande geïsoleerde kandidaat: `talera-style-diepblauw-20261107` op 7 november 2026 09:42 UTC.
- Browser Rendering A/B: `#v17-ruler`, `#v17-progress` en `::-webkit-slider-runnable-track` hebben een transparante achtergrond; 42 neutrale individuele jaarstreepjes blijven aanwezig bij nul eigen herinneringen.
- Jaarselectie in test: `1985 → 1995`, jaarpreview met drie kinderen zichtbaar en daarna `1985` hersteld. Automatische screenshot 390×844 bevestigt visueel geen doorlopende lijn, wel losse markeringen en de originele ronde selector.
- Echt iPhone-gebruik en geheugen-/videoregressie zijn hiermee **niet** voltooid. De goedgekeurde huidige voorkeurs-Worker van 6 november is niet overschreven. De nieuwe diepblauwe testversie blijft kandidaat.

## Intuïtieve bediening — veilige kleur- en tekstronde (7 november 2026)

**Opdracht:** voer de eerder opgestelde bouwprompt uit, **zonder enige functiewijziging**. Toegestaan: uitsluitend kleur van inhoudsbediening en visueel weglaten van aantoonbaar overbodige inhoudsinstructies. Alle huidige boven-/onderbalken, hun inhoud, de vertel-/opnametechniek, media-ID's, tijdstempels, de presentatiewerking, WhatsApp, reacties en opslag blijven beschermd.

### Herstelpunt en broncode
- Vóór wijzigingen de branch `backup/deepblue-before-intuitive-ux-20261107` aangemaakt vanaf `feature/deepblue-style-bars-locked-20261107`.
- Bestaande geïsoleerde testcandidate gebruikt; uitsluitend `talera-style-diepblauw-20261107` gedeployed (omstreeks 10:43 UTC). Geen nieuwe functionele Worker, andere binding of productiepromotie.
- GitHub wijzigingscommits `5d1fb002d018f1c11663a3d28ae755bae602f8e9` en `c21cd4c5fc58f687f121723c3c9fdd484d3557d7`.
- Diff tussen het herstelpunt en de actuele stylesheet: **buiten de twee CSS-stringconstanten `BRAND_CSS` en `TALERA_MORE_CONTENT_ONLY_CSS` zijn de volledige bronteksten byte-voor-byte identiek**. Binnen deze constanten zijn enkel de hieronder genoemde nauw gescopeerde regels toegevoegd; niets verwijderd van bestaande CSS.
- Actuele candidate: `https://talera-closed-memory-diepblauw-test-20261107.mark-a39.workers.dev/mijn-leven`.
- Huidige goedgekeurde versie: `https://talera-closed-memory-core-test-20261106.mark-a39.workers.dev/mijn-leven`, **niet aangepast**.

### Uitgevoerde veilige inhoudsverbeteringen
1. Op `/tell` startpagina is uitsluitend de redundante uitleg `#app #main > p.p` visueel verborgen. Beide ingangen (foto's toevoegen en zonder foto's vertellen) blijven aanwezig. Het zichtbare maximum 25 foto's en de informatie dat het concept wordt bewaard blijven behouden.
2. Op `/mijn-leven` is alleen de redundante instructie onder de onderwerpkaarten `#sheetBody .talera-topics-note` visueel verborgen. Alle zes onderwerpkaarten, de jaarblokken en de bestaande tijdlijn blijven aanwezig en werken volgens de oorspronkelijke code.
3. In het herinneringswerkblad zijn uitsluitend de bestaande knopkleuren van `#speak` en `#write` naar officieel middenblauw `#23497E`, hun randkleur naar `#5579A9` en de `#publish`-knop naar diep donkerblauw `#071A3D` gebracht. Exact dezelfde element-ID's, posities, afmetingen en clickhandlers bleven behouden.
4. De bestaande datumknop `#dateToggle` gebruikt nu `#23497E`, zodat hij niet langer van het officiële palet afwijkt. De datumkeuze en datumbevestigingslogica zijn onaangeroerd.
5. In de inhoud van de Instellingen-weergave is uitsluitend de redundant beschrijvende `intro` visueel verborgen. Zeven menuopties en de menubalk blijven aanwezig. De accounts- en privacymeldingen blijven staan.

### Automatische regressiecontrole
- Op mobiel `360×780`, `390×844`, `430×932`: A/B met de werkende versie van 6 november op `/mijn-leven`, `/tell`, `/present?talera_menu=hub`. De gecontroleerde elementen `.mast`, `.flow-nav`, `.sheet-handle`, `#app .top`, `#talera-more-menu header`, `#talera-more-menu .headbutton`, `#talera-v15-appbar`, `#talera-v12-reactions-bar` zijn qua berekende kleur/achtergrond, zichtbaarheid, positie, afmeting en opaciteit gelijk gebleven.
- `/tell`: uitleg visueel verborgen, foto-kiezer blijft bruikbaar, optie zonder foto's en conceptstatus blijven zichtbaar. In een tijdelijke browser werd het bestaande werkblad geopend; de drie werkbalkknoppen hadden dezelfde posities/afmetingen. Kleuren als voorzien.
- `/present?talera_menu=hub` → Instellingen: `data-view=settings`, inhoudelijke intro `display:none`, alle **7** opties aanwezig.
- Veilig klikgedrag op een tijdelijk leeg werkblad: `Vertellen` opent het bestaande paneel met Opnemen en Klaar; `Schrijven` opent het bestaande schrijfvenster met tekstveld en Klaar; `Plaatsen` toont dezelfde bestaande melding voor een leeg concept. Geen microfoon aangevraagd, geen echte media opgeslagen.
- Javascript-bronvergelijking met de voorkeursversie: `/tell` 9/9 scripts gelijk, `/present` 29/29 gelijk, `/present?talera_menu=hub` 29/29 gelijk. `/mijn-leven` heeft van 17 scripts alleen de **eerder goedgekeurde V17-tijdlijndichtheidsfunctie** anders. In déze UX-ronde is geen enkel script gewijzigd.

### Bewust NIET uitgevoerd
- `Opnemen` na het bewaren visueel laten wijken voor `Klaar`: de bestaande `Klaar`-knop staat in de **beschermde opnamepaneel-bovenbalk**. Geen CSS of code aan de beschermde bar/opnamebediening geraakt. Afzonderlijke expliciete uitzondering/acceptatie nodig.
- `Plaatsen` voor lege herinneringen grijs of niet-actief maken: de bestaande HTML biedt niet op iedere route een betrouwbare CSS-only toestand voor gesproken, geschreven én beeldherinneringen; dit zou mensen misleiden. Bestaande knop en validatie blijven.
- Andere teksten en hints die limieten, back-ups, datumzekerheid, opslag, fouten, privacy en toestemmingen betreffen zijn behouden.
- Eventuele oorspronkelijke tekortkomingen met WhatsApp, het witte uitschuifbare verhaalpaneel en afspelen zijn hier niet gerepareerd omdat deze opdracht wijzigingen aan techniek verbood.

### Openstaande controle
- Geen echte iPhone- of toegankelijkheids-/spraakopnametest uitgevoerd. De gebruiker dient de nieuwe kleuren en tekstminimalisatie zelf te beoordelen, inclusief opname-/video-/WhatsAppfunctionaliteit.
- Geen officiële linkpromotie zonder expliciete goedkeuring.

## UX-vervolgronde — extra media toevoegen (7 november 2026)

De gebruiker heeft toestemming gegeven om de eerder vastgelegde **uitsluitend kleur- en tekstgebaseerde** intuïtiviteitsverbeteringen voorzichtig voort te zetten. Geen enkele technische of functionele verandering toegestaan, en bij twijfel niets wijzigen.

### Uitgevoerd
- Uitgebreide inspectie op mobiele browser van acht toestanden van de content in `Mijn TALERA` (hub, instellingen, hulp, abonnement, privacy, account, mensen en delen). Alle belangrijke uitleg over accounts, inloggen, privacy en nog niet beschikbare onderdelen behouden. De bestaande hoofdnavigatie en instellingen worden niet gewijzigd.
- Onjuiste restkleur gevonden op het **bestaande mediaplusknopje** `#app #main .work .talera-v9-add-media`: oude tekstkleur `rgb(32,81,107)`, achtergrond `rgb(241,246,248)`.
- Uitsluitend CSS-kleuren op dit bestaande inhoudsknopje aangepast naar officiële `#23497E` (tekst/plus) en `#F7F5F0` (warm ivoor, achtergrond).
- Uitsluitend de overgebleven oude tekstkleur van de grote `#app #main .picker` op het startscherm met de fotoselectie vervangen door `#23497E`. De labels en media-input blijven intact.
- Er zijn **geen andere teksten verborgen of aangepast**, omdat de resterende aangetroffen teksten noodzakelijke informatie over inhoud, privacy, opslag of beschikbaarheid kunnen bieden.
- De grote wens om opnameknop en Klaar statusafhankelijk in kleur te wisselen is **niet uitgevoerd**: die knoppen zitten in de beschermde vertelbediening en zouden nieuwe toestemming voor wijziging vereisen.
- De knop `Plaatsen` is niet kunstmatig inactief gemaakt; de bestaande validatie blijft.

### Technische controle
- GitHub herstelpunt vóór deze vervolgronde: `backup/deepblue-before-ux-polish-2-20261107`.
- Alleen `BRAND_CSS` is uitgebreid met twee aan `#app #main` gebonden selectors. De rest van het Worker-bestand is byte-identiek aan het herstelpunt; ook `TALERA_MORE_CONTENT_ONLY_CSS` is exact gelijk gebleven.
- GitHub codecommit: `cf57601bc62d67c4dba1d4442422275f82bd381b`.
- Cloudflare live bijgewerkt: uitsluitend bestaande geïsoleerde stijl-Worker `talera-style-diepblauw-20261107`, gewijzigd `2026-11-07T10:56:21.791323Z`. De functionele test-Worker, de huidige goedgekeurde Worker en de originele gedeelde stijl-Worker zijn niet gewijzigd.
- Browser Rendering op 360×844, 390×844 en 430×844: de plus/media-kaart heeft nu `rgb(35,73,126)` op `rgb(247,245,240)` en blijft op dezelfde plek met dezelfde bestaande responsieve afmetingen. `#speak`, `#write`, `#publish` en `#dateToggle` blijven op hun bestaande plek en in hun vorige status.
- A/B-stijlen op 390×844 tegenover de goedgekeurde 6 november-versie: `#app .top`, `.mast`, `.flow-nav`, `.sheet-handle`, `#talera-more-menu header`, `#talera-more-menu .headbutton`, `#talera-v15-appbar` en `#talera-v12-reactions-bar` exact gelijk in onderzochte berekende posities, afmetingen, kleur, achtergrond, display en opaciteit.
- Geen opname, media-upload of iPhone op echte hardware getest. Bij vergelijking van de Worker-broncode staat vast dat alleen CSS is gewijzigd; de vooraf uitgevoerde test van het openen van Vertellen, Schrijven en Plaatsen blijft leidend voor de eerder geteste functies.

### Besluit
Huidige kandidaat: `https://talera-closed-memory-diepblauw-test-20261107.mark-a39.workers.dev/mijn-leven`.
Officiële voorkeur blijft `https://talera-closed-memory-core-test-20261106.mark-a39.workers.dev/mijn-leven`. Nog geen promotie of iPhone-acceptatie.

## UX-ronde 3 — zelfschalende tijdlijn, alleen ontwerp en demonstratie (7 november 2026)

### Gebruikerssignalen
- Twee iPhone-screenshots tonen een andere tijdlijn: de standalone TALERA-uitvoering bij een groen blad heeft 42 vrijwel gelijke, donkere streepjes; de nieuwe Safari-uitvoering toont dunne neutrale streepjes. Ook de onderste tablabels verschillen (o.a. `Berichten` versus `Meldingen`). De nieuwe browseruitvoering toont expliciet een `...20261107.mark-a39.workers.dev`-host in de Safari-balk; de precieze origin achter het bestaande PWA-icoon is vanaf de schermafbeelding niet uit te lezen.
- Browser-Rendering A/B bevestigt: op `talera-closed-memory-core-test-20261106` blijven 42 `has-memory`-streepjes zichtbaar, omdat 500 demo's meetellen; op `talera-closed-memory-diepblauw-test-20261107` staan 42 fijne neutrale markeringen bij geen eigen verhalen. De laatste link is actueel online.
- Beide onderzochte versies leveren dezelfde 500 voorbeeldherinneringen. De aantallen van die referenties zijn ongeveer 10–15 per jaar (1985–2026). In dit getoonde tijdvak vallen 468/500 voorbeelden; de overige 32 zijn van 1982–1984. Daardoor zouden alle voorbeeldherinneringen bij de huidige vaste drempel van 8+ onmiddellijk maximale intensiteit tonen.
- De huidige thuis-tijdlijnlogica gebruikt vaste drempels `0, 1, 2–3, 4–7, 8+`; dat kan bij 3000 verhalen vrijwel alle jaren donker maken. Nieuwe gebruikerswens: schaalbare intensiteit per periode waarbij pieken en dalen zichtbaar blijven bij honderden, duizenden en tienduizenden verhalen, zonder een doorlopende blauwe balk.

### Getest concept, uitsluitend als losse interactieve ontwerpdemonstratie
Er is een standalone HTML-proef buiten de PWA gebouwd, niet geüpload naar de TALERA-Worker en niet verbonden met gebruikersopslag. De gebruiker kan daarin kiezen uit:
1. Geen eigen verhalen: 42 lichte jaarstreepjes.
2. 300 **fictief verdeelde** verhalen: 10 lege, 11 rustige, 9 gewone, 7 drukke en 5 heel drukke jaarposities.
3. 3000 **fictief verdeelde** verhalen met dezelfde onderliggende relatieve jaarverdeling: 10 lege, 10 rustige, 10 gewone, 7 drukke en 5 heel drukke jaarposities.
4. Selectie van **179** echte voorbeelden (hoogstens het oorspronkelijke aantal per jaar) met bewuste rustige/geselecteerde perioden; die selectie is alleen voor de demo, wordt niet aan persoonsgegevens toegevoegd.
5. Alle 500 originele voorbeelden, waarvan 468 in het zichtbare bereik 1985–2026: verdeling vrijwel uniform; 42 jaarposities alle met een **middelmatige** intensiteit, dus nooit allemaal maximaal donker.

### Ontworpen schaalregel
1. Bepaal het aantal **eigen verhalen per kalenderjaar** (of bij hoge levensduur per visueel gelijkmatig jaarblok). Tel de 500 referentieherinneringen niet als persoonlijke herinneringen mee.
2. Bereken de **mediaan van de niet-lege** periodeaantallen als de persoonlijke referentiewaarde. Daardoor verschuiven grenzen mee als het totaal van 300 naar 3000 groeit.
3. Bepaal de relatieve factor `r = n / max(1, medianPositive)`; toon `n=0` als haarlijn; `0<r<0.45` als zeer licht; `0.45≤r<1.45` als gewoon; `1.45≤r<2.8` als druk; `r≥2.8` als zeer druk.
4. Elk jaar blijft een **los streepje/blokje**, zonder horizontale verbindingslijn. Houd de bestaande jaren, slider, tekst en geselecteerde jaarcirkel ongewijzigd.
5. Bij automatische samenvoeging van meerdere jaren per markering is een eerlijke vergelijking wenselijk: normaliseer aantallen per jaar in het betreffende tijdvak (i.v.m. kortere laatste periode). Houd nulperiodes licht en toon bij selectie het echte aantal verhalen. Dit punt is nog ontwerp, niet geïmplementeerd.
6. Vermijd visuele sprongen bij groei van de verzameling (eventueel schaalwaarde stabiliseren); toets kleuren voor contrast en herkenbaarheid.

### Browserproef van de standalone HTML
De HTML is in een geïsoleerde headless Chromium-browser via `set_content` getest op 390×844; de vijf keuzemodi reageerden, alle waarden en 42 jaarposities werden getoond, geen JavaScript-errors. Een screenshot van de 3000-modus is lokaal gemaakt.

### Strikte grenzen en vervolg
- **Geen aanpassing aan de online TALERA-PWA gedaan voor dit schaalontwerp.** De vaste drempels van de bestaande app zijn dus nog niet veranderd. Aanpassing vereist specifiek toestemming om de **bestaande** `talera-flow-v17-time`-weergavefunctie (geen opname-/presentatiecode) te wijzigen: die wijziging is niet puur CSS/tekst en valt buiten het eerdere masterbouwbesluit.
- Geen wijzigingen aan opname/vertelcyclus, media-ID's, swipes, video, WhatsApp, tekstpaneel, opslag, account, PWA-versies, beschermde balken of versieregister.
- Op het toestel de precieze PWA-launch-URL achter het oude beginschermicoon vaststellen zonder de bestaande app of lokale data te verwijderen. Niet promoveren naar officiële versie vóór acceptatie.

## UX-ronde 3 — zelfschalende tijdlijn in staging geïmplementeerd (7 november 2026)

**Gebruikersopdracht:** pas nu expliciet de relatieve schaal uit de vooraf goedgekeurde 300/3.000/10.000-verhalenproef uitsluitend toe op de bestaande tijdlijn op `Mijn leven`. Geen enkele andere code, stijl, knop, tekst, pagina, mediafunctie, opnamecyclus of PWA-balk wijzigen.

### Uitvoering en herstelbaarheid
- Herstelbranch van vlak vóór deze wijziging: `backup/deepblue-before-timeline-relative-scale-20261107`.
- Eén bronbestand op de bestaande GitHub-featurebranch gewijzigd; broncommit: `86b4b69d60511e18ea29d9857ffcadfc7e574d56`.
- Exacte diffcontrole tussen herstelbranch en huidige featurebranch: **alle brontekst buiten één stringconstante `TALERA_HOME_MARKS_DENSITY` is byte-identiek.** `BRAND_CSS` en alle andere CSS, HTML-transformaties, Workers-bindings en JavaScript blijven intact.
- De ene gewijzigde renderer bevindt zich exclusief in de reeds bestaande `talera-flow-v17-time` binnen `/mijn-leven`. De patch vervangt de originele V17-`drawMarks()` op dezelfde bestaande plek, alleen wanneer de bron exact overeenkomt; geen extra eventhandlers, scripts, renderlagen of navigatie.
- Bestaande aantallen per jaar voor uitsluitend **eigen** herinneringen; de 500 `demo:true`-voorbeelden blijven buiten de persoonlijke intensiteit. Alle 500 voorbeeldherinneringen blijven wel beschikbaar in preview/jaarselectie.
- Nieuwe formule: deel elk periodeaantal door de kalenderjaren in het visuele tijdvak (verhalen per jaar); neem de mediaan van uitsluitend de niet-lege periodewaarden als referentie (`anchor=max(1,mediaan)`). Nul blijft intensiteit 0. Voor positieve waarden `r = (verhalen per jaar)/anchor`: `r<0.45` niveau 1, `r<1.45` niveau 2, `r<2.8` niveau 3, anders niveau 4. Dit is dezelfde zelfschalende verdeling als de goedgekeurde demonstratie.
- Alle bestaande tick-renderinstructies, CSS-klassen, vijf visuele groottes en kleuren, individuele jaren, ronde geselecteerde slider, jaarlabels en de verwijderde horizontale doorlopende lijn blijven **byte-identiek**, dus zonder visuele herbouw.
- De wijziging is op de reeds bestaande geïsoleerde Worker `talera-style-diepblauw-20261107` gedeployed op `2026-11-07T11:46:43.279598Z`. De goedgekeurde originele Worker van 6 november en de functionele staging-Worker zijn niet aangepast.

### Browser-Rendering-regressie
Getest op 390×844 in de nieuwe gehoste stagingpagina met tijdelijke in-memory verhaalobjecten (er is geen persoonlijk verhaal aan opslag toegevoegd). Dezelfde 42 jaarposities als het HTML-voorbeeld:
- 0 eigen verhalen: 42 dunne lege jaren.
- 300 verhalen: 10 lege, 11 rustige, 9 gewone, 7 drukke, 5 zeer drukke jaren.
- 3.000 verhalen: 10 lege, 10 rustige, 10 gewone, 7 drukke, 5 zeer drukke jaren.
- 10.000 verhalen: 10 lege, 10 rustige, 10 gewone, 7 drukke, 5 zeer drukke jaren.
- De daadwerkelijk door de browser berekende totalen waren precies 0, 300, 3.000 en 10.000; dus geen verhaal ging verloren in de proef. De testverdeling is identiek aan die uit de losse 10.000-verhalen-demo, niet gelijk aan opgeslagen gebruikersdata.
- Zonder eigen herinneringen met de 500 gewone referentievoorbeelden aanwezig: alle 42 markeringen blijven niveau 0. Dit is expliciet opnieuw in de actuele kandidaat gecontroleerd.
- De bestaande jaarselector kon van 1985 naar 1995 worden verschoven, waarna het zichtbare jaar 1995 werd; de 42 markeringen bleven aanwezig. Geen wijziging van selectieflow.
- Visuele A/B stijlcontrole op 360, 390 en 430 pixels breed: alle geteste beschermde balken op `/mijn-leven` (`.mast`, `.flow-nav`, `.sheet-handle`), `/tell` (`#app .top`) en `/present?talera_menu=hub` (menu-header, headbutton, presentatie-appbar, reactiesbar) exact gelijk aan goedgekeurde basis qua kleur/achtergrond, geometrie, zichtbaarheid en opaciteit.
- Bij lange levensperioden (> beschikbaar aantal pixelposities) worden visuele jaren nog steeds gebundeld via de **ongewijzigde** bestaande bucketing. De nieuwe formule normaliseert daarbij voor het aantal jaren per blok. De daadwerkelijke lange-periodevisualisatie op een iPhone is nog **niet** handmatig geaccepteerd.

### Grenzen en status
- De gebruiker heeft nu **expliciet** toestemming gegeven voor uitsluitend deze ene technische wijziging aan de tijdlijnschaal. Het eerdere algemene verbod op technische aanpassingen blijft onverminderd gelden voor de rest van TALERA.
- De volledige vertelmodus, tijdstempels, opslag, upload, audio, video, WhatsApp, witte verhaaltekst, reacties, schermvolgorde, oorspronkelijke boven-/onderbalken, overige CSS en iPhone-icoon zijn niet aangeraakt.
- **Testkandidaat:** `https://talera-closed-memory-diepblauw-test-20261107.mark-a39.workers.dev/mijn-leven`.
- **Goedgekeurde voorkeursversie ongewijzigd:** `https://talera-closed-memory-core-test-20261106.mark-a39.workers.dev/mijn-leven`.
- Nog geen productiepromotie of acceptatietest met 300–10.000 daadwerkelijk op iPhone opgeslagen herinneringen; voor herinstallatie/verwijderen van een PWA wordt niet geadviseerd wegens mogelijk lokale data.

## Tijdelijke intensiteitsbron: 500 voorbeelden totdat er eigen verhalen zijn — 7 november 2026

**Uitdrukkelijk akkoord van gebruiker:** maak de inhoudelijke tijdlijn van Mijn leven controleerbaar door voorlopig de bestaande 500 voorbeeldherinneringen als zichtbare intensiteitsbron te gebruiken als de gebruiker nog helemaal geen eigen herinneringen heeft. Zodra er één of meer eigen herinneringen zijn, moet de berekening alleen de eigen verhalen tellen. Verander verder niets.

### Technische uitvoering
- Isolatie: uitsluitend in de bestaande diepblauwe stijltestworker `talera-style-diepblauw-20261107` en alleen op de bestaande pagina `/mijn-leven`, via de al aanwezige `TALERA_HOME_MARKS_DENSITY` renderer van `talera-flow-v17-time`.
- GitHub broncodecommit: `cceb4f4dab355dc78ea001e0476b4552385e277c`.
- Herstelbranch vóór wijziging: `backup/deepblue-before-demo-density-fallback-20261107`.
- GitHub bronvergelijking vóór/na: **alle tekst buiten die ene tijdlijnrenderer-constante is byte-identiek**. Bestaande mediane zelfschalingsformule, visuele niveaus 0–4, relatieve drempels, tick-rendering, kleuren, blokmaten, schuifbediening, jaartallen, layout en overige scripts identiek.
- In de renderer worden al beschikbare items gescheiden in `referenceCounts` (`demo:true`) en `ownCounts` (`demo:false`). Wanneer `ownCounts.size===0`, wordt alleen `referenceCounts` gebruikt voor de relatieve intensiteit; bij één of meer eigen verhalen uitsluitend `ownCounts`. Er worden geen voorbeeldherinneringen naar privéopslag gekopieerd en geen eigen herinneringen toegevoegd.
- De tooltip van een jaarstreepje onderscheidt nu `voorbeeldherinneringen` en `eigen herinneringen`.
- Cloudflare deployment geslaagd op `2026-11-07T12:01:00.154153Z`. Geen nieuwe PWA, geen nieuwe Worker of een andere binding gemaakt.

### Controle op daadwerkelijke gehoste testversie
- De bestaande 500 voorbeelden omvatten ook 32 herinneringen uit 1982–1984, **buiten** het bestaande tijdlijnbereik 1985–2026. De 42 zichtbare jaarposities krijgen dus samen 468 voorbeelden. Jaar 1985: 11; 1995: 13; 2026: 11.
- De werkelijk gemeten intensiteiten van de 42 jaarposities zijn `[0,0,42,0,0]` (volgorde niveaus 0 t/m 4). **Alle jaren krijgen dezelfde middelmatige intensiteit, omdat de voorbeelden bijna gelijkmatig zijn verdeeld met circa 10–15 per jaar.** Dit is een correct gevolg van de relatieve schaal, geen defect. Gebruik voor afwisselende pieken/dalen liever de aparte interactieve 300/3000/10000-verhalen-demo; de echte referenties mogen niet kunstmatig worden herverdeeld zonder aparte instructie.
- Tijdelijke browserproef zónder opslaan van data: 500 demo's alleen → totaal 468 in huidig jaarbereik; 500 demo's plus één eigen verhaal in 1995 → uitsluitend één markering van eigen herinnering, alle andere jaren haarlijn; 500 demo's plus drie eigen verhalen (2 in 1995 en 1 in 2001) → uitsluitend twee gevulde jaarmarkeringen.
- Beschermde balken `.mast`, `.flow-nav`, `.sheet-handle` qua geteste posities, afmetingen, kleuren en zichtbaarheid bij 360, 390 en 430 pixels breed gelijk aan de goedgekeurde oorspronkelijke PWA.
- Worker timestamps gecontroleerd: de oorspronkelijke voorkeursworker (6 november), oorspronkelijke gedeelde stijlworker en functionele diepblauwe kernworker bleven onaangeroerd.

### Niet gewijzigd
- Geen opname-, video-, foto-, presentatie-, commentaar-, WhatsApp-, tekst-, account-, opslag- of navigatielogica.
- Geen nieuwe voorbeeldverhalen, geen andere intenser/donkerder CSS, geen verandering van bestaande datumrange of selectie. Geen ingreep aan beschermde appbalken of de eerder afgesproken kleur- en tekstverbeteringen.
- Geen officiële promotie of vervanging van de bestaande voorkeurslink. De gebruiker moet het uiterlijk nog op eigen iPhone beoordelen.
- Testkandidaat: `https://talera-closed-memory-diepblauw-test-20261107.mark-a39.workers.dev/mijn-leven`.
- Goedkeurde voorkeur onveranderd: `https://talera-closed-memory-core-test-20261106.mark-a39.workers.dev/mijn-leven`.

## Tijdlijn 2D: bezetting én relatieve intensiteit — 7 november 2026

**Gebruikersaanleiding:** Bij een gelijkmatige verdeling zien 300, 3.000 en 10.000 herinneringen er met uitsluitend de mediane relatieve kleurintensiteit vrijwel hetzelfde uit. De tijdlijn moet óók het absolute aantal verhalen per periode visualiseren, zonder een doorlopende donkere lijn te worden.

### Goedgekeurd begrensd wijzigingsvlak
- Alleen het bestaande tijdlijn-tekenalgoritme in de HTML-route `/mijn-leven`, binnen `talera-flow-v17-time` via de eerder gebruikte exacte rendererconstante `TALERA_HOME_MARKS_DENSITY`.
- Herstelbranch vóór wijziging: `backup/deepblue-before-dual-axis-timeline-20261107`.
- GitHub broncommit: `e13b80009d38d09339ea3b05ec4e3222acac70e4`.
- Diff tussen herstelbranch en broncommit: **alle broncode buiten die ene tijdlijnrenderer-string is byte-identiek**. Geen CSS aangepast. Binnen de renderer zijn uitsluitend nieuwe berekening en inline `height`/`top` op bestaande `.v17-mark`-elementen toegevoegd; alle oorspronkelijke tellingen, de eigen-vs-voorbeeld fallback, relatieve klassen, jaarlabels, tooltips, positie, breedte en eventhandlers ongewijzigd.
- Bestaande voorbeelden tellen alleen als intensiteitsbron zolang er geen eigen herinneringen zijn. De 500 voorbeelden blijven ongewijzigd; 468 vallen in het bestaande bereik 1985–2026. Na een eigen verhaal telt uitsluitend eigen inhoud, zoals voor deze ronde was goedgekeurd.

### Dubbel algoritme
1. **Relatieve intensiteit, bestaand en behouden:** bepaal het aantal verhalen per kalenderjaar (eventuele visuele jaarbundels worden genormaliseerd per jaar), vergelijk het met de mediaan van alle niet-lege tijdvakken. Laat de vijf bestaande kleuren en breedtes staan: 0, <0.45×, <1.45×, <2.8× en ≥2.8× de mediaan.
2. **Absolute bezetting, nieuw en onafhankelijk:** bij een gevuld tijdvak met `n = verhalen per kalenderjaar`, bereken `fill=min(1, ln(1+n)/ln(1001))`. Zet de streephoogte op `round(7+18×fill)` pixels, met gecentreerde verticale uitlijning. Lege perioden blijven ongewijzigd op 7 px/1 px breed.
3. Daardoor levert ongeveer 7 verhalen/jaar een 12–13 px hoog streepje, ongeveer 71 verhalen/jaar een 18 px streepje, ongeveer 238 verhalen/jaar een 21 px streepje. Ook bij hoge bezetting blijft de streephoogte begrensd tot 25 px, en laat de ongewijzigde breedte van bijvoorbeeld 3 px de noodzakelijke witte ruimte tussen de jaren intact. Een gelijkmatige verdeling heeft logischerwijs geen kunstmatige kleurpieken.

### Browseronderzoek en resultaten
- Deployment op uitsluitend bestaande geïsoleerde stijlworker `talera-style-diepblauw-20261107`, op `2026-11-07T12:21:53.2137Z`.
- Browser-Rendering op actuele diepblauwe `/mijn-leven` bij 390×844: met **0** verhalen = 42 oorspronkelijke fijne markeringen 7 px hoog/1 px breed; met **300** gelijkmatig verdeelde verhalen = 42 markeringen van 12–13 px hoog/3 px breed; met **500** gelijkmatig verdeelde voorbeelden = 13–14 px/3 px; met **3.000** gelijkmatig verdeelde verhalen = 18 px/3 px; met **10.000** gelijkmatig verdeelde verhalen = 21 px/3 px.
- In de gelijkmatige simulaties bleven alle 42 markeringen in de middelste relatieve kleurklasse (geen kunstmatige pieken). De interne telling en het beschrijvende jaarlabel waren correct. Geen herinneringen aan gebruikersopslag toegevoegd; uitsluitend tijdelijke in-memory browserfixtures.
- Aparte mobiele HTML-demonstratie (390px), onafhankelijk van de PWA, met vier vergelijkbare rijen (300 gelijkmatig, 3.000 gelijkmatig, 10.000 gelijkmatig, 3.000 met echte pieken/dalen) heeft 42 ticks per rij en totale tellingen 300/3000/10000/3000. Met 3000 ongelijkmatige verhalen: 10 lege, 10 rustige, 10 gewone, 7 drukke, 5 zeer drukke tijdvakken; streephoogtes 7–21px. Gecontroleerd met lokale headless Chromium, geen JavaScriptfouten. Het demo-HTML en de afbeelding zijn afzonderlijke gespreksbijlagen, **niet** gedeployed naar TALERA.
- De online app is eveneens met Browser-Rendering-screenshot visueel beoordeeld: de bestaande 500 voorbeeldherinneringen tonen een nette rij afzonderlijke markeringen, geen horizontale verbindingslijn en de oorspronkelijke jaarknop.
- Browser A/B stijlcontrole op 360×844, 390×844 en 430×844: de beschermde `.mast`, `.flow-nav`, `.sheet-handle`, `#app .top`, `#talera-more-menu header`, `.headbutton`, `#talera-v15-appbar` en `#talera-v12-reactions-bar` blijven qua berekende geometrie, kleur, achtergrond, display en opaciteit gelijk aan de goedgekeurde basis. De kaart heeft eerdere bewust geautoriseerde andere merkstijl, niet veroorzaakt door deze wijziging.
- De technische browserproeven zijn **geen** volledige test met daadwerkelijke 10.000 lokaal opgeslagen herinneringen op een iPhone. App-prestaties met grote eigen verzamelingen en langjarige tijdvakbundels verdienen aanvullende echte iPhone-test.

### Strikte bewaking
- Alle vertel-, opname-, video-, foto-, upload-, reactie-, WhatsApp-, opslag-, account- en presentatiefuncties zijn niet gewijzigd.
- De goedgekeurde werkende versie `https://talera-closed-memory-core-test-20261106.mark-a39.workers.dev/mijn-leven` is niet bijgewerkt.
- De nieuwe algoritmeversie blijft een **testkandidaat** op `https://talera-closed-memory-diepblauw-test-20261107.mark-a39.workers.dev/mijn-leven`. Promotie pas na expliciete acceptatie.

## ONDERZOEK: presentatietijdlijn en thuistijdlijn met gedeelde bezettingslogica (7 november 2026)

**Alleen onderzoek, NIKS aan de app gebouwd of gedeployed.** Gebruiker heeft nadrukkelijk bepaald dat op de presentatietijdlijn alle bestaande kleuren, transparanties, het oplichten, animaties, bediening, zoom, foto-overgangen, audiovisuele presentatie en huidige presentatiebalken EXACT blijven. Alleen de **indicatie van de hoeveelheid verhalen door de hoogte/bezetting van de streepjes** mag later wijzigen.

### Aangetroffen implementatie
- `/mijn-leven`: bestaande `<script id="talera-flow-v17-time">` (ongeveer 8.112 tekens) met `drawMarks()`, een rij losse DOM-jaarstreepjes met `talera-density-0..4`. Eerder door gebruiker goedgekeurde dubbele schaal: `occupancy = min(1,log1p(verhalen_per_jaar)/log1p(1000))`, markeringhoogte `round(7+18*occupancy)` px; relatieve mediaan blijft in klassen 0..4 vertaald naar kleur en breedte. Zonder eigen verhalen zijn de 500 voorbeelden tijdelijke bron, zodra eigen verhalen bestaan uitsluitend eigen telling. Het gaat over jaartallen in bestaande bereik 1985–2026.
- `/present`: volledig andere techniek. Eén canvas `#timelineCanvas`, geïmplementeerd in een bestaand ongeveer 57.770 tekens lang **inline basisscript** (zonder expliciete ID) met `function drawDensity(level,startMs,endMs,w,axisY)`. `draw()` roept achtereenvolgens `drawDensity`, `drawMemoryBeacons`, `drawScale` aan en bevat `updateNearestStory()` en fotopreview. Daarnaast meerdere controllers die de bestaande tijdlijnmotor `window.__taleraTimelineRuntime` en `.timeline` gebruiken. Die overige functies dienen ongewijzigd te blijven.
- Bestaande density-tekening: `function densityBucket(level){return [60,7,1,1,1,null][level]}`; zes zoomstanden (15 jaar, 2 jaar, 3 maanden, 2 weken, 1 dag, 24 uur). `aggregatePerDay` haalt aantallen uit `dayCounts`. `rate` is nu **aantal verhalen per dag**, `intensity=1-Math.exp(-rate/(level===0?.055:.48))`. De streephoogte gebruikt exact één expressie `const bh=5+intensity*56;`. De huidige presentatiekleur/transparantie wordt afzonderlijk daarna getekend met `ctx.fillStyle=rgba(91,143,185,.24+intensity*.66)` en `rr(...)`; die mogen absoluut niet wijzigen. Ook `drawMemoryBeacons`, `drawScale`, `bounds`, `zoomPos`, `centerMs`, `registerMemory`, `registerMemories`, foto/video/audio-presentatie en de pointer/wheel/gesture-handlers blijven volledig ongewijzigd.
- Presentatie bevat dezelfde **50 originele voorbeelden plus 450 aanvullende testvoorbeelden**; basiscatalogus `MEMORIES=[...].concat(TALERA_STRESS_MEMORIES)`. De 450 extra voorbeelden hebben `isDemo:true`/`stressTest:true`; de 50 oorspronkelijke hebben deze vlag niet. Dat laatste vereist expliciete herkenning als voorbeeld, niet eenvoudig `!m.isDemo` als definitie van eigen verhaal gebruiken.
- Eigen lokaal opgeslagen herinneringen komen in de presentatiemotor via `talera-zero-memory-adapter` (`_taleraLocal:true`) en `runtime.registerMemories`. De bestaande `dayCounts` is een optelling over **alle** reeds geregistreerde presentatieherinneringen, dus demo én eigen, anders dan de thuisregel met automatische prioriteit aan eigen verhalen. De *dichtheidsbron* moet voor dezelfde uitkomst als thuis identiek worden gekozen, zonder `MEMORIES` of selectie-/navigatiegegevens aan te passen.
- Presentatie heeft routefilters `?theme=...`, `?decade=...` en speciale single-memory/recipient-focus. Presentatie beslaat een levensperiode vanaf 1976, met een zichtvenster afhankelijk van zoom. De thuisjaarstreepjes beslaan 1985–2026. Bij vergelijking dezelfde jaarperiode en hetzelfde toepasselijke filter respecteren: dezelfde verhalenbron/normalisatie, niet per se dezelfde zichtbare lengte van de tijdlijn.

### Haalbaarheid en veilige aanpak
**Ja, mogelijk met beperkte, goed af te bakenen renderwijziging; nee, niet uitsluitend met CSS omdat het canvas wordt getekend.** De mogelijkheid om de bestaande `bh`-regel te vervangen is met een niet-persistente syntaxisproef van uitsluitend `drawDensity` gecontroleerd: de aangepaste functie compileert; de originele kleurexpressie blijft exact behouden. Dat is slechts een veiligheidsproef, **geen volledige oplossing**: alleen `rate*365.2425` in hoogte invullen normaliseert te sterk op dag-/weekzoom (één verhaal per dag kan kunstmatig als 365 verhalen per jaar ogen) en laat nog het demo/eigen verschil bestaan.

Aanbevolen later te bouwen implementatie **alleen binnen dichtheidstekenpad**:
1. Een eigen, read-only dichtheidsteller uit de *reeds beschikbare* herinneringsrecords die de thuisbron respecteert: voorbeelden zolang er geen eigen verhalen zijn, daarna uitsluitend eigen. Maak geen wijzigingen aan `MEMORIES`, `EVENT_OFFSETS`, `dayCounts`, `taleraRebuildDensity` en de timeline-runtime. De teller moet performant zijn bij 10.000 verhalen en dynamisch laden bij account/herinnering toevoegen; vermijden van dure volledige scans per animatieframe.
2. Dezelfde absolute logaritmische **bezettingsfractie** als thuis per kalenderjaar als gedeelde betekenis. Visualiseer die binnen het bestaande canvas-hoogtebereik (nu maximaal 61 px), met zorgvuldige behandeling van zoomniveaus; zorg dat een enkele gebeurtenis in een dag-/weekvenster niet lijkt op honderden verhalen per jaar.
3. Laat bestaande presentatie **kleur, fillStyle, transparantie, licht-/reactie-/beacon-effecten, markeringbreedtes, afgeronde vormen, canvas tekenen op andere lagen, schaalas, tijdlabels, zoom, gesturing, fotoswipes, opname/afspelen en navigatie 100% intact**. Geen losse speler, nieuwe tijdlijnlaag, nieuwe eventhandlers of extra init-systemen.
4. Isolatie op nieuwe GitHub-herstelbranch en alleen diepblauwe staging; één exacte bronvervanging voor de concrete `/present`-basisscriptfunctie. De huidige stijlworker dient `/present` apart, met de oorspronkelijke statusbar-herstelroute. Het is technisch uitvoerbaar om alleen de hoogte-/telling uit het bestaande `drawDensity`-blok in het geretourneerde HTML te wijzigen, maar vereist expliciete bouwopdracht en regressietesten.
5. QA op 0, 300, 3000 en 10000 verhalen gelijkmatig plus ongelijkmatig; presentatie in alle 6 zoomniveaus; verhaaltoevoeging/verwijdering, filter op thema/deccennium, één gedeelde herinnering, in-place verhaaltekst, fotoswipe en audio/video synchronisatie; vergelijk alle beschermde presentatiebalken en voor/na bronscripts.

### Status
- **GEEN codewijziging of deployment in deze onderzoeksronde.** Huidige kandidaat blijft `https://talera-closed-memory-diepblauw-test-20261107.mark-a39.workers.dev/mijn-leven`.
- Goedkeurde werkende kern van 6 november blijft ongewijzigd.

## Bouwresultaat — gedeelde bezettingsschaal presentatietijdlijn (7 november 2026)

**Gebruiker gaf expliciet opdracht:** voer de eerder goedgekeurde bouwprompt uit; uitsluitend de indicatie van het aantal verhalen via de dichtheidsstreepjes op het presentatiescherm aanpassen. Alle bestaande kleurwaarden, oplichten, animaties, zoom, tijd-as, beacons, foto-/video-/audiosynchronisatie, verhaaltekst, besturing, opslag en vaste schermbalken moeten blijven.

### Source-control en terugdraaiing
- Herstelbranch vóór de wijziging: `backup/deepblue-before-presentation-density-20261107`.
- GitHub sourcecommit `760a378ae00cf11aef492dba8038f5d9ab1b937b` op `feature/deepblue-style-bars-locked-20261107`.
- Gewijzigd bestand: uitsluitend `r20-dev/brand-voorstel-d/style-worker-blue-content.mjs` van de reeds bestaande aparte teststijl-Worker.
- GitHub vóór/na codecontrole: na het verwijderen van de toegevoegde, exact gescopeerde `rewritePresentationDensity(html)`-functie, één lege regel en de ene gewijzigde aanroep in de bestaande `/present`-route is de hele Worker-bron **byte-identiek** aan het herstelpunt. Geen CSS-kleur/markeringstijl, routing van andere schermen, opnameproces, PWA-manifest of binding gewijzigd.
- De herstelbare `rewritePresentationDensity`-functie herschrijft alleen de al bestaande inline presentatietekenfunctie `drawDensity(level,startMs,endMs,w,axisY)` en voegt **uitsluitend een cache-invalidatieregel** toe aan de bestaande `taleraRebuildDensity()`. Fail-closed wanneer niet precies de bekende codepatronen worden gevonden. Geen extra script, presentatiemotor, eventlistener of tijdlijnlaag toegevoegd.
- Andere bestaande geheugen-, media- en presentatiecode inclusief `drawMemoryBeacons`, `drawScale`, `window.__taleraTimelineRuntime`, `MEMORIES`, `dayCounts`, pointers en audio/video's blijft byte-identiek aan de vorige test-/officiële versie.

### Berekening en bronprioriteit
- Dezelfde absolute bezettingsfractie als op `Mijn leven`: `occupancy = min(1, ln(1 + verhalenPerKalenderjaar) / ln(1001))`.
- De bestaande presentatietijdlijn gebruikt een 5..61 px canvasstreepjesgebied: `height = 5 + 56*occupancy`. De thuislijn heeft 7..25px hoogte. De **fractie is identiek**, de pixelomvang is afgestemd op de al bestaande presentatietekening.
- Presentatie telt initieel de 50 bestaande oorspronkelijke (ID 1..50) plus de 450 `isDemo`-testherinneringen voor de streephoogtes. Zodra een eigen verhaal wordt geregistreerd, gebruikt de dichtheidsweergave alleen eigen verhalen; de 500 voorbeelden blijven beschikbaar in bestaande navigatie.
- De eigen/verhalen-voorrang wordt gerealiseerd door een **read-only, gecachte** dag- en jaarindex in `drawDensity`. De index ververst automatisch wanneer de bestaande code `taleraRebuildDensity` aanroept, bijvoorbeeld bij toevoegen van herinneringen. `MEMORIES` en het oorspronkelijke `dayCounts` worden niet gewijzigd.
- De oorspronkelijke zoomdag-buckets (60/7/1 dag) worden voor *waar echt een verhaal staat* op basis van gekozen bron geteld. Hoogte komt uit het werkelijke aantal verhalen in het kalenderjaar, zodat één verhaal op één dag niet wordt vermenigvuldigd met 365. De zoom-6 (`24 uur`) losse gebeurtenisdots blijven geheel ongewijzigd.
- De bestaande `intensity=1-Math.exp(-rate/(level===0?.055:.48))` en originele canvas-`fillStyle` / alpha, stralende visuele effecten, kleuren, breedtes en afgeronde tekenvormen **zijn tekstueel identiek behouden**. Alleen de input `rate` gebruikt de afgesproken demo/eigen-bronprioriteit; daarom volgt de bestaande oplichtintensiteit vanzelf de gekozen verhalen. Geen nieuwe kleur-/glowregel.

### Automatische tests op de gehoste kandidaat
- Worker deploy geslaagd op **`2026-11-07T13:30:54.923202Z`** naar uitsluitend `talera-style-diepblauw-20261107`.
- De complete inline presentatiescript van 59.661 tekens is vóór deployment op JS-syntaxis gecontroleerd: **geldig**. De originele presentatiecode van 57.770 tekens verschilt uitsluitend in één `drawDensity`-functie en één `taleraRebuildDensity`-cache-reset; alle overige bronbytes gelijk.
- Browser Rendering 390×844: 500 demo's in default 15-jaarvenster → 41 zichtbare dichtheidsbalkjes met 25,1–27,5px hoogte.
- Tijdelijke, **niet opgeslagen** eigen herinneringen over 42 jaren, gelijkmatig verdeeld:
  - 300 verhalen → 30 zichtbare streepjes in standaard 15-jaarvenster, hoogte **21,9px**.
  - 3.000 verhalen → 47 zichtbare streepjes, hoogte **39,1–39,7px**.
  - 10.000 verhalen → 47 zichtbare streepjes, hoogte **48,3–49,4px**.
  - Aantal streepjes in het venster verschilt doordat herinneringen in de tests op verschillende kalenderdagen voorkomen; het totale ingevoerde aantal is correct en wordt niet opgeslagen.
- 3.000 ongelijkmatig verdeelde verhalen, 10 lege jaren, 42 jaarposities totaal: 47 zichtbare dichtheidsstreepjes in het standaard presentatievenster met uiteenlopende hoogtes **30,05–47,66px** en 12 bestaande berekende transparantiewaarden. De perioden met lege jaren krijgen geen fictieve dichtheidsstreepjes.
- Bronprioriteitstest: 500 voorbeelden gaven 41 streepjes in standaardvenster; nadat er exact één tijdelijk eigen verhaal in 2021 werd toegevoegd, werd uitsluitend één dichtheidsstreepje van **10,62px** getekend, overeenkomstig de exacte logaritmische formule.
- Alle **zes** bestaande zoomstanden zijn getest via de originele debug-zoomknoppen: 15 jaar, 2 jaar, 3 maanden, 2 weken en 1 dag tekenen correcte dichtheidsbalkjes; zoom-6 24 uur blijft de originele gebeurtenispuntjes gebruiken. Jaar-/datumfocus en originele tijdlijnruntime bleven aanwezig.
- Responsieve A/B vergelijking op **360/390/430×844** met de ongewijzigde goedgekeurde basis: `#timelineCanvas`, `.timeline`, `#photoStage`, `#memoryStoryScroll`, `#talera-v15-appbar`, `#talera-v12-reactions-bar` en menukop behouden identieke berekende kleuren, backgrounds, opacity, display, zichtbaarheid en rechthoekgeometrie.
- `/present` toont op elk van die breedtes nog steeds precies **29 scripts**. Slechts één inline script is inhoudelijk gewijzigd: de bedoelde presentatiedichtheidsfunctie (plus de cache-reset daarbinnen). De andere 28 scripts, waaronder alle audiovideo-, foto-, verhaal- en besturingscontrollers, blijven byte-identiek.

### Afbakening en acceptatie
- Goedkeurde kern-/voorkeurs-Worker `talera-closed-memory-core-test-20261106` blijft ongewijzigd (laatste wijziging 6 nov 21:00:40Z). Test-kernworker `talera-closed-memory-diepblauw-test-20261107` blijft ongewijzigd (7 nov 06:57:41Z). Oorspronkelijke gedeelde stijlworker blijft ongewijzigd (5 nov).
- Testlink presentatie: `https://talera-closed-memory-diepblauw-test-20261107.mark-a39.workers.dev/present`; standaard app via `/mijn-leven`.
- **Niet als officieel gepromoveerd.** Opname-/video-/audio-/swipecontrollers zijn niet aangeraakt, maar een echte opname-/iPhone-regressietest is nog nodig voor definitieve acceptatie. Niet claimen dat alle media- en accountfuncties op echte hardware zijn geverifieerd.

## Afbouw na tijdlijn — laatste veilige werkbladkleurcorrectie (7 november 2026)

De tijdlijnwijzigingen op `/mijn-leven` en `/present` zijn inmiddels door de gebruiker gezien en goedgekeurd als testuitvoering. De gebruiker gaf daarna opdracht de eerdere afbouw van de intuïtieve diepblauwe UI weer op te pakken. Deze ronde houdt zich aan de eerder vastgelegde CSS-only/no-logic grenzen.

### Werkelijke bevinding
- De zichtbare inhoud van `/mijn-leven`, `/tell` en het Mijn TALERA-menu is via headless mobiele browser onderzocht. De concrete redelijke restafwijking was het bestaande **gestippelde randje** van `#app #main .work .talera-v9-add-media`: `rgb(189,209,217)` (legacy grijsblauw) rond een al eerder goedgekeurd blauw plus-teken op ivoorkleurige achtergrond. Bijbehorende iPhone-achtige 390×844-screenshot van het lege werkblad visueel nagekeken.
- Overige legacy tekstkleurwaarden kwamen vooral uit containers, onzichtbare invoervelden of geërfde basiskleuren en zijn niet blind overschreven. De aantoonbaar onnodige teksten bleven verborgen zoals eerder goedgekeurd. Niet aan persoonlijke scherm-/presentatiestructuur geraakt.

### Uitsluitend één CSS-correctie
- Herstelbranch: `backup/deepblue-before-final-editor-border-20261107`.
- Broncommit: `4275672d306a3b1d97faf6abe78babc0d939919f`.
- Slechts één bestaande, strikt tot het inhoudelijke mediavak van het werkblad gescopeerde CSS-regel aangevuld met `border-color:rgba(85,121,169,.45)!important`. De achtergrond, het plusteken, streepstijl, randdikte, afmetingen, klikacties, invoer of code zijn verder identiek gebleven.
- Broncode vóór/na GitHub: **het hele Worker-bestand behalve die ene CSS-regel byte-identiek**. Specifiek het eerder goedgekeurde `TALERA_HOME_MARKS_DENSITY` en `rewritePresentationDensity` (beide tijdlijnen) ongewijzigd.
- Geïsoleerde diepblauwe stijlworker opnieuw gepubliceerd op `2026-11-07T13:46:57.641289Z`, niet de functionele Worker, de officiële goedgekeurde basis of de oorspronkelijke gedeelde stijlworker.

### Browser-QA en grenzen
- Op de gehoste diepblauwe `/tell` in mobiel 360, 390 en 430 px breed is via de bestaande knop **zonder foto's vertellen** het al bestaande werkblad geopend, zonder persoonsgegevens, media of opnames op te slaan. De bestaande add-media-tegel heeft nu berekende rand `rgba(85,121,169,.45)`, nog altijd `dashed`, met bestaande responsive afmetingen ongeveer 105×105, 113×113 en 126×126 px.
- Bij alle drie breedtes blijft de kop exact 48 px hoog; de originele bestandenkiezer is aanwezig en blijft `accept=image/*,video/*` en `multiple=true` gebruiken.
- De eerdere goedgekeurde knopkleuren van **Vertellen**, **Schrijven**, **Plaatsen** en de datumknop zijn bij een werkbladinspectie correct. Er zijn geen opname- of videofuncties gestart of gewijzigd.
- **Geen re-design**, geen uitbreiding of extra speler/JS-laag, geen verandering aan presentatie, voice, camera, plaatsing, opslag, deelacties, vaste balken, tijdlijnberekeningen of PWA-versie. Nog steeds afzonderlijk iPhone-hardwareacceptatie nodig voor de vertelcyclus, foto/video, playback en opgeslagen herinneringen.

### Versies
- Huidige diepblauwe afbouw-/testkandidaat: `https://talera-closed-memory-diepblauw-test-20261107.mark-a39.workers.dev/mijn-leven`.
- Ongewijzigde door gebruiker goedgekeurde vorige voorkeursversie: `https://talera-closed-memory-core-test-20261106.mark-a39.workers.dev/mijn-leven`.
- Er is geen nieuwe officiële versie gepromoveerd en niets met persoonlijke lokale data gedaan.

### Aanvullende niet-destructieve bedieningstoets na UX-randcorrectie

- Op `/tell` via de bestaande keuze `Zonder foto's vertellen` en vervolgens `Vertellen` het **bestaande opnamepaneel** geopend. Headless-browser-screenshot op 390×844 bevestigt bestaande inhoud `Your story starts here`, paneel `Tell`, de knop `Opnemen` en `Klaar`. **Opnemen is niet aangeraakt**, er zijn geen microfoonrechten aangevraagd en geen opname gestart.
- In een tweede tijdelijke browsersessie opent de bestaande datumknop het originele modal met exacte datum, optie om de exacte dag niet te weten, `Bewaren` en `Cancel`. Geen datum aangepast of opgeslagen.
- De afzonderlijke `Schrijven`-toets toont het bestaande `taleraWriterOverlay` met tekstvak `taleraWriterText` en `Klaar`-knop `taleraWriterDone`. Er is geen tekst ingevoerd.
- Deze drie tests zijn **alleen het openen van panelen**: geen volledige regressietest van audio/video, foto-timing of bewaren. Het gemengde Engelse/Nederlandse label in de tests hangt samen met de testbrowser/locale en is niet in deze visuele CSS-ronde gewijzigd.

## Functionele eindcontrole — synthetische media en opname (7 november 2026)

**Gebruikersopdracht:** ga verder met de functionele eindcontrole, na de visuele UX-afbouw. **Deze ronde: volledig read-only onderzoek en synthetische testdata in geïsoleerde Cloudflare-browser. GEEN codewijziging of deployment.** Niet verwarren met een echte iPhone-proef en niet claimen dat het complete publiceren/afspelen als eindgebruikersflow op iOS al is gevalideerd.

### Browserproef met beeld en video, op bestaande `/tell`
- Bestaande knop "Zonder foto's vertellen" opent de huidige editor.
- Twee *verschillende* door de testbrowser gemaakte PNG's zijn via de bestaande `input[type=file]` toegevoegd. Er ontstonden twee onafhankelijke media-ID's en twee thumbnails; `#next` werkte van 1/2 naar 2/2 en het framebeeld veranderde.
- Nog een uitgebreide proef met twee synthetische PNG's + een **daadwerkelijk gegenereerde afspeelbare WebM-video** (browser-Canvas `captureStream` + `MediaRecorder`, geen statische preview als bron). Import leverde drie verschillende media-ID's; editor wisselde 1/3→2/3→3/3. Op 3/3 is het werkelijke `#frame > video` aanwezig met `readyState=4` en `videoWidth=96`, zonder importfout.
- Tijdens inspreken met dezelfde 3 media: `#frame > video` speelde **daadwerkelijk** (`paused=false`, `currentTime=0.326` seconden, `videoWidth=80`). Dit is relevant voor de eerder op iPhone opgetreden fout van alleen geluid bij een stilstaand videobeeld.

### Synthetische opname en tijdstempels
- `navigator.mediaDevices.getUserMedia` is **uitsluitend in de tijdelijke browser** gestubd met een echte Web Audio oscillator-stream. De bestaande TALERA-MediaRecorderfunctie werd gewoon gebruikt; er zijn **geen persoonlijke opnamen of microfoontoestemmingen**.
- Bestaande opnameknop ging van `Opnemen` naar `Stoppen` en terug; `Terugluisteren` verscheen, gekoppelde audio stond in een laadbaar `<audio>` element.
- Proef met 2 foto's + 1 video en een spreekopname van circa 1,15 seconden: uit daadwerkelijk opgeslagen browser-IndexedDB-manifest `talera-lifeline-dev-local-v1` zijn 3 media-ID's, opgeslagen stemopname, `voiceDurationMs=1151` en exact 4 cues teruggelezen: foto0 op 0ms, foto1 op 361ms, video2 op 632ms (`videoAtMs=0`), terug naar foto1 op 983ms. Cues bevatten de echte bestaande media-ID's, in oplopende tijd, zonder duplicatie.
- Onafhankelijke **daadwerkelijke horizontale TouchEvent-veegproef** met twee verschillende PNG's en synthetische audio: tijdens opnemen werd het frame 1/2 → 2/2; opnieuw opgeslagen en teruggelezen manifest bevatte exact twee cues (0ms foto0 en 442ms foto1) en `voiceDurationMs=629`. Geen dubbele registraties.
- Eerste swipe-test met twee identieke zwarte afbeeldingen telde niet: de bestaande duplicaatbescherming voorkwam invoer; de proef is opnieuw correct uitgevoerd met bewust verschillende PNG's. Geen softwarefout.

### Belangrijke gevonden UX-afwijking: pauze/hervatten verborgen
- In de bestaande opnamepaneelcode worden `#taleraV61RecPause` en `#taleraV61RecStop` **initieel met `hidden` opgebouwd**. De bronscriptinspectie vond geen `pause.hidden=false`/ `stop.hidden=false` code.
- In daadwerkelijk actieve recorderstatus (primaire knop `■ Stoppen`) zijn deze twee aparte knoppen nog steeds `hidden=true`, berekend `display:none` en `width=0`. **De gebruiker ziet dus geen pauze-/hervatknop.**
- Intern werkt de bestaande functie wel: een puur programmatische klik op het verborgen pauze-element meldt `Opname gepauzeerd.`, een tweede meldt `Opname hervat.`. De opname kon daarna worden gestopt, had een laadbare preview en werd als echt concept bewaard (`voiceDurationMs=677` in deze proef).
- **Geen code gewijzigd en geen knop geforceerd zichtbaar gemaakt in de app.** Dit betreft de beschermde vertelbediening; een gerichte oplossing moet eerst door de producteigenaar worden afgestemd op de eerder zorgvuldig goedgekeurde vertelcyclus. Of de knop in het huidige product bewust verborgen was, is nog niet bevestigd.

### Bestanden opnieuw opgeslagen en gelezen
- De bestaande `window.TaleraMemories.save/get/blob` lokaal (geen netwerkaccount/backend) is apart getest met twee PNG's, een afspeelbare WebM en een met echte `MediaRecorder` gegenereerd WebM-audiobestand. Na save→get→blob kregen alle vier items intacte, niet-lege media:
  - photo image/png 282 bytes
  - photo image/png 282 bytes
  - video video/webm 1074 bytes
  - audio audio/webm 6969 bytes.
- Narration-cues bleven aanwezig bij de readback. Na roundtrip had de videoblob `readyState=4`, afmetingen 80×80 en dus daadwerkelijk decodeerbare videodata. **Dit is een store-API-roundtrip, geen bevestiging dat de volledige UI-publiceerflow en presentatie automatisch correct afspelen.**

### Testgrenzen
- Uitgevoerd op headless Chrome met mobiel viewport 390×844, synthetische media en kunstmatige AudioContext-stream. Dit is geen Safari iPhone, geen HEVC/MOV/AVFoundation, geen echte cameratoestemming, geen fysieke aanraking of iOS-PWA-installatie.
- De volledige eindgebruikersketen `Plaatsen → Mijn leven → /present → audio-en-video synchroon terugkijken` is met een echte iPhone/testherinnering **nog niet voltooid**. Ook het daadwerkelijke afspelen van langer opgenomen persoonlijke iPhone-video's vraagt handmatige controle; video-in-de-opname is wel synthetisch bewezen.
- De huidige `/present` met twee eerder goedgekeurde tijdlijnen is niet gewijzigd; uitdrukkelijke bescherming van opname, media-ID's, timestamps en native inline-video is gerespecteerd.
- Testkandidaat `https://talera-closed-memory-diepblauw-test-20261107.mark-a39.workers.dev/mijn-leven` en goedgekeurde basis `https://talera-closed-memory-core-test-20261106.mark-a39.workers.dev/mijn-leven` beide **ongewijzigd** in deze testronde.

## Presentatie: social/terug/bewerken — alleen kleurafwerking (7 november 2026)

**Aanleiding:** gebruiker stuurde iPhone-screenshot met omhooggetrokken witte leeslaag. Onderin waren het hartje, de berichtenballon, de deelactie en de tellers nauwelijks zichtbaar (wit op zeer lichte achtergrond); bovendien hadden de ronde Terug- en Bewerkenknop verschillende kleuren.

**Geautoriseerde grens:** alleen CSS-kleuren, contrast, borders en schaduwen. Geen wijzigingen aan posities, groottes, scroll-/swipe-/timingcode, navigatie, interacties, opname-, foto-, video-, audio-, timeline- of opslagfuncties. De gebruiker heeft de complete vertelcyclus reeds goedgekeurd en die blijft onaangeroerd.

- Herstelbranch: `backup/deepblue-before-presentation-social-button-style-20261107`.
- CSS-sourcecommit: `42d296f1d54fc096230c8dcb2238e5775add378b`.
- Eén bestaande CSS-string `TALERA_MORE_CONTENT_ONLY_CSS` aan de bestaande geïsoleerde stijlworker toegevoegd met **uitsluitend** selectoren `body:not(.talera-recipient-presentation) #talera-flow-home`, `#talera-v5-editor-pencil` en `body.talera-v18-reading:not(.talera-recipient-presentation) #talera-clean-social` inclusief de daarin liggende buttons en actieve hartjes-SVG. Alle bestaande CSS vóór de uitbreiding is byte-identiek.
- De beide ronde knoppen hebben nu identiek `background rgba(7,26,61,.80)`, wit pictogram, witte rand `rgba(255,255,255,.82)` en dezelfde zachte schaduw. Bestaande radius, 45×45px, positie, href/acties en alle scripts onaangeraakt.
- **Uitsluitend in de bestaande leesstand** `body.talera-v18-reading`: reactiebalk `background rgba(247,245,240,.97)`, rand `rgba(85,121,169,.48)`, donkerblauwe button-/teller-/SVG-stroke-kleur `#071A3D` en donkere actieve hartvulling. De originele rustige fotostand van de reactiebalk blijft wit op translucent glas. Geen extra klasses, JS, events of renderlagen.
- Cloudflare-deployment naar alleen bestaande `talera-style-diepblauw-20261107`, tijd `2026-11-07T15:56:19.225679Z`.
- Browser-Rendering op de **daadwerkelijk gepubliceerde URL** bij viewport 360×844, 390×844 en 430×844: alle drie breedtes geverifieerd vóór scroll (photo mode) en na `#memoryStoryScroll` naar leesstand (body krijgt bestaande `talera-v18-reading`). De beide 45×45px knoppen waren in beide toestanden gelijkgekleurd; hun geometrie bleef intact. Sociale toolbar bleef 168×60px en op dezelfde horizontale positie, met nieuwe donkere SVG-stroke en tellers in leesstand. In fotostand bleef de originele `rgba(250,252,255,.2)` achtergrond met witte pictogrammen behouden.
- Visueel geëvalueerd met browser-screenshot van omhooggetrokken leeslaag op 390×844: hart, reactieballon, deelicoon en tellers zijn duidelijk diepblauw tegen ivoor; Terug en Bewerken dragen dezelfde diepblauwe stijl.
- GitHub bron-DIFF is exact: alle andere Worker-code **en alle bestaande CSS** behalve de aangehechte 1138 CSS-karakters volledig identiek. Beide tijdlijnfuncties `TALERA_HOME_MARKS_DENSITY` en `rewritePresentationDensity`, de 29 presentatiecontrollers, photo/video/audio en alle andere routes zijn niet gewijzigd.
- Geen promotie naar de officiële 6-novemberversie; persoonlijke iPhone-acceptatie van deze stijlwijziging nog door gebruiker te doen.

**Huidige testlink:** `https://talera-closed-memory-diepblauw-test-20261107.mark-a39.workers.dev/present`.
**Onaangeroerde goedgekeurde voorkeursversie:** `https://talera-closed-memory-core-test-20261106.mark-a39.workers.dev/mijn-leven`.

## Presentatie: glasstijl knopjes en gecentreerde terugchevron — 7 november 2026

Gebruiker stuurde screenshot van gewone foto-/presentatiestand. De ronde Terugknop en Bewerkenknop waren nog **donkerblauw**, terwijl de bestaande socialmediabalk een **lichte transparante frosted-glass stijl** gebruikte. Gebruiker wilde uitdrukkelijk dat beide knopjes dezelfde kleurstijl als de socialmediabalk krijgen en dat de terugpijl optisch exact gecentreerd wordt. **Alleen CSS toegestaan, geen technische/gedragswijzigingen.**

### Uitvoering
- Herstelbranch vóór aanpassing: `backup/deepblue-before-glass-buttons-arrow-center-20261107`.
- GitHub codecommit: `4af215c1616326b1bffbb29afbd4e07f5943a558`.
- Bestaande stijlworker `talera-style-diepblauw-20261107` bijgewerkt op `2026-11-07T16:14:57.211256Z`. Alleen diepblauwe testkandidaat; officiële voorkeursworker van 6 november niet gewijzigd.
- Toegevoegd aan bestaande presentatiestijlconstante `TALERA_MORE_CONTENT_ONLY_CSS`; verder **volledige Worker-bron byte-identiek** aan herstelbranch, en alle reeds bestaande CSS volledig behouden. Geen HTML, JS, opname-, media-, timeline-, player-, sharing- of navigatiewijziging.
- In normale fotostand nu beide ronde `#talera-flow-home` en `#talera-v5-editor-pencil` identiek aan `#talera-clean-social`: `background rgba(250,252,255,.20)`, `border rgba(255,255,255,.72)`, `backdrop-filter blur(18px)`, `box-shadow rgba(0,0,0,.20) 0 5px 22px`; witte iconen met subtiele donkere leesbaarheidsschaduw.
- In bestaande omhooggetrokken leesstand `body.talera-v18-reading`: beide knoppen wijzigen exact mee met socialbalk naar `background rgba(247,245,240,.97)`, `border rgba(85,121,169,.48)`, `box-shadow rgba(7,26,61,.15) 0 4px 18px` en donkerblauwe iconen `#071A3D`.
- Terugpijl stond door font-basislijn optisch iets te laag. Bestaand anker `#talera-flow-home` blijft met originele `href=/`, formaat 45×45 en klikvlak. Alleen oorspronkelijke typografische glyph visueel onderdrukt met `font-size:0` en een geometrisch gecentreerde CSS-chevron via `::before` getekend (`15×15px`, 4px gekantelde randen, `top:50%`, `left:calc(50% + 2px)` als optische x-correctie, `rotate(45deg)`, `pointer-events:none`). Geen nieuwe DOM of scripts. De visuele centrering is in browser-screenshots voor foto- en leesstand bekeken.

### QA
- Headless-browsercontrole op **gepubliceerde** diepblauwe `/present` bij 360×844, 390×844 en 430×844, telkens normale fotostand én omhooggeschoven leesstand.
- In alle 6 gevallen is de complete glaskleur-/rand-/schaduw-/blurset van Terug en Bewerken **exact gelijk** aan het reactieblok. De knopdiameter bleef 45×45, positie links 15px / rechts 15px, y=116px; de socialbalk bleef 168×60. De teruglink is nog `href=/`, het pseudo-chevron is `pointer-events:none`.
- Browser-Rendering-screenshots vóór deployment in de twee toestanden visueel nagekeken, inclusief scherp getekende, gecentreerde chevron. Het eerste prototype met SVG-mask is NIET geïnstalleerd, omdat dat bij preview leeg kon lijken; gekozen oplossing is uitsluitend robuuste CSS-randen.
- GitHub bronvergelijking tussen herstelbranch en actieve code: **alle tekst behalve exact de toegevoegde 2136 CSS-tekens aan bestaande CSS-constante is byte-identiek**. Beide eerder goedgekeurde tijdlijnlogica’s, complete vertelcyclus en alle 29 presentatiecontrollers onaangeroerd.
- Nog geen echte iPhone-acceptatie van dit nieuwe uiterlijk; gebruiker kan de live testlink beoordelen. Geen promotie naar de officiële goede basisversie.

**Testlink:** `https://talera-closed-memory-diepblauw-test-20261107.mark-a39.workers.dev/present`.
**Oude officiële werkende versie:** `https://talera-closed-memory-core-test-20261106.mark-a39.workers.dev/mijn-leven`.

## Automatische, subtiele fotocontrastkeuze — 7 november 2026

Gebruiker vroeg om **slechts twee subtiele kleurgradaties** van de terug- en bewerkknop op `/present`: behoud de al goedgekeurde lichte glasstijl op normaal/donker fotomateriaal, en zet bij bijna wit beeld automatisch naar een **net iets grijzere, goed leesbare** glasvariant. De gebruiker corrigeerde ons toen een eerste testuitvoering te donkerblauw was: "niet meteen naar diep blauw". Die correctie is onmiddellijk gepubliceerd vóór deze QA-afronding.

### Implementatie, uitzonderlijk alleen visuele software
- GitHub herstelbranch vóór automatische contrastdetectie: `backup/deepblue-before-auto-photo-contrast-20261107`, bron SHA vooraf `36cf5e81be6cfb0ace28fd87275f1fb3c2bb8930`.
- GitHub tijdelijke commit `89f661e5ae94f29b35753d4688c39c1cdcc35325` bevatte te donkere `rgba(7,26,61,.38)` glasstand; gebruiker heeft dit meteen gecorrigeerd. **NIET de finale geaccepteerde kleur**.
- Correctie GitHub commit `f2ff69e834b7dea76c5d2b42d908d83ab7780ca7`: sterkere maar **zacht rookgrijze** contraststand `rgba(206,213,221,.80)`, pictogram `#405267`, lichte rand `rgba(255,255,255,.84)` en zachte grijze schaduw. Geen diepe donkerblauwe knop. Oorspronkelijke transparant-witte glasstand blijft intact als norm.
- Eén *uitsluitend visueel* script `TALERA_PRESENT_AUTO_GLASS_JS` ingespoten in bestaande `/present` HTML-head om lokale luminantie van de zichtbare foto achter de twee knoppen te meten: bij een van de twee bijna witte delen kiezen **beide knoppen samen** de grijze variant. CSS-class via `data-talera-photo-contrast="strong"`; geen knopvervanging, eventlisteners op knoppen of tijdlijncode gewijzigd. Berekent gemiddelde lineaire sRGB-luminantie met 12x12 pixels per knop op downscaled, CORS-safe afbeelding (`fetch` en `createImageBitmap`). Een bron zonder leesrechten faalt zonder dat media/speler geraakt worden en laat de standaard lichte glasstand staan. Fotowissels volgen bestaande DOM-mutaties; video-check slechts elke 2,5s; hysterese `0.73` aan / `0.65` uit voorkomt nerveus wisselen. Geen netwerkverkeer naar een nieuwe dienst; alleen ophalen van de al getoonde foto indien browser dat toestaat.
- Initiële boot is na test aangepast: presentatiewerkblad bouwt navigatieknoppen soms na `DOMContentLoaded` op; daarom wacht de **visuele helper** maximaal 80×180ms tot de bestaande knoppen en fotostage beschikbaar zijn. Dit raakt geen presentatietechniek.
- In omhooggetrokken leesstand blijven de bestaande ivoorkleurige knoppen, donkerblauwe iconen en socialbalk **exact ongewijzigd**.
- Uit GitHub bronvergelijking herstelbranch tegen huidige branch blijkt: alle oorspronkelijke bronnen buiten (1) een aangehechte ~735-karakter CSS-regel aan bestaande presentatiestijlconstante, (2) de nieuwe geïsoleerde contrastanalyse-scriptconstante (~5.181 tekens) en (3) een `script`-inclusie in de reeds bestaande `/present`-stijlroute zijn byte-identiek. Met name `TALERA_HOME_MARKS_DENSITY`, `rewritePresentationDensity`, `drawDensity`, vertelcyclus, audio/video/recorder, tijdstempels, media-ID, opslag, swipe en navigatie onaangeroerd.
- Alleen geïsoleerde Cloudflare teststijlworker `talera-style-diepblauw-20261107` is bijgewerkt, gecorrigeerde deploy `2026-11-07T16:31:28.662966Z`; de goedgekeurde bron van 6 november is niet gewijzigd.

### Tests
- Browser-Rendering op actuele `/present`, zonder aangepaste appdata, viewport 360x844/390x844/430x844. Bij de bestaande lichte foto is de **echte door de app gekozen** status `strong` voor beide 45×45px knoppen, met exact berekende `rgba(206,213,221,.80)` achtergrond en iconen `rgb(64,82,103)`.
- Na tijdelijk in de geïsoleerde browser vervangen van de zichtbare afbeelding met een donker `data:image/png` fixture schakelt de automatische helper zelfstandig terug naar `normal`; beide behouden de bestaande `rgba(250,252,255,.20)` glasachtergrond en witte iconen. De testafbeelding wordt niet opgeslagen, gepubliceerd of verwerkt in gebruikersdata.
- Na omhoogscrollen naar de bestaande `talera-v18-reading` toestand krijgen beide knoppen onafhankelijk van de tijdelijke fotostatus weer exact dezelfde `rgba(247,245,240,.97)` achtergrond en `rgb(7,26,61)` iconen als de socialbalk. Normale socialbalk is ongewijzigd.
- Geometrie bleef op alle schermbreedtes 45×45px, back-knop links 15px, edit-knop rechts 15px, y 116px. Teruglink blijft `href=/`; de CSS-gecentreerde terugchevron blijft ongewijzigd.
- De volledige, gecorrigeerde actuele staging op 390px is ook per Browser-Rendering screenshot visueel gecontroleerd: beide iconen zijn goed leesbaar op licht fotodeel en knoppen ogen lichtgrijs, niet diepblauw.
- Betreft *automatische browsertests*, geen echte iPhone Safari/PWA-hardwareacceptatie. Bij afbeeldingen waarop browser CORS het uitlezen weigert, blijft (veilig) de standaardglasstijl zichtbaar; dat is een bekende beperking van helderheidsdetectie en geen verandering aan media-/presentatiefunctionaliteit.

**Testlink:** `https://talera-closed-memory-diepblauw-test-20261107.mark-a39.workers.dev/present`.

**Onaangeroerde goedgekeurde versie:** `https://talera-closed-memory-core-test-20261106.mark-a39.workers.dev/mijn-leven`.

## Presentatie: kleinere neutraalgrijze terugchevron — 7 november 2026

Gebruiker vroeg na de automatische rookgrijze contrastregeling de **zichtbare terugchevron ("vinkje") kleiner te maken en expliciet geen donkerblauw te gebruiken**. De knop zelf, bewerkknop en alle presentatietechniek moesten behouden blijven.

- Herstelbranch: `backup/deepblue-before-small-neutral-back-chevron-20261107`.
- Broncommit: `ac63a759c5b222cfd1d46c77da247363e0bbad23`.
- Uitsluitend een optellend CSS-blok aan de bestaande `TALERA_MORE_CONTENT_ONLY_CSS` toegevoegd. De bestaande `#talera-flow-home::before`-chevron is van 15×15 naar **12×12px** en de lijn van 4 naar **3px** gebracht. Optische centrering `left:calc(50% + 1.5px)` i.p.v. +2px; subtiele neutraalgrijze schaduw. In sterke lichtfoto-contraststand en op ivoorkleurig tekstscherm worden beide chevronranden **`#606266`**, RGB 96,98,102; de standaard witte foto-op-donkere-foto-chevron blijft behouden. Geen donkerblauw in de grijze chevron.
- Knopdiameter 45×45px, teruglink `href=/`, positie (x=15, y=116), bewerkknop, sociale balk, foto/video/audio en de automatisch wisselende rookgrijze achtergrond zijn volledig ongewijzigd. Geen JS-, HTML- of dynamische logica-aanpassing; slechts deze CSS.
- Cloudflare deploy van alleen de bestaande diepblauwe stijlworker `talera-style-diepblauw-20261107` op `2026-11-07T16:46:04.133305Z`. De goedgekeurde 6-novemberkern onaangeroerd.
- Browser Rendering QA op de gepubliceerde `/present`, **360×844, 390×844 en 430×844**; in foto-/lichte-contraststand én omhooggetrokken leesstand worden voor de chevron daadwerkelijk 12×12px, 3px-randen en `rgb(96,98,102)` gemeten. Het bestaande 45×45px klikvlak en de href blijven ongewijzigd. Een voorafgaande screenshotproef van deze CSS is visueel gecontroleerd.
- Testlink `https://talera-closed-memory-diepblauw-test-20261107.mark-a39.workers.dev/present`. Definitieve iPhone-acceptatie door gebruiker nog te doen.

## Verkleining terugpijltje naar 9 px — 7 november 2026
Gebruiker vroeg om directe uitvoering van circa 25% verkleining van het terugpijltje, zonder bouwprompt of wijziging aan de klikknop. Herstelbranch `backup/deepblue-before-9px-neutral-chevron-20261107`; sourcecommit `188edd7b1fa219d80c81460ed380d24386237fe4`. Alleen het bestaande CSS-pictogram in `#talera-flow-home::before` gewijzigd: 12×12 → 9×9 px, randdikte in CSS 3→2,25 px, optische x-offset +1,5→+1 px. Neutraalgrijze kleur `#606266` op lichte fotostand/leesstand behouden; witte kleur op donkere foto behouden. Button zelf blijft 45×45px, href `/`, geen JavaScript-/HTML-/bedienings-, media-, vertel-, opslag- of tijdlijnwijziging. Codevergelijking: buiten de bestaande presentatiestijlconstante volledige Worker-bron byte-identiek: `true`. Alleen geïsoleerde stijl-Worker `talera-style-diepblauw-20261107` gepubliceerd `2026-11-07T16:53:47.594605Z`. Op live gepubliceerde /present automatisch gecontroleerd op breedtes 360/390/430 px: 9×9 px terugpijltje; browser rondt 2,25 px in berekende rapportage af tot 2 px; 45×45 px button ongewijzigd; tekst-/fotostand en contrastkleur intact. Screenshot op 390 px visueel gecontroleerd. Voorlopig alleen testversie; goedgekeurde kernversie van 6 november niet aangepast.

## Presentatie: ronde knopvlakken 25% kleiner, pictogrammen behouden — 7 november 2026
Gebruiker gaf expliciet opdracht niet opnieuw de pictogrammen te verkleinen maar alleen beide bestaande ronde knopvlakken 25% te laten krimpen; gewenste 45×45px naar afgerond 34×34px, met bestaande iconen en functies intact. Herstelbranch `backup/deepblue-before-34px-presentation-circles-20261107`; GitHub broncommit `22564540cd5b6d30f2aa73bfc9e1e6c36df0ee09`. Wijziging uitsluitend aanvullende 617 karakters CSS in de bestaande presentatie-stijlconstante, geen JavaScript/HTML/media/tijdlijn/opnamelogica veranderd. Back en Edit 34×34px, beide nog ronde 50%-vormen; centrumpunten behoudend via top=121,5px (voorheen 116px voor 45px), left back=20,5px (voorheen 15px); right edit=20,5px (voorheen 15px). Terugpijl blijft 9×9px (CSS-rand 2,25px), neutraalgrijs in sterke lichtfoto/leesstand; potlood blijft font-size 23px. Automatische contrastkleuren en sociale balk volledig intact. CSS-only source check: `true`. Alleen stijlworker `talera-style-diepblauw-20261107` gepubliceerd 2026-11-07T16:59:08.046624Z. Live Chrome browser QA op 360/390/430 breed, foto- en leesstand: beide werkelijk 34×34 px; knoppen op dezelfde middellijn, potlood 23px, terugchevron 9px, kliklink href=/ behouden. Geen gepersonaliseerde opslag aangepast; goedgekeurde 6-novemberkern niet gepromoveerd of gewijzigd. Testlink `https://talera-closed-memory-diepblauw-test-20261107.mark-a39.workers.dev/present`.

## PWA-positiecorrectie: terug- en bewerkknop exact naast datum (7 november 2026)

**Probleem gemeld en met screenshot onderbouwd door gebruiker:** na installeren van diepblauwe /present als iPhone-beginscherm-PWA staan de zichtbare 34px terug-/bewerken-cirkels rond dezelfde Y-positie als de tijdlijn, in plaats van horizontaal naast de datumindicator. In browserweergave met andere bovenmarges leek dit eerder wel goed.

**Oorzaak:** eerdere CSS hardcodeerde op `#talera-flow-home` en `#talera-v5-editor-pencil` de **interactieve** knoppositie `top:116px!important`, terwijl de datumknop `#focusText` in de bestaande `#surface`-tijdlijn van verticale positie verandert afhankelijk van viewport/safe-area/standalone presentatie. Het oorspronkelijke visuele midden van de knoppen hoorde uitgelijnd te zijn met `#focusText`, niet vast aan de bovenrand van het apparaat.

**Aanpak — geïsoleerde visuele correctie**
- Herstelbranch: `backup/deepblue-before-pwa-presentation-button-alignment-20261107`.
- GitHub sourcecommit `b527511b282895f008ac878b68783e72092f668a`.
- **CSS-only positionering + kleine alleen-visuele meethelper, GEEN tijdlijn-/presentatiefunctie-aanpassing:** nieuwe CSS `top:var(--talera-presentation-nav-top, calc(116px + env(safe-area-inset-top,0px)))!important` voor beide bestaande knoppen. Een geïsoleerde niet-interactieve `TALERA_PRESENT_NAV_ALIGN_JS` met ID `talera-date-aligned-controls` leest de bestaande DOM-rechthoek van `#focusText` en van de knop en zet alleen de root-CSS-variabele met de feitelijke hoogte `date.top + date.height/2 - back.height/2`. Het is een positioneringscorrectie van de bestaande knoppen; geen vervanging van elementen, eventlisteners, links of knoppen.
- Opstart wacht beperkt op dynamisch opgebouwde bestaande elementen; updates bij relevante bestaande style/class-mutaties, grootteaanpassingen, viewport/orientation/pageshow en opstart. Geen wijziging aan `drawDensity`, zoom, foto/video, opname, audio, vertellen, scripts of opslag.
- De **zichtbare** twee glas-cirkels blijven 34×34px (via `::after`), **echte klikvlakken** blijven 45×45px; pijltje 9×9px, potloodlettergrootte 23px, twee automatische grijs-/glasstijlen, sociale balk en alle functies ongewijzigd.
- Gewijzigd uitsluitend de reeds bestaande CSS-stijlstring (+308 karakters), één nieuwe geïsoleerde visuele JS-helper (2057 tekens) en één `/present` head-scriptimport. GitHub **reversibiliteitscontrole**: door uitsluitend deze drie stukken uit de bijgewerkte Worker te verwijderen is de volledige bron **byte-identiek** aan herstelbranch; alle oorspronkelijke scripts, de presentatie-rendering en beide tijdlijnen zijn ongewijzigd.
- Cloudflare publicatie uitsluitend naar `talera-style-diepblauw-20261107` op `2026-11-07T17:14:28.381071Z`. Officiële november 6-kern en overige functionele Workers niet gewijzigd.

**QA op gepubliceerde diepblauwe /present**
- Browser Rendering op 360, 390 en 430 px, normale foto- en opgetrokken leesstand: date-center, back-center en edit-center zijn **alle drie gelijk** (in de basis **Y=138,796875px**).
- Voor de PWA-verschijningsvorm de bestaande `#surface` **in de vlucht 52px naar beneden verschoven** (tijdelijke, niet-opgeslagen testfixture). Dat bracht de datum naar **Y=190,796875px**. De twee knoppen schakelden automatisch mee naar **precies hetzelfde Y=190,796875px**, in foto- en leesstand. De vorige hardcoded top=116px bleef achter en was hierdoor de zichtbare fout; nu opgelost in de simulatie.
- Browser screenshot van deze verplaatste testweergave visueel nagekeken: de ronde knoppen en datum liggen horizontaal op één lijn, in tegenstelling tot de gebruikersscreenshot.
- Hit-testing links/rechts van de zichtbare cirkels blijft `talera-flow-home` respectievelijk `talera-v5-editor-pencil`; klikvak 45×45, beide rondjes 34×34, iconen en kleurregeling behouden.
- Bestaande teruglink daadwerkelijk geactiveerd op live testpagina: navigeert naar `TALERA · My life`.
- Bewerkenklik in geïsoleerde browser getest met tijdelijk gesimuleerd eigen `rt.currentMemory()` (omdat de 500 voorbeeldverhalen bewust niet bewerkbaar zijn): opent bestaande `TALERA · Tell your story`-route. Geen echte data of records opgeslagen.
- Dit is **geen fysieke iPhone-standalone-acceptatietest**. Gebruiker moet de nieuwe /present op zijn geïnstalleerde iPhone PWA beoordelen; eventueel PWA opnieuw openen om oude weergave te verversen. Geen door ons uitgevoerde wijzigingen aan manifest of PWA-installatie.

**Testlink:** `https://talera-closed-memory-diepblauw-test-20261107.mark-a39.workers.dev/present`.
**Vorige goedgekeurde basis:** `https://talera-closed-memory-core-test-20261106.mark-a39.workers.dev/mijn-leven` — onaangeroerd.
