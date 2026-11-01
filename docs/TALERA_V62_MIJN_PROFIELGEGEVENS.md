# TALERA V62 — Mijn profielgegevens (accountbeheer, eerste gecontroleerde stap)

**Bouwdatum:** 1 november 2026. **Status:** afzonderlijke Cloudflare-staging, geen productiemerge.

## Onderzoek van de werkelijk actieve Clean Core Worker
- `GET /api/me` is aanwezig en retourneert de ingelogde accountidentiteit, schermnaam en e-mailadres (alleen bij geauthenticeerde sessie).
- `GET /api/discovery` leest de gebruikersnaam en vindbaarheid. `POST /api/discovery` is een bestaande, werkende route voor gebruikersnaam/vindbaarheid, beschermd met sessiecontrole en herkomstcontrole.
- Er is **geen geverifieerde route voor het bewerken van de schermnaam of het e-mailadres** in de actieve Clean Core-code. Daarom bevat V62 bewust geen ‘Opslaan’-scherm voor die velden.
- Wachtwoordherstel heeft een API, maar die vereist e-mailconfiguratie `RESEND_API_KEY` en `RESET_FROM`. De actieve Worker heeft deze bindings niet. Het bestaande formulier bestaat wel, maar verstuurt in deze configuratie geen mail en retourneert een duidelijke 503. V62 maakt de afwezigheid reeds in het menu zichtbaar.

## Nieuw scherm
- In `Mijn TALERA → Mijn account` een ingang **Mijn profielgegevens**.
- In het profielscherm: **Naam**, **E-mailadres** en **Gebruikersnaam** getoond vanuit de bestaande, ingelogde accountresponsen. Geen eigen lokale kopieën of nieuwe database.
- Via **Gebruikersnaam en vindbaarheid** gaat de gebruiker naar de reeds bestaande privacyinstelling waar deze gegevens wél bijgewerkt kunnen worden.
- Uitleg dat wijzigen van naam/e-mailadres nog niet mogelijk is; geen onwerkzame bewerk- of opslaanknop.
- Zonder sessie: uitsluitend de aanmeldroute, geen persoonlijke profielinhoud.
- Menu-geschiedenis behouden: profiel → privacy → profiel → account → Mijn TALERA → sluiten.
- Directe URL `?talera_menu=profile` ondersteunt dezelfde afscherming als andere accountgebonden menu's.

## Grensvoorwaarden
- V56 t/m V61 blijven ongewijzigd als aparte terugvalversies.
- V62 gebruikt alleen V56_BASE servicebinding, geen nieuwe D1/R2 of account-/socialcontroller.
- Geen gegevensmutatie, migratie of cookie-wijziging.
- Geen uitgeschakelde tests. De bekende twee ontbrekende oude bestandsreferenties blijven in issue #61.
- Voor toekomstig naam/e-mail wijzigen: eerst expliciet ontworpen backend-authenticatie, herverificatie voor e-mail, autorisatie, audit en tests. Geen onveilige Quickfix in de UI.

## Acceptatie
1. Anoniem account → aanmelden; geen persoonlijke gegevens zichtbaar.
2. Ingelogd: Mijn account → Mijn profielgegevens toont enkel de eigen, ge-escapete accountwaarden.
3. Vanuit profiel naar bestaande gebruikersnaam/vindbaarheid en via terug terugkomen; niet uit menu vastlopen.
4. Herstelmail wordt niet als actief aangeboden zolang e-mailconfiguratie ontbreekt.
5. Delen, berichten, foto's, presentatiemodus, Free, V61-opslag en V59-accountisolatie blijven intact.
6. Echte iPhone-test en echte ingelogde profieltest nog vereist vóór productie.

## Technische testbevindingen

- Staging-URL: https://talera-pwa-v62-mijn-profiel-20261101.mark-a39.workers.dev/present
- Anoniem openen van `?talera_menu=profile` toont alleen 'Aanmelden nodig', geen profielwaarden.
- De profielcase is in de **render-menu-switch** ingevoegd; tijdens het testen is een aanvankelijke fout met een verkeerde switch-anker hersteld. Na herstel is de route opnieuw getest.
- Gesimuleerde ingelogde account in de browser (geen productieaccounts): naam, e-mailadres en publieke gebruikersnaam verschijnen uit `/api/me` en `/api/discovery`. Een voorbeeldweergave met fictieve gegevens toont tevens dat naam/e-mailadres nog niet gewijzigd kunnen worden.
- Klikroute getest: Mijn account → Mijn profielgegevens → Privacy en beveiliging → Mijn profielgegevens → Mijn account.
- Bestaande hoofdmenu-, gedeelde herinneringen-, berichten- en instellingenroutes blijven beschikbaar. V61-opslag blijft uitsluitend onder Instellingen.
- Clean Core secretbinding-lijst bevat niet de twee noodzakelijke e-mailconfiguraties; de vermelding ‘Herstelmail nog niet aangesloten’ is daarom bewust zichtbaar.
- Verificatie van echte e-mailverzending, daadwerkelijke naamwijziging en herstel van een echt account is niet uitgevoerd; deze functies blijven expliciet open.

## Afronding testcontrole — V62

- GitHub Actions [run 41286324379](https://github.com/Marksmits1972/talera-lifeline/actions/runs/41286324379): **186 tests geslaagd, 2 gefaald**. Alle V62-profielspecifieke controles geslaagd; de enige twee fouten zijn bestaande ontbrekende oudere bronbestanden, zie [issue #61](https://github.com/Marksmits1972/talera-lifeline/issues/61). Niet melden als een volledig groene regressie.
- Browser Rendering anoniem: directe profiel-URL levert 'Aanmelden nodig' zonder zichtbare persoonlijke gegevens. Ongevraagde Free-login blijft uit.
- Browser Rendering met fictieve, onderschepte sessie-API-antwoorden: eigen naam, e-mail en gebruikersnaam worden weergegeven; via privacyinstellingen kan het menu terugkeren naar profiel en daarna account. Geen echte gebruiker aangemeld en niets opgeslagen.
- Gebruikersnaam aanpassen gebruikt de reeds aanwezige beveiligde privacyroute. **Naam en e-mailadres wijzigen is niet geïmplementeerd** wegens ontbrekende gevalideerde backendendpoint.
- V62 heeft uitsluitend de V56-servicebinding, geen D1/R2. Controle van de Clean Core-testdatabase gaf dezelfde aantallen als vooraf: 4 accounts, 12 herinneringen, 10 shares, 23 berichten, 4 grants, 5 browserkoppelingen. Alleen aantallen getoetst; geen mutaties uitgevoerd.
- Cloudflare V56 en V61 deployments blijven ongewijzigd; V62 is een afzonderlijke testversie, niet gepromoveerd.
- Echte iPhone/Safari-test met een bestaand ingelogd account nog open vóór productieacceptatie.

## Aanvulling bouwronde: naam direct opslaan, zonder nieuwe softwarelaag

- Bestaande **Clean Core Worker** gebruikt; geen extra Worker, database, tabel of afzonderlijke accountservice.
- Eén beveiligde toevoeging: `POST /api/profile`. De bestaande sessiecontrole `talera_sid` en herkomstcontrole worden hergebruikt. Rate limit 12 per 10 minuten, maximaal 100 tekens en controle op besturingstekens. Alleen `accounts.display_name` voor de aangemelde `user.id` wordt bijgewerkt.
- **Geen wijziging van e-mailadres** zolang veilige e-mailverificatie niet actief is. Geen fake opslaan-knop voor e-mail.
- Dit endpoint is als versie `c4496dcc-b120-43d7-846c-25adea9dc31f` van `talera-clean-core-staging-20261030` geüpload en door Cloudflare gecompileerd. Daarna is de versie gedeployed onder deployment `bd8cd77a-e901-4246-803e-f3b63e07bf2d`, met behoud van dezelfde D1- en media-bindings. Terugvaldeployment: `7b37e37c-0be7-4973-bc19-c0c0224d6f6a`.
- De bestaande **V62**-menuworker is op hetzelfde testadres bijgewerkt; er is geen nieuwe V63-app aangemaakt.
- Mobiele browsertest met fictieve accountresponsen: naam wijzigen, opslaan en direct terugzien; e-mailadres blijft ongewijzigd. Testresultaat: één profiel-POST; nieuwe naam in profielinvoer en hoofdmenu. Geen echte gebruikers gewijzigd tijdens de browsertest.
- Anonieme live controle: `GET /api/me`, `POST /api/profile`, `GET /api/shares`, `GET /api/messages` geven alle HTTP 401. De bestaande deelketen is niet opnieuw gebouwd.
- Nog open: acceptatie met werkelijk ingelogd account op iPhone, en bevestigde persistente naamwijziging na opnieuw aanmelden. E-mailadres wijzigen en account-wachtwoordherstel vereisen werkende geverifieerde e-mailafhandeling.

**Architectuurafspraak:** stop met nieuwe Vxx-wrapperketens; consolideer bij volgende grotere release de bestaande menu-aanpassingen in één module, zonder functies opnieuw te ontwerpen.
