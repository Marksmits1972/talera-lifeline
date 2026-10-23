# TALERA – V42 Safari fotowissel en herstart (23 oktober 2026)

## Doel
Herstel in **de moderne TALERA PWA** de fout waarbij de stemopname en de oranje puntjes verderlopen, maar de foto niet zichtbaar wisselt. Reproduceer ook: handmatig naar de laatste foto, daarna de opname opnieuw starten, waarbij het beeld ten onrechte op de laatste foto blijft.

## Nieuwe veilige test-Worker
- Origin: `https://talera-pwa-photo-clock-v42-test.mark-a39.workers.dev`
- Vertellen: `/tell`
- Presenteren: `/present`
- Werkende gezondheidsroute: `/story-player-health` geeft **TALERA Story Player V42**
- Bron: afzonderlijke kopie van `talera-pwa-photo-clock-v41-test`, geen wijziging van V41 of productie
- Runtime identificeert zich als `window.__taleraStoryPlayer.version === 'v42-photo-replay-safari-fix'`

## Concrete oorzaak

De V41-fotowissel controleerde de browser-afbeelding als volgt:

```js
photo.src = src;
if (photo.complete) complete(photo.naturalWidth > 0);
```

In Safari kan de afbeelding tijdelijk `complete === true` melden met `naturalWidth === 0` voordat `load` daadwerkelijk is afgehandeld. De functie `complete(false)` markeerde de foto daarop definitief als mislukt. De V41-speler blokkeerde daarna alle automatische herhaalde pogingen van dezelfde foto-ID (`photoFailed===key&&!manual`). Handmatig tikken omzeilde dit verbod; dit verklaart het gerapporteerde verschil tussen handmatig en automatisch wisselen. Dit scenario is als gecontroleerde browserregressie gereproduceerd; nog niet op het echte toestel bevestigd.

## Gerichte wijzigingen aan V42

1. Vervang de vroege foutbehandeling door `if (photo.complete && photo.naturalWidth > 0) complete(true)`. Bij `complete=true` en nog onbekende afmetingen wordt gewacht op het echte `onload`- of `onerror`-event (of een time-out na 6,5 seconden).
2. Laat een mislukte automatische beeldwisseling na 1,8 seconden nogmaals proberen, in plaats van permanent te blokkeren. Tijdens een lopende aanvraag blijft deduplicatie actief.
3. Beschouw een interne geselecteerde foto-index niet als bewijs dat de zichtbare RH19-fotolaag klopt; vergelijk de echte `currentSrc` en `naturalWidth` voordat een identieke wissel wordt overgeslagen.
4. Bij het `play`-event aan het begin van de stemopname wordt de bij het eerste cue-tijdstip opgeslagen foto expliciet geselecteerd. Foto's en puntjes blijven door één fotoselectie aangestuurd.
5. Bibliotheek, originele mediabestanden en opname-/opslagformaat zijn niet gewijzigd.

## Side-by-side browsertest met Safari-achtige afbeeldingstoestand

Een gemockte `Image` rapporteerde eerst `complete=true` en `naturalWidth=0`, en maakte de echte afbeelding pas 100 ms later beschikbaar. Drie verschillende PNG-foto's en een WAV-opname van 4 seconden met cues op 0, 1.000 en 2.300 ms werden voor beide versies via de bestaande `TaleraMemories.save` opgeslagen.

| Gebeurtenis | V41 | V42 |
|---|---|---|
| Handmatig foto 3 kiezen | Foto 3 | Foto 3 |
| Afspelen opnieuw vanaf 0 s | Blijft foto 3; fout | Foto 1; correct |
| Tijdspositie 1,4 s | Blijft foto 3; fout | Foto 2; correct |
| Tijdspositie 2,7 s | Blijft foto 3 | Foto 3; correct |
| Terug naar 0 s | Blijft foto 3 | Foto 1; correct |

De test las per stap de werkelijk geselecteerde index, de actieve puntindicator, de werkelijke `currentSrc`, `naturalWidth` en foutstatus. **V42: alle gecontroleerde stappen geslaagd.**

De moderne home-, vertel-, presentatie- en gezondheidsroutes zijn na publicatie via Cloudflare Browser Rendering opnieuw gecontroleerd: HTTP 200 zonder pagina-404 of Worker-fout 1101.

## Resterende acceptatie / bescherming

- Dit is een geïsoleerde test-Worker, **niet** de definitieve TALERA PWA. V39, V40 en V41 blijven ongewijzigd.
- De nieuwe Workers-origin deelt Safari-opslag niet automatisch met vorige testdomeinen. Verwijder vorige apps of herinneringen niet.
- Reële iPhone-foto's en echte microfoonopname zijn nog niet op de gebruikerstoestel getest; de Safari-specifieke regressie is nagebootst in een browser.
- Vraag bij acceptatie nadrukkelijk naar automatisch foto 1 → 2 → 3 en herstart vanaf handmatig geselecteerde laatste foto → foto 1.
