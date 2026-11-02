# TALERA V62 — alleen-lezen inhoudscontrole van EU-cloudarchief

Datum: 2 november 2026. **Status: gebouwd in GitHub-testbranch, NIET uitgerold naar de actieve iPhone-V62 Worker.** Geen wijzigingen aan Free, D1, R2, cloudtoestemming of klantbestanden.

## Waarom
Op het iPhone-scherm is een Premium-cloudarchief van 8 media, 1 verhaal en 0 bewaarde reacties zichtbaar, maar dezelfde browser heeft 0 lokale Free-herinneringen. Dit is niet tegenstrijdig: het privé-Premium-archief is gescheiden van lokale IndexedDB en gewone account-herinneringen. De oorspronkelijke lokale Free-installatie is nog niet met zekerheid teruggevonden. Een manifesttelling bewijst geen byte-integriteit of volledige migratie.

## Kleine nieuwe beveiliging
- `src/mijn-talera/premium-cloud-integrity.mjs` leest met bestaande geauthenticeerde **GET**-routes en sessie-/entitlement-/consentchecks cloud-media en verhaalrecords byte-voor-byte, vergelijkt SHA-256 of bestaande multipart-fingerprint en controleert media-identiteit. Het opent IndexedDB niet, gebruikt geen lokale opslag en doet geen POST/PUT/DELETE. Voor lange video's worden begrensde 8 MiB ranges verwerkt.
- De bestaande Worker biedt dezelfde module op `/__clean/premium-cloud-integrity.mjs` aan, zonder nieuw accountstelsel, nieuwe database, R2-bucket of tweede menu. `premium-cloud-integrity.txt` is uitsluitend de Worker-served bronkopie.
- Onder **Mijn abonnement → Bekijk cloudarchief** verschijnt na manifestvoorvertoning **Controleer cloudbestanden (alleen lezen)**. Zolang die verificatie niet geslaagd is, wordt **Herstel naar leeg apparaat** niet aangeboden. Boven 64 MiB vraagt de controle toestemming voor extra dataverkeer. Ook na positieve controle blijft de bestaande herstelprocedure opnieuw alle checks uitvoeren en vereist zij expliciete toestemming én een lege lokale IndexedDB.
- Een groen resultaat betekent uitsluitend **cloudbytes corresponderen met het servermanifest**; de oorspronkelijke lokale Free-bestanden zijn **niet** vergeleken. De 2 eerder gemelde niet-ondersteunde lokale bestanden blijven afzonderlijk open. Nooit een volledige migratie claimen op basis van dit resultaat.

## Tests en afbakening
`test/premium-cloud-integrity.test.mjs`: normale foto+verhaal; gewijzigd bytebestand; ander account; ontbrekende accounteigenaarschap; 26 MiB multipart video; UI-vergrendeling en bronroutering. Toegevoegd aan bestaande GitHub Actions `premium-cloud-tests.yml`. De gerichte `premium-cloud` check op commit `5f36059b9294d7bfb8cd9226a6a5f6ff2139b18d` is **completed/success**.

**Niet gedaan:** geen Cloudflare-productiedeployment, geen iPhone-praktijkcontrole, geen herstel uitgevoerd, geen directe live server-bytecontrole, geen lokale data gewijzigd. De laatste stap vereist gecontroleerde live V62-deployment met rollback en daarna een expliciete alleen-lezen praktijkproef op het juiste account. Het bekende afwijkende automatische `talera-core` preview-buildresultaat is afzonderlijk en mag niet worden verward met het geslaagde Premium-testresultaat.

Geen opnieuw-koppelen, wissen, herinstalleren of Cloudflare-login vragen.