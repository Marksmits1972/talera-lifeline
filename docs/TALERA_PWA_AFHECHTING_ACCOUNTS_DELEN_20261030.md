# TALERA PWA — geïntegreerde account- en deelroute, checkpoint 30-10-2026

## Afspraak
Één TALERA-PWA en één bestaande TALERA account-kern. Geen extra registratie-, berichten- of sharecontrollers bovenop de goedgekeurde bediening. Live PWA/goed werkende V51 blijft ongewijzigd; V52 is integratie-test.

## Klaar en in mobiele browser vastgesteld
- `/present` controleert bij binnenkomst `GET /api/me` via de bestaande servicebinding `CLEAN_CORE`.
- Bij ontbrekende sessie verschijnt automatisch **Aanmelden** in het bestaande **Meer**-paneel; geen Cloudflare Access-login voor klanten.
- De cookie is first-party op dezelfde PWA-host voor account, reacties, berichten, privacy en delen (backend uitgetest per route; aanmelden met echte gebruikerscredentials in de PWA is nog niet als end-to-end bevestigd).
- Vanuit **Delen via WhatsApp** verschijnt bij geen sessie **Aanmelden om te delen**, daarna terug naar dezelfde herinnering. Geen publicatie zonder expliciete toestemming.
- Accounts hergebruiken de kern-endpoints register/login/logout/me, ontdekbaarheid, gebruikerszoeken, berichten en reacties, gedeelde herinneringen en eigen herinneringen.
- `/account` verwijst door naar `/present?talera_menu=account`, dus niet langer naar een los testformulier.
- Het bestaande **Meer**-menu bevat account, mensen, herinneringen, berichten, privacy, meldingen, luisteren, abonnement, instellingen en hulp.
- Eerdere fotobandbewegingsregels blijven gelden: sociale balk verborgen tijdens snel bewegen en pas per stilstaande herinnering geladen. Slechts één sociale balk, geen actieve oude share-shell.
- PWA-runtimevelden voor `story`, `fullStory` en `at` worden nu correct omgezet naar `title`, `storyText` en `eventDate` in canonieke geheugenopslag. Publiceren doet geen dubbele memory mapping.
- Wachtwoord vergeten heeft nu een echt formulier dat de bestaande `/api/password/forgot` gebruikt.

## Nog NIET als afgerond te claimen
1. **Foto/video bij WhatsApp-gastlink**: de huidige clean-core `/gedeeld/{token}` toont tekst; foto's/video's zijn nog niet veilig gekoppeld aan gastlink-publicatie. De UI meldt dit uitdrukkelijk. Bouw dit als media-uitbreiding van dezelfde kern met eigenaar-/token-/intrekkingscontrole, géén tweede deelservice.
2. **Herstelmail werkelijk versturen**: de clean-core Worker heeft alleen D1-binding en mist momenteel `RESEND_API_KEY` en `RESET_FROM`. Het formulier is gekoppeld, maar e-maillevering is niet actief.
3. **Echte gebruikerssessie end-to-end**: login → terug naar dezelfde PWA-herinnering → hartje/reactie → delen → WhatsApp-link → ontvangen → intrekken nog live testen met Mark/Jill in gescheiden browsers, zonder wachtwoorden te delen.
4. **Mijn mensen / ontvangeruitnodiging**: zoeken en privacy werken via de kern, maar de volledige ontvangerselectie in het originele PWA-deelvenster nog toetsen/afronden.
5. **Accountprofiel**: bestaande kern heeft weergegeven naam, e-mail en ontdekbaarheidsinstelling; uitgebreid profielbeheer (foto, telefoon, apparaat-/sessie-overzicht en abonnement) is nog geen functionele kern-API. Toon niets als definitief werkend als er geen endpoint voor is.

## Integratieregels
- Geen database-dubbels; `talera-clean-core-staging-20261030` en `pwa_memory_links` zijn leidend.
- Alleen de interne API onder hetzelfde PWA-adres, met first-party HttpOnly sessiecookie.
- De approved presentatie, fotoband, foto-overgangen, auto-verdwijnende sociale balk, vertelmodus en hoofdmenu blijven behouden.
- Niet migreren of wissen zonder voorafgaande expliciete goedkeuring.
- Regressiecontroles: één menu, één sociale balk, account-herkenning, 401 UX, geen onbedoelde publicatie, werkende terugvalversie.

## Huidige test-URL
https://talera-pwa-v52-integraal-account-staging-20261030.mark-a39.workers.dev/present
