# TALERA V8 — Vertelstart zonder zichtbare flits

**Aparte testlink:** https://talera-v61-r20-vertelstart-zonder-flits-v8-20261104.mark-a39.workers.dev/present

**Nieuwe Worker:** `talera-v61-r20-vertelstart-zonder-flits-v8-20261104`

**Cloudflare-versie:** `dc673a10-919c-4d94-84e3-b5c6172eeb04`

**GitHub branch:** `dev/r20-vertelstart-zonder-flits-v8-20261104`

## Probleem en oorzaak

Bij het openen van een eigen, ingesproken herinnering komt eerst de buitenste foto in beeld; daarna initialiseert de bestaande `/vertelmodus-embed?mode=present` in een `iframe`. De embed wordt standaard al getoond tijdens opstart en plaatst eerst tijdelijke voorbeeldafbeeldingen met `examples();mode('idle')`, voordat `INIT` de echte media en ingesproken opname laadt. Daardoor is een korte zichtbare flikkering waarschijnlijk.

## Enige wijziging

V8 bouwt **bovenop de onveranderde V7** via servicebinding `V7_BASE`.

- De bestaande foto van de actieve herinnering blijft in het hoofdvenster zichtbaar tijdens het opstarten van de vertel-iframe.
- Alleen `iframe.talera-zero-present-frame` begint met transparantie; geen ander onderdeel wordt verborgen of gewijzigd.
- De bestaande embed meldt na het ontvangen en verwerken van de echte media al `{taleraZero:true,type:'INITIALIZED'}`.
- V8 gebruikt die bestaande melding om in dezelfde-origine iframe vast te stellen of het echte eerste foto- of videobeeld geladen is. Zodra het beeld gereed is, wordt de bestaande iframe in 110 ms zichtbaar.
- Een fallback na 4 seconden voorkomt dat de bedieningsknoppen onbereikbaar blijven als het beeld nooit een laadevent afgeeft.
- De originele playercode, audio, volgorde, cues/tijdcodes, swipes, opslag en editor/verwijderknop blijven **volledig** intact. Geen nieuwe spelers, timers voor de vertelling of opslagstructuren.

## Controles

- Worker in Cloudflare gepubliceerd en exacte source teruggelezen.
- V7, V6, originele R20 en vertrouwde staging zijn bij publicatie op hun eerdere versienummers gebleven.
- Synthetische JavaScript-test van `INITIALIZED`-event uitgevoerd: andere berichten worden genegeerd, eerste beeld blijft aanvankelijk verborgen, echte afbeelding wordt eerst geladen, daarna zichtbaar, met fallback bij niet-laden.
- **De werkelijke flikkering is nog niet op een iPhone geverifieerd.** De nieuwe Worker heeft eigen browseropslag, dus een lokaal opgeslagen herinnering uit V7 staat niet automatisch in V8. Maak daarom op V8 een testherinnering met de stemcyclus.
- Als de flits ook in V8 blijft, eerst vaststellen of deze optreedt vóór of ná het verschijnen van de native vertelknoppen; niets blind uitbreiden.
