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
