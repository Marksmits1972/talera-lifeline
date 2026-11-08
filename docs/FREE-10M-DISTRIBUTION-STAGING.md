# TALERA Free — echte distributie-optimalisatie in staging
Datum: 8 november 2026. Alleen Free; Premium valt buiten deze wijziging.

## Wat we al weten
De eerdere Free-audit zag grote HTML-pagina's met veel ingebouwde JavaScript en CSS,
en Cache-Control: no-store op /mijn-leven, /present en /tell van de voorkeurs-PWA.
Dat bewijst niet dat 10 miljoen gebruikers onmogelijk zijn.

**Belangrijk:** de huidige GitHub-code is een timeline-prototype en is nog niet
bewezen identiek aan de voorkeurs-PWA op
talera-account-birthdate-test-20261107.mark-a39.workers.dev.
We optimaliseren hier eerst de aantoonbaar aanwezige root-route van de GitHub-Worker.

## Wat nu echt wordt gebouwd
1. Een buildtool leest de anonieme homepage uit de bestaande Worker.
2. De tool zet compatibele, identieke JS- en CSS-codeblokken om naar losse bestanden
   met een SHA-256-hash in de bestandsnaam. Niet-veilige omzettingen blijven inline.
3. Cloudflare Workers Static Assets kan die statische bestanden wereldwijd leveren.
   De assetheaders zijn: public, max-age=31536000, immutable.
4. Alleen de volledig anonieme GET naar / zonder cookies, auth of parameters
   krijgt de kleinere gegenereerde HTML-shell. De shell blijft no-store.
5. Alle andere paden, uitnodigingen, gepersonaliseerde verzoeken en API's lopen
   rechtstreeks via de ongewijzigde bestaande Worker.
6. Tests reconstrueren de oorspronkelijke HTML byte-voor-byte en vergelijken
   de originele JS/CSS met iedere versiegebonden statische asset.

De code staat op een aparte branch, zonder productiedeployment. De
standaardconfiguratie wrangler.jsonc wordt niet gewijzigd. De stagingconfiguratie
wrangler.free-scale.jsonc heeft een andere Worker-naam en geen productie-R2-binding.

## Reproduceerbare uitvoering
- node scripts/build-free-scale.mjs
- node --test test/free-scale-distribution.test.mjs
- npx wrangler deploy --dry-run --config wrangler.free-scale.jsonc

Alleen als later expliciet gewenst en geverifieerd:
- npx wrangler deploy --config wrangler.free-scale.jsonc

Er is geen grote loadtest uitgevoerd, geen personalisatie gecachet en er is geen
productie-opslag aangeraakt.

## Wat nodig blijft vóór de claim 10 miljoen gebruikers
- De exacte huidige Free-PWA-broncode en uitrolroute aan deze optimalisatie koppelen.
- Browser- en mobiele regressie op styling, tijdbalk, audio, video en offline gedrag.
- Meerdere regio's, cachehitratio, aantal assets, bytes, Worker-CPU, p95/p99,
  fouten en kosten meten in een veilige stagingomgeving.
- Piekbelasting gecontroleerd opvoeren volgens een vooraf afgesproken kostenlimiet.

Status: eerste uitvoerbare **stagingimplementatie**; schaalclaim nog niet bewezen.
Cloudflare docs:
https://developers.cloudflare.com/workers/static-assets/
https://developers.cloudflare.com/workers/static-assets/headers/
https://developers.cloudflare.com/workers/static-assets/binding/
