# TALERA Premium — EU-R2 opslag klaarzetten

**Status 2 november 2026, na aanmaken via Cloudflare-dashboard:** **EU-bucket aangemaakt en op de bestaande Clean Core-staging Worker aangesloten.** De persoonlijke cloudroutes blijven nog niet geactiveerd; er is geen klantdata overgezet.

## Gerealiseerde opslagkeuze
In hetzelfde bestaande Cloudflare-account is één **private R2-bucket** aangemaakt met echte `eu`-jurisdiction, bedoeld voor Premium-privéherinneringen; **geen extra Worker, database, account of publieke R2-domeinnaam**.

Gerealiseerde exacte bucketnaam: `talera-premium-private-eu-staging`.

Cloudflare is gecontroleerd: `cf-r2-jurisdiction: eu` is bij API-aanmaak verplicht om het gebied te garanderen; de via ChatGPT beschikbare Cloudflare-aanroep ondersteunt geen eigen requestheaders. In plaats van een gewone `WEUR`-bucket heeft de eigenaar de bucket handmatig via het dashboard met **Specify jurisdiction → European Union (EU)** aangemaakt. Alle op 2 november aangetroffen TALERA-buckets hadden `jurisdiction: default`.

## Herhaalbare EU-aanmaakmethode (voor andere omgevingen, hier al uitgevoerd)

```sh
npx wrangler r2 bucket create talera-premium-private-eu-staging --jurisdiction eu
npx wrangler r2 bucket info talera-premium-private-eu-staging --jurisdiction eu
```

Of Cloudflare dashboard → R2 object storage → Create bucket → **Specify jurisdiction → EU**. Controleer via de details dat `jurisdiction=eu` staat vóór gebruik. Gebruik niet enkel `--location weur`: een location hint is geen residentiegarantie.

De afzonderlijke, private binding is in de **bestaande** Clean Core-staging daadwerkelijk aangesloten:

```json
{
  "binding": "PREMIUM_PRIVATE",
  "bucket_name": "talera-premium-private-eu-staging",
  "jurisdiction": "eu"
}
```

Behoud bij upload/versiewijziging alle bestaande bindingen (`DB`, `SHARE_MEDIA`, `PREMIUM_MEDIA`) en de laatst goed werkende versie. **Bij oplevering blijft** `PREMIUM_PRIVATE_MEMORY_ENABLED=false`, lege testaccount-allowlist, `available.cloud_storage=false`. Niets publiceren voordat een geauthenticeerde synthetische QA-acceptatie compleet is.


### Aansluiting en verificatie — 2 november 2026

Cloudflare-dashboard bevestigt de nieuwe bucket onder `/r2/eu/buckets/talera-premium-private-eu-staging`, **Standard**, **Public Access Disabled** en **0 B** bij creatie.

De gekoppelde Cloudflare API heeft via `PATCH /accounts/{account_id}/workers/scripts/talera-clean-core-staging-20261030/settings` met behoud van alle vijf bestaande bindings de zesde binding **`PREMIUM_PRIVATE`** toegevoegd, inclusief `jurisdiction:"eu"`. Cloudflare antwoordde succesvol en een onafhankelijke tweede GET op de Worker-settings bevestigde die binding exact. Instellingen zijn:

- `DB` dezelfde D1-database; `SHARE_MEDIA` en `PREMIUM_MEDIA` behouden;
- `PREMIUM_CLOUD_PILOT_ENABLED="false"` en lege `PREMIUM_CLOUD_PILOT_ACCOUNT_IDS` ongewijzigd;
- `PREMIUM_PRIVATE` → `talera-premium-private-eu-staging`, jurisdictie `eu`.

Cloudflare heeft bij de instellingenwijziging **automatisch een nieuwe actieve versie** uitgerold: `f9f87f6e-813e-4d8b-a866-c97ac5963e24` (versie 44). De voorafgaande werkende versie `6a74f222-27a3-49c4-9082-0ca9f7b9742a` (versie 43) blijft als direct terugvalpunt beschikbaar.

**Functionele controle na de automatische uitrol:** `GET /__health` = **200, ready:true**. `/api/me`, `/api/me/entitlements`, `/api/me/premium/cloud/pilot` en `/api/me/premium/cloud/memories` weigeren een anonieme sessie nog steeds met **401**. D1 bevat onveranderd 12 herinneringen en 0 tijdelijke Premium-grants. De nieuwe private geheugenroutes zijn vooralsnog uitsluitend GitHub Draft-code, **niet in deze actieve Worker geladen**. Geen echte upload/herstelclaim.

**Nog open:** de GitHub Draft-code gecontroleerd aansluiten, eigen fail-closed activering, synthetische testaccount en twee authentieke sessies, volledige media-integriteitsacceptatie en bewaarbeleid/quotas vóór gebruikersvrijgave. Geen extra Cloudflare-account of nieuwe Worker aanmaken.

## Afgeschermde ontwikkelproeven
- De concept-API voor `PUT` media en daarna het complete `memory.json`-manifest is accountgescheiden en controleert SHA256. De cloudkopie wordt pas volledig gemeld als alle originele bestanden kloppen.
- Op tweede toestel blijft `stories` + `files` dezelfde TALERA IndexedDB; herstel gebruikt één atomaire `add`-transactie. Geen bestaande record kan stilzwijgend worden vervangen.
- Bij een mislukte mediaoverdracht **vóór** de manifestfase verwijdert de prototype-client *best effort* uitsluitend net geüploade bestanden uit die poging via bestaande `DELETE /api/me/premium/cloud/media`. Reeds bestaande, identieke eerdere uploads worden **nooit** automatisch verwijderd; lokaal blijft alles intact.
- **Beperking:** na netwerkverlies zonder ontvangstbevestiging kunnen alsnog niet-gecommitteerde objecten achterblijven. Een bewaartermijn/opruiming met veilige gelijktijdigheidsafhandeling en opslagquota moeten zijn beslist vóór een echte activering. Het prototype mag niet als volledige, racevrije object-GC worden voorgesteld. Voeg geen R2-lifecycle-regel toe op `private/v1/` die ook definitief opgeslagen originelen zou laten verdwijnen.
- Eerst uitsluitend synthetische testinhoud en minimaal één normale geauthenticeerde QA-sessie, daarna tweede sessie; na test rechten intrekken en proefobjecten controleren.

## Bron
- https://developers.cloudflare.com/r2/reference/data-location/
- https://developers.cloudflare.com/workers/wrangler/commands/r2/
- https://developers.cloudflare.com/r2/api/workers/workers-api-usage/
