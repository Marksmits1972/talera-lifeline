# TALERA — centraal taalcontract (i18n) v1

**Status:** eerste technische implementatie in een afzonderlijke branch; nog geen volledige taalvrijgave.

## Bron en ontwerpbesluit

Gebaseerd op de leidende TALERA-roadmap en de internationale architectuurafspraken in Google Drive.
Bij introductie: Nederlands, Engels, Duits, Frans en Spaans. Extra talen krijgen een nieuwe catalogus en registratieregel, **nooit nieuwe forks van Tijdlijn / Vertellen / RH19**.

## Invarianten

1. Elke vaste gebruikersinterfacetekst krijgt één **semantische, stabiele** sleutel (bijv. `nav.timeline`, `tell.save`, `status.titleRequired`). Sleutel en opgeslagen story-ID zijn niet vertaald of taalafhankelijk.
2. Catalogi zijn gescheiden van componentlogica: `experiments/lifeline-main/locales/{nl,en,de,fr,es}.js`. Een nieuwe taal raakt uitsluitend de configuratie/taalcatalogus; geen functionele paginalogica.
3. `experiments/lifeline-main/i18n.js` levert de shared bootstrap. Pagina's gebruiken `data-i18n`, `data-i18n-placeholder`, `data-i18n-aria-label`, of `TaleraI18n.t('key', {name:value})`. Via `textContent`/DOM-attributen renderen, geen vertaalde HTML injecteren. Onbekende sleutel toont zijn eigen sleutel om ontbrekende catalogusitems te signaleren.
4. Voorkeur: opgeslagen handmatige taalkeuze `talera.ui.language.v1`, anders apparaattaal, anders **Engels**. Locale-normalisatie werkt met regio's (`nl-NL`, `de-DE`, etc.). Taalwissel wordt uitgezonden als `talera:languagechange`; bestaand verhaal en schermselectie blijven behouden.
5. `Intl.DateTimeFormat` en `Intl.NumberFormat` voor zichtbare waarden. Gestructureerde herinneringsdatums blijven ISO-/datumprecisiegegevens; eigen verhaaltekst, audio, identiteit en mediabestanden worden **nooit** automatisch vertaald of gemigreerd.
6. Vertalingen van vaste UI worden redactioneel beoordeeld vóór publieke publicatie; geen AI-vertaling tijdens runtime. Land, belastingjurisdictie, betaalmethode, tijdzone en taal zijn afzonderlijke configuraties.
7. **Geen lokale media-opslagmanipulatie of wipe.** Vertalingen lezen/schrijven alleen de afzonderlijke taalvoorkeurswaarde. IndexedDB schema `talera-lifeline-dev-local-v1` blijft ongewijzigd. Originele RH19-gestures, fotolayout en verhaalpaneel worden niet veranderd.

## Uitvoering en migratiestatus

- **Gedaan:** vijf afzonderlijke taalcatalogi met dezelfde eerste 101 sleutels; runtime, persisted selector in bestaand tijdlijn-hamburgermenu, gedeelde footer, gedeeltelijke tell-pagina, datumkeuzelabels, tijdlijnnavigatie, filter- en maandlabels.
- **Nog te migreren:** bestaande Nederlandse status- en foutmeldingen in alle scripts en opslaglaag, overgebleven tijdlijn-/vertel-labels, tekst in aanvullende Free-tools, en zichtbare RH19-presentatieteksten. RH19 mag alleen qua **tekstreferenties** veranderen, nooit presentatiegedrag. Ook semantische datumweergaven, plurals, toegankelijkheid en content review moeten volledig worden afgevinkt.
- **Toets:** `node --test test/lifeline-main.test.mjs test/lifeline-i18n.test.mjs`, smoke op **afzonderlijke** `talera-r19-lifeline-i18n-preview-dev` Worker en échte iPhone-Safari acceptatie voordat dezelfde-origin PWA een nieuwe versie krijgt.
- **Release-gate:** alle vaste UI-strings geïnventariseerd en uit functionele code gehaald, vijf volledige catalogi, per taal en route begrijpelijke UI, echte toesteltest, menselijke tekstgoedkeuring. Zonder die punten géén claim van volledige vijf-talige dekking.

## Een volgende taal toevoegen

1. Maak `locales/<code>.js` met alle bestaande sleutels en goedgekeurde vertalingen.
2. Registreer éénmaal de taal in `i18n.js` (module-import en catalogusconfiguratie); voeg waar relevant locale-formaat toe.
3. Test met browsertaal en met handmatige taalkeuze, test fallbacks en het ontbreken van herschrijven van privéverhalen.
4. Publiceer alleen na taalredactie/acceptatie. Hoofd-tijdlijn, vertelpagina, RH19 en opslagcode hebben hierbij géén vertaalafhankelijke branches.

**Let op:** een zesde taal toevoegen zonder functionele pagina-wijziging is getest; de huidige vijf catalogi zijn nog conceptvertalingen en de bestaande prototype-UI is nog niet geheel gemigreerd.
