# TALERA Free F5 — één strikt gescheiden integratiepad (8 november 2026)

## Gebouwd
- Eén nieuwe, losstaande Worker-entrypoint met zeven afzonderlijke SQLite Durable Object classes: account/email/handle/sessie/rate en verhaal/deelkoppeling.
- Authenticeert sociale verzoeken via dezelfde Httponly TALERA-sessiecookies als de nieuwe authpilot. Externe QA-identiteitsheaders worden altijd verwijderd en de server tekent de actor alleen na sessiecontrole. Daardoor is een willekeurige actor-ID uit browserheaders nooit gezaghebbend.
- Registratie met verplichte geldige geboortedatum; de datum staat in het individuele account-object. `GET /api/me`, `/api/profile/birthdate`, profielwijziging, login/logout en sociale deel-/intrek-routes lopen via dezelfde oorsprong.
- Levert de byte-gecontroleerde anonieme TALERA-schermen plus vier twee keer gecontroleerde originele openbare /__clean JavaScripts; gebruikt alleen officiële anonieme broncode. Er is geen fallback naar de bestaande TALERA-backend.
- **Nieuw: persoonlijke F5-schermen** `/mijn-leven` en `/present` halen de geldige sessie én eigen geboortedatum uit dezelfde account-DO, passen de reeds goedgekeurde tijdlijntransformatie toe op de originele bron-HTML en leveren eigen private/no-store HTML. Bij ontbrekende datum/bronmarker is er expliciet een veilige fout.
- **Nieuw: testbare browsertoegang** via een korte, serverondertekende HttpOnly testcookie na sleutelcontrole. De pagina hoeft geen wachtwoord of sessiegeheim in eigen JavaScript of URL op te nemen. De Free-sessie blijft een aparte cookie. Overige nog niet overgezette API-routes falen gesloten.

## Harde grenzen / nog niet klaar
- De beide persoonlijke tijdlijn-HTML-transformaties zijn in een echte **lokale Cloudflare-runtime** technisch bewezen; dit is nog **geen volledige iPhone/Safari browseracceptatie**. De oorspronkelijke teller, foto's, video, audio, vertellogica, berichten, discovery en lokale herinneringsopslag moeten als complete gebruikersstroom nog worden gecontroleerd.
- De **browser-testtoegang is in code gebouwd en lokaal getoetst**; een definitieve openbaar bruikbare F5-testlink is nog niet uitgegeven. Er is geen Cloudflare productie- of EU-stagingdeployment van F5 uitgevoerd.
- Geen legacy-gebruikers- of media-overdracht. Geen bestaande echte accounts, data, oorspronkelijke PWA, D1 of R2 gewijzigd.
- De synthetische identiteits-/stagingkeys mogen niet in productie worden gebruikt.
- Geen bewijs voor tien miljoen gebruikers of globale kosten/limieten. Niet mergen, omschakelen of productie uitrollen zonder expliciete toestemming.

## Gecontroleerd testbewijs

GitHub Actions [42511659255](https://github.com/Marksmits1972/talera-lifeline/actions/runs/42511659255): **succesvol** — zes anonieme officiële GET-snapshots, vier geverifieerde `/__clean` JavaScripts, Wrangler bundling, zeven lokale echte DO-klassen, drie fictieve accounts, één fictief sociaal verhaal, accountgebonden persoonlijke schermen, afgeschermde browsercookie, session/logout, shares/revocations en behoud bij herstart. Deze run test de lokale uitvoering, niet miljoenen gelijktijdige verzoeken of echte Safari.

## Afgebakende testpoorten
1. **F5a CI, in deze PR**: bouw anonieme schermen uit zes GETs, bundel Cloudflare Worker zonder deploy, test F5 echt in lokale Wrangler runtime: 3 fictieve accounts, 1 fictief verhaal, datumisolatie, dubbelcheck van sessie-auth, header-spoofing geblokkeerd, grant/revoke, share/revoke, cookie-logout en restartpersistentie. Resultaat alleen geldig als de GitHub-run groen is.
2. **F5b**: werkende officiële Free-UI-API contracten op afzonderlijke staging met fictieve verhalen, zonder prod-backendfallback. Alle bestaande vertel-/presentatie-/tijdlijn-regressies controleren op iPhone/Safari.
3. **F6**: oplopende beperkte loadmetingen, p95/p99, hotspot, budget/limieten en expliciete beslissing of de 10M-doelstelling aannemelijk/bewijsbaar is.

## Stopregel
Geen eindeloos testen. Alleen een falende harde poort repareren en die poort opnieuw testen; geen zijprojecten. Free pas 'klaar' na de afgesproken functionele, privacy-, schaal- en browseracceptatie. Premium tot die tijd niet starten.

## Verwantschap
PR #93 (Static Assets) -> #94 (account-DOB DO) -> #95 (account/sessie DO) -> #96 (social DO) -> **deze F5 branch**.
