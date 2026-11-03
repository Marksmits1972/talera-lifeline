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

## Offline uitrolvoorbereiding (2 november 2026, na iPhone-cloudscherm)

- Nieuwe `scripts/v62-package-preflight.mjs` bouwt het **bestaande V62-modulepakket** in een tijdelijke GitHub Actions-directory. De Worker bevat 16 onderdelen, waarvan ontbrekende `.txt`-modules uit de bestaande `.mjs`-bron worden samengesteld. De canonieke menu-/Worker-guard, Free-back-up en kennisbank worden bewaard. Elk onderdeel krijgt een SHA-256-controlesom in `release-inventory.json`. De bestanden in de Git-repository of bij de gebruiker worden niet aangepast.
- `.github/workflows/v62-release-preflight.yml` compileert dit pakket met Wrangler **--dry-run** en voert daarnaast de reeds bestaande publieke V62 HTTP-rooktest uit. Geen Cloudflare-token, accountbinding, deployment, databasewijziging of gebruikerssessie is hiervoor vereist.
- Eerste pakketcontrole: [run 41537787061](https://github.com/Marksmits1972/talera-lifeline/actions/runs/41537787061), volledig **success**, 16 modules gebundeld, 174.42 KiB onbewerkt / 46.10 KiB gzip. De checksum-inventaris is als GitHub Actions-artifact opgeslagen.
- Uitgebreide pakketcontrole: [run 41537978015](https://github.com/Marksmits1972/talera-lifeline/actions/runs/41537978015). Offline-compile en bestaande publieke V62 HTTP-rooktest zijn beide succesvol uitgevoerd. Deze tests tonen de huidige publieke basiswerking aan, niet de aanwezigheid van de nieuwe functie in de live iPhone-app.
- **Nog geen live release:** `talera-lifeline` heeft geen gevalideerde, bestaande GitHub-deployworkflow voor precies deze V62 Worker en haar bestaande bindings. `wrangler.jsonc` van de repository wijst naar `talera-timeline-prototype`, NIET V62. De los gekoppelde `talera-product`-workflow hoort uitsluitend bij de AI Builder en mag niet voor deze app worden gebruikt.
- Eerst een expliciet gevalideerd deploypad nodig dat het bestaande actuele multipart V62 Worker-pakket **en de echte servicebinding `V56_BASE`** behoudt, de actuele Worker-versie als rollback verifieert en alleen gecontroleerde modules toevoegt. De dry-run-config is bewust ongeschikt voor productie (naam `talera-v62-offline-compile-only`, geen Cloudflare-account/bindings). **Geen** gebruiker opnieuw laten inloggen of bestaande Free/Premium-herinneringen koppelen/herstellen.


## V62 live bronvergelijking — 2 november 2026

- Automatische GitHub-read-only-bronvergelijking toegevoegd aan de **bestaande offline preflight**, zonder Cloudflare-token: `scripts/v62-live-drift-check.mjs`.
- Geslaagde volledige run [41538688747](https://github.com/Marksmits1972/talera-lifeline/actions/runs/41538688747): 16 brononderdelen gecontroleerd; **13 bestaande publieke onderdelen hebben exact dezelfde SHA-256 als live V62**; de menubron `menu-integration.txt` is de geplande wijziging; `premium-cloud-integrity.txt` is de nieuwe module die nog niet live bestaat. Ongeplande moduleverschillen: **0**.
- De Worker-hoofdbron `worker.js` is niet via de publieke V62-origin uitleesbaar. Dat is geen mislukte controle, maar een **aparte verplichte uitrolvoorwaarde**: deze moet bij publicatie als huidige Cloudflare-Worker-versie / gebundelde content worden geborgd. Een uitsluitend publiek SHA-vergelijkende test kan geen bestaande servicebindings of live deploy-rollback garanderen.
- De GitHub-preflight gebruikt alleen publieke GET-verzoeken voor de bestaande bronmodules. Als buiten de menumodule en nieuwe integriteitsmodule iets onverwacht afwijkt, blokkeert de preflight. Release-inventaris en driftstatus zijn als GitHub Actions artifact bewaard.
- Strikte volgorde voor een eventuele live V62-update: (1) bestaande Cloudflare scriptversie en deployment-ID **actueel** ophalen en bewaren; (2) bestaande `V56_BASE` servicebinding en overige Worker-settings controleren, zonder naar een ander Worker- of accountdoel te schakelen; (3) alléén de twee bedoelde modulewijzigingen plus de noodzakelijke bestaande Worker-route toevoegen; (4) na publicatie read-only routes, Free-back-up, iPhone-menu, beveiligde cloudpreview en gesloten anonieme toegang testen; (5) bij regressie meteen terugvallen op de vooraf geverifieerde deployment-ID. Bij ontbrekende Cloudflare-toegang: STOP, niet raden.
- **Geen live uitrol uitgevoerd**; geen lokale IndexedDB, cloudarchief of toestel gewijzigd. Laat de gebruiker niet herhaald opnieuw bij Cloudflare inloggen. De lokale oorspronkelijke Free-herinnering en twee onbekende files blijven open onderzoekspunten. De getoonde cloudteller 8 media + 1 verhaal is een manifestbevestiging, niet zelf de byte-integriteitstest.

## LIVE-uitrol bevestigd — 2 november 2026

De bestaande V62 Worker `talera-pwa-v62-mijn-profiel-20261101` is via een eenmalige, strikt afgebakende GitHub Actions-release gepubliceerd; er was geen interactieve Cloudflare-login nodig.

- **GitHub Actions:** [run 41540721811](https://github.com/Marksmits1972/talera-lifeline/actions/runs/41540721811), job `release` completed/success.
- **Actieve nieuwe deployment:** `f26d3f99-e417-447d-b94f-e6a1d5efc7f7` (releasebewijs `published_and_verified`).
- **Vorige deployment voor terugval:** `b896199b-dbdc-4e8d-a1aa-6b7fb0dcc44a`, versie `9ed50d3a-1f3e-4a63-a80b-840990e3bd2f`.
- Live-versie, exacte Worker-hoofdbron, `V56_BASE`-servicebinding en alle 13 onveranderde clientmodules zijn vóór de mutatie byte-voor-byte vergeleken. Na publicatie zijn alle 16 modules in de Cloudflare-bron opnieuw met SHA-256 geverifieerd, inclusief de vernieuwde canonieke menubron, de bestaande Worker-router en de nieuwe cloud-integriteitsmodule.
- De publieke routes `/present`, `/mijn-leven` en `/__clean/premium-cloud-integrity.mjs` reageerden na uitrol correct. **Rollback niet uitgevoerd of noodzakelijk**. Het bestaande accountsysteem, lokale Free-IndexedDB, Cloudflare-workerbindings, D1 en R2 zijn niet gewijzigd.
- De nieuwe UI biedt na `Bekijk cloudarchief op dit account` **Controleer cloudbestanden (alleen lezen)**. Pas na succesvolle verificatie wordt de herstelknop aangeboden, en de herstelroute vereist vervolgens afzonderlijke toestemming en een lege lokale database.
- **Nog niet getest met echte persoonlijke accountinhoud:** de iPhone-verificatie van de 8 cloudmedia en 1 verhaal, identificatie van 2 eerdere niet-ondersteunde lokale bestanden en volledige herstelacceptatie op een onafhankelijk leeg testapparaat. De serverregistratie alleen is geen volledige migratiebevestiging.
- Veilige eerstvolgende iPhone-stap: bestaande TALERA-V62-app openen via app-icoon, `Meer → Mijn abonnement → Bekijk cloudarchief op dit account → Controleer cloudbestanden (alleen lezen)`, resultaat delen. Niet opnieuw koppelen, niets wissen of naar leeg apparaat herstellen.
