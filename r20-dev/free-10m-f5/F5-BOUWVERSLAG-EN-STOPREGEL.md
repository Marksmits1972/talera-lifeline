# TALERA Free F5 — één strikt gescheiden integratiepad (8 november 2026)

## Gebouwd
- Eén nieuwe, losstaande Worker-entrypoint met zeven afzonderlijke SQLite Durable Object classes: account/email/handle/sessie/rate en verhaal/deelkoppeling.
- Authenticeert sociale verzoeken via dezelfde Httponly TALERA-sessiecookies als de nieuwe authpilot. Externe QA-identiteitsheaders worden altijd verwijderd en de server tekent de actor alleen na sessiecontrole. Daardoor is een willekeurige actor-ID uit browserheaders nooit gezaghebbend.
- Registratie met verplichte geldige geboortedatum; de datum staat in het individuele account-object. `GET /api/me`, `/api/profile/birthdate`, profielwijziging, login/logout en sociale deel-/intrek-routes lopen via dezelfde oorsprong.
- Levert uitsluitend de byte-gecontroleerde anonieme TALERA-schermen en externe JS/CSS vanuit de al bestaande F1-build. Iedere aanvraag is met een afzonderlijke F5-testsleutel afgesloten. Geen fallback naar de bestaande TALERA-backend.
- Alle overige routes en de ingelogde UI falen bewust gesloten. De gebruiker mag nooit een **anonieme** vaste geboortedatumtijdlijn als eigen gepersonaliseerde tijdlijn krijgen.

## Harde grenzen / nog niet klaar
- Dit is de **eerste F5-backendintegratie**, niet de volledige gecertificeerde Free-PWA. De bestaande teller, foto's, video, geluid, vertellogica, berichten, discovery en beide gepersonaliseerde tijdlijnen zijn nog niet via de nieuwe backend bewezen.
- Geen Cloudflare productie- of EU-stagingdeployment, geen browserontgrendeling of iPhone/Safari acceptatie.
- Geen legacy-gebruikers- of media-overdracht. Geen bestaande echte accounts, data, oorspronkelijke PWA, D1 of R2 gewijzigd.
- De synthetische identiteits-/stagingkeys mogen niet in productie worden gebruikt.
- Geen bewijs voor tien miljoen gebruikers of globale kosten/limieten. Niet mergen, omschakelen of productie uitrollen zonder expliciete toestemming.

## Afgebakende testpoorten
1. **F5a CI, in deze PR**: bouw anonieme schermen uit zes GETs, bundel Cloudflare Worker zonder deploy, test F5 echt in lokale Wrangler runtime: 3 fictieve accounts, 1 fictief verhaal, datumisolatie, dubbelcheck van sessie-auth, header-spoofing geblokkeerd, grant/revoke, share/revoke, cookie-logout en restartpersistentie. Resultaat alleen geldig als de GitHub-run groen is.
2. **F5b**: werkende officiële Free-UI-API contracten op afzonderlijke staging met fictieve verhalen, zonder prod-backendfallback. Alle bestaande vertel-/presentatie-/tijdlijn-regressies controleren op iPhone/Safari.
3. **F6**: oplopende beperkte loadmetingen, p95/p99, hotspot, budget/limieten en expliciete beslissing of de 10M-doelstelling aannemelijk/bewijsbaar is.

## Stopregel
Geen eindeloos testen. Alleen een falende harde poort repareren en die poort opnieuw testen; geen zijprojecten. Free pas 'klaar' na de afgesproken functionele, privacy-, schaal- en browseracceptatie. Premium tot die tijd niet starten.

## Verwantschap
PR #93 (Static Assets) -> #94 (account-DOB DO) -> #95 (account/sessie DO) -> #96 (social DO) -> **deze F5 branch**.
