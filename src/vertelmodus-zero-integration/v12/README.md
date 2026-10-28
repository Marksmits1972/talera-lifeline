# TALERA V12 — goedgekeurde visuele basis voor de presentatie

## Besluit van gebruiker — 28 oktober 2026

De gebruiker heeft de scherpere, doorlopende presentatie met een enkele zachte donkere tekstgradient op zijn iPhone bekeken met drie V12-voorbeelden en zegt: **"we houden dit nu even als vaste versie aan. Dit ziet er mooi en overzichtelijk uit."**

**Status: visuele presentatieopbouw V12 GOEDGEKEURD ALS VASTE BASIS.**

Dit betekent uitdrukkelijk **niet** dat alle V12-functionaliteit op iPhone afgetest is of dat productie/CURRENT automatisch moet worden vervangen. De bestaande V11-versie blijft bewaard als herstel-/vergelijkingsbasis.

**Openstaand acceptatiepunt:** bij deze kandidaat zijn geen eigen, breed/liggend gefotografeerde foto's van de gebruiker beschikbaar om te beoordelen of `object-fit: cover` de belangrijkste onderwerpen netjes in beeld houdt. De weergave mag bij liggende foto's zijkanten (of afhankelijk van verhouding boven/onder) uitsnijden; die uitsnede moet later met echte eigen foto's op iPhone, zowel in Safari als de geïnstalleerde PWA, getest worden. Niet wijzigen voordat zo'n test tot een concrete nieuwe wens leidt.

## Technische vaste regels
- Eén doorlopend, scherp fotovlak met originele kleuren.
- Geen dubbele fotoachtergronden, dynamische beeldmaskers, zware blur, melkachtige witte waas of zichtbare horizontale fotogrenzen.
- Eén subtiele **donkere** gradient achter de witte verhaaltekst onderaan.
- Uniforme presentatie voor staande, liggende en vierkante voorbeelden.
- Fotocontroller, tijdlijn, tik/swipe, Vertelmodus, Schrijfmodus, stem/video en opslag ongemoeid.
- Nieuwe UI-teksten uitsluitend in de bestaande centrale taalcontainers.
- Nieuwe bouwrondes behouden deze goedgekeurde presentatiebasis tenzij de gebruiker expliciet een wijziging goedkeurt.

## Vaste testversie en rollback
- V12 PWA: https://talera-pwa-v12-scherpe-presentatie-test.mark-a39.workers.dev/
- Direct presenteren: https://talera-pwa-v12-scherpe-presentatie-test.mark-a39.workers.dev/present?memory=5
- Worker: `talera-pwa-v12-scherpe-presentatie-test`.
- Vastgelegde Cloudflare deployment: `f0edc064-f7b1-4eff-8580-4645339aaa48`.
- Cloudflare version: `23566e9b-c1dd-42a3-8899-5462eaac0457`.
- V11 rollback: `talera-pwa-v11-schone-fotos-vergelijking-test`, deployment `85ca1430-8376-49ff-bdcb-b3603c347a29`, version `29269c04-8733-4fb8-aebe-f0dd9f123abb`.
- GitHub branch: `feature/v12-uniform-scherp-fotovlak-20261028`.
- V12-bron-delta: `presentation-photo-v12.css`. De historisch geïntegreerde Worker is nog niet volledig CI-reproduceerbaar uit de GitHub-delta; Cloudflare-deployment blijft de exacte testkandidaat.

## Wat is wel/niet gevalideerd?
- Automatische mobiele Chromium-checks: presentatie met meerdere beeldverhoudingen, `object-fit:cover`, geen mask/blur, foto-overlay, lezen van langere verhaaltekst, navigatie en gesimuleerde aanvullende videoronde.
- Op echte iPhone: gebruiker bevestigt het uiterlijk van drie voorbeeldfoto's, mooie helderheid, tekstleesbaarheid en consistente uitstraling.
- Niet getest/goedgekeurd: echte eigen liggende foto's, uitsnede van gezichten/onderwerpen, iOS-opnamen/videos met geluid in deze specifieke kandidaat, volledige regressie van alle functies.

**Geen automatische promotie van V12 naar definitieve productie en geen destructieve migratie van persoonlijke media.**
