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
