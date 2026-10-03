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

## Aanvullende voortgang 1 oktober 2026

- De aparte Free-worker is gepubliceerd via Cloudflare Builds op `development/prototype-free`. URL: https://talera-free-local-prototype.mark-a39.workers.dev/. De eerdere publicatieblokkade hierboven beschrijft alleen de oorspronkelijke situatie.
- De gebruiker heeft toestemming gegeven om updates van deze Free-testomgeving voortaan zelfstandig via de gekoppelde GitHub-verbinding te publiceren. De bevroren referentie blijft intact.
- De echte cloudbrowserproef heeft fotoselectie, herladen, datum/tekst, publicatie en terugzien van de tekst op de tijdlijn bevestigd. Geen volledige netwerkaudit uitgevoerd. De gebruiker heeft ook een eigen foto en getypte herinnering op zijn iPhone-tijdlijn teruggezien.
- Tekst, titel en datum worden als lokale IndexedDB-records bewaard, naast de fotoblobs. Losse tekstbestanden of een zichtbare telefoonmap worden niet aangemaakt. Export/import volgt later.
- Het Free-tekstpaneel behoudt nu de gekozen tussenhoogte bij loslaten en vensterwijzigingen. DOM-regressietest geslaagd. Presentatiegebaren worden op pagehide/pageshow hersteld; de gemelde Safari-terugkeerfout en het nieuwe veeggevoel blijven open voor mobiele verificatie.

## Reservekopieproef v1

Volledige collectie exporteren en gecontroleerd terugzetten is nu gebouwd. Zie `docs/PROTOTYPE_FREE_BACKUP_SPEC.md` voor afspraken, formaat, limieten en mobiele acceptatie. De eerdere vermelding van export/import als nog te bouwen is hiermee vervangen. Audio, offline app-shell en mobiele backupacceptatie blijven open.

Extra tests:

```bash
node free-local/test-backup.mjs
node free-local/test-backup-ui.mjs
```

Dezelfde `FREE_INDEXEDDB_MODULE` en `FREE_JSDOM_MODULE` instellingen gelden als voor de eerdere tests.


## Complete Free-proef — geïntegreerde bouw

De opdracht van 1 oktober 2026 vervangt de eerdere fasebeperking: lokale audio, maximaal 12 foto's per herinnering, directe context, expliciet onbekende datum, tekst óf audio publiceren, terugluisteren, foto’s bladeren, bewerken/verwijderen, installatie/offline-shell, opslagmeting/persistentieverzoek en reservekopie v2 met audio. Zie `docs/PROTOTYPE_FREE_INTEGRATED_SPEC.md` voor modulegrenzen, acceptatie en de status van onderbrekingen. Versie-1 kopieën blijven leesbaar.

Interne controles: `test-integrated.mjs`, de bestaande opslag-, DOM-, pakket- en UI-tests, plus Wrangler dry-run. Audio en oorspronkelijke foto's worden nooit naar de Worker gestuurd; het apparaat verwerkt ze. `connect-src self` is nu nodig voor de vaste offline-appcode; de Worker accepteert uitsluitend GET/HEAD en geen persoonlijke opslagroutes. De offline-shell bevat uitsluitend bekende appbestanden.

Mobiele acceptatie blijft open: echte microfoon en hoorbare opname, Safari-formaten/oriëntatie, schermvergrendeling, appwissel, offline toevoegen na eerste cachefase, PWA/Safari-context, Bestanden-export/herstel inclusief audio, herstart en Android. Geteste recordergebeurtenissen zijn simulaties en bewijzen geen hoorbare opname op iPhone.

## Correctieronde 2 oktober: presentatie, tijdvakken en transcriptie

De Free-testbranch heeft een apart leesvlak op de tijdlijn: verticaal slepen behoudt tussenhoogten; horizontale fotoboekgebaren blijven bij de bestaande motor. Tikken op de foto bladert binnen het verhaal. Luisteren staat standaard uit, is in Meer aan te zetten en start vervolgens bij wisselen van verhaal. Bij geweigerde autoplay wordt hervatten expliciet aangeboden. Grote foto-pijlen, telling en luisterknop zijn verwijderd. De boven- en onderlagen hebben een smalle transparante blur, zonder de witte captiongradiënten. Dialogen hebben een herkenbaar kruis; de reservekopiecontrole blijft tijdens een actieve bewerking beschermd tegen afsluiten.

Nieuwe publicaties vereisen een datum of seizoen en jaartal. Winter van jaar Y loopt van december Y-1 tot en met februari Y. Seizoensverhalen krijgen uitsluitend voor de weergave stabiel verdeelde posities binnen het tijdvak; de opgeslagen aanduiding blijft het seizoen. Bestaande onbekend-gedateerde verhalen worden niet verwijderd. Tijdvak en plaatsingsvolgorde blijven behouden in reservekopieën. Fotoselectie heeft geen vaste limiet van twaalf; verwerking blijft serieel en gebonden aan beschikbare toestelopslag.

Spraakherkenning gebruikt Whisper tiny q8 en Transformers.js 3.8.1 in een afzonderlijke worker. Alleen de publieke runtime en modelbestanden worden gedownload; PCM wordt als lokale Float32Array verwerkt. Geen remote SpeechRecognition-fallback. Eerste gebruik vereist netwerk en modelopslag; het model wordt door de runtime gecachet. AudioWorklet verzamelt circa zes seconden per blok, zodat transcriptie met vertraging wordt toegevoegd aan het witte tekstvlak en dezelfde lokale verhaalrecord. De volledige audio blijft onafhankelijk van transcriptiefouten behouden. Live transcriptiekwaliteit, snelheid, stroomverbruik en offline modelcache op iPhone/Android zijn nog geen bevestigde acceptatie. De geïsoleerde `/speech-check` pagina accepteert uitsluitend lokaal geselecteerde proefaudio en verandert geen verhalen.

Validatie: opslag-, reservekopie-, DOM-, import/offline-, recorder-, reservekopie-UI- en nieuwe presentatie/tijdvaktests; Wrangler build zonder bindings. Het echte Whisper-model heeft een publieke JFK-proefopname lokaal correct omgezet in de Node-runtime; dat bewijst nog geen Safari/WASM-werking. Mobiele acceptatie en visuele controle van de gepubliceerde bouw blijven nodig.

De hervatte acceptatieronde heeft de echte browsercyclus foto → seizoen/jaartal → tekst → tijdlijn bevestigd, inclusief zichtbare sluitkruisen en een blijvende tussenhoogte van het presentatieleesvlak. De datumtekst op de ruler gebruikt bij seizoensverhalen nu de opgeslagen tijdvakaanduiding. Vertraagde oude UI-autosaves mogen een nieuw tijdvak of inmiddels aangevulde tekst niet terugzetten. De app-shellversie is verhoogd zodat bestaande installaties nieuwe modulebestanden ontvangen. De browserruntime van het spraakmodel heeft een afzonderlijke cache voor de vier vaste, gepinde CDN-bestanden; modelgewichten blijven in de bestaande lokale modelcache. `test-speech.mjs` controleert resampling, opeenvolgende lokale PCM-blokken en voltooiing. De browsermodeltest wordt pas geaccepteerd na zichtbare transcriptie; een geslaagde Node-test alleen is onvoldoende.
