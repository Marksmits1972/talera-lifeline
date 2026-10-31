# TALERA V57 — Mijn TALERA integratie (testversie)

**Status:** veiligheidsgerichte bouwronde, afzonderlijke testworker; V56 ongewijzigd. Geen productiepromotie zonder eigenaaracceptatie.

## Scope
- Bestaande V56-accounts, verhaalopslag, reacties, fotos, WhatsApp en iPhone-presentatie blijven via servicebinding intact.
- Legacy hoofdpagina-routes `/gedeeld` en `/meldingen` komen terecht bij de al gekoppelde accountmenuweergaven.
- Deep-link ondersteuning voor `Mijn mensen`, `Door mij gedeeld`, `Met mij gedeeld`, abonnement en overige bestaande instellingen.
- Free presentatie opent zonder **verplichte of ongevraagde** accountpopup. Aanmelden verschijnt wel bij accountgebonden acties.
- Bij onverwacht gewijzigde upstream-bron wordt het bestaande script **niet** gedeeltelijk gepatcht.
- Geen migratie, schrijven naar databases, verwijderen, export of accountreset. 
- **Niet opgelost in deze ronde:** databaseconsolidatie, onafhankelijke back-up/herstel, volledige account-/Family-/betaalprocessen. Die vereisen losse gates.

## Testbasis
`node --test test/mijn-talera-v57.test.mjs`

## Staging
Worker: `talera-pwa-v57-mijn-talera-integratie-20261031`
Binding: `V56_BASE` -> `talera-pwa-v56-whatsapp-foto-social-20261031`.
Rollback: gebruik ongewijzigde V56-URL; verwijder geen cookies of IndexedDB.

## Acceptatie
1. Free `/present` toont geen automatische accountaanmelding.
2. `/gedeeld` / `/meldingen` openen de betreffende accountweergave, zonder dat andere herinneringen verschijnen.
3. Ingelogde gebruiker krijgt bestaande gedeelde verhalen en berichten met dezelfde accountrechten.
4. V56 en V57 worden op dezelfde iPhone gecontroleerd: fotoband, opname, hartjes, reply en WhatsApp blijven gelijk.
5. Behoud van eigen herinneringen en opslag bevestigen; geen productie-Go op alleen gesimuleerde tests.

## Controle 31 oktober — afgeronde test
- Cloudflare Browser Rendering (mobiele viewport 390 × 844): anonieme presentatie opent zonder inlogmodal; `/gedeeld` → ‘Met mij gedeeld’ met expliciete login-CTA; `/meldingen` → ‘Berichten’; `Mijn mensen` en `Door mij gedeeld` openen in de bestaande menulaag. De login-knop leidt naar het bestaande aanmeldformulier.
- Nieuwe V57-unit-tests: **8/8 geslaagd**.
- Totale GitHub-regressiesuite: **99 geslaagd / 2 gefaald**, omdat twee bestaande tests bestanden zoeken die op de main-branch ontbreken: `xxory-test/src/tv-player.js`, `xxory-test/src/unified-webapp.js`. Zie [issue #61](https://github.com/Marksmits1972/talera-lifeline/issues/61). Niet misleidend groen registreren.
- Broncontrole achteraf: V56 actieve deployment `21b44d0d-143b-4eb3-bb01-0cb4b9ea2969` ongewijzigd; V57 heeft uitsluitend servicebinding `V56_BASE`, geen eigen D1/R2.
- Centrale accountdatabase bevat nog 4 accountrecords, 12 herinneringsrecords, 10 deellinks, 4 directe rechten, 23 berichten: aantallen onveranderd tijdens deze integratiecontrole. Dit bewijst geen volledige gegevensintegriteit, maar bevestigt dat geen migratie is uitgevoerd.

**Nog open:** twee-account/iPhone-eindacceptatie, account- en herinneringsmodelconsolidatie, foto/audio-video-acceptatie, persoonlijke Free-export en herstel.
