# TALERA PWA V4 — schrijf-cursor, footer, tijdlijn-publicatie

**Datering:** 27 oktober 2026. **Status:** GEBOUWD, browsergetest met synthetische invoer, iPhone Safari nog niet geaccepteerd. V4 is alleen een testkandidaat.

## Gecontroleerde bevroren basissen
- V3: talera-pwa-werkblad-schrijf-v3-test, deployment 4d1e702e-4abd-4392-b3bc-6c52fecfd715 — onaangetast.
- V2: talera-pwa-vertel-schrijf-v2-test, deployment 0a1fece2-a737-490b-9f3d-274aa71882e9 — onaangetast.
- Zero-integratie: talera-pwa-vertelmodus-zero-integrated-test, deployment 5be1127d-b0cb-494c-8f4a-b1fe2801ae03 — onaangetast.

## Afzonderlijke V4 kandidaat
- Worker talera-pwa-werkblad-schrijf-v4-test
- Test-PWA: https://talera-pwa-werkblad-schrijf-v4-test.mark-a39.workers.dev/tell
- Tijdlijnoverzicht: https://talera-pwa-werkblad-schrijf-v4-test.mark-a39.workers.dev/mijn-leven
- Presentatie: https://talera-pwa-werkblad-schrijf-v4-test.mark-a39.workers.dev/present
- Cloudflare deployment 675a53e8-3552-4750-9833-1c2a13949739
- Cloudflare version fadc266e-6295-4cbd-bcdb-3ea663b29364
- GitHub branch feature/werkblad-publish-writer-v4-20261027

## Scope en bronpatches
1. Schrijven: zes bestaande beelden blijven in originele herinneringsvolgorde; beeldstrip wordt BINNEN dezelfde scrollcontainer als de bestaande concepttekst geplaatst, niet meer als apart vast onderdeel. Textarea groeit met scrollHeight, houdt overflow verborgen en verschuift bij een actieve cursor de gezamenlijke scrollcontainer zodat de invoer zichtbaar blijft. On-screen-toetsenbord gebruikt window.visualViewport.height en .offsetTop met resize/scroll/oriëntatie-listeners; die listeners worden bij sluiting afgemeld. Zie v4/writer-motion.js/.css. Geen tweede savepad; het bestaande story input-event en saveDraft blijven leidend.
2. Bewerkpagina: publicatiefooter is een normale flex-rij onder de onafhankelijk scrollbare werkpagina, niet meer een negatieve sticky onderaan. Houd rekening met env(safe-area-inset-bottom) en display-mode standalone. Bestaande titel/datum/media en navigatie behouden.
3. Publiceren: bestaande datumvalidatie en uploads blijven staan. Na mem.save volgt nu extra controle mem.get(row.id) van het daadwerkelijk opgeslagen record, VOORDAT het concept en de mediacopies worden opgeruimd. Daarna gaat navigatie naar /mijn-leven?published=<row.id> in plaats van rechtstreeks /present?memory=<id>. Hier wordt de nieuw opgeslagen herinneringskaart opgezocht, benadrukt en in beeld gescrold, met de compacte melding ‘Je herinnering staat op je tijdlijn’. De kaart zelf linkt naar de bestaande presentatie. Zie v4/timeline-published.js/.css.
4. Spraakopname, wisselmomenten, videoronde met origineel geluid, officiële TALERA-icons, bestaande drag-sorteerfunctie, PWA-opslag en Project Master blijven behouden. Geen oude Story Player opnieuw geïntroduceerd.

## Afgeronde browserproeven (gesimuleerd mobiel 390x844)
PASS: /, /tell, /mijn-leven?published=..., /present, /vertelmodus-embed?mode=present en manifest laden zonder Worker-fouten.
PASS: automatische publicatie van een nieuwe tekstherinnering met titel en datum 2020 -> app NAVIGEERT naar ‘Mijn leven’, nieuwe kaart gevonden en status ‘Je herinnering staat op je tijdlijn’ zichtbaar; dit is echte IndexedDB-bewaring in een geïsoleerde browsersessie.
PASS: 45 getypte tekstregels -> groeiend tekstveld 2512px hoog, scrollcontainer scrollTop 1767px, terwijl de bovenste foto's mee weg kunnen schuiven en het invoerveld intern geen onafhankelijke scrollbar meer heeft.
PASS: zes synthetische foto's en twee drag-acties -> precies één publicatieknop: [1,1,1], app en footer eindigen op viewport onderrand 844px, button onderrand 830px (zichtbaar).
V3 regressietests van opnamestart en originele ongedempte videoronde zijn eerder in dezelfde basistak met synthetische gebeurtenissen geslaagd; echte iPhone-videodoorloop blijft nog niet praktisch geverifieerd.

## Nog te toetsen door eigenaar op echt iPhone-toestel
- Schrijf langere tekst met geopend softwaretoetsenbord in Safari of ChatGPT-webview: cursor blijft zichtbaar en foto's schuiven natuurlijk omhoog; blijf ook midden in bestaande tekst aanpassen.
- Open als geïnstalleerde PWA op beginscherm en controleer veilige ondermarge/hoogte zonder browserbalk.
- Zet datum, titel, foto's en tekst; tik ‘Op mijn tijdlijn plaatsen’ en bevestig in ‘Mijn leven’ dat de herinnering verschijnt en opent. Wanneer datum nog ontbreekt moet de bestaande datepicker eerst verschijnen.
- Test stem/foto-synchronisatie, volledige videoachterronde met geluid en originele officiële appicon op iOS.
- Vergelijk met behoudende V3, laat eigenaar de kandidaat apart accepteren voordat deze CURRENT wordt.
Let op: andere workers.dev-origin = eigen IndexedDB. Bestaande herinneringen van een andere URL verschijnen niet automatisch in V4.

## Releasebeleid
NIET mergen of promoveren naar CURRENT zonder expliciete eigenaarbeoordeling. V3 en eerdere Cloudflare-workers onaangeraakt. De complete historische Cloudflare-bundel wordt nog niet volledig vanuit GitHub CI gereproduceerd; deze branch is een gedocumenteerde delta.
