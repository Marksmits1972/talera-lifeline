# TALERA — Life Space + r19h2 | Eerste gecombineerde proef

**Status:** broncode gebouwd in een afzonderlijke werkbranch; code- en routeringscontroles uitgevoerd; nog niet live gepubliceerd of op iPhone/Safari beoordeeld.

## Doel

- Gebruik de goedgekeurde Life Space van 8 oktober 2026 als browse- en ontdekscherm.
- Gebruik de **originele** r19h2-presentatie en tijdlijn van 1 oktober 2026.
- Gebruik exact dezelfde 50 herinnerings-ID's. Er is vastgesteld dat alle 50 ID's, datums, verhaalintro's en fotoadressen overeenkomen.
- Eén tik op een Life Space-foto opent de overeenkomstige herinnering op r19h2.
- Met de ronde terugknop ga je terug naar de bestaande Life Space-camera zonder de pagina te herladen.
- De bestaande r19h2-vertelroute blijft bereikbaar.
- Geen van de bevroren versies of bestaande Cloudflare Workers wordt overschreven.

## Bronbestanden

- `experiments/life-space/index.html` — behouden Life Space, alleen demo-aantal op werkbranch teruggezet naar 50.
- `src/reference-r19h2-carousel-combined-worker.js` — originele ongewijzigde r19h2-presentatie.
- `experiments/life-space/integration-worker.js` — **nieuwe adapter**, laadt beide schermen en koppelt selectie/terugkeer.
- `experiments/life-space/wrangler.integration.jsonc` — afzonderlijke Worker-configuratie.
- `test/life-r19-integration.test.mjs` — regressiecontroles voor de originele 50 demoherinneringen en de scheiding van de Workers.

## Routes ná publicatie van de nieuwe Worker

- `/` — de gecombineerde proef, start in Life Space.
- `/space` — het Life Space-scherm zelfstandig.
- `/present` — originele r19h2 met integratiebridge.
- `/tell` — bestaande r19h2-vertelinterface.

## Publiceren — nooit de bestaande Workers wijzigen

1. Selecteer in Cloudflare een **nieuw** Worker-project op basis van de GitHub-branch `work/life-space-final-polish-20261013`.
2. Bouw vanuit de repository-root (geen extra build-command nodig):
   `npx wrangler deploy --config experiments/life-space/wrangler.integration.jsonc`
3. Controleer vóór deploy dat de Worker-naam **talera-life-r19-combined-dev** is, dus **niet** `talera-r19-reference`, `talera-business-filmstrip` of `talera-timeline-prototype`.
4. Controleer de werkelijk door Cloudflare toegewezen URL. Ga niet uit van een verzonnen workers.dev-adres.
5. De config bevat bewust geen D1-/R2-koppeling naar de originele r19h2-omgeving.

**Let op:** deze eerste proef is alleen-lezen. De vertelinterface kan bekeken worden, maar daadwerkelijk opslaan/opnemen/publiceren via de backend is geblokkeerd totdat een **aparte testdatabase en aparte mediabucket** zijn geconfigureerd en gecontroleerd. Dat voorkomt impact op het originele TALERA-prototype.

## Handmatige acceptatietest na publicatie

- Open de gecombineerde startpagina en controleer de zwevende foto-overzichtslaag en tijdlijn.
- Tik herinnering 1, 25 en 50 aan. Controleer de exacte foto, oorspronkelijke tijdlijn, volledige r19h2-verhaaltekst en bediening.
- Druk op de ronde terugknop; Life Space moet op dezelfde camerapositie blijven.
- Gebruik de knop om een verhaal te openen vanuit Life Space.
- Open `Vertellen` om de oorspronkelijke schermroute te controleren; verricht geen opslagtest tot de eigen testdatabase is ingericht.
- Vergelijk origineel en werkversie in Safari/iPhone en groot scherm. Alles dat nog afwijkt wordt alleen in de werkbranch hersteld.

## Beperkingen

Deze adapter gebruikt twee afzonderlijke schermweergaven met een gedeelde selectie voor snelle **prototypevalidatie**. Het is geen definitieve integratiearchitectuur. De toekomstige TALERA Web-bouw moet de twee goedgekeurde gedragscontracten in één schone productarchitectuur realiseren, zonder blijvende iframe-trucs.

**Niet gewijzigd:** `freeze/life-space-definitief-20261008`, `reference/prototype-free-final-r19h2-20261001`, `freeze/business-filmstrip-pre-qr-20261008` en de bestaande online Workers.
