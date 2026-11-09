# TALERA Free F5 — één strikt gescheiden integratiepad (8 november 2026)

## Gebouwd
- Eén nieuwe, losstaande Worker-entrypoint met zeven afzonderlijke SQLite Durable Object classes: account/email/handle/sessie/rate en verhaal/deelkoppeling.
- Authenticeert sociale verzoeken via dezelfde Httponly TALERA-sessiecookies als de nieuwe authpilot. Externe QA-identiteitsheaders worden altijd verwijderd en de server tekent de actor alleen na sessiecontrole. Daardoor is een willekeurige actor-ID uit browserheaders nooit gezaghebbend.
- Registratie met verplichte geldige geboortedatum; de datum staat in het individuele account-object. `GET /api/me`, `/api/profile/birthdate`, profielwijziging, login/logout en sociale deel-/intrek-routes lopen via dezelfde oorsprong.
- Levert de byte-gecontroleerde anonieme TALERA-schermen plus vier twee keer gecontroleerde originele openbare /__clean JavaScripts; gebruikt alleen officiële anonieme broncode. Er is geen fallback naar de bestaande TALERA-backend.
- **Nieuw: persoonlijke F5-schermen** `/mijn-leven` en `/present` halen de geldige sessie én eigen geboortedatum uit dezelfde account-DO, passen de reeds goedgekeurde tijdlijntransformatie toe op de originele bron-HTML en leveren eigen private/no-store HTML. Bij ontbrekende datum/bronmarker is er expliciet een veilige fout.
- **Nieuw: testbare browsertoegang** via een korte, serverondertekende HttpOnly testcookie na sleutelcontrole. De pagina hoeft geen wachtwoord of sessiegeheim in eigen JavaScript of URL op te nemen. De Free-sessie blijft een aparte cookie. Overige nog niet overgezette API-routes falen gesloten.

## Harde grenzen / nog niet klaar
- De oorspronkelijke `TaleraMemories.save()`-opslag met **fictieve foto, video en audio**, bewaarde cue-volgorde en tijdstempels, teruglezen op beide tijdlijnschermen en **gescheiden IndexedDB per account** is op de echte EU-F5-testworker geslaagd in Chromium met mobiel iPhone-schermprofiel. Dit bewijst nog **geen fysieke iPhone/Safari microfoon-/camera-opname**. Berichten/discovery/legacy-uploadroutes behoren niet tot deze pure lokale Free-verhaalopslag.
- **Echte F5 EU-staging is wel uitgerold** onder `talera-free-f5-combined-stage-20261108` met zeven nieuwe DO-klassen en afgesloten QA-toegang; dit is **niet** de officiële TALERA-PWA en bevat geen originele account-/media-bindings. De QA-sleutel is bewust niet in publieke code verwerkt. Er is geen productieomschakeling of oude accountmigratie uitgevoerd.
- Geen legacy-gebruikers- of media-overdracht. Geen bestaande echte accounts, data, oorspronkelijke PWA, D1 of R2 gewijzigd.
- De synthetische identiteits-/stagingkeys mogen niet in productie worden gebruikt.
- Geen bewijs voor tien miljoen gebruikers of globale kosten/limieten. Niet mergen, omschakelen of productie uitrollen zonder expliciete toestemming.

## Gecontroleerd testbewijs

GitHub Actions [42511659255](https://github.com/Marksmits1972/talera-lifeline/actions/runs/42511659255): **succesvol** — zes anonieme officiële GET-snapshots, vier geverifieerde `/__clean` JavaScripts, Wrangler bundling, zeven lokale echte DO-klassen, drie fictieve accounts, één fictief sociaal verhaal, accountgebonden persoonlijke schermen, afgeschermde browsercookie, session/logout, shares/revocations en behoud bij herstart. Deze run test de lokale uitvoering, niet miljoenen gelijktijdige verzoeken of echte Safari.

## Browser- en cloudbewijs (laatste resultaten)

- **Echte EU-run [42516137777](https://github.com/Marksmits1972/talera-lifeline/actions/runs/42516137777): GESLAAGD.** Twee fictieve accounts, sociaal verhaal, sessies en delen, plus een echte Chromium-browser met mobiel iPhone-schermprofiel. In die browser is de originele Free-localstore met **fictieve foto, MP4-video en WAV-audio** getest: na herladen zijn bestanden, narratiecue-indices `[0,1,0]`, tijdstempels `[0,1000,2000]`, video-offset `100` ms en audio-duur 3000 ms intact. Beide tijdlijnpagina's vinden dezelfde herinnering. Een tweede account leest deze niet; terugwisselen naar het eerste account toont het verhaal opnieuw. Nul page errors.
- **Headless WebKit Linux is ongeschikt voor deze Blob-opslagmeting:** zonder enige TALERA-code faalde een lege IndexedDB-test bij het bewaren van zowel een eenvoudige `Blob` als een `File` met `UnknownError: Error preparing Blob/File data to be stored in object store`, terwijl een eenvoudige tekstwaarde wel werd opgeslagen. Zie [run 42515888619](https://github.com/Marksmits1972/talera-lifeline/actions/runs/42515888619). Daarom is niets aan de goedgekeurde recorder veranderd. Dit is een Linux-testomgeving, geen bevestiging van Safari/iOS-gedrag.
- **Nog één echte iPhone/Safari acceptatie** van camera/microfoon, swipes en presentatie in originele speler. Geen nieuwe backendarchitectuur bouwen of de vertelcyclus herschrijven voor een WebKit-testomgeving die standaard geen Blob kan opslaan.

## Afgebakende testpoorten
1. **F5a CI, in deze PR**: bouw anonieme schermen uit zes GETs, bundel Cloudflare Worker zonder deploy, test F5 echt in lokale Wrangler runtime: 3 fictieve accounts, 1 fictief verhaal, datumisolatie, dubbelcheck van sessie-auth, header-spoofing geblokkeerd, grant/revoke, share/revoke, cookie-logout en restartpersistentie. Resultaat alleen geldig als de GitHub-run groen is.
2. **F5b**: werkende officiële Free-UI-API contracten op afzonderlijke staging met fictieve verhalen, zonder prod-backendfallback. Alle bestaande vertel-/presentatie-/tijdlijn-regressies controleren op iPhone/Safari.
3. **F6**: oplopende beperkte loadmetingen, p95/p99, hotspot, budget/limieten en expliciete beslissing of de 10M-doelstelling aannemelijk/bewijsbaar is.

## Stopregel
Geen eindeloos testen. Alleen een falende harde poort repareren en die poort opnieuw testen; geen zijprojecten. Free pas 'klaar' na de afgesproken functionele, privacy-, schaal- en browseracceptatie. Premium tot die tijd niet starten.

## Verwantschap
PR #93 (Static Assets) -> #94 (account-DOB DO) -> #95 (account/sessie DO) -> #96 (social DO) -> **deze F5 branch**.

## 9 november 2026 — oorspronkelijke Free-API-audit, minimaal herstel

De laatste geïsoleerde opslag-only CI (run 42638659480) vond **11 statische API-prefixen**, waarvan twee rechtstreeks in de nieuwe F5-gateway worden genoemd en **negen** op bronverwijzingen berustten. Een stringverwijzing bewijst niet dat een route in normale Free-interactie actief is. De negen zijn gegroepeerd om geen onnodige backend te herbouwen:

- `/api/version`: de oorspronkelijke Mijn leven/Presentatie-scripts vragen bij openen/focus `/api/version?check=<timestamp>` op. De F5-gateway wees de query voorheen af. Nu uitsluitend een GET met precies één tijdstempelparameter, plus een GET zonder parameters, beantwoord met exact de bestaande originele `CURRENT`-versie; CI vergelijkt met beide originele bronnen en checkt QA-gate, extra parameters en POST.
- `/api/v25/social`: bron verwijst naar een `v25-demo-1450`-testcontext. Niet verwarren met de daadwerkelijk gescheiden `__social`-DO-API; geen stille doorverbinding of gedragwijziging.
- `/api/account-social`, `/api/account-social/stories`, `/api/linked/stories`, `/api/integration/stories`: de originele bron kent eerdere servergestuurde verhaal-/deelroutes, waaronder server-mediarequests. De nieuwe Free-bibliotheek bewaart bestanden lokaal. Niet naar de bestaande klantbackend doorsluizen en niet doen alsof die oude serververhalen beschikbaar zijn.
- `/api/v12-invites/story`, `/api/v12-invites/revoke`, `/api/share-preview/meta`: eerdere uitnodigings- en server-voorvertoningsroutes. Hun complete media-/privacy-/ontvangerscontract is voor strikt lokale Free-herinneringen nog niet als interoperabel bewezen. Geen ongevraagde media-upload, tijdelijke R2-kopie of alternatieve deel-UX toevoegen.

**Status:** uitsluitend de concreet aangetoonde gewone versiecheck is in de geïsoleerde F5-bron hersteld; de acht andere legacy/demo-verwijzingen blijven veilig afgewezen en zijn **geen bewijs dat alle oude deel-/ontvangersfuncties al werken**. De echte Free delen/ontvangen-acceptatie staat open. Behoud van officiële PWA, verhalen, originele media, design-cleanup-UI en centrale linkregister is ongewijzigd. Nieuwe commit nog niet uitgerold; eerst CI.
