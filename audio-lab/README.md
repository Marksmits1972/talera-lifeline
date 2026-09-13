# TALERA Audio Lab v2

Dit project staat bewust volledig los van de bestaande TALERA-app.

Doel: één geïsoleerde audioketen op een echte iPhone/Safari bewijzen zonder tijdlijn, Orb, transcriptie, datumlogica of andere TALERA-state.

## Vier bewijzen

1. **Opnemen**
   - open de iPhone-microfoon;
   - neem 5–10 seconden op;
   - maak één lokale `Blob` met `MediaRecorder`.

2. **Lokaal luisteren**
   - toon lokale bytes, MIME en SHA-256;
   - speel exact die lokale blob af;
   - de tester bevestigt zelf: `Ja, ik hoor mezelf`.

3. **R2-opslag en terughaalcontrole**
   - upload exact dezelfde blob naar R2;
   - server berekent SHA-256;
   - R2 `head()` moet dezelfde bytegrootte en hash bevestigen;
   - download daarna het object opnieuw;
   - client berekent opnieuw SHA-256;
   - lokale bytes/hash en serverbytes/hash moeten exact gelijk zijn.

4. **Vanaf server luisteren**
   - maak een nieuwe object-URL van de teruggehaalde R2-blob;
   - speel die blob op de iPhone af;
   - de tester bevestigt zelf: `Ja, dit is dezelfde opname`.

Pas na die laatste bevestiging telt de ronde als geslaagd.

## 10-rondes acceptatie

De teller op het toestel moet `10/10` bereiken met tien opeenvolgende volledige rondes. Een ronde is alleen groen wanneer:

- lokale blob > 0 bytes;
- lokale playback hoorbaar de eigen opname is;
- R2 stored bytes gelijk zijn aan lokale bytes;
- teruggehaalde bytes gelijk zijn aan lokale bytes;
- lokale SHA-256 exact gelijk is aan server/R2 SHA-256;
- serverplayback hoorbaar exact dezelfde opname is;
- een volgende nieuwe opname in dezelfde pagina opnieuw volledig werkt.

Pas daarna wordt recorder/upload/playback-code teruggebracht naar TALERA.

## Cloudflare

Worker: `talera-audio-lab`

URL: `https://talera-audio-lab.mark-a39.workers.dev/`

Root/config: `audio-lab/wrangler.jsonc`

R2 binding:
- variable: `AUDIO`
- bucket: `talera-audio-lab`

## Veiligheid

De bestaande TALERA-app is bevroren op:

`archive/freeze-talera-before-audio-lab-20260912`

De vorige Audio Lab v1 staat op:

`archive/audio-lab-v1-20260913`
