# TALERA — I2: originele video's na Vertelmodus + rustige vormgeving

Datum: 27 oktober 2026. Status: **nieuw ontwikkel- en testvoorstel; nog niet door eigenaar goedgekeurd op iPhone**.

## Vaste productafspraken uit het gesprek
1. **Zonder stemverhaal:** bestaande reguliere presentatieweergave van foto's en video's behouden. De originele video hoort met zijn originele geluid beschikbaar te zijn. De huidige I2-wijziging maakt geen nieuwe speler voor deze modus.
2. **Met stemverhaal:** de goedgekeurde zelfstandige Vertelmodus blijft leidend. De opname, cue-tijdstempels, beeldwissels en pauzeafhandeling worden niet gewijzigd. Video's tijdens de vertelling blijven stil.
3. **Na het laatste woord:** automatisch de **volledige originele video's** uit dezelfde herinnering één voor één opnieuw aanbieden, in opgeslagen mediavolgorde, mét origineel geluid. De afgespeelde delen tijdens het vertellen bepalen niet de lengte: elke originele video start bij 0:00.
4. De video's worden **niet gekopieerd, gedupliceerd of opnieuw opgeslagen**. De oorspronkelijke blobs/URLs worden hergebruikt.
5. Tijdens deze extra videoreeks: **tik = volgende video binnen dezelfde herinnering**, **horizontale swipe = volgend verhaal op de tijdlijn**. Tijdens de gesproken vertelling blijft de bestaande automatische cue-synchronisatie onaangetast; een swipe vanuit de ingebedde speler gaat naar het volgende verhaal.
6. **Geen extra geluidskeuzes tijdens het inspreken.** Geen abrupte uitwisseling tussen twee geluidsstromen of terugkeer midden in een zin.
7. **iPhone/Safari-uitzondering:** als de browser automatisch starten met geluid blokkeert, verschijnt één compacte 'Video met geluid'-knop. Dit is een browserbeperking, niet een verplicht extra bedieningsstap in andere situaties.

## I2-implementatie
- `embed-bridge.js`: een aparte video-queue die pas na `voice.ended` start. Nooit onderdeel van de stemklok, de recorder, `follow()`, `syncVideo()` of `cues`.
- `presentation-adapter.js`: verwerkt het expliciete `NEXT_STORY`-bericht en selecteert de volgende herinnering via TALERA-tijdlijn. Dit verandert geen foto-cues.
- `embed.css` en `tell-overlay.css`: ingetogen vormgeving met groot beeld, rustige warme TALERA-achtergrond, compacte afgeronde knoppen en subtiele status.
- Nieuwe Worker/afzonderlijke test: `talera-pwa-vertelmodus-postvideo-layout-test`. Voorafgaande geïntegreerde I1-kandidaat en zelfstandige goedgekeurde basis blijven onveranderd.
- GitHub-branch: `feature/vertelmodus-postvideo-layout-20261027`.
- **Geen automatische overgang naar een volgend verhaal nadat alle originele video's afgelopen zijn**; de gebruiker behoudt de regie.

## Gerichte acceptatietests
- A. Foto-herinnering met stem, geen video's: vertelling stopt zonder extra ronde of fout.
- B. Foto+video-herinnering met stem, video na 5 seconden overgeslagen tijdens opname: na het gesproken verhaal loopt dezelfde originele video alsnog vanaf 0:00 tot het einde met geluid.
- C. Drie video's: na de stem volgen alle drie volledig in juiste volgorde, zonder overlap van de vertelstem.
- D. Tijdens videoronde: een tik slaat video 1 over naar video 2; een swipe gaat naar het volgende tijdlijnverhaal, niet naar een foto.
- E. Tijdens vertelling: foto's volgen de opgeslagen stem-cues precies zoals in de goedgekeurde uitvoering. Opname start/pauze/stop, later terugkijken en opslaan blijven werken.
- F. Zonder ingesproken verhaal blijven gewone foto's/video's werken; controleer op echte iPhone of originele audio intuïtief start.
- G. Test iPhone/Safari met en zonder mogelijkheid tot automatische geluidsweergave; eventuele fallback is één compacte knop.
- H. Let specifiek op **hakkelen van de tweede video**. I2 claimt nog geen oplossing voor het decodeer-/bufferprobleem; meet dit afzonderlijk met de originele video.
- I. Beoordeel lay-out van Vertelmodus én Presentatiemodus op eigen iPhone. Huidige tuning is een eerste voorstel; definitieve visuele goedkeuring staat open.

## Releaseveiligheid
De goedgekeurde zelfstandige Vertelmodus en de geïntegreerde I1-testkandidaat blijven als herstelpunten bestaan. Geen overschrijving van de live-PWA of andere origin. Herinneringen zijn lokaal per origin opgeslagen; herinneringen uit eerdere workers.dev-adressen verschijnen niet automatisch op de I2-testorigin. Tests op de nieuwe origin vereisen afzonderlijk testmateriaal.

## Verificatiestatus
- Broncode op GitHub aangepast en syntactisch gecontroleerd.
- Nieuwe Cloudflare Worker is aangemaakt en werkt met eigen workers.dev-subdomein.
- Externe HTTP/browserproeven en echte iPhone-video/audio-synchronisatie zijn nog **niet bewezen**. Promoveer I2 niet naar CURRENT zonder deze acceptatie.
