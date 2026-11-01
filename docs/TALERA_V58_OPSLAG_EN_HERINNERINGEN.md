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
