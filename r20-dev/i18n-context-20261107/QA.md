# TALERA — contextgebonden vijftalige teksten, eerste veilige bouwronde

Datum: 7 november 2026. **Status: afzonderlijke TESTVERSIE, NIET de huidige beste voorkeurslink vervangen.**

## Afspraak van gebruiker

Iedere tekst/woordgroep krijgt een **eigen vertaalsleutel per plaats en betekenis**, ook wanneer de Nederlandse formulering gelijk is. Bijvoorbeeld `account.register.birthDate.label` en `account.profile.birthDate.label` zijn onafhankelijk wijzigbaar; `social.comment.composePlaceholder` en `messages.thread.composePlaceholder` zijn verschillende betekenissen. Eerder dubbele sleutelwaarden niet automatisch samenvoegen.

## Veilige architectuur

- Nieuw, afzonderlijk Cloudflare Worker: `talera-i18n-context-test-20261107`; `TALERA_BASE` servicebinding verwijst naar ONGEWIJZIGDE `talera-account-birthdate-test-20261107`. Geen eigen DB/KV-bindingen; alle API-, uploads-, media- en accountaanvragen ongewijzigd doorgestuurd.
- De bekende HTML-routes krijgen een **zuivere woordenregisteruitbreiding**: het bestaande `#talera-v23-i18n` script wordt ongewijzigd gelaten behalve de JSON-inhoud van `PACKS`. De oorspronkelijke vertaalmotor, dynamische algoritmen en eventhandlers blijven exact bestaan.
- Eigen bewerkbaar apart register `context-register.mjs` met **31 unieke context-sleutels, alle afzonderlijk voorzien van vijf expliciete waarden** (NL, EN, DE, FR, ES). Dit betekent aanvullend op de originele 474 sleutels 505 sleutels per taal in de geïsoleerde versie.
- Eigen `context-binder.mjs` voegt uitsluitend `data-i18n` of `data-i18n-placeholder`/`data-i18n-aria-label` toe aan de specifieke bestaande DOM-velden. Geen input-elementen, knoppen of velden vervangen. 28 van de 31 context-sleutels zijn in die binder voorbereid/gekoppeld. Drie zijn als **voorbereide, nog niet actief gekoppelde** sleutels opgenomen: `tell.voice.recordSaved`, `tell.voice.narrationSaved`, `social.comment.composePlaceholder`. Niet claimen dat alle tekstplaatsen al zijn afgewerkt.
- Extra exacte contextselectors voor account aanmaken, inloggen, wachtwoord herstellen, geboortedatumprofiel, berichtenmenu, presentatie-terug-/bewerken-aria en schrijfveld. De registratie-/DOB-logica zelf is identiek gebleven.
- De bestaande `sourceToKey` fallback blijft tijdelijk bestaan voor onbehandelde schermdelen. De huidige 14 Nederlandse dubbele bronteksten **zijn niet samengevoegd of verwijderd**.

## Uitgevoerde browser-/codecontroles

1. Nieuwe test-Worker en drie losse modules succesvol gepubliceerd `2026-11-07T20:37:22.485319Z`.
2. `/mijn-leven`, `/present` en `/tell` laden de oorspronkelijke TALERA-schermen met extra binder.
3. Actuele registratie-HTML gecontroleerd: na dynamische opbouw heeft elk van de zes velden zijn **eigen `account.register.*` data-i18n-sleutel**; geboortedatum blijft een verplicht `input type=date`.
4. Op dezelfde registratiepagina wisselt elke naam/gebruikersnaam/geboortedatum/e-mail/wachtwoord/confirm-tekst correct in **NL, EN, DE, FR en ES**. De voorheen onvertaalde geboortedatum en wachtwoordinstructie zijn nu bijvoorbeeld DE `Geburtsdatum` en `Passwort (mindestens 8 Zeichen)`, FR `Date de naissance` en `Mot de passe (8 caractères minimum)`, ES `Fecha de nacimiento` en `Contraseña (mínimo 8 caracteres)`. De gebruikersnaamplaceholder wisselt ook van taal. Alle 5 registratieknoppen en oorspronkelijke acties blijven bestaan.
5. Inloggen: aparte contextcodes op e-mail en wachtwoord, submit. Wachtwoordherstel: eigen e-mail/submit-sleutels; Engelse en Duitse labels getest.
6. Presentatieknoppen: terugbutton/pen blijven echte 45×45 px aanraakvlakken met zichtbare 34×34 px glas-schijven, terugpijl 9 px; aria-teksten hebben eigen context-sleutels. De oorspronkelijke presentatie-aanraaklogica is niet gewijzigd.
7. **Bronvergelijking** op drie routes: volledige originele vertaallogica buiten JSON-dictionary heeft dezelfde bronhash `7a1066cf` als huidige voorkeursversie. Alle andere gecontroleerde referentiecatalogus-, vertel-, tijdlijn-, presentatie-, DOB- en stijlscripts hebben identieke hashes; alleen de nieuwe binder is toegevoegd.
8. De originele account-DOB-workerbron heeft op oorspronkelijke branch en nieuwe branch exact dezelfde Git blob SHA `309b2d3c00acfc49f975bf171083b7d191f76e8b`. Dus de huidige beste TALERA-code is niet gewijzigd.

## Opzettelijk nog niet aangepakt

- De overige circa 474 historische vertaalcodes zijn niet allemaal aan een expliciet DOM-element per locatie gekoppeld. Het vervangende woordenregister is daarom nog **geen volledige 100%-contextuele i18n-migratie**. Volgende rondes moeten afzonderlijk de hoofdschermen, Vertellen, Presentatie, sociale berichten, verborgen panelen en foutmeldingen inventariseren en koppelen.
- Drie hierboven genoemde codes zijn aangemaakt maar nog niet functioneel aan concrete dynamische schermlocaties getoetst.
- Profielgeboortedatum-editor voor reeds bestaande accounts heeft een eerder gevonden potentiële functionele renderblokkade in de oorspronkelijke versie. Niet behandeld: dit is een apart TECHNISCH issue en buiten de tekst-only scope.
- Geen echte registratie uitgevoerd en geen eigen accountdata aangeraakt. Geen volledige iPhone PWA-appacceptatie. Schermruimte bij alle mogelijke lange vertalingen moet later separaat getest worden.

## Controle-afspraak

**De voorkeursversie in het centrale Google Drive-PWA-linkregister blijft** `https://talera-account-birthdate-test-20261107.mark-a39.workers.dev/mijn-leven` totdat gebruiker uitdrukkelijk een opvolger aanwijst.

**Nieuwe tekst-TESTLINK:** `https://talera-i18n-context-test-20261107.mark-a39.workers.dev/mijn-leven` en `/present`. Geen andere apparaten of eerdere PWA-origin aangepast. Niets aan vertellogica, fotografie, video, audio, tijdlijn, database, opnames, opslag of gebruikersgegevens veranderd.
