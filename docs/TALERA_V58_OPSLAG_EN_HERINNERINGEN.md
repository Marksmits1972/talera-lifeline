# TALERA V58 — Opslag en herinneringen (alleen-lezen)

**Status:** aparte stagingversie; V56 en V57 blijven ongewijzigd; niet naar productie zonder controle op echte iPhone.

## Wat is gebouwd
- Nieuwe ingang **Opslag en herinneringen** onder Mijn TALERA én Mijn account.
- Op dit toestel: leest uitsluitend het **aantal** opgeslagen herinneringen via de bestaande `window.TaleraMemories.list()` op hetzelfde apparaat/browser-origin.
- In het account: leest uitsluitend aantallen via bestaande, sessiegebonden `GET /api/memories` en `GET /api/shared-with-me`. Niet ingelogd? Geen accountopvraag.
- Benadrukt dat lokaal opgeslagen media geen cloud-back-up betekenen en dat elke afzonderlijke testlink zijn eigen browseropslag heeft.
- Knop opnieuw controleren; bij ontbreken van een account toont dit onderdeel een duidelijke loginactie.
- Bestaande V57-routing en optioneel Free-inloggen blijven behouden.

## Architectuur-/veiligheidsgrens
- Geen nieuwe database; V58 heeft alleen servicebinding naar V56.
- Geen import, migratie, delete, accountmerge, nieuwe authenticatiecontroller, nieuwe sociale controller of opslag-mutaties.
- De account- en lokale bibliotheken worden **niet** samengevoegd en er worden geen persoonlijke titels, foto's of teksten naar diagnose- of logsystemen gestuurd.
- Bij wijziging upstream menu-module valt patch volledig terug op de originele module (niet gedeeltelijk patchen).
- In V58 worden geen getallen als volwaardige back-up of volledige sync gepresenteerd.

## Open tests en volgende stappen
1. Real-device: lokaal eigen verhaal opslaan op **V58** en controleren dat tellers dat tonen; verhaal blijft zichtbaar na herstart. Het lokaal opgeslagen verhaal in **V56** wordt in V58 niet getoond en mag niet gewist worden.
2. Test met twee expliciet ingestelde testaccounts op V58: eigen accountaantal, ontvangen aantal, deelrechten intrekken en bereik beperken.
3. Daarna afzonderlijke expliciete import/export-herstelroute uitwerken en beveiligingstoets uitvoeren; nooit op alleen een getalsvergelijking migreren.
4. Reguliere regressiepoort heeft nog twee historische bestanden die ontbreken in main: issue #61.

## Browseracceptatie
- Anoniem `/present` zonder loginpop-up.
- `?talera_menu=storage` toont lokale opslag zonder verplicht account; geen automatische upload.
- Deepshare `/gedeeld` en `/meldingen` blijven in het ingelogde menu.
- `/api/memories`, `/api/shared-with-me` aanroepen alleen na sessieautorisatie via bestaande backend.

## Bouwcontrole 1 november 2026

- Gepubliceerd als aparte Cloudflare Worker `talera-pwa-v58-opslag-mijn-talera-20261101`:
  https://talera-pwa-v58-opslag-mijn-talera-20261101.mark-a39.workers.dev/present
- Alleen servicebinding `V56_BASE` naar bestaande V56; geen eigen databasebindings of mediaopslag.
- Browser Rendering 390 × 844: gewone /present opent zonder gedwongen login; menu Mijn TALERA bevat opslagingang; /present?talera_menu=storage toont nul lokale verhalen in nieuwe lege testsessie, geen fictieve accountinhoud; /gedeeld en /meldingen openen de bestaande afgeschermde accountweergaven. Knop vanuit menu opent opslagweergave.
- Geïsoleerde browsertest met tijdelijk gesimuleerde `TaleraMemories.list()` van twee items toont correct 2 lokale herinneringen na ‘Opnieuw controleren’. Dit is **geen bewijs dat twee echte verhalen veilig bewaard of herstelbaar zijn**.
- Alle **9 tests in de V58-testmodule** zijn geslaagd (7 overgenomen V57-controles plus 2 specifieke V58-controles). De volledige GitHub Actions suite [run 41283129429](https://github.com/Marksmits1972/talera-lifeline/actions/runs/41283129429) eindigt op **109 geslaagd, 2 gefaald**, uitsluitend vanwege reeds geregistreerde ontbrekende oudere bestanden in [issue #61](https://github.com/Marksmits1972/talera-lifeline/issues/61). Geen codeverandering om dit te verdoezelen.
- Read-only referentiële controle op de bestaande Clean Core testdatabase: **0** herinneringen met ontbrekende eigenaar, **0** share-links met verkeerde of ontbrekende herinnering/eigenaar, **0** gebroken grant-verwijzingen, **0** berichten zonder geldige account-/herinneringsverwijzing, **0** foutieve PWA-koppelrecords en **0** dubbele lokale-ID-toewijzingen. **5** bestaande PWA-memorylinks. Dit is *alleen* een integriteitscontrole op relevante sleutelrelaties en geen bewijs van foto-opslagkwaliteit of rechtenbeheer op meerdere apparaten.
- PR #62 is afhankelijk van [PR #60](https://github.com/Marksmits1972/talera-lifeline/pull/60) (V57); V56 blijft ongewijzigde terugvalversie.

**Acceptatie blijft OPEN:** daadwerkelijk testen op eigen iPhone, een veilig proefverhaal op dezelfde test-origin en echte tweede ingelogde account. Geen migratie en geen productiegoedkeuring.
