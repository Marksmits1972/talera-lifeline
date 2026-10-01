# TALERA Free — lokale fotoproef

Bron: bevroren `reference/prototype-free-final-r19h2-20261001`, commit `0738ade7fafb68c3ae85675a68f8d4f8c09526ef`.

Dit is de eerste afzonderlijke proefroute: één foto → compacte lokale kopie en thumbnail → datum en handmatige tekst → lokaal opslaan → juiste positie op de bestaande tijdlijn → heropenen/bewerken. De originele bestanden in de fotobibliotheek worden nooit gewijzigd.

## Modules en grenzen

| Module | Verantwoordelijkheid | Publieke aansluiting |
|---|---|---|
| `storage.browser.js` | IndexedDB, echte blobs en versieerbare metadata, transacties | `storage.story/stories/media/putMedia/save/delete` |
| `media.browser.js` | Lokale canvasverwerking, configureerbaar 1600/320 px | `compactPhoto(file,id)` |
| `bridge.browser.js` | Omzetten tussen referentie-UI en lokale gegevens | lokale `Response`-adapter; geen netwerktransport |
| `pages.js` | Referentievormgeving hergebruiken, cloudcontrollers uitschakelen | `makePages()` |
| `copy.browser.js` | Centrale Nederlandse teksten voor nieuwe/aangepaste Free-functionaliteit | `nl`, `t(key)` |
| `worker.js` | Alleen appcode en statische scripts leveren | GET/HEAD, overige routes 404, schrijven 405 |

De referentie wordt alleen geïmporteerd om de bestaande HTML/CSS en interacties te hergebruiken. De Free-worker roept uitsluitend vaste pagina-GETs zonder bindings aan. Persoonlijke inhoud gaat niet naar de historische serverroutes. De browseradapter bewaart die inhoud uitsluitend in IndexedDB. `connect-src 'none'` blokkeert aanvullend netwerkverzoeken vanuit de pagina; scripts worden van dezelfde origin geladen. Persoonlijke herinnerings-ID's staan in URL-fragmenten en worden niet als query naar de server verzonden.

Dit is bewust een overgangsadapter rond de bevroren UI, nog geen volledige schone herbouw van alle UI-modules. De oude UI-teksten moeten nog volledig geïnventariseerd en gecentraliseerd worden voor afronding van algemene roadmapfase 1. Nieuwe en gewijzigde Free-teksten staan in de centrale catalogus. Deze proefstap markeert geen algemene roadmapfase als gereed.

## Ontwikkelen en bouwen

Vanuit de repository:

```sh
npm ci
node free-local/dev-server.mjs
npx wrangler deploy --dry-run --config free-local/wrangler.jsonc
```

De lokale server luistert op `127.0.0.1:4173`. Voor publicatie moet eerst de beschikbaarheid van Worker-naam `talera-free-local-prototype` gecontroleerd worden in het bedoelde Cloudflare-account. Gebruik uitsluitend `free-local/wrangler.jsonc`; de rootconfiguratie hoort bij de bevroren referentieomgeving. Er is nog geen Free-deployment uitgevoerd.

## Testen

`test-storage.mjs` gebruikt `fake-indexeddb`; `test-dom.mjs` gebruikt daarnaast `jsdom`. Installeer deze testhulpmiddelen buiten de productdependencies en geef hun modulepaden op via `FREE_INDEXEDDB_MODULE` en `FREE_JSDOM_MODULE`, of maak ze normaal beschikbaar voor Node.

```sh
node --test free-local/test-storage.mjs
node free-local/test-dom.mjs
```

`test-browser.mjs` bevat de echte browserroute met fotoselectie, compressie, opslaan, herladen, bewerken en controle op netwerkverzoeken. Gebruik Playwright met een werkende Chromium-installatie; optioneel `FREE_PLAYWRIGHT_MODULE`, `FREE_CHROMIUM_PATH`, `FREE_TEST_ORIGIN` en `FREE_SCREENSHOT_PATH`.

## Bewijs op 1 oktober 2026

- Zes interne controles geslaagd: teruglezen van bytes/metadata, abort bij ontbrekende bytes met behoud van eerdere gegevens, verwijderen van lokale media na metadatawijziging, weigeren van lege media, syntaxis/netwerktransportcontrole van pagina's en geïsoleerde configuratie.
- DOM-controle geslaagd: dezelfde lokale herinnering wordt op de tijdlijn geselecteerd met eindige tijdpositie en juiste titel/tekst; de vertelpagina heropent dezelfde datum/tekst/titel. Canvas is in deze test gemockt; dit bewijst geen vormgeving of browsercompatibiliteit.
- Cloudflare dry-run geslaagd: circa 812 KiB bronbundel, circa 197 KiB gzip; **geen bindings**.
- Echte browsertest geblokkeerd: Chromium stopt in deze omgeving bij starten met SIGTRAP. Er zijn dus nog geen werkelijke mediagroottes, screenshots of geslaagde volledige browser-netwerkaudit.
- Publicatie geblokkeerd: Wrangler meldt dat Cloudflare niet is aangemeld. Er is geen bevestigde Free-URL en de beschikbaarheid van de Worker-naam is nog niet gecontroleerd.

## Mobiele acceptatie — nog open

1. Open de afzonderlijke Free-URL op iPhone/Safari zodra die beschikbaar is.
2. Kies één eigen foto en controleer het directe beeld, de uitsnede en oriëntatie.
3. Vul een bevestigde datum en eigen tekst in via het omhoogschuivende paneel.
4. Kies **Op mijn tijdlijn**; controleer foto, datumpositie en tekst.
5. Herlaad, sluit/heropen de browser en test een telefoonherstart binnen dezelfde context.
6. Open de herinnering opnieuw om te bewerken. Test een ongeldig fotoformaat en opslagfouten.
7. Controleer netwerkverkeer: geen persoonlijke tekst, media of metadata mag het toestel verlaten.

Nog te bouwen in volgende proefstappen: lokale audio, installatie als PWA, offline app-shell, lokale export/import, kleine bulkselectie, opslagmeter/persistentieverzoek en verdere datalevensloop-/belastingtests. Zonder export is deze eerste proef alleen geschikt voor testinhoud. Browseropslag is geen gegarandeerde reservekopie.

De lokale proef mag pas na expliciete mobiele goedkeuring een nieuwe baseline worden. Rollback van de geïsoleerde Worker raakt de referentie en bestaande live Workers niet. Wis of verander de Free-origin niet bij updates: lokale gegevens zijn aan die origin en browsercontext gekoppeld.
