# TALERA Free — reservekopie en herstel, proefversie 1

Afgesproken en gebouwd op 1 oktober 2026 op `development/prototype-free`. De bevroren referentie blijft intact.

## Gebruikersroute

Na de eerste lokaal bewaarde foto verschijnt een korte uitleg: “TALERA bewaart een kleine kopie van je geselecteerde foto op dit toestel, zodat je tijdlijn werkt.” De gebruiker kiest vrijwillig **Reservekopie maken** of **Later**. De functie is ook bereikbaar via **Meer → Reservekopie** op de vertelpagina en de tijdlijn.

TALERA stelt de volledige collectie van dat moment samen in één `.talera`-bestand met datum en tijd. Daarna opent **Bewaar reservekopie** waar ondersteund het systeemmenu. De gebruiker kiest bijvoorbeeld **Bewaar in Bestanden → Op mijn iPhone**. Bij ontbreken van ondersteund delen is er een downloadroute. Er is geen vaste mapkoppeling, automatische doorlopende backup, native app of cloudintegratie.

TALERA vraagt daarna **Is het bestand bewaard?** Alleen de bevestiging van de gebruiker wordt geregistreerd, met een apart tijdstip voor de bevestiging en het moment van de snapshot. Geannuleerd delen geldt niet als bewaard. De app toont of er wijzigingen zijn sinds de laatst bevestigde kopie.

Bij herstel kiest de gebruiker het bestand. Na controle toont TALERA de datum en aantallen. **Vervang en zet terug** vervangt na expliciete keuze de huidige collectie door de snapshot. De uitleg noemt dat nieuwere wijzigingen niet worden meegenomen. Annuleren verandert de collectie niet.

## Techniek en afbakening

- IndexedDB blijft de primaire werkopslag op dezelfde origin. Het backupbestand bevat echte bytes buiten de browseropslag zodra de gebruiker het daar bewaart.
- Eén consistente read-only snapshot van verhalen en media. Export omvat ook concepten, notities, foto-metadata, titels, datums en thumbnailbytes.
- Formaat v1: magic `TALERA1\n`, vier bytes manifestlengte, UTF-8 JSON-manifest en aaneengesloten fotoblobs. SHA-256 per blob controleert beschadiging. Het is geen ZIP en geen versleuteld bestand.
- Versie, grootte, unieke identifiers, datums, referenties, metadata en alle hashes worden gecontroleerd vóór het schrijven. Limiet van deze proef: 256 MB per backupbestand, 4 MB manifest en 10.000 records per categorie.
- Terugzetten gebruikt één IndexedDB-transactie voor clear en put. Een mislukte transactie herstelt de eerdere collectie automatisch door rollback.
- Audio is nog niet gebouwd. Een backup met niet-ondersteunde audioreferenties wordt geweigerd; er worden geen audiogegevens stilzwijgend weggelaten.
- Media staan niet in localStorage of base64. Alleen kleine backupstatusvelden staan in localStorage.
- Er worden geen bestanden, foto’s of verhalen door TALERA naar een server gestuurd. Het systeemmenu laat de gebruiker zelf een bestemming kiezen.

## Bewijs en open acceptatie

De interne tests bevestigen volledige export en herstel na het verwijderen van de oorspronkelijke records, foto- en thumbnailbytes, concepten/notities, beschadiging/truncatie, onbekende versies, ontbrekende referenties en rollback na een fout nadat verwijderingen al waren ingepland. UI-tests bevestigen de eerste-foto-aanbieding, Later, delen annuleren en het verschil tussen voorbereid, gedeeld en gebruiker-bevestigd bewaard. De bestaande opslag-, DOM- en Cloudflare-bouwcontrole slagen.

Open mobiele acceptatie: de echte Bestanden-route op iPhone (zowel Safari als ingebouwde browser), annuleren, het terugvinden van het `.talera`-bestand, herstel na bewust gewiste sitegegevens in een testcollectie, en praktisch geheugengebruik bij grotere bestanden. Het behoud van een reservekopie helpt pas als de gebruiker het bestand daadwerkelijk buiten browseropslag bewaart. Nieuwere wijzigingen komen mee bij een volgende backup.
