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
