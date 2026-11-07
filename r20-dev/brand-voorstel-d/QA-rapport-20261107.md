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
