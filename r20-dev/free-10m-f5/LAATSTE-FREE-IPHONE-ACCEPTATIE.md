# TALERA FREE — éénmalige iPhone-acceptatie en veilig afronden
Datum: 8 november 2026
Status: **Free-code geïntegreerd en aantoonbaar groen in aparte EU-stage; niet vrijgegeven in productie**.

## Vastliggend eindbewijs (NIET opnieuw uitvoeren)
- Lokale Cloudflare-integratie: https://github.com/Marksmits1972/talera-lifeline/actions/runs/42516137608
- Echte aparte EU-Cloudflare- en Chromium-mobiele browsertest: https://github.com/Marksmits1972/talera-lifeline/actions/runs/42516137777 — **succesvol**.
- Deze browsertest heeft met uitsluitend fictieve bestanden een foto, MP4-video, WAV-audio, tijdstempels, cue-volgorde, herladen, dezelfde lokale opslag in Mijn leven en Presentatie en accountisolatie bewezen.
- Pristine Linux WebKit faalde al zonder TALERA-code bij het schrijven van Blob/File naar IndexedDB; dat testplatform is daarom niet geschikt om iPhone-Safari-mediaopslag te beoordelen. Geen wijzigingen aan recorder/player door dit Linux-testprobleem.

## Safari/in-app-browser toegang gerepareerd op 9 november 2026

De eerdere foutmelding `{"ok":false,"error":"Ongeldige herkomst"}` ontstond doordat de F5-code bij de toegangspagina vereiste dat ieder normaal iPhone-formulier de HTTP-`Origin`-header meestuurde. Die header kan bij Safari of een in-app browser ontbreken. **Het is niet veroorzaakt door het kopiëren van de toegangscode via WhatsApp.**

Oplossing in **uitsluitend de geïsoleerde F5 Worker**: het formulier krijgt bij GET een HMAC-ondertekend CSRF-veld en een Secure/HttpOnly/SameSite=Strict-cookie die tien minuten geldig zijn. Bij POST is een uitdrukkelijk vreemde Origin nog steeds verboden; als de browser Origin weglaat, wordt de aanvraag alleen aanvaard met de geldige ondertekende form- en cookiecombinatie. De toegangscode zelf blijft een aparte geheimcontrole. Live deployment en drie specifieke security-tests zijn geslaagd in [GitHub Actions run 42584185216](https://github.com/Marksmits1972/talera-lifeline/actions/runs/42584185216). Hierna is de automatische hotfix-uitrol weer uitgezet om sleutels en iPhone-test stabiel te laten.

**Aandachtspunt:** de eerder aan de gebruiker getoonde toegangscode werkt alleen wanneer exact dezelfde waarde ook als `STAGING_F5_KEY` op deze specifieke testworker in Cloudflare is opgeslagen. Een code kopiëren naar WhatsApp en het formulier invullen wijzigt deze Cloudflare-secret niet. Een mismatch toont nu de duidelijkere melding `Toegangscode niet herkend. Controleer of deze in Cloudflare is opgeslagen.` Bewaar de geheime code buiten GitHub en screenshots. Open de link opnieuw zodat de verse ondertekende formcookie wordt gezet; gebruik bij voorkeur Safari rechtstreeks voor de opname-/cameraacceptatie.

## De nieuwe eenvoudige toegang (9 november 2026)

**Nieuw en live getest:** een één-klik-uitnodiging voor precies deze geïsoleerde Free-testworker. Geen Cloudflare-sleutel instellen, geen code in WhatsApp kopiëren, geen registratie of accountaanmelding. De browser opent een tijdelijke pagina die zelf één fictief Free-account met geboortedatum 1974-04-02 aanmaakt, de ondertekende testcookie én eigen sessiecookie ontvangt en automatisch naar `/mijn-leven` gaat. Dit gebruikt exact de bestaande F5-account-DO's en de goedgekeurde oorspronkelijke vertel- en presentatieschermen.

**Beveiliging:** de volledige 256-bit uitnodiging is uitsluitend via een gebruikerslink met URL-`#fragment` gedeeld; de Worker bevat alleen SHA-256 van het geheim. Het fragment wordt niet bij GET verzonden en wordt onmiddellijk uit de browserhistorie gehaald. De testlink werkt tot **16 november 2026, 21:00 uur Nederlandse tijd**. Valse of cross-origin uitnodigingen worden geweigerd; de afzonderlijke TALERA-productiedata zijn niet verbonden. Een ingebouwde rate limiter voorkomt onbeperkt fictieve accounts op dezelfde IP binnen tien minuten. Deel de geheime volledige uitnodigingslink niet publiek.

**Bevestigde technische checks:** echte lokale Cloudflare-integratie met volledig automatisch fictief account, sessie, QA-gate en persoonlijke tijdlijn plus expliciet afwijzen van vervalste tokens is groen; [real EU deployment + GET/reject checks 42585407955](https://github.com/Marksmits1972/talera-lifeline/actions/runs/42585407955) groen. De werkelijke geheime uitnodiging is niet in de repository, buildlogs of workflow opgenomen. Dit is geen vervanging van handmatige echte iPhone-microfoon-/videotest. De originele permanente TALERA-app is niet gewijzigd.

**De onderstaande oudere stappen met `STAGING_F5_KEY` zijn voor normale handmatige toegang en zijn niet meer nodig voor de nieuwe één-klik-uitnodiging.** 

## ECHTE iPhone: precies één laatste acceptatieronde
**Testlink**: https://talera-free-f5-combined-stage-20261108.mark-a39.workers.dev/__f5/entry

Dit is de **aparte F5-testapp**, niet de officiële permanente PWA. De F5-Worker heeft alleen zijn eigen zeven EU-Durable Object-klassen en statische code; geen koppeling naar de officiële TALERA-accounts, D1, R2 of Premium.

**Toegang**: de besloten test vraagt een `STAGING_F5_KEY` (64 willekeurige hextekens). De oude sleutel werd automatisch in GitHub Actions gegenereerd en gemaskeerd en kan om veiligheidsredenen niet worden teruggelezen. Vóór de fysieke test moet de eigenaar **alleen in het dashboard van de geïsoleerde testworker** bij Settings → Variables and Secrets → `STAGING_F5_KEY` een nieuwe eigen 64-hex-testsleutel instellen; de andere vier QA-secrets NIET wijzigen. Bewaar die sleutel privé en plak hem op de iPhone in het veld ‘Testtoegang’. Stel een testaccount in met een **fictief e-mailadres**, uniek gebruikersnaam, synthetische geboortedatum en niet-hergebruikt wachtwoord. Voeg geen echte of persoonlijke foto's, video's of spraakbestanden toe.

**Eenmalig fysiek gebruiksscenario**:
1. Open de testlink op een echte iPhone in Safari, voer de eigen testtoegang in, registreer een fictief **Free** account. Controleer dat de eigen geboortedatum/levenslijn in Mijn leven en Presentatie klopt.
2. Open Vertellen, gebruik de echte microfoontoestemming en voeg een zelfgemaakte **fictieve** foto en video toe. Spreek een korte onpersoonlijke zin in en swipe één- of tweemaal door de beelden tijdens het spreken. Stop, bewaar het verhaal.
3. Ga via de bestaande presentatie, **zonder tweede losse speler**, terug naar de herinnering. Controleer dat audio, stilstaande beelden, de bewegende video en swipes tegelijk worden afgespeeld, inclusief de beeldwisselingen op de juiste momenten.
4. Herlaad de app. Controleer hetzelfde verhaal opnieuw. Log uit, log in op hetzelfde testaccount en controleer het nogmaals. Wissel indien nodig naar een tweede fictief Free-account op dezelfde iPhone; de eerste herinnering mag daar niet zichtbaar zijn.
5. Noteer uitsluitend **GESLAAGD** of één concreet falend onderdeel (bijvoorbeeld ‘video blijft stil terwijl audio speelt’). Alleen dat onderdeel herstellen en opnieuw beproeven. Geen algemene nieuwe testrondes.

## Verplichte veiligheidsgrens vóór een productieomschakeling
- **NIET automatisch overschakelen.** Bestaande TALERA-accounts, sessies en sociaal/deelrecht moeten expliciet veilig gemigreerd of overeenkomstig een vastgesteld contract voortgezet worden. De oudste audit betrof slechts een read-only steekproef, geen echte migratie.
- **Lokale herinneringen zijn origin-gebonden IndexedDB**. Een nieuwe workers.dev-hostnaam ziet de reeds opgeslagen foto's, video's, audio en cues van de vorige app **niet**. Een browser kan die opslag niet stilzwijgend uit een andere host ophalen. De overstap moet daarom ofwel op de oorspronkelijke PWA-origin plaatsvinden met compatibele opslag, of een zichtbare lokale export/import met integriteitscontrole en terugval naar de originele versie bevatten. Niet doen alsof een nieuwe link oude verhalen automatisch heeft overgenomen.
- Een oude database mag pas worden losgekoppeld nadat aantal accounts, birthdates, sessies, shares, storymetadata en rechten gecontroleerd zijn en een rollback beschikbaar is. Herinneringen van echte gebruikers NOOIT via deze synthetische stage importeren.
- De QA-sleutel is **geen productie-authenticatie**; bij productie moeten QA-toegang, test-HMAC-identiteit en stagingconfiguratie uit de klantroute verwijderd worden. De origineel goedgekeurde vertel- en presentatiecyclus blijft exact zoals hij is.

## Definitief stopmoment
- **Technische Free-integratie: GROEN.**
- **Fysieke iPhone/Safari-gebruikersacceptatie: nog éénmaal uitvoeren**.
- **Productieovergang: alleen na expliciet akkoord en een bewezen migratie-/rollback-contract**.
- **10 miljoen: schaalarchitectuur voor 10 miljoen geregistreerde Free-gebruikers structureel beoordeeld**, niet 10 miljoen simultane livegebruikers bewezen. Beperk gefaseerde uitrol met echte CPU, Durable Object-duration, hotspot-/kostenmonitoring (zie F6-BEOORDELING-10M-FREE.md).
- **Premium: niet bouwen, niet testen, niet deployen vóór Free afgerond is.**

Geen extra rondes. Alleen één falende harde acceptatiestap herstellen en opnieuw controleren.
