# TALERA V62 — Free lokaal back-up maken, herstellen en maandelijks herinneren
Datum: 1 november 2026. Bouw: gerealiseerd op bestaande V62-staging. Productievrijgave: wacht op eigenaar/iPhone-acceptatie.

## Bestaande architectuur behouden
- Alle persoonlijke Free-herinneringen blijven op het **eigen toestel**, in bestaande IndexedDB `talera-lifeline-dev-local-v1` met `stories` en `files`. Geen nieuwe database/tabel, geen server-back-up, geen AI-analyse en geen automatische upload. Gratis sociaal account is niet vereist voor lokale back-up.
- Bestaande Worker `talera-pwa-v62-mijn-profiel-20261101` serveert `/__clean/free-backup.js` vanuit de enige bron `src/mijn-talera/free-backup.txt`. UI in bestaande `Mijn TALERA → Instellingen → Opslag en back-up`.
- Bestaande `TaleraI18n`-catalogus V23 aangevuld met 22 back-uptekstsleutels, plus twee vernieuwde beschrijvingen in Settings voor NL/EN/DE/FR/ES. Geen parallel runtime-vertaalregister.
- De bestaande V56-presentatie, foto- en audioweergave, deelrechten, API, accounts en alle andere functies zijn inhoudelijk ongewijzigd.

## Werkende bediening
**Back-up maken:** leest de lokale `stories` en `files`, controleert of alle benodigde media aanwezig zijn en bouwt een bestand `TALERA-Free-YYYY-MM-DD.talerabackup` met versieherkenning, volledig inhoudsoverzicht, originele mediabytes en SHA-256-controles. De gebruiker kiest via de beschikbare **iOS Bestanden/deelinterface** (waar ondersteund) of de browserdownload een eigen locatie. TALERA beweert niet dat het bestand extern bewaard is voordat de gebruiker dit heeft gecontroleerd. Er is een aparte knop **Ik heb het bestand bewaard**, die uitsluitend de door de gebruiker bevestigde datum lokaal opslaat.

**Back-up herstellen:** gebruiker selecteert een bestaand TALERA-bestand. TALERA controleert header, versie, inhoudsoverzicht, lengte en **iedere mediahash vóór schrijven** en toont een herstelvoorbeeld met nieuwe/bestaande herinneringen en mediabestanden. Alleen na expliciete bevestiging volgt één IndexedDB-transactie met uitsluitend `add()` voor nog niet bestaande records. Bij corrupte of afwijkende ID's/bytes stopt herstel, zonder stil overschrijven. Herstellen werkt **ook bij ingelogd Free-account uitsluitend lokaal**, zonder automatische accountupload.

**Maandelijkse herinnering:** eenmaal per **30 dagen**, uitsluitend als er al lokale persoonlijke herinneringen zijn en iemand het Mijn TALERA-hoofdmenu opent. De eerste maand begint op het eerste bezoek aan dat menu **met lokale herinneringen**: geen direct bericht na nieuwe verhalen en geen meldingen tijdens vertellen/afspelen. Keuzes: **Back-up maken**, **Al gedaan**, **Later**. Bij alle keuzes wordt een volgende popup pas na minimaal 30 dagen getoond. Geen push, e-mail, accountverplichting of serverplanning. Datum en voorkeur worden alleen lokaal opgeslagen.

## Gerichte testbewijzen
1. Mobiele Cloudflare-browser, losstaande fictieve `stories`/`files`: export, correct voorafgaand herstelvoorbeeld, import na lokaal verwijderen van uitsluitend testrecords, bytegelijk herstel van foto/audio/video, audiotijdcodes identiek en herimport zonder duplicaten: **geslaagd**.
2. Eerdere geïsoleerde proef: moedwillig beschadigd mediabestand wordt geweigerd, gewijzigd bestaand verhaal wordt als conflict herkend: **geslaagd**.
3. Popup met kunstmatig 31 dagen verstreken: opent één keer; **Later** sluit en een tweede herinnering in dezelfde periode verschijnt niet: **geslaagd**.
4. Bestaande V62-route `/present?talera_menu=storage`: **Create backup / Restore backup** en de lokale bewaaruitleg verschijnen in de geteste Engelse taal; `hub`, `present`, `tell`, `kennisbank` openen zonder Worker-fout.
5. Tests in `test/free-backup-local-restore.test.mjs`: contract, privacy, checksums, herstel zonder overschrijven, herinnering, één bestaande Worker en centrale talen. Historische regressieblokkers in issue #61 zijn afzonderlijk open.

## Actieve en terugvalversies
- Bestaande V56: talenregister uitgebreid tot 473 sleutels per taal; versie `3a0a6bc2-61c4-4748-860d-87d95230dda5`, deployment `fa96d8ac-ab5c-43c9-8269-50ed673c9e13`; vorige deployment `235cd152-9aa4-4740-99dd-5afca389f8ee` blijft beschikbaar.
- Bestaande V62: backupversie `9e2401dc-373b-47c8-9f43-ca39a2e9a86c`, deployment `6a148092-4d47-48dd-b0e4-254f19e74538`; vorige deployment `821863de-1dae-4d43-a48d-933861d36e7b` blijft beschikbaar.
- Alle testgegevens waren fictief en in tijdelijke browsersessies. Geen persoonlijke of cloudaccountrecords gemigreerd of verwijderd.

## Nog verplichte acceptatie voor productievrijgave
- **Echte iPhone/Safari PWA:** maak meerdere eigen proepherinneringen, inclusief liggende/staande foto's, audio en video. Maak back-up, kies in Bestanden een map, **controleer dat het bestand werkelijk buiten de PWA aanwezig blijft** en importeer het in een volledig geïsoleerd testprofiel of andere test-origin. Vergelijk titels, datums, mediabytes, volgorde en presentatie. Test ook herstel als ingelogde Free-gebruiker zonder cloud-upload.
- **Grotere pakketten en opslaglimieten:** er is een technische veiligheidsgrens van ongeveer 2 GiB per archief (geen commerciële Free-fotolimiet). Test opslagruimte en grotere bestanden op echte iPhones. Een te groot pakket leidt tot een foutmelding, **niet** tot de claim dat de back-up veilig is.
- Een kopie in een map van dezelfde telefoon helpt bij verlies van browsergegevens, maar niet bij verlies van de hele telefoon. Gebruiker kan het bestand vrijwillig naar een andere eigen veilige locatie kopiëren.

**Status:** technisch gebouwd en met fictieve data end-to-end gecontroleerd; daadwerkelijke externe iOS-bestandssysteemacceptatie nog open. Nooit als bewezen volledig veilig voor echt persoonlijk archief presenteren vóór deze laatste acceptatie.
