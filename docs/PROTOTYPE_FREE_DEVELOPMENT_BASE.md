# TALERA Prototype Free — ontwikkelbasis

Vastgelegd op 1 oktober 2026.

## Bevroren referentie

- Repository: `Marksmits1972/talera-lifeline`.
- Functioneel en visueel uitgangspunt: `reference/prototype-free-final-r19h2-20261001`.
- Exacte referentiecommit: `0738ade7fafb68c3ae85675a68f8d4f8c09526ef`.
- Ontwikkelbranch: `development/prototype-free`, rechtstreeks gestart vanaf deze commit.

De referentiebranch wordt nooit gewijzigd, samengevoegd met ontwikkelwerk, geforceerd bijgewerkt of verwijderd. Bij vergelijking geldt de exacte commit hierboven als vaste basis.

## Werkwijze

1. Gebruik de bestaande werking en vormgeving als uitgangspunt.
2. Bepaal iedere bouwfase samen met de gebruiker volgens de projectmaster en roadmap.
3. Leg vóór implementatie het doel, de afbakening en de acceptatiecriteria van die fase vast.
4. Bouw en controleer één fase tegelijk. Leg het resultaat vast voordat de volgende fase begint.
5. Controleer bij relevante wijzigingen de vertelpagina, fotowisseling, omhoogbewegend tekstscherm en aansluiting op de presentatie/tijdlijn tegen de referentie.
6. Wijzigingen worden uitsluitend op de ontwikkelbranch of afzonderlijke fasebranches vastgelegd.
7. Publicatie is een afzonderlijke stap. `main` is volgens de README gekoppeld aan automatische productiepublicatie; deze basisvastlegging wijzigt `main` niet.

## Status bij de start

De ontwikkelbranch begint met ongewijzigde applicatiecode uit de referentie. Deze vastlegging voegt alleen dit document toe.

De leidende documenten zijn op 1 oktober 2026 gevonden en gelezen op Google Drive:

- [TALERA_PROJECT_MASTER_CURRENT](https://docs.google.com/document/d/18p9vX0UVOPs7EQCXSRb7cHDyJghaaLmnnyJrLLLDWH0/edit), laatst gewijzigd 30 september 2026. Voor deze proef geldt specifiek de aanvulling **TALERA FREE — BOUWPROMPT LOKAAL PWA-PROTOTYPE — 30 SEPTEMBER 2026**.
- [TALERA_ROADMAP_NAAR_LIVE_LEIDEND_CURRENT](https://docs.google.com/document/d/1NvhK-fhVa9lW_ndq3sauWh_pFf4sXrt_-Nln0foFHig/edit), laatst gewijzigd 29 september 2026.

De nieuwste opdracht van de gebruiker beperkt dit traject tot het Free-prototype. De specifieke lokale bouwopdracht gaat voor oudere serveruploadflows. De commerciële roadmap wordt hierdoor niet als geheel uitgevoerd of als afgerond gemarkeerd. `docs/SHARING_BUILD_SPEC.md` vervangt deze bronnen niet.

## Scope: lokale Free-proef

- Eén PWA, met vertelpagina en tijdlijn op dezelfde stabiele origin.
- Originele foto's blijven ongemoeid in de fotobibliotheek. TALERA bewaart compacte weergavekopieën en thumbnails met echte bytes in IndexedDB; geen duurzame blob-URL's, base64-mediaopslag of media in localStorage.
- Verhalen, datums, persoonlijke metadata en later audioblobs blijven op het toestel.
- Geen persoonlijke uploads, servertranscriptie, externe spraakherkenning, AI-verwerking of synchronisatie.
- Eigen prototypebestanden en een afzonderlijke testdeployment; bestaande Workers, routes, D1/R2 en live builds blijven ongemoeid.
- Bestaande vormgeving en tijdlijninteractie blijven uitgangspunt. Opslag en interface krijgen afzonderlijke modules met expliciete interfaces.
- Geen belofte van gegarandeerd permanente browseropslag. Offlinegebruik, heropenen, updates en export/import moeten afzonderlijk worden bewezen; Safari-tab en beginscherm-PWA krijgen aparte mobiele tests.
- Betaalde cloudlagen, betalingen, native app en TV-player vallen buiten deze proef.

## Voorstel voor de eerste gezamenlijke stap

Voorstel ter gezamenlijke keuze: **Free-proeffase 1 — één foto lokaal bewaren en terugzien op de tijdlijn**. Dit is een lokale proefstap, niet een verklaring dat fase 1 van de algemene roadmap gereed is.

Voorbereiding: inventariseer de actieve referentieroutes, netwerkverzoeken en vaste UI-teksten; leg modulegrenzen en de centrale Nederlandse tekstcatalogus aan volgens roadmapfase 1 vóór verdere functionele afbouw.

Gebruikersroute: foto kiezen → direct zichtbaar → compacte kopie verwerken → datum en tekst → atomair lokaal opslaan en teruglezen → juiste tijdlijnpositie → dezelfde herinnering heropenen.

Acceptatie: foto en tekst blijven na herladen in dezelfde browsercontext beschikbaar, de juiste herinnering wordt geopend, opslagfouten beschadigen bestaande gegevens niet en een netwerkaudit toont dat persoonlijke inhoud het toestel niet verlaat. Het bestaande uiterlijk wordt vergeleken met de bevroren referentie. iPhone/Safari-acceptatie blijft open totdat op het echte toestel getest is.

Daarna volgen lokale audio, offline/PWA, lokale export/import en kleine bulkselectie volgens de specifieke bouwopdracht. De eerste proefstap omvat nog geen volledige oplevering van het Free-prototype.

## Voortgang 1 oktober 2026

De gebruiker heeft de eerste proefroute bevestigd en opdracht gegeven het bouwproces op te pakken. De afzonderlijke implementatie staat in `free-local/`; bronbestanden en configuraties van de referentie en bestaande Workers zijn ongewijzigd.

Status: **GEBOUWD — interne controles gedeeltelijk bewezen; mobiele acceptatie open**. Zes opslag-/isolatiecontroles, een DOM-controle van tijdlijnhandoff en heropenen, en de Cloudflare dry-run slagen. Echte browser-QA, volledige netwerkaudit en iPhone-tests zijn nog niet uitgevoerd. Cloudflare-publicatie is geblokkeerd doordat authenticatie ontbreekt. De centrale catalogus bevat de nieuwe/gewijzigde Free-teksten; de volledige inventaris en migratie van geërfde UI-teksten blijft open. Algemene roadmapfase 1 is niet afgerond. Zie `free-local/README.md` voor bewijs, grenzen en de mobiele checklist.
