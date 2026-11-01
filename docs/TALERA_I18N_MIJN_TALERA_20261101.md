# TALERA — bestaand talenregister uitgebreid voor Mijn TALERA

**Datum:** 1 november 2026. **Status:** V62-staging actief; eindacceptatie op echte iPhone nog open.

## Geen tweede systeem

De bestaande PWA bevat reeds `TALERA_V23_TRANSLATIONS` en `window.TaleraI18n` met talen `nl`, `en`, `de`, `fr`, `es`, één taalvoorkeur `talera-interface-language-v1` en het bestaande `talera:languagechange`-event. Voor deze bouwstap is geen nieuwe vertaalmotor, Worker, bucket of database gemaakt.

Het bestaande register in de V56-app heeft **152 nieuwe sleutels met namespace `more.*`** ontvangen, ingevuld in elk van de vijf talen. Het register is hierdoor van 297 naar 449 sleutels per taal gegroeid (2.245 taalwaarden in totaal). De bron van de toevoegingen is `src/mijn-talera/vertalingen-menu.json`; dit is uitsluitend buildinput voor het *bestaande* register en geen afzonderlijke runtimecatalogus.

De bestaande runtime vertaalt interface-tekstnodes via de al aanwezige NL-brontekst-naar-sleutelindex en `TaleraI18n.t()`. Persoonlijke verhalen, herinneringen en de inhoud van gebruikers blijven onvertaald.

## Menu en taalkeuze

- De canonieke V62-menubron is `src/mijn-talera/menu-integration.txt`, geen opeenvolgende source patches.
- `Mijn TALERA → Instellingen → Taal` toont nu de vijf taalopties *in het menu*.
- Een keuze roept `window.TaleraI18n.setLanguage()` aan; de bestaande voorkeur en het bestaande wijzigingsevent blijven leidend. De terugpijl sluit niet langer de app af of navigeert onnodig naar `/`.
- De link naar de publieke kennisbank en de commerciële WhatsApp-/uitlegpagina's horen bij het **websiteproject**; deze zijn niet aan de appvertalingen toegevoegd. De app-hulplink zelf is wél vertaald.
- Geen wijzigingen aan auth, deelrechten, accountgegevens, D1/R2 of socialfunctionaliteit.

## Versies en fallback

- Bestaande V56-basismodule, nieuwe catalogusversie `5226338a-ad57-40ab-954a-ec56b4854c76`; actief deployment `a02fca36-bf3a-47cb-85bc-1a7b69bbd343`.
- Voorherstel V56-versie `f8adb025-3c8b-4619-ac61-fb8e4ca9ee25` en deployment `21b44d0d-143b-4eb3-bb01-0cb4b9ea2969` blijven bestaan. Overige bestaande V56-bindings zijn behouden.
- Bestaande V62-menuworker, nieuwe versie `d993d732-ca90-4b5d-8ef9-8032a67097f8`; actief deployment `de171866-76c8-4b98-91d6-d5648107bc5e`.
- Voorherstel V62-versie `824f9289-4a20-4430-a534-72a61cab7664`, deployment `1899d89b-2004-4419-a08e-835c8db0dc05`.

## Gerichte acceptatie

1. Browser op mobiel formaat (390×844): vijf talen **nl, en, de, fr, es** doorlopen; voor alle vijf kwam de bestaande `TaleraI18n.t('more.hub.people')` overeen met de zichtbare menutekst.
2. Duits → Instellingen → Taal → Frans: picker toont de huidige taal, omschakeling vindt plaats zonder pagina- of accountwissel, de terugknop gaat terug naar Instellingen en de tekst is Frans.
3. De bestaande kennisbank, account-, delen-, berichten- en opslagroutes zijn niet opnieuw gebouwd.
4. Niet alle toekomstige of dynamisch samengestelde schermteksten zijn met deze opdracht afgevinkt; toekomstige UI-tekst hoort als `more.*`- of modulesleutel in hetzelfde register.
5. Echte iPhone/Safari-acceptatie nog niet uitgevoerd; geen nieuwe uitgebreide volledige socialtest nodig.

**Architectuur:** één taalkeuze, één catalogus, vaste modulenaamruimten, vijf talen. Geen nieuwe fysieke taalbuckets.
