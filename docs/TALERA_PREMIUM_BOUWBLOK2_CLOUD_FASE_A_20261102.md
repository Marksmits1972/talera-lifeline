# TALERA Premium — bouwblok 2: cloudopslag, fase A (2 november 2026)

Status: ontwerpbesluit bevestigd op 2 november 2026; nog NIET uitgerold. Na eenmalige toestemming standaard automatische cloudopslag én synchronisatie voor Premium.

## Bestaande infrastructuur
- Account- en rechtenbron: bestaande Clean Core Worker `talera-clean-core-staging-20261030` en D1 `talera-clean-core-staging-20261030`.
- `GET /api/me/entitlements`: `rights.permissions.cloud_storage` is een *recht*, maar `rights.available.cloud_storage` blijft false tot veilige functionaliteit live is.
- TALERA Free bewaart herinneringen lokaal in IndexedDB (`stories`, `files`); export/herstel via `.talerabackup` blijft intact.
- Bestaande TALERA R2-bucket `talera-account-social-media-staging-20261029` behoort tot de sociale deelketen; deze bucket niet zonder isolatie inzetten voor persoonlijke Premium-cloudmedia.
- Aanwezige bucket `talera-core-media` is historisch en niet zonder verificatie als Premium-bestemming te hergebruiken.

## Minimale scope, veilig en eenvoudig
1. Premium vraagt één keer expliciete toestemming voor cloudopslag en eventuele migratie van bestaande lokale herinneringen. Daarna worden nieuwe en gewijzigde Premium-herinneringen standaard automatisch veilig geüpload en gesynchroniseerd; geen toestemming per foto of herinnering. Server controleert altijd accountrecht en beschikbaarheid.
2. TALERA Free blijft lokaal. Bij overstap naar Premium worden na de eenmalige toestemming bestaande lokale herinneringen overgezet; de lokale exemplaren blijven behouden totdat veilig opslaan is bevestigd.
3. Upload via geauthenticeerde bestaande Core Worker. Objectnaam uitsluitend servermatig samengesteld uit geverifieerde account-ID en gegenereerd object-ID; nooit ruwe gebruikersbestandsnamen of client-account-ID als autoriteit.
4. Per bestand: grootte/MIME grenzen, integriteitscontrole, eigenaarschap, quota en fouten terugkoppelen. Sla alleen benodigde metadata in dezelfde D1 op, mediabytes in afgeschermde R2.
5. Download, lijst en verwijderen uitsluitend via serverzijdige controle op eigenaar; geen publieke R2-links.
6. Upload pas als voltooid tonen na objectverificatie en atomische metadatavastlegging; bij fout mag lokaal origineel nooit verloren gaan.
7. Synchronisatie hoort bij de standaard Premium-belofte. De bouw mag gefaseerd getest worden (upload, teruglezen, automatische sync en conflicten), maar de gebruikerservaring kent na toestemming geen handmatige uploadstappen.
8. Bij verlopen Premium-recht geen nieuwe uploads; bestaand materiaal niet automatisch wissen. Toegang, export, bewaartermijn en eventuele downgrade vooraf definiëren.
9. Bestaande gedeelde links, WhatsApp, hartjes, gesprekken, Free-back-ups en persoonlijke verhalen ongemoeid laten.

## Acceptatie voor live vrijgave
- Free en niet-ingelogd kunnen geen cloudobject uploaden of lezen.
- Premium met testrecht maar `available:false` kan nog niets uploaden.
- Premium na eenmalige toestemming: bestaande lokale herinneringen worden veilig gemigreerd en nieuwe/gewijzigde herinneringen automatisch geüpload; lokale bronbestanden blijven behouden totdat cloudopslag bevestigd is.
- Ander account krijgt 403/404 bij object-ID; geen object-/account enumeratie.
- Herhaald uploadverzoek veroorzaakt geen onbedoelde dubbele data; falende upload wordt veilig hersteld.
- Vervallen/intrekken van testrechten sluit nieuwe upload af.
- Echte iPhone/Safari en desktop met een afzonderlijk **inlogbaar** testaccount getest vóór bredere uitrol.

## Besluit
Deze fase legt de bouwgrens vast zonder nieuwe Worker of ongevraagde D1/R2-migratie. De expliciete toestemming geldt één keer voor de overgang naar automatische Premium-cloudopslag, niet per herinnering. Volgende implementatiehandeling: audit van de bestaande Core Worker-bindings, R2 bucket-isolatie en serverroutes; pas daarna het kleinste werkende uploadpad schrijven en lokaal testen. Geen claim dat cloudopslag of synchronisatie al werkt.

## Vast ontwerpbesluit gebruiker — 2 november 2026
TALERA Premium belooft standaard cloudopslag en synchronisatie. Na éénmalige gebruikersinstemming verloopt dat automatisch voor alle Premium-herinneringen. Geen individuele selectie of handmatige upload als normale werking. TALERA Free blijft lokaal. Dit besluit vervangt alle eerdere formuleringen over handmatig kiezen van cloudherinneringen.
