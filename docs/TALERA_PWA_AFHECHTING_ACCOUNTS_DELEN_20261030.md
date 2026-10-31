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

## WhatsApp-preview-correctie — 30 oktober 2026, na iPhone-test
- De eerste foto-preview werd uit twee tekenlagen opgebouwd: uitgevulde, wazige achtergrond plus een tweede volledige foto in het midden. Op WhatsApp veroorzaakte dat een ongewenst beeld met drie stroken.
- De gedeelde JPEG op 1200 × 630 bevat nu **precies één tekening van de geselecteerde bronfoto**, met een gecentreerde uitsnede (cover), zonder collage of wazige zijpanelen.
- De WhatsApp-tekst wordt nu alleen de persoonlijke URL; titel en TALERA staan al in Open Graph. De OG-beschrijving verwijdert een identieke begintitel uit de verhaaltekst.
- Via mobiele browser geverifieerd: module geladen, exact één `drawImage`, geen `blur(22px)`, één sociale bediening en WhatsApp-tekst zonder dubbele introductie.
- **Nog op iPhone te bevestigen** met een nieuw gegenereerde uitnodiging: eindkaart in WhatsApp. Bestaande links/kaartcaches worden niet met terugwerkende kracht herschreven. WhatsApp kan de URL onder de kaart blijven tonen; dit is platformgedrag.

## Ontvangerpresentatie per gedeelde herinnering — 31 oktober 2026
- De bestaande tokenroute `/gedeeld/{token}` geeft geen losse tekstpagina meer maar een **TALERA-presentatie van uitsluitend die ene herinnering**. Geen horizontale tijdlijn, geen toegang naar naastgelegen foto's of herinneringen.
- Volledige tekst via **Lees het verhaal** in een afzonderlijk scrollbaar leesvenster; de foto vormt de presentatieachtergrond. De OG-kaart blijft de brede 1200×630 foto gebruiken, terwijl de individuele ontvanger bij nieuwe uitnodigingen de originele fotoverhouding krijgt via de tokenbeveiligde `foto-volledig`-route.
- Hartjes en reacties via `/api/guest/threads/{token}` delen de **bestaande comments-, likes- en messages-tabellen** en gedeelde kernfuncties met gewone TALERA-gesprekken. Geen tweede sociale database of extra eigenaarlogica.
- Gasten kunnen bekijken; voor een hartje of reactie is een TALERA-sessie nodig. Bij bestaande **same-origin** browsersessie wordt die hergebruikt; anders opent aanmelden of account aanmaken binnen dezelfde gedeelde presentatie. De gebruiker keert na aanmelden terug naar de betreffende herinnering. WhatsApp-inappbrowser kan een afzonderlijke cookie-opslag gebruiken; automatisch herkennen van sessies uit andere browsercontexten is dus niet te garanderen.
- Geluidsbediening is conditioneel op echte meegestuurde media; alleen een geheugen met audio-bestandsbron krijgt geluidsupload en afspeelknop. De huidige demoherinneringen geven géén audio-URL bloot; daarom is de knop daar bewust afwezig.
- Geldigheid en intrekken gelden ook voor de bijbehorende foto, audio en de sociale token-endpoints. Tijdelijke bestanden krijgen automatische lifecycle-opruiming na maximaal 31 dagen.
- Integratietest met **tijdelijke** account- en geheugenrecords bevestigd: anonieme GET 200, anonieme reactie 401, ingelogd hartje 200, ingelogde comment 201, eigenaar ontving 2 meldingen, revocation leidde tot 404 voor viewer, API en media. De tijdelijke QA-records en sessie zijn daarna verwijderd.
- Ontvangerweergave, menu en opslag zijn in V52-staging bijgewerkt; de goedgekeurde hoofd-PWA-versies zijn niet overschreven.
- Nog via echte iPhone/WhatsApp te controleren: uiterlijk van volledige foto, echte accountlogin tussen browsercontexten en een daadwerkelijke audioherinnering zodra een bronbestand beschikbaar is.

## Nog NIET als afgerond te claimen
1. **Foto bij WhatsApp-gastlink**: gekoppeld op 30-10-2026. Vanuit de gekozen herinnering wordt na expliciete toestemming een JPEG-voorbeeld (1200×630) gemaakt en beveiligd opgeslagen onder de bestaande share-ID. De persoonlijke gastpagina bevat nu een tokengebonden `og:image` en een zichtbare foto. De foto wordt alleen vrijgegeven voor een geldige, niet-ingetrokken token; bij intrekking wordt de tijdelijke foto verwijderd. Tijdelijke opslag krijgt een 31-daagse lifecycle-regel. **Nog open**: bevestigen met een echt nieuwe WhatsApp-uitnodiging op een iPhone dat de kaart de foto toont; video in gastlinks en afzonderlijke foto-bijlage zijn niet inbegrepen.
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
