# TALERA V11 — 50 schone voorbeeldfoto's en gecontroleerde blurvergelijking
**Datum 28 oktober 2026. Status: aparte testkandidaat gebouwd, automatisch in mobiele Chromium getest; nog niet door gebruiker op iPhone getest of goedgekeurd.**

## Exacte uitgangsbasis en herstel
- V11 Worker: `talera-pwa-v11-schone-fotos-vergelijking-test` (Cloudflare Workers).
- V11 PWA: https://talera-pwa-v11-schone-fotos-vergelijking-test.mark-a39.workers.dev/
- Normale presentatietest met herinnering 25: https://talera-pwa-v11-schone-fotos-vergelijking-test.mark-a39.workers.dev/present?memory=25
- Dezelfde herinnering zonder blur/maskers: https://talera-pwa-v11-schone-fotos-vergelijking-test.mark-a39.workers.dev/present?memory=25&photo_test=raw
- Zelfde voorbeeld in ander beeldformaat: `memory=1` staand, `memory=2` liggend, `memory=3` vierkant.
- V10 blijft intact als herstelbasis: `talera-pwa-v10-schrijf-kenmerken-presentatie-test`; V9 blijft eveneens ongemoeid.
- Bron-delta in GitHub `feature/v11-50-schone-fotos-blurdiagnose-20261028`, voortbouwend op V10. De historische volledige Cloudflare Worker is niet uit GitHub-delta alleen reproduceerbaar; maak geen CURRENT/PR-merge zonder goedkeuring.

## Wijziging: alleen 50 fictieve DEMO-herinneringen
De bestaande V10 heeft twee demonstratiebronnen die niet hetzelfde waren: (A) 50 objecten in het presentatiemotor-script `chunk6`, (B) afzonderlijke `DEMO_MEMORIES` gebruikt door hoofdoverzicht en `/api/demo-memories`. **Beide bronnen** zijn nu op de 50 verse gegevens afgestemd. De originele tijdlijnposities en demo-id's 1 t/m 50 zijn behouden. Alle 50 titelteksten en volledige verhaalteksten zijn nieuw. Bronfoto's zijn 50 unieke **URL's** van Picsum met stabiele seed (geen `?blur`, `?grayscale` of vooraf toegepaste TALERA-beeldfilters); geen persoonlijke media zijn gewijzigd. Variatie loopt cyclisch door portret 800×1200, landschap 1200×800 en vierkant 900×900.

Picsum levert op aanvraag op maat geschaalde/waar nodig uitgesneden beelden; dit test niet de oorspronkelijke camera-EXIF of ruwe HEIC-bestanden. Het zijn demonstratiefoto's voor een technische vergelijking, geen aangekochte of eigen productie-beeldbank. Geen gebruikersherinneringen, concepten, stemopnames of eigen foto's zijn verwijderd.

Ook 5 hardcoded initiële/fallback-fotoreferenties in de presentatie zijn vervangen, zodat geen oude voorbeeldfoto als initiële achtergrond te zien is.

## Diagnose: twee toestanden met exact dezelfde bronfoto
Normaal: bestaande V10-presentatie wordt gebruikt, inclusief dynamische fotografische maskers en subtiele achtergrondvervaging.
Controle `photo_test=raw`: schakelt enkel in een diagnostische CSS-klasse de achterliggende vervaagde fotolaag, de dynamische fotomaskers en het backdrop-filter uit. De originele hoofdafbeelding, opgeslagen datum/tekst, tijdlijnpositie, fotowissel- en swipebesturing blijven gelijk. De weergave is uitdrukkelijk een **controlemodus**, geen nieuw productieontwerp. Omdat de originele bronfoto voor beide modussen identiek is, is een visueel verschil afkomstig uit software-styling, niet uit een 'reeds ingebakken' blur in de foto.

Bij de broninspectie vastgesteld: oudere foto-renderer heeft een dynamisch masker met circa 72px zachte randen en software-backdrops, afhankelijk van fotoformaat, zelfs als V10 andere vervagingslagen al had verminderd. Dit is een plausibele softwareverklaring, maar de echte iPhone-vergelijking moet het definitief tonen.

## Automatische controles (mobiele Chromium 390×844)
1. /, /present, /tell geven HTTP 200, hoofdoverzicht `window.__taleraReferenceMemories` bevat **50** unieke, nieuwe seeded foto-URL's en nieuwe teksten; geen oude demo-URL's meer op het hoofdoverzicht.
2. Na een aanvankelijke fout in het samenvoegen van de presentatiescript-data (ontbrekende komma's in de vernieuwde demo-objecten) is deze volledig hersteld. De echte RH19 `window.__taleraTimelineRuntime` is in V11 actief. De directe route `/present?memory=25` toont daadwerkelijk de tekst en foto van herinnering 25, niet de oude fallback-tekst.
3. Zelfde bron + tekst met en zonder `photo_test=raw`: beide routes renderen foto 25 met zelfde URL. Normaal heeft de foto een software mask-gradient, de Raw-controle heeft `mask-image:none` en geen achtergrondfilter.
4. Id 2 (liggend, 1200×800) en 3 (vierkant, 900×900) zijn in beide toestanden getest: afbeelding geladen en zelfde titel/datum per paar. Mask-gradient alleen in normale toestand; achtergrondfilter alleen in normale toestand.
5. Alle 50 verschillende seeded foto-bronnen zijn via kleine controleafbeeldingen geladen in browser: **50 geslaagd, 0 mislukt**.
6. Dit bewijst niet de weergave in iOS Safari of geïnstalleerde PWA, en ook niet de originele HEIC/JPEG-foto's van de gebruiker. Gebruikersacceptatie blijft nodig.

## Te beoordelen
- Vergelijk hetzelfde beeld (bijvoorbeeld nr. 25) in de twee links op de iPhone.
- Let bij foto's 1, 2, 3 op zichtbaarheid van volledige foto, gelijkmatig verloop boven/onder en natuurlijke kleurweergave.
- Geef aan of de Raw-controle voor TALERA beter werkt, of dat een minimale gradient zonder dynamisch fotomasker gewenst is.
- Laat V10 onaangeroerd totdat keuze is goedgekeurd. Geen volledige wissen/migratie van eigen foto's uitvoeren.

## Vertaalbaarheid
Bestaande UI-teksten blijven op het V10 centrale vertaalsysteem; de 50 nieuwe verhaalteksten zijn fictieve gebruikers-/redactionele inhoud, geen knoppen/labels. Eventueel toe te voegen interface-tekst moet altijd in centrale talencontainers worden ondergebracht.
