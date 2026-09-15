# TALERA – bouwopdracht delen en vertrouwenskringen

## Status

Dit document is de functionele en technische bouwopdracht voor de deelervaring. De ontwerpbeslissingen zijn vastgesteld; technische details mogen worden verfijnd zolang de toegangsregels en gebruikersbeloften hieronder niet worden afgezwakt.

De eerste implementatie bestaat uit een geïntegreerd interactieprototype in de bestaande tijdlijnworker. Het prototype gebruikt geen echte uitnodigingen of productieaccounts. De beveiligde backend volgt pas nadat de mobiele gebruikerservaring is goedgekeurd.

## Productdoel

Een eigenaar moet vanuit de actieve herinnering eenvoudig één verhaal of een gefilterde tijdlijn kunnen delen. De ontvanger krijgt een rustige TALERA-ervaring, ziet nooit zijn vertrouwenskring en kan nooit meer inhoud ophalen dan de server expliciet toestaat.

## Vaste uitgangspunten

- Opslaan en delen zijn afzonderlijke handelingen.
- De actieve herinnering onder de middennaald is automatisch het deelobject.
- Iedereen vertelt uitsluitend vanuit de eigen ik-persoon.
- Een ontvanger kan niets aan de levenslijn van een ander toevoegen of wijzigen.
- WhatsApp vervoert de uitnodiging; TALERA beheert identiteit, toestemming en toegang.
- Ontvangers kunnen inhoud alleen binnen TALERA bekijken en beluisteren.
- Ontvangers kunnen niet downloaden of opnieuw doorsturen.
- Naam en logo van TALERA blijven rustig en herkenbaar aanwezig.

## Vertrouwensmodel

Elke herinnering heeft exact één `visibility_level`:

| Waarde | Eigenaarlabel | Toegang |
| --- | --- | --- |
| 0 | Alleen ik | Alleen eigenaar |
| 1 | Binnenkring | Eigenaar en niveau 1 |
| 2 | Vertrouwde kring | Eigenaar en niveaus 1–2 |
| 3 | Ruime kring | Eigenaar en niveaus 1–3 |

Een persoon heeft voor één levenslijn één `access_level` van 1 tot en met 3. De autorisatieregel voor een tijdlijnverhaal is `viewer.access_level <= story.visibility_level`. Niveau 0 wordt nooit aan een ontvanger geleverd.

De labels en niveaus zijn uitsluitend zichtbaar voor de eigenaar. De ontvanger krijgt geen aantallen, lege posities, slotjes of andere aanwijzingen dat er verborgen verhalen bestaan.

## Deelvorm A – alleen dit verhaal

1. Eigenaar opent **Meer → Delen**.
2. TALERA toont de actieve herinnering.
3. Eigenaar kiest **Alleen dit verhaal**.
4. Standaardduur is 30 dagen.
5. Alternatieven zijn 24 uur, 7 dagen, 30 dagen en zonder einddatum.
6. TALERA maakt na bevestiging één niet-voorspelbare, intrekbare gastuitnodiging.
7. De ontvanger mag zonder account bekijken en beluisteren.
8. Na afloop kan TALERA vragen: “Roept dit verhaal bij jou een eigen herinnering op?”
9. Zelf vertellen of blijvend beheren vereist een TALERA-account.

## Deelvorm B – mijn tijdlijn

1. Eigenaar kiest **Mijn tijdlijn**.
2. Eigenaar kiest privé de kring: Binnenkring, Vertrouwde kring of Ruime kring.
3. TALERA maakt een eenmalig te accepteren tijdlijnuitnodiging.
4. Ontvanger opent de uitnodiging en logt in of maakt een account.
5. Ontvanger kiest **Toegang aanvragen**.
6. Eigenaar ontvangt een aanvraag en kiest **Toestaan** of **Weigeren**.
7. Pas na goedkeuring wordt de gefilterde tijdlijn beschikbaar.
8. Toegang blijft actief totdat de eigenaar haar wijzigt of intrekt.

## Registratie en sessies

- Registratie biedt telefoonnummer en e-mailadres als gelijkwaardige routes.
- Er is geen zelfbedacht wachtwoord nodig.
- Numerieke verificatiecodes hebben minimaal zes cijfers, zijn eenmalig en maximaal tien minuten geldig.
- Aanvragen en foutieve pogingen worden beperkt en vertraagd.
- Foutmeldingen verraden niet of een account bestaat.
- Sessiecookies zijn `Secure`, `HttpOnly` en passend `SameSite` ingesteld.
- Sessies worden na verificatie en gevoelige wijzigingen vernieuwd.
- Gevoelige wijzigingen vereisen herverificatie.
- Een passkey kan later als sterkere en eenvoudigere terugkeerroute worden toegevoegd.
- SMS is nooit de enige beschikbare herstel- of toegangsmethode.

## Bewaren en eigenaarschap

**Met mij gedeeld** bewaart uitsluitend een verwijzing naar de originele herinnering en toegangsverlening. Er ontstaat geen zelfstandige kopie van foto, video of audio. Verwijderen, verlopen of intrekken maakt de verwijzing onmiddellijk ontoegankelijk.

Een eventuele export van de eigen levenslijn is een aparte eigenaarsfunctie en geeft ontvangers geen downloadrecht.

## Meldingen en beheer

Onder **Meer → Mijn mensen** ziet alleen de eigenaar:

- uitnodiging aangemaakt;
- wacht op goedkeuring;
- actief;
- verlopen;
- ingetrokken;
- deelvorm en interne vertrouwenskring;
- acties toestaan, weigeren, verplaatsen en intrekken.

De eigenaar krijgt alleen een melding wanneer actie nodig is en een korte bevestiging na goedkeuring. TALERA toont geen luisterfrequentie, luisterduur of melding voor iedere opening.

Een ontvanger krijgt na intrekken of verlopen uitsluitend: “Dit verhaal of deze tijdlijn is niet meer beschikbaar.” De reden en kring worden niet getoond.

## Schermen en staten

### Eigenaar

1. Meer-hub met Delen, Mijn mensen en Met mij gedeeld.
2. Deelkeuze met actieve herinnering.
3. Verhaalduur kiezen.
4. Tijdlijnkring kiezen met aanduiding “alleen zichtbaar voor jou”.
5. Uitnodiging gereed.
6. Mijn mensen – leeg, aanvraag, actief, verlopen en ingetrokken.
7. Met mij gedeeld – leeg, toegankelijk en niet meer beschikbaar.
8. Bevestiging voor toegang uitbreiden of intrekken.

### Ontvanger

1. Gedeeld verhaal – afzender, herinnering en Luisteren.
2. Persoonlijk-met-jou-gedeeld aanduiding.
3. Eigen herinnering starten.
4. Tijdlijnuitnodiging – inloggen/registreren.
5. Toegang aanvragen.
6. Wachten op goedkeuring.
7. Goedgekeurde, gefilterde tijdlijn.
8. Geweigerd, verlopen of ingetrokken.

## Navigatiearchitectuur

- **Meer** is de algemene TALERA-index en is niet gekoppeld aan de actieve herinnering.
- Meer reserveert ruimte voor profiel, Mijn mensen, Met mij gedeeld, abonnement en betaling, privacy en beveiliging, meldingen, instellingen en hulp.
- Delen is een afzonderlijke contextuele knop op het foto- en videoscherm.
- De contextuele deelknop gebruikt automatisch de actieve herinnering en opent de keuze tussen één verhaal en de tijdlijn.
- Tijdlijnuitnodigingen en bestaande toegang blijven daarnaast beheerbaar via Mijn mensen.

## Visuele architectuur

- Eén deelmodule bezit overlay, frost, navigatie en toestanden.
- Geen gestapelde semi-transparante achtergronden.
- De glass-frostlaag is één doorlopende surface met een zachte gemaskeerde overgang naar de foto.
- De actieve foto blijft achter het deelvenster herkenbaar.
- Het deelvenster neemt op mobiel circa 76–82% van de schermhoogte in.
- Achterliggende tijdlijn, verhaalgebaren en audio pauzeren zolang het venster open is.
- Alle aanpasbare waarden staan als CSS-variabelen op de module-root.
- De eerste implementatie hergebruikt de bestaande kleurvariabelen en bottom-commandlaag.

## Productiegegevensmodel

### `users`

`id`, `display_name`, `primary_email`, `primary_phone`, `created_at`, `status`

### `stories`

`id`, `owner_id`, `event_at`, `title`, `text`, `visibility_level`, `status`, `created_at`, `updated_at`

### `timeline_access`

`id`, `owner_id`, `viewer_id`, `access_level`, `status`, `approved_at`, `revoked_at`

### `invitations`

`id`, `owner_id`, `kind`, `story_id`, `intended_access_level`, `token_hash`, `expires_at`, `status`, `claimed_by_user_id`, `claimed_at`, `approved_at`, `revoked_at`

### `shared_references`

`id`, `viewer_id`, `owner_id`, `story_id`, `invitation_id`, `saved_at`, `status`

### `audit_events`

`id`, `actor_id`, `owner_id`, `event_type`, `target_type`, `target_id`, `created_at`, beperkte beveiligingsmetadata zonder verhaalinhoud

## Productie-API

- `POST /api/share/story` – gastuitnodiging maken.
- `POST /api/share/timeline` – tijdlijnuitnodiging maken.
- `GET /api/invitations/:token` – minimale, tokengebonden uitnodigingscontext.
- `POST /api/invitations/:token/claim` – koppelen aan geverifieerd account.
- `POST /api/invitations/:id/request-access` – tijdlijntoegang aanvragen.
- `POST /api/access-requests/:id/approve` – eigenaar keurt goed.
- `POST /api/access-requests/:id/deny` – eigenaar weigert.
- `POST /api/access/:id/revoke` – toegang intrekken.
- `PATCH /api/access/:id/level` – kring wijzigen na gevolgenbevestiging.
- `GET /api/timelines/:ownerId/stories` – servergefilterde verhalen.
- `GET /api/stories/:storyId/media/:mediaId` – autorisatie per mediaverzoek.

Ruwe tokens worden nooit opgeslagen; uitsluitend een cryptografische hash. Autorisatie gebruikt nooit alleen client-side tags of verborgen knoppen.

## Prototypegrens

De eerste UI-versie:

- werkt met de actieve tijdlijnherinnering;
- laat alle eigenaar- en ontvangerstaten doorlopen;
- bewaart uitsluitend niet-gevoelige prototype-status in `localStorage`;
- maakt geen productie-uitnodiging;
- verstuurt geen echte beveiligde deelkoppeling;
- toont duidelijk wanneer een actie nog een prototypevoorbeeld is.

## Acceptatiecriteria prototype

- Meer opent één rustig, licht TALERA-werkblad met de algemene app-index.
- De actieve-herinneringskaart en de directe ingang Delen staan niet in de algemene Meer-index.
- Een afzonderlijke deelknop op het foto- of videoscherm opent de deelroute voor de actieve herinnering.
- Delen toont de actieve herinnering zonder token of beheergegeven te kopiëren.
- Alle twee deelvormen en vier duurkeuzes zijn bereikbaar.
- Kringkeuze is als privé-instelling herkenbaar.
- Ontvangervoorbeelden noemen nergens een kring of rang.
- Mijn mensen toont alle afgesproken statussen.
- Met mij gedeeld beschrijft bewaren als verwijzing.
- Sluiten herstelt de tijdlijn zonder sprong of nieuwe visuele laag.
- Audio stopt bij openen en kan na sluiten weer volgens de bestaande logica starten.
- Er is geen download- of doorstuuractie in de ontvangerweergave.
- Bestaande home-, vertel-, tijdlijn-, foto- en audiowerking blijft intact.

## Productiegate

Echte persoonlijke verhalen mogen pas via de nieuwe routes worden gedeeld nadat serverautorisatie, tokenopslag, sessies, rate limiting, media-afscherming, intrekken, auditlogging en alle negatieve tests zijn geïmplementeerd en onafhankelijk zijn beoordeeld.
