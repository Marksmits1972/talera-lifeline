# TALERA — Mijn account: profielgegevens en naam wijzigen

**Gecontroleerde bouwstap: 1 november 2026**

## Werking
- Route: **Mijn TALERA → Mijn account → Mijn profielgegevens**.
- De naam kan worden bewerkt en met **Naam opslaan** opgeslagen.
- E-mailadres is alleen leesbaar. Wijziging blijft uitgeschakeld totdat veilige e-mailbevestiging beschikbaar is.
- Gebruikersnaam en vindbaarheid gebruiken de bestaande privacyinstelling.
- Terug naar privacy, profiel, account en Mijn TALERA blijft mogelijk.

## Eenvoudige techniek
- Geen extra Worker, database, tabel of tweede accountservice.
- De bestaande Clean Core Worker `talera-clean-core-staging-20261030` heeft **één nieuwe route**: `POST /api/profile`.
- Hergebruik van de bestaande geauthenticeerde sessie, origin-controle en rate limit. Alleen `accounts.display_name` van de ingelogde persoon wordt bijgewerkt (100 tekens maximaal).
- Bestaande V62-interface bijgewerkt op hetzelfde testadres: https://talera-pwa-v62-mijn-profiel-20261101.mark-a39.workers.dev/present
- De bestaande deelketen, fotos, berichten, lokale opslag en privacy-instellingen zijn niet opnieuw gebouwd.
- Bronwijzigingen staan in `src/mijn-talera/account-profile-endpoint.js` en `src/mijn-talera/v62-route-bridge.js`.

## Controle
- De Cloudflare Core-versie `c4496dcc-b120-43d7-846c-25adea9dc31f` is gecompileerd en actief gezet onder deployment `bd8cd77a-e901-4246-803e-f3b63e07bf2d`.
- Vorige deployment voor terugval: `7b37e37c-0be7-4973-bc19-c0c0224d6f6a`.
- Mobiele browsertest met **fictieve sessieantwoorden**: de nieuwe naam verschijnt na opslaan in het profiel en in het hoofdmenu; het e-mailadres blijft onveranderd. Dit is geen bewijs van persistente opslag in een echte ingelogde sessie.
- Live anonieme API-smoketest: `GET /api/me`, `POST /api/profile`, `GET /api/shares` en `GET /api/messages` geven HTTP 401.
- GitHub Actions [run 41287474337](https://github.com/Marksmits1972/talera-lifeline/actions/runs/41287474337): **188 van 190 tests geslaagd**. Alle nieuwe profieltests zijn geslaagd. De twee bekende testfouten verwijzen naar twee ontbrekende oude bronbestanden (issue #61).
- Een volledige reële ingelogde naamwijziging, verversing en opnieuw aanmelden is **nog niet uitgevoerd**. Geen definitieve iPhone-acceptatie.

## Architectuurregel voor vervolg
Geen nieuwe Vxx-proxyketen voor kleine wijzigingen. Werk bestaande modules rechtstreeks bij en consolideer de eerdere menu-aanpassingen vóór verdere grote uitbreidingen.
