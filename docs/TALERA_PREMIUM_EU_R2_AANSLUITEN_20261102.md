# TALERA Premium — EU-R2 opslag klaarzetten

**Status 2 november 2026:** gecontroleerd ontwerp, **EU-bucket nog NIET aangemaakt** en nog geen gebruikersdata. De bestaande Core/PWA-staging blijft actief, de persoonlijke cloudgate blijft uit.

## Keuze
Maak in hetzelfde bestaande Cloudflare-account één **private R2-bucket** aan met echte `eu`-jurisdiction, bedoeld voor Premium-privéherinneringen; **geen extra Worker, database, account of publieke R2-domeinnaam**.

Voorgestelde exacte bucketnaam: `talera-premium-private-eu-staging`.

Cloudflare is gecontroleerd: `cf-r2-jurisdiction: eu` is bij API-aanmaak verplicht om het gebied te garanderen; de via ChatGPT beschikbare Cloudflare-aanroep ondersteunt geen eigen requestheaders. Daarom is **geen** standaardbucket met `WEUR`-hint als schijnoplossing aangemaakt. Alle op 2 november aangetroffen TALERA-buckets hadden `jurisdiction: default`.

## Eénmalige EU-aanmaak (wanneer authentificatie voor Cloudflare CLI beschikbaar is)

```sh
npx wrangler r2 bucket create talera-premium-private-eu-staging --jurisdiction eu
npx wrangler r2 bucket info talera-premium-private-eu-staging --jurisdiction eu
```

Of Cloudflare dashboard → R2 object storage → Create bucket → **Specify jurisdiction → EU**. Controleer via de details dat `jurisdiction=eu` staat vóór gebruik. Gebruik niet enkel `--location weur`: een location hint is geen residentiegarantie.

Na aanmaak uitsluitend in de **bestaande** Clean Core-staging een afzonderlijke, private binding toevoegen:

```json
{
  "binding": "PREMIUM_PRIVATE",
  "bucket_name": "talera-premium-private-eu-staging",
  "jurisdiction": "eu"
}
```

Behoud bij upload/versiewijziging alle bestaande bindingen (`DB`, `SHARE_MEDIA`, `PREMIUM_MEDIA`) en de laatst goed werkende versie. **Bij oplevering blijft** `PREMIUM_PRIVATE_MEMORY_ENABLED=false`, lege testaccount-allowlist, `available.cloud_storage=false`. Niets publiceren voordat een geauthenticeerde synthetische QA-acceptatie compleet is.

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
