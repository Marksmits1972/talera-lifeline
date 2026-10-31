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
