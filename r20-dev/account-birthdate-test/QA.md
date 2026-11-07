# TALERA — accountgeboortedatum en persoonlijke tijdlijnen (geïsoleerde test)

Datum: 7 november 2026. Status: **gepubliceerde testkandidaat**, nog geen acceptatie door gebruiker met een echt TALERA-account.

## Wat gebouwd is

- **Eigen test-Worker:** `talera-account-birthdate-test-20261107`. Worker heeft alleen een `TALERA_BASE` servicebinding naar de bestaande diepblauwe kandidaat en een **nieuwe, volledig afzonderlijke D1-database** `talera-birthdate-account-test-20261107` (database-ID `4d8aa183-3854-481c-97ab-e24eca7f484c`). Geen schemawijziging aan bestaande account-, herinneringen- of media-D1-databases.
- **Bestaande accountregistratie bewaard:** naam, unieke gebruikersnaam, e-mail, wachtwoord en bevestiging blijven. Met een losse UI-helper verschijnt `Geboortedatum` als verplicht `input[type=date]`, `name=birthDate`, `autocomplete=bday`.
- **Bestaande menu-afhandeling met minimale patch** van *één registratieaanvraag* in `/__clean/menu-integration.mjs`: voegt alleen `birthDate:data.birthDate` toe aan het bestaande `POST /api/register`-payload. Alle knoppen, validatie van gebruikersnaam, wachtwoordregels, login en de rest van de menuscript worden ongewijzigd doorgestuurd. GET-respons van dit JS-asset live gecontroleerd: precies één nieuwe registratiepayload, oude payload afwezig.
- **Testregistratielaag** valideert een volledige ISO-geboortedatum inclusief schrikkeldag, niet in de toekomst. Stuurt bestaande accountgegevens exact door naar de oorspronkelijke register-API en schrijft na succesvolle registratie alleen `account_id, birth_date, updated_at` in de aparte privé-D1. Wachtwoordopslag en authentificatie blijven bij het bestaande core-systeem; geen DOB in publieke discovery of social.
- **Eigen accountgeboortedatum**: nieuwe `/api/profile/birthdate` GET/POST voor een aangemelde gebruiker en `/api/me` uitbreiding (DOB alleen in eigen sessie). In het bestaande ingelogde Mijn-account-paneel is een privé-editor toegevoegd om de geboortedatum later in te voeren/wijzigen. Ongemachtigde GET van profielgeboortedatum gaf in browser HTTP **401**.
- **Tijdlijnankers accountgebonden:** bij geladen pagina en een ingelogd account met geboortedatum wordt het v17-startjaar op `/mijn-leven` ingesteld op het geboortejaar, en wordt *alleen* `LIFE_START` op `/present` ingesteld op de geboortedag. Zonder actieve sessie of DOB blijven de oorspronkelijke demo-ankers en schermscripts onveranderd. Geen wijzigingen aan de herkomst van voorbeeldverhalen en opgeslagen persoonlijke herinneringen, geen tijdlijn-intensiteits-, zoom- of navigatiealgoritme gewijzigd.

## Tests uitgevoerd

- Scriptvalidatie van Worker en UI-helper: **geslaagd**.
- Datumvalidatie: `1976-09-06`, `2000-02-29`, `2004-02-29`, `2010-05-14`, datum van vandaag geldig; `2025-02-29`, `1900-02-29` en toekomstige datum afgekeurd.
- Pure tests van beide tijdlijntransformaties voor 1976, 2000 (schrikkeljaar) en 2010: **startjaar / exacte dag kloppen** en `drawMarks` / `drawDensity` niet gewijzigd.
- Nieuwe test-Worker gepubliceerd op `2026-11-07T18:28:05.563726Z`. URL `https://talera-account-birthdate-test-20261107.mark-a39.workers.dev/mijn-leven` of `/present`.
- Beide pagina's laden live, accountmenu aanwezig. In werkelijke accountaanmaak is de volgorde Naam / Unieke gebruikersnaam / Geboortedatum / E-mailadres / Wachtwoord / Wachtwoord herhalen, DOB verplicht.
- Actuele publieke menu-integration JS live opgehaald: na wijziging bevat de registratieaanvraag **precies eenmaal** `birthDate:data.birthDate`; originele wachtwoordregels aanwezig.
- Hashvergelijking tussen oude diepblauwe en nieuwe kandidaat **uitgelogd**: `talera-flow-v17-time`, `talera-flow-v16` en volledige referentiecatalogus zijn byte-identiek; op `/present` zijn oorspronkelijke tijdlijnscript en bestaande visuele styling-scripts byte-identiek. Alleen nieuwe DOB-UI-helper wordt toegevoegd.
- Test-D1 bevatte bij controle **nul records**; geen persoonlijke accounts of geboortedatums van gebruikers gelezen, gewijzigd of verwijderd.
- Synthetische ingelogd-accountformulierweergave (DOM-testfixture, zonder echt account) toont `Mijn geboortedatum` en `Geboortedatum bewaren`.

## Niet beweren / resterende acceptatie

- **Nog geen echte nieuwe accountregistratie of profielopslag van een ingelogde gebruiker doorlopen**. Daarvoor zou een account in de gedeelde bestaande accountbackend moeten worden aangemaakt, wat niet zonder noodzaak is gedaan.
- **Nog geen aangemelde end-to-end vergelijking van beide tijdlijnen met een werkelijk opgeslagen geboortedatum**; de dag/jaartransformaties zijn apart getest met geldige datums. Deze praktische controle moet in de geïsoleerde test worden gedaan met een door de gebruiker gekozen testaccount.
- Onderliggende bestaande accountbackend blijft gedeeld als service; nieuwe geboortedatum staat echter alleen in aparte D1. Verder niets uit bestaande accounts gekopieerd.
- **Geen codewijziging aan originele diepblauwe kandidaat, goedgekeurde versie van 6 november, vertelcyclus, audio/video/foto, timing, media-ID's, swipebediening, presentatiecontrollers of oude database.**

Broncode: `r20-dev/account-birthdate-test/account-birthdate-worker.mjs` op `feature/account-birthdate-timeline-20261107`.
