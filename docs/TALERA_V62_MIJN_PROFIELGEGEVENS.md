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
