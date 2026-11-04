# TALERA R20 — start ontwikkelbranch: potloodje / bewerken

- **Ontwikkelbranch:** `dev/r20-start-potlood-bewerken-20261104`
- **Geteste app-origin:** `talera-pwa-v61-kleine-kruisjes-staging-20261104.mark-a39.workers.dev`
- **Cloudflare staging-Worker:** `talera-pwa-v61-kleine-kruisjes-staging-20261104`
- **Staging-versie:** `dc7c5565-065c-4942-92fe-a71f6e465597`
- **Goedkeurde beschermde R20 Worker (niet bewerken):** `talera-pwa-v61-r20-goedgekeurd-herstelpunt-20261104`
- **Beschermde R20-versie:** `1f65e254-3bc7-418a-8015-236fe5e5d441`
- **Vóór deze ronde op start-origin:** `1bfe2d99-8171-4472-bf3f-da84e8db4dc4`

## Wijzigingen

De bestaande R20-code van 93.560 tekens is intact gehouden en met een geïsoleerd UI-blok uitgebreid tot 104.227 tekens. In de presentatie, tijdlijn en Mijn leven staat nu altijd één vast potloodje, los van de huidige herinnering. Bij aanklikken wordt de op dat moment actieve herinnerings-ID opnieuw opgevraagd. Bij eigen opgeslagen herinneringen opent de editor. Bij ingebouwde voorbeeldherinneringen geeft een beheer-informatiedialoog de ID, datum en herkomst weer; deze zijn geen persoonlijke records en kunnen niet via de bestaande editor verwijderd worden. De bestaande bewerkpagina wordt geopend, zonder aan de vertel-, foto-, video-, audio- of presentatiemotor te raken.

Bij lokaal gepubliceerde herinneringen verschijnt binnen de bestaande editor een afzonderlijke knop **Herinnering volledig verwijderen**, die na een expliciete bevestiging `TaleraMemories.remove(id)` aanroept. Bij gedeelde/cloud-herinneringen blijft de bestaande beheer- en verwijderroute gehandhaafd.

Demo-/voorbeeldherinneringen hebben geen persoonlijk opslagrecord en krijgen daarom geen vernietigende verwijderknop. Het vaste potloodje blijft wel zichtbaar bij deze testrecords en toont hun ID, zodat de gebruiker ziet welke bron de tijdlijn op dat moment heeft. Als die opnieuw bij het laden verschijnen, komen ze uit vaste voorbeeldcode en niet uit een nieuwe opname.

## Bronbestanden

- `potlood-bewerken.worker.mjs`: compacte zelfstandige R20-wrapper met exact de nieuwe clientzijde UI-/verwijderlogica. Ook los inzetbaar als staging.
- De lopende **start-origin** is op Cloudflare als R20-code + deze UI-injectie gepubliceerd, zodat bestaande IndexedDB op dat adres toegankelijk blijft. De volledige versie is onder bovengenoemd Cloudflare-versienummer terug te halen; dit GitHub-pad is géén onafhankelijke uitrol van de start-origin.

## Veiligheidsvoorwaarden

- Nooit de beschermde R20-recovery-Worker aanpassen.
- Geen wijzigingen aan blur, foto-/video-overlays, presentatiemodus, opname of opslagstructuur.
- Alleen eigen herinneringen bewerken; alleen verwijderen na een bevestiging door de gebruiker.
- De oorspronkelijke codeversie kan worden hersteld. Een eenmaal in IndexedDB verwijderde herinnering wordt **niet** hersteld door het terugzetten van de Worker-versie; eerst lokaal een backup maken.
