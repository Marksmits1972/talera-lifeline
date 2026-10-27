# TALERA — Vertelmodus volledig los, 27 oktober 2026

## Acceptatie door eigenaar — 27 oktober 2026

De eigenaar heeft de zelfstandige Vertelmodus op iPhone getest en bevestigt dat de microfoonopname werkt, foto's op de eigen tik- en swipemomenten veranderen, de beelden synchroon met de stem terugkomen en gedempte video op het gekozen punt wordt onderbroken. **Technische kern zelfstandig geaccepteerd.** Lay-out en bediening moeten nog worden ontworpen; opslag en integratie in de hoofd-PWA zijn nog niet afgerond. **Behoud de zelfstandige werkende basis, wijzig de synchronisatie niet tijdens de vormgevingsronde.**

Cloudflare-deployment van deze goedgekeurde proef: `2d7fbcfd-652a-4374-ac78-fb476696b1b0` (version `78e8dbfa-34b9-4d37-9645-55829e47d427`). De code die de eigenaar testte staat in `index.html` op deze branch.


**Status: GEÏSOLEERDE PROEF, NIET GOEDGEKEURD VOOR TALERA-INTEGRATIE.**

HTTPS-proef: https://talera-vertelmodus-zero-20261027.mark-a39.workers.dev/

Worker: talera-vertelmodus-zero-20261027. Cloudflare deployment: 2d7fbcfd-652a-4374-ac78-fb476696b1b0.

Dit bestand is de exacte HTML-bron van die onafhankelijke testversie. Geen TALERA imports, geen oude Story Player, geen koppeling met herinneringenopslag, foto-renderer of RH19. Opname gebruikt MediaRecorder en één performance.now()-klok met pauzecorrectie; vastgelegd worden {t,index,videoAtMs?} bij handmatig tikken/swipen. Afspelen volgt audio.currentTime; video's kunnen het beeld niet blokkeren na de volgende cue. Video-audio is gedempt tijdens voice-over.

**Testvoorwaarden:** (1) meerdere foto's met 5 wissels en terugbladeren, (2) video halverwege wegvegen zonder vast te lopen, (3) pauze/hervat bij opname, (4) echte microfoon op iPhone Safari, (5) exacte beeldwissels bij terugluisteren. Opgenomen audio is lokaal in de huidige tab en gaat verloren bij verversen; gekozen bestanden worden niet naar de server geüpload.

**Integratieverbod:** geen wijzigingen aan TALERA-hoofdapp of bestaande testworker totdat deze proef op iPhone is goedgekeurd. Bestaande eerdere basis behouden.