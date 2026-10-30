# TALERA — Clean Social & WhatsApp herstelbranch

**Datum:** 30 oktober 2026. **Status:** in ontwikkeling; niet uitgerold.

## Onderzochte nulmeting

De gepubliceerde V50 hangt via V49 aan V45. Er zijn concurrerende oude deelpaden (renderReady, quickSend, v47Send, v50ShareWhatsApp), plus lokale en serverreacties. V50 gebruikt een Cloudflare Access-aanmeldroute en wijzigt uitnodigingstijd achteraf.

## Vastgelegde architectuur

1. Eén canoniek memoryId met __taleraTimelineRuntime.subscribe, geen polling.

2. Eén SocialController met per-memoryId cache, optionele storyId en bescherming tegen verouderde responses.

3. Eén sociale balk; tijdens een deelvenster onzichtbaar en zonder pointer-events.

4. Eén WhatsApp-route: expliciete toestemming voor tijdelijke publicatie, termijn 1u/1d/7d/30d, een unieke bearer-gastlink per deelactie, alleen één verhaal, verval en intrekken server-side.

5. Ontvanger zonder TALERA-/Cloudflare Access-account. De server mag Cloudflare gebruiken; geen extra Access-gate.

6. Eigenaaracties vereisen een bestaande geverifieerde TALERA-sessie of goedgekeurde veilige device-identiteit; nooit een publiek onbeveiligd uploadendpoint.

7. TALERA-contacten en vertrouwenskringen houden hun eigen auth en rechten.

8. Een unieke link mag binnen de geldigheidsduur herhaald geopend worden; doorsturen blijft mogelijk.

## Automatische proeven

Een afzonderlijk lokaal herstelpakket met ES-modules, tests en staging D1-schema heeft 14 van de 14 huidige unit-/simulatietests groen: 20 snelle switches, correcte cache, reacties direct, dedupe, rollback, vier expiraties, eigenaar-auth fail-closed, tokenhergebruik/idempotentie, verval/intrekken en media-autorisatie.

## Nog niet afgerond

Echte owner-auth en consent-upload, koppeling aan de nieuwste presentatie, verwijderen van concurrerende legacycontrollers, media-copy en cleanup, staging D1/R2, browser- en iPhone WhatsApp-acceptatie en volledige rollback.

Geen productie-Worker of productiedatabase gewijzigd. Publicatie blijft geblokkeerd totdat de integratie- en privacytests slagen.

## Release gate

Geen gebruikerslink of claim van compleet werkend totdat de gekoppelde app, alle gedeelde media, gasttoegang, iPhone en data-integriteit groen zijn.