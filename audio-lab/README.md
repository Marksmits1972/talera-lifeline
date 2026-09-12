# TALERA Audio Lab

Dit project staat bewust los van de bestaande TALERA-app.

Doel: één geïsoleerde keten bewijzen op iPhone/Safari:

1. Microfoon openen.
2. Audio opnemen met `MediaRecorder`.
3. Lokale blob maken en lokaal afspelen.
4. Exact die blob uploaden naar R2.
5. R2-opslag byte-voor-byte controleren.
6. Het bestand opnieuw via de Worker ophalen.
7. De opnieuw opgehaalde serverblob afspelen.

## Cloudflare

Workernaam: `talera-audio-lab`

Root directory / working directory: `audio-lab`

R2 binding:
- variable: `AUDIO`
- bucket: `talera-audio-lab`

De bucket moet éénmalig in Cloudflare R2 worden aangemaakt voordat de Worker kan deployen.

## Acceptatie

De keten is pas groen wanneer op een echte iPhone in Safari minimaal 10 opeenvolgende tests slagen waarbij:

- lokale bytes > 0;
- `Luister lokaal` de juiste eigen opname afspeelt;
- R2 stored bytes exact gelijk zijn aan lokale bytes;
- opnieuw opgehaalde bytes exact gelijk zijn aan lokale bytes;
- `Luister vanaf server` exact dezelfde opname hoorbaar afspeelt;
- een tweede nieuwe opname in dezelfde pagina opnieuw volledig werkt.

Pas daarna wordt recorder/upload/playback-code teruggebracht naar TALERA.
