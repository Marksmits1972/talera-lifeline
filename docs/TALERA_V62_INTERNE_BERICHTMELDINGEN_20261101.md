# TALERA V62 — interne berichtenmeldingen bij gezamenlijke herinneringen
**Datum:** 1 november 2026. **Status:** uitgevoerd in bestaande staging Workers. Test op echte ingelogde meergebruikerssessies nog open.

## Productafspraak
- Eén gedeelde berichtenwisseling per herinnering; accountreacties en WhatsApp-gastreacties gaan door elkaar.
- **Interne TALERA-meldingen uitsluitend voor ingelogde accountgebruikers met geldige toegang tot de herinnering.** De eigenaar krijgt bericht wanneer anderen reageren.
- Andere accountontvangers met actieve deeltoegang krijgen ook meldingen van nieuwe reacties. De auteur ontvangt **geen melding van zijn eigen accountreactie**.
- WhatsApp-gasten zonder account krijgen **geen automatische WhatsApp-reactieberichten, geen e-mails, geen push**. Ze bezoeken de bestaande link vrijwillig opnieuw zolang die geldig is.
- De Meldingen/ Berichten-weergave blijft gegroepeerd op herinnering. Bij de meest recente reactie wordt afzender en eigenaar zichtbaar, bijvoorbeeld **'Peter reageerde op de herinnering van Mark'**. Het aantal ongelezen berichten blijft zichtbaar.
- De bestaande grens van circa 200 reacties in de gespreksweergave wordt niet vergroot of opgerekt.
- Geen nieuwe Worker, database, tabellen, apart berichtenregister of notificatieprovider.

## Wat al bestond
In de bestaande `talera-clean-core-staging-20261030` Worker stuurt `addThreadComment` voor accountreacties al een record naar de eigenaar en gebruikers met actieve `memory_grants`, behalve de auteur. `/api/messages/unread-count`, `/api/messages` en `/api/messages/memory/:id/read` ondersteunen het interne berichtenoverzicht. Het V62-menu heeft al een badge, een samenvoeging per `memory_id` en één gesprek.

## Uitgevoerde kleine aanvullingen
1. **Gastreacties:** na `INSERT INTO guest_comments` selecteert de bestaande core de eigenaar en **actieve `memory_grants`-ontvangers**. Voor iedere unieke accountontvanger komt één interne `messages`-rij met `kind=guest_comment` en het bestaande unieke `comment_id`. **Geen berichten naar gasttelefoonnummers**.
2. **Meldingstekst:** `GET /api/messages` voegt via lees-only joins `actor_name` (account- of gastnaam), `owner_name` en `memory_title` aan bestaande records toe. Bestaande rijen blijven geldig, ook oudere gastmeldingen zonder `comment_id` (dan valt het menu terug op de gewone teller).
3. **Weergave:** in `src/mijn-talera/menu-integration.txt` wordt het gesprek nog steeds per herinnering gegroepeerd. Bij de nieuwste reactie staat een compacte tekst met afzender en eigenaar; het aantal ongelezen blijft zichtbaar. `more.messages.actorNotice` is voor NL/EN/DE/FR/ES toegevoegd aan het **bestaande** `TaleraI18n`-register (nu 474 sleutels per taal).
4. **Privacy bij ingetrokken toegang:** `GET /api/messages` en `/api/messages/unread-count` tonen uitsluitend records waarvoor de eigenaar het geheugen bezit of waarvoor een geldige, niet-ingetrokken `memory_grant` bestaat. De wijzigingen zijn query-only; er is **geen migratie of verwijdering van bestaande gegevens**.

## Tests
- Statische broncontrole: account `addThreadComment` slaat eigen melding over; gasten krijgen geen persoonlijk meldingsaccount of automatische verzending.
- **D1 schema read-only gecontroleerd:** bestaande tabellen `messages`, `comments`, `guest_comments`, `memories`, `accounts`, `memory_grants` beschikken over alle benodigde kolommen. Geen databasewijzigingen.
- Beide nieuw gebruikte D1 joins en privacyfilters met `EXPLAIN QUERY PLAN` read-only geverifieerd.
- Mobiele browser 390 × 844: `/present?talera_menu=messages`, `/present?talera_menu=hub`, `/tell` en `/kennisbank/` openen zonder Worker-excepties.
- De vijf taalwaarden voor de voorbeeldmelding getest: NL, EN, DE, FR en ES.
- Zonder aanmelding weigert `/api/messages` terecht met HTTP 401. Account- of guesttestreacties zijn **niet naar echte gebruikers verstuurd**.
- **Eindacceptatie open:** aanmelden met meerdere fictieve TALERA-testaccounts, een gastreactie via WhatsApp-preview plaatsen, ontvangers en badges één voor één controleren; toegangsintrekking en eigen-reactie testen. Dit is niet als bevestigd gepresenteerd.

## Bestaande Workers en rollback
- Core `talera-clean-core-staging-20261030`: versie `adc64616-6a2a-4e68-b8ad-25835204a9c3`; deployment `50191730-8c70-44cf-9975-ffd23fe236fe`; vorige deployment `90c905fc-5751-40b4-a6a7-34f6c5373796`.
- Bestaande V56 presentatieservice/vertalingen: versie `49814a94-b4d3-40fc-b236-0eeca8df53c5`; deployment `83f0a27c-a9ca-4a0c-9d45-1fad5a39587f`; vorige deployment `a9cdd6b2-5167-4b96-8690-410f8c154502`.
- Bestaande V62 menu: versie `7c2439f3-cb67-42ba-bbb7-b2a6990f7858`; deployment `98bd4070-1f66-43d4-a34a-15462d411963`; vorige deployment `53a6cb4f-ce97-4ba0-890e-a7e55dc57503`.
- Kerncode is gewijzigd in de versie van de reeds bestaande Cloudflare Core Worker (traceerbaar via bovengenoemd version ID); het menu en de vertaalbron staan in de bestaande V62 GitHub-bouwtak.
