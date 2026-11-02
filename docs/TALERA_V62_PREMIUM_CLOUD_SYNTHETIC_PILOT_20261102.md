# TALERA V62 — Premium cloudopslag, bouwblok 2: afgeschermde synthetische proef
Datum: 2 november 2026
Status: **nieuwe broncode is op 2 november gekoppeld aan bestaande Clean Core-STAGING Worker; pilotfunctie staat expliciet UIT, geen persoonlijke uploads, geen echte account-end-to-end-test.**

## Doel van dit kleine bouwmoment
Één fictieve herinnering via de **bestaande accountauthenticatie** en tijdelijke Premium-rechten veilig kunnen bewaren in een bestaande private R2-bucket, teruglezen vanuit een tweede sessie van dezelfde testaccount, integriteit controleren en daarna verwijderen. Het is nog **geen** persoonlijke upload-, sync-, media- of herstelproductiefunctionaliteit. Geen extra Worker, database, pakketmodel of tweede herinneringsbibliotheek.

## Nulmeting van de bestaande omgeving vóór de koppeling
- Actieve Clean Core staging: `talera-clean-core-staging-20261030`, D1-binding `DB` en R2-binding `SHARE_MEDIA`; **geen** algemene persoonlijke `PREMIUM_MEDIA`-binding.
- Bestaande D1: tabellen `accounts`, `memories`, `pwa_memory_links`, `talera_premium_test_grants` en andere bestaande sociale tabellen. Géén tabellen in deze bouwstap toegevoegd.
- Bestaande R2: `talera-core-media` is privé (geen custom domain en r2.dev publiek uit); de bucket meldt regio `WNAM`. Dit is geen besluit over definitieve Europese/private klantopslag.
- De vorige V62-/core-versies en werkende Free-functies zijn onaangeroerd.

## Implementatie
- `src/core/premium-cloud-pilot.js`: compact, in bestaande Clean Core te integreren route.
- `POST /api/me/premium/cloud/pilot`: **negeert iedere aangeleverde inhoud** en schrijft één vaste, servergegenereerde **fictieve JSON-herinnering**, onder het geïsoleerde `pilot/v1/<account-id>/talera-pilot-synthetic-v1.json`-object. Na PUT: R2-teruglezing en SHA-256-controleronde, anders geen succesbevestiging.
- `GET /api/me/premium/cloud/pilot`: leest alleen de testaccount-eigen R2-key; controleert omvang, synthetische marker, SHA-256, schema en memory-ID. Verificatie van een tweede sessie kan dezelfde bestaande ingelogde accountidentiteit gebruiken.
- `DELETE /api/me/premium/cloud/pilot`: wist uitsluitend dat synthetische pilotobject.
- Geen verwerking van eigen foto's, verhalen, audio, video, `stories` in IndexedDB, `SHARE_MEDIA`, bestaande `memories`-records of WhatsApp-reacties.

### Fail-closed schakelaars
Voor **alle** pilotrequests zijn nodig: geldige geauthenticeerde bestaande gebruiker, `PREMIUM_CLOUD_PILOT_ENABLED='true'`, exacte account-ID in `PREMIUM_CLOUD_PILOT_ACCOUNT_IDS`, een nog geldige handmatige Premium-testgrant met `cloud_storage` en een aparte R2-binding `PREMIUM_MEDIA`. Voor POST/DELETE ook bestaande Origin/CSRF-controle en rate limiting. Zonder deze expliciete instellingen blijft de route ontoegankelijk; de commerciële `available.cloud_storage` blijft `false`.

### Inbouwcontract — uitgevoerd op staging; historische instructie voor herhaalbaarheid
Neem bij een volgende gecontroleerde uitrol de bron van `premium-cloud-pilot.js` op in de **bestaande** Clean Core Worker en voeg in `premiumRoutes`, direct vóór de bestaande `/api/admin/premium/`-filter, toe:
```js
if (p===premiumPilotPath)
  return premiumCloudPilotRoutes(req,env,user,p,m);
```
Deze aanroep veronderstelt de bestaande helpers `premiumGrantView`, `uuidRule`, `allowedWrite` en `rateLimit`. Koppel uitsluitend voor de synthetische proef een R2-binding `PREMIUM_MEDIA` naar de reeds aanwezige private `talera-core-media` bucket. Zorg dat de pilot eerst op de bestaande test-Worker draait en niet op een publieke productie-Worker. Geen nieuwe auth- of opslaglagen maken.

## Controles 2 november
- Lokale Node-mock van dezelfde module: **6/6 tests groen**, o.a. standaard uitgeschakeld, alleen allowlist + actief recht, synthetische PUT/GET uit tweede sessie, cross-account geblokkeerd, corrupte inhoud geweigerd, Origin-blokkade en opruimen.
- Losse echte R2-infrastructuur-smoketest in `talera-core-media` met **uitsluitend fictieve JSON**: PUT geslaagd, object zichtbaar in lijst met correcte grootte (112 bytes), DELETE geslaagd, daarna nul objecten onder de gebruikte sleutel. De Cloudflare-connector leverde bij GET geen leesbare body; dus dit is **geen bewezen echte download/restore** via de actieve Worker.
- Werkelijke end-to-end sessie-/R2-route in de actieve V62 Worker: **nog niet uitgevoerd** (binding en Worker-integratie ontbreken).

## Vervolg na beoordeling
1. Controleer dat alleen fictieve testaccounts in allowlist en tijdelijke rechten zitten.
2. Verbind de bestaande test-Worker via één terug te draaien deployment met de bovenstaande route en R2-binding, zonder iets aan de Free- of social-flow te veranderen.
3. Bewijs POST→GET in twee echte sessies en DELETE; daarna de pilot weer uitschakelen. Niet meer testrondes dan noodzakelijk.
4. Pas daarna de commerciële cloudopslag ontwerpen: expliciete gebruikerskeuze, individuele mediaoverdracht, duurzame mapping op dezelfde memory-ID, veilig conflictenbeleid, rechten op elk endpoint, EU/privacy- en bewaarbeleid, back-up en herstel.
5. **Geen persoonlijke media in de huidige WNAM-bucket zetten voordat regio, rechtsgrond en bewaartermijnen zijn goedgekeurd.**

De GitHub-bouwtak alleen is nog geen actieve deployment. Geen bewering van geslaagde klantcloudsync, herstel op een echt tweede apparaat of op een iPhone.


## Update en bewijs 2 november 2026 — aangesloten en gecontroleerd
De volledige actieve Clean Core-Worker-bron is uit de Cloudflare script-content API opgehaald en met een minimale toevoeging verrijkt. De bestaande `premiumRoutes`, `handler`, deelketen, accountauthenticatie en social/Free-code zijn behouden; alleen deze pilotmodule en één dispatchregel na de bestaande Premium-dispatch zijn toegevoegd.

- Bestaande Worker: `talera-clean-core-staging-20261030`; **nieuwe actieve deployment** `d3d2b35c-129b-4271-b3dd-695ee0a467dc`, versie `6a74f222-27a3-49c4-9082-0ca9f7b9742a` (100% staging-traffic).
- Veilig rollbackpad: vorige deployment `164d870b-da22-4a74-b6a3-ea12bc3a9279`, versie `1ae8bd64-81ba-4b45-88c3-361938679c85`. Geen D1-tabellen gewijzigd.
- Worker-bindingen ná uitrol: bestaande `DB`, bestaande `SHARE_MEDIA`, toegevoegde private R2-binding `PREMIUM_MEDIA` naar de **reeds bestaande** `talera-core-media`; daarnaast `PREMIUM_CLOUD_PILOT_ENABLED=false` en lege `PREMIUM_CLOUD_PILOT_ACCOUNT_IDS`. De synthetische route blijft dus in de actieve staging onbeschikbaar.
- **Broncontrole na deployment:** script-content opnieuw gelezen (66.976 tekens); pilotfunctie en één authenticatiegebonden dispatch aanwezig.
- V62 PWA-presentatiewerker `talera-pwa-v62-mijn-profiel-20261101` bleef exact op versie `73a651ba-5c87-4268-8b97-078d71969400`.
- D1 na uitrol: 1 beheerder, 0 Premium-testgrants, 0 auditevents en 12 bestaande `memories` (gelijk gebleven). **0** R2-objecten op `pilot/v1/`.
- **Werkelijke R2 GET-controle verbeterd:** voor uitsluitend fictieve JSON (123 bytes) is PUT geslaagd, GET leverde exact dezelfde tekst, DELETE geslaagd, daarna geen objecten meer. De eerdere melding dat R2-GET geen leesbare body had was een verschil in connectorantwoord; de inhoud kon wél via een stringrespons worden gecontroleerd.
- De zes `node --test`-proeven uit `test/premium-cloud-pilot-v62.test.mjs` zijn daadwerkelijk in Node 22 uitgevoerd: 6/6 groen.
- **Niet aangetoond:** de nieuwe Workerroute met een echte ingelogde synthetische accountsessie, het verkrijgen van tijdelijke testgrant via de cockpit, herstel op een tweede fysiek apparaat, klantmedia, sync of productiegeschiktheid. De bestaande Worker is succesvol als scriptversie aangemaakt en gedeployed, maar onafhankelijke HTTP-runtimeacceptatie is niet mogelijk gebleken via de huidige testverbinding.

### Volgende kleinste stap
Maak uitsluitend voor een gecontroleerde fictieve QA-account een tijdelijke Premium-testgrant en allowlist, activeer de pilot alleen voor dat account en test met twee echte geauthenticeerde sessies. Schakel daarna de pilot weer uit en verwijder het proefobject. **Geen echte foto's, verhalen of privédata gebruiken**; regio WNAM is niet goedgekeurd als definitieve persoonlijke opslagregio.
