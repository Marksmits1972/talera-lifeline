# TALERA V11 — Eenvoudige ontbrekende foto's na stemopname

**Status:** afzonderlijke testversie, 5 november 2026. Browsercontrole geslaagd; wacht op bevestiging op iPhone.

## Wat wordt gebouwd?

Bij een herinnering met zes foto-ID's en vier gesproken fototijdcodes, verschijnen de twee resterende foto's automatisch na het **werkelijke** einde van de stemopname. Alle foto's volgen de oorspronkelijke positie in de bestaande opgeslagen media-ID-lijst. Elke niet-besproken foto wordt vier seconden getoond. Daarna begint exact de bestaande oorspronkelijke ronde met videogeluid.

De opgeslagen spraak-tijdcodes bevatten `{t,index}`, dus geen herhaalde fysieke foto-ID. De originele `g.media` bevat de unieke media-ID's en de oorspronkelijke volgorde. De speler ontvangt de bijbehorende `state.items` in diezelfde volgorde. De kleinste veilige oplossing is de al gebruikte posities uit `state.cues` vergelijken met de indexen van de foto's in `state.items`.

## Minimaal codeverschil

In de **bestaande** HTML van `/vertelmodus-embed` wordt alléén:

1. `function taleraV11ShowRemainingPhotos()` toegevoegd. Deze bepaalt met één `Set` de reeds besproken posities, toont overige afbeeldingen via de bestaande `show(index)`, laat het huidige voice-follow-algoritme stoppen met `mode('ready')`, en roept na de laatste foto de oorspronkelijke `taleraStartOriginalRound()` aan;
2. In de originele `voice.addEventListener("ended", ...)` de enkele aanroep van `taleraStartOriginalRound()` vervangen door `taleraV11ShowRemainingPhotos()`. De rest van deze regel is ongewijzigd.

**Niet gewijzigd:** `begin()`, `mark()`, `stop()`, `complete()`, `play()`, `follow()`, `show()`, `taleraReplayNext()`, `taleraStartOriginalRound()`, opslag, `voiceCues`, `g.media`, geluid, swipes, stijl, presentatie of Free/Premium. Geen aparte videocontroller, extra fotocue-opslag of nieuwe afspeellaag.

De bestaande presentatietest draait via een aparte Cloudflare service-binding naar de beschermde stijlversie. Dit is uitsluitend om veilig te testen; geen extra runtime-logica in de uiteindelijke app.

## Technische verificatie

- **11/11** gerichte tests voor zes echte lijstposities, vier cues en twee resterende beelden, niet-opgeslagen extra ID's, gemengde video/foto-media, herhaalde cues, andere herinnering tijdens de extra 4-seconden-foto en onaangeroerde videoaanroep.
- **5/5** publieke routevergelijkingen: alleen het ingebedde verhaal wordt aangepast. De originele HTML van de vertelspeler is verder **byte-identiek** na normalisatie van het hostadres in het `og:image`-veld. Het beginscherm, de presentatiepagina en de editor zijn verder gelijk.
- **Echte Chrome-test met valide WAV-geluid**, dus niet een kunstmatig `ended`-event: na de echte audio-`ended`-gebeurtenis verscheen foto 5 meteen, foto 6 na vier seconden, en daarna startte de bestaande videospeler met `muted=false`. Ook getest bij afspelen vanuit de recorder (`mode=record`).
- GitHub Actions: https://github.com/Marksmits1972/talera-lifeline/actions/runs/42027759447

## Afzonderlijke test en rollback

- Testadres: https://talera-vertel-restfotos-v11-test-20261105.mark-a39.workers.dev/
- Bron: `r20-dev/restfotos-v11/restfotos.worker.mjs`
- Branch: `feature/talera-restfotos-eenvoudig-v11-20261105`
- Worker-versie: `cd6662bc-a502-4f6b-9146-b505a322e853`
- Test-Worker deployment: `4c037936-ddf1-4191-8ec9-2968392f2359`
- Voorafgaande werkende V10-test: `8b6a2a29-4487-4fe7-8ecc-f63464321331`, **ongemoeid**
- Stijl-Worker: `bc36d913-49f8-4f4d-b00d-3d5894a11146`, **ongemoeid**
- Beschermde V9: `683c6aaf-8dd0-42de-b6e4-f3bd80d7de06`, **ongemoeid**

**Let op:** browsertests zijn geen garantie voor iOS Safari en echte persoonlijke herinneringsbestanden. Definitieve acceptatie pas na iPhone-test met bijvoorbeeld zes foto's waarvan vier tijdens het inspreken in beeld kwamen. De nieuwe aparte testhost heeft eigen lokale opslag: verwijder de bestaande TALERA-PWA niet. Bij problemen laat de oude V10-test-Worker en beschermde V9 volledig staan.

## Tijdelijke zichtbare diagnose voor iPhone-proef (5 november 2026)

Een eerdere read-only diagnose stond uitsluitend **binnen de verborgen/inliggende iframe** en was niet zichtbaar op het hoofdscherm. Dit is hersteld **zonder de bestaande opname- of afspeelcode te wijzigen**.

- Alleen op `/present` en `/tell` voegt de aparte V11-test-Worker één script aan het einde van de pagina toe: `FRONT_DIAG_SCRIPT`, tag `talera-v11-front-diagnose-script`.
- De knop **🔎 Diagnose** staat vast linksonder op het bovenliggende scherm, buiten de foto-iframe. Er is een uitklapvenster met **Ververs**, **Kopieer** en **Sluiten**.
- De al bestaande read-only observatie in `/vertelmodus-embed` is verborgen in de iframe en stuurt alleen zijn **samenvatting** via `postMessage` naar het bovenliggende venster. De samenvatting bevat aantallen en **1-gebaseerde beeldposities**, geen media-ID's, beeldbestanden of gesproken audio. Het ontvangersvenster controleert de exacte iframe en de gelijke origin.
- Het venster toont: totaal aantal media, foto's, video's, aantal tijdcodes, verschillende gebruikte foto's, ontbrekende foto's, of de stem werkelijk is afgelopen, huidige beeldpositie, en welke restfoto's daadwerkelijk na de stem zijn waargenomen.
- Bij ontbreken van een actieve speler staat **Wachten op vertelspeler…**. Dat is op zichzelf diagnostisch: het hoofdscherm heeft dan nog geen gegevens ontvangen.
- Alles gebeurt lokaal in dezelfde browser. **Geen uploads, geen logging naar server, geen cloud-database, geen wijzigingen aan opnames/tijdcodes/video's.**
- Terugzetten na iPhone-proef: verwijder `FRONT_DIAG_SCRIPT` / `addFrontDiagnostic()` / de twee front-routes `/present` en `/tell` uit deze V11-test-Worker en de aparte `READ_ONLY_AUDIT_SCRIPT` uit de embed. De originele pagina's zijn verder byte-identiek.
- De bestaande V10-rollback, de stijl-Worker en de V9-basis zijn niet aangepast.

Technische verificatie: **13/13** unit-tests, **5/5** live HTML-/routevergelijkingen en Chrome-integratietest met een **zichtbare en aanklikbare knop** op zowel `/present` als `/tell`. Met zes synthetische foto's en vier cues werd de melding **Restfoto's: 2 (5, 6)** zichtbaar in het voorgrondpaneel. Ook de echte afspeelvolgorde van stem, foto 5, foto 6 en de originele videoronde met geluid blijft in de test intact.

GitHub Actions: https://github.com/Marksmits1972/talera-lifeline/actions/runs/42038713338
Testadres: https://talera-vertel-restfotos-v11-test-20261105.mark-a39.workers.dev/
