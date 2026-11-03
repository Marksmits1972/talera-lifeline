# TALERA V62 — drie kleine PWA-afwerkingen

**Datum:** 1 november 2026. **Scope:** uitsluitend PWA-weergave en navigatie, niet betalings-/wedstrijdadministratie of commerciële website.

## 1. Taalconsistentie tijdlijn

- De bestaande Cloudflare V56-presentatiebron gebruikt nu de bestaande `window.TaleraI18n.t()` voor de tijdlijntekst **vandaag** en leeftijdsaanduiding **jaar**.
- Twee nieuwe sleutels `present.today` en `present.ageUnit` toegevoegd aan **het bestaande** `TALERA_V23_TRANSLATIONS`-register, voor NL/EN/DE/FR/ES; geen tweede vertaalmotor.
- Catalogus omvat nu **451 sleutels per taal** (voordien 449). Versieerbare aanvullingsbron: `src/mijn-talera/vertalingen-menu.json` (152 bestaande `more.*` + 2 `present.*`).
- Mobiele visuele controle: de Engelse tijdlijn toont `45 years`, `50 years`, `today`; bestaande datumweergave en fotospeler zijn behouden.

## 2. Meer — zichtbare status van nog niet beschikbare instellingen

- Mijn abonnement heeft als onderschrift **Nog niet beschikbaar**.
- Toegankelijkheid heeft als onderschrift **Binnenkort: extra lees- en bedieningsopties**.
- Weergave heeft als onderschrift **Binnenkort: persoonlijke weergavevoorkeuren**.
- Voor alle vijf talen staan de respectievelijke vertalingen in hetzelfde register.
- Onderliggende routes zijn behouden; er zijn geen fictieve instellingen of betaalacties toegevoegd.

## 3. Kennisbank — terug naar actieve herinnering

- De bestaande `Mijn TALERA → Kennisbank en hulp`-link voegt nu alleen de actuele herinnerings-ID en eventueel gekozen jaar aan een **relatieve, eigen-origin** terugverwijzing toe.
- De bestaande statische kennisbankpagina `/kennisbank/` controleert het retouradres: uitsluitend dezelfde origin, `/present`, de bekende parameters `memory`, `year` en `talera_menu=help`.
- Geen accountinhoud, verhalen of media in URL of opslag; alleen de al bestaande selectie-ID.
- De vaste terugknoppen boven- en onderaan brengen je terug naar het **hulpmenu boven dezelfde herinnering**. Bij rechtstreeks openen zonder herkomst leidt de knop naar het normale hulpmenu.
- Browsertests: herinnering 3; met jaar 1985; ongeldige externe retourlink geweigerd; alle routes zonder 1101 Worker-fouten; geen horizontale overloop op 320 px.

## Uitrol en terugval

- Bestaande V56-presentatieworker bijgewerkt: versie `7525932f-df69-4902-9b2c-745cb1b004c1`, actieve deployment `dc3858fc-22f5-49ee-88df-d684809cc48a`. Vorige deployment `a02fca36-bf3a-47cb-85bc-1a7b69bbd343` blijft als terugval.
- Bestaande V62-menuworker bijgewerkt: versie `08ac4f44-5695-4009-a558-65dd64d4702f`, actieve deployment `6e24386a-9846-4de7-bdd4-440d8aff9ad3`. Vorige deployment `f1cba563-fd6a-4dfb-9122-cea3cf291975` blijft als terugval.
- **Geen** nieuwe Worker, tweede database, nieuwe patchketen of wijziging aan de deel-API, persoonsgegevens of herinneringen.
- Regressiecontrole in `test/mijn-talera-consolidated.test.mjs` aangepast. Nieuwe complete GitHub Actions CI-uitslag niet afgevinkt. Definitieve iPhone-bevestiging van de eigenaar blijft open.

## Niet aangepakt

Geen herontwerp van de fotopresentatie, deelketen, timeline drag-logica, website-kennisbank, back-up, abonnementbetalingen of overige toekomstige PWA-functies.
