# TALERA V62 — WhatsApp-gastreacties: rustig lezen en eenvoudig terugreageren

**Datum:** 1 november 2026. **Status:** Actief op bestaande V62-testlink; iPhone-acceptatie door eigenaar nog open.

## Gewijzigde bediening

- Via de bestaande WhatsApp-deellink opent **Reacties** nu in **leesstand**: de berichtwissel blijft zichtbaar en het invoerformulier staat dicht.
- Onderaan de wissel staat één knop **Reageren**. Pas na die klik verschijnt het formulier.
- Na een **geslaagde** verzending worden de berichten bijgewerkt en verdwijnt het formulier weer. Bij een fout blijft het formulier open met de foutmelding, zodat invoer niet verloren gaat.
- Bij een niet-ingelogde bezoeker wordt de reeds bestaande browseropslag `talera-gast-voornaam` hergebruikt; geen nieuw cookie, account of databaseveld.
- Bekende naam: **Reageren als [voornaam]** met **Naam wijzigen**. Onbekende naam: eerst voornaam invullen (2–40 tekens).
- De naam wordt pas na een geslaagde reactie lokaal onthouden. De naam dient uitsluitend als invulgemak, **niet als identiteitscontrole**. Op een ander toestel, een ander domein of na verwijderen van browsergegevens wordt deze niet gegarandeerd herkend.
- Bestaande reactieballonnen, opmaak van uitgaande en inkomende berichten, hartjes, mediaweergave en API-verzoeken zijn niet gewijzigd.

## Architectuur, tests en terugval

- De logica staat als één leesbare bron in `src/guest/guest-reactions.js`, ingebouwd in de **bestaande** `talera-pwa-v56-whatsapp-foto-social-20261031` Worker. Geen nieuwe runtime-laag, database, tabel, accountservice of extra Worker.
- Een synthetische mobiele browsertest met fictieve reacties bevestigt: leesstand zonder zichtbaar formulier; klikken op Reageren toont het formulier; een reactie plaatsen verbergt het formulier; naam `Sofie` wordt lokaal opgeslagen; bij opnieuw reageren verschijnt `Reageren als Sofie`; naam wijzigen toont het naamveld; alle controles geslaagd.
- De actief uitgeleverde V56-bron bevat de nieuwe leesstand. Basisroute, Mijn TALERA, kennisbank en ongeldige gastlink openen zonder Worker-exceptie. De test heeft **geen werkelijke gebruikersreacties opgeslagen**.
- Nieuwe Worker versie: `45fa4f36-b1f2-45f1-9a7b-4237005ec684`; actieve deployment: `bf51267d-b917-458c-b9ba-fc582bf3138b`; terugvaldeployment: `dc3858fc-22f5-49ee-88df-d684809cc48a` met vorige versie `7525932f-df69-4902-9b2c-745cb1b004c1`.
- Tests vastgelegd in `test/guest-reactions-read-mode.test.mjs`.
- Nog niet uitgevoerd: volledige echte WhatsApp-iPhone end-to-endcontrole met bestaande deellink. Dit is geen reden om de volledige deelketen opnieuw te bouwen.

## Back-up is een apart onderwerp

- Lokale herinneringen in dezelfde browser zijn **geen automatische back-up**. Browserdata wissen, toestelvervanging of afwijkende testdomeinen kunnen lokale gegevens onbereikbaar maken.
- Bestaande opslag- en accountfuncties niet gewijzigd.
- Later af te werken: expliciete en controleerbare synchronisatie / reservekopie en herstel van herinneringen **inclusief media**, met deduplicatie en toestemming; niet alleen een teller in Instellingen.
