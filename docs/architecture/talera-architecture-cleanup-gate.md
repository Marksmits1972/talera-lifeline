# TALERA V13 — architectuur-opschoning en releasepoort

Status: **gedeeltelijk opgeschoond; NIET definitief goedgekeurd / niet uitgerold**.

## Leidende minimale architectuur

1. **Één bron voor gebruikersdata:** `TaleraMemories` (IndexedDB `talera-lifeline-dev-local-v1`, `stories` met sleutels en `files` met originele blobs plus optionele afgeleide telefoonbestanden). Titel, datum, tijd en identiteitsvelden veranderen niet door een scherm- of taalwissel.
2. **Eén ID in navigatie:** `/present?memory=<memoryId>`, `/?memory=<memoryId>` en `/tell?edit=<memoryId>`. De pagina haalt zelf de recordgegevens op; navigatie kopieert geen foto's/verhalen of IndexedDB-payloads.
3. **Een presentatieregelaar:** de goedgekeurde RH19-engine bezit tikken, swipen, overgangen en het witte verhaalpaneel. De lokale adapter mag slechts RH19-herinneringsgegevens en specifieke videoplayer/audio aanbieden. Geen galerij-duplicaat.
4. **Eén zichtbare hoofdmenubalk:** `navigation.js` genereert dezelfde drie tabs, iconen en taalsleutels. De pagina heeft alleen een declaratieve `<!--TALERA_SHARED_NAV-->`-plaats.
5. **Eén vertaalcatalogus:** vaste UI-tekst via `i18n.js` met stabiele keys, vijf starttalen (NL/EN/DE/FR/ES), later meer. Persoonlijke verhalen blijven in oorspronkelijke taal.
6. **Expliciete paginabouw:** pagina's bieden duidelijke invulpunten voor aanvullingen. Geen willekeurige zoek-/vervangacties op labels, bestaande CSS of HTML-structuren.

## In deze afzonderlijke branch daadwerkelijk verwijderd

- Het scrapen van de navigatie-HTML uit de tijdlijn plus regex-bewerkingen van `class`, `aria-current` en oude demo-URL. In plaats daarvan één pure component `navigation.js`.
- De afwijkende oude navigatie-HTML/CSS op de historische `storylab-clean`-route (daar nu ook de gedeelde component).
- De `?local=`-teruglink na een datumwijziging: na opslaan terug naar `?memory=`.
- Kwetsbare injecties op de **eerste willekeurige `<script>`**, het `mediaSection`-element en afsluitende `</body>` in Tijdlijn/Vertellen. Deze zijn vervangen door afzonderlijk benoemde declaratieve plaatsen.
- RH19-broncode en IndexedDB niet aangepast. Geen bestaande PWA publicatie.

## Openstaande architectuurschuld — niet verbergen of wegtesten

**Prioriteit A.**
- De originele 50 RH19-demogegevens zijn zowel in `src/html/chunk3..6.js` als in `demo-memories.js` opgenomen. Test bevestigt gelijke data, maar dat is nog **dubbel bronbeheer**. Eén canonieke data-export vereist een afzonderlijke RH19-snapshotcontrole vóór het schrappen van de duplicaatbron.
- RH19 gebruikt nu vaste datumgrenzen **06-09-1976 t/m 06-09-2026**, terwijl de nieuwere tijdlijn breder gaat. Alle herinneringen in geldige datums daarbuiten kunnen daardoor niet vanzelf correct in RH19 positioneren. Eerst tijdsmodel ontwerpen en reproductietests (1900, heden, >2026) zonder de goedgekeurde foto-/swipe-layout aan te tasten.
- De tijdlijn, IndexedDB en RH19 gebruiken nog verschillende objectvormen en een adapter. Behoud één canonieke opgeslagen record; beperk noodzakelijke omzetting tot een expliciet RH19-presentation-inputcontract. Verwijder alle overige duplicerende adapters en state-paden alleen mét bewezen gelijk gedrag.
- Vanwege de bestaande RH19-HTML is een legacy `</body>`-invoegpunt op `/present` nog aanwezig. Dit mag pas verdwijnen wanneer RH19 zelf een formele éénmalige uitbreidingsplaats heeft zonder de referentiepresentatie te wijzigen.

**Prioriteit B.**
- Verscheidene oorspronkelijke RH19-modules injecteren nog stijl- en controllerlagen. Inventariseer werkelijk actieve functies; schrap enkel bewezen inactieve/dubbele stukken na RH19-regressie op iPhone, geen cosmetische totaalrewrite.
- Niet alle oude NL-UI/status-/foutstrings zijn al onderdeel van de taalcatalogus; zesde taal is mogelijk maar niet volledig gedekt. `i18n.js` levert momenteel alle vijf woordenlijsten in elke HTML-response en gebruikt nog een vaste lijst van land-/regiocodes. Dit is bruikbaar voor vijf, maar bij meer talen moeten data/language-bundles onafhankelijk uitbreidbaar zijn.
- De foto-telefoonvariant kan zowel bij opslag als bij eerste weergave worden gemaakt. Onderzoek welke strategie op een echte iPhone lagere piekbelasting en snellere eerste presentatie geeft; kies daarna **één** aanmaakmoment zonder de originele bestanden weg te gooien.
- Verifieer alle links naar oude locaties en waarom die nog moeten blijven (alleen compatibility wanneer daadwerkelijk gebruikt). Documenteer verwijderdatum na acceptatie.

## Vrijgavecriteria

- Alle core- en RH19-tests slagen in een schone branch; daarnaast cross-page functionele integratietests voor verhaal zonder foto, met foto, meerdere foto's, video, audio, bewerken en datumwijziging.
- De drie routes tonen exact hetzelfde navigatieonderdeel en dezelfde herinnering via stabiele ID.
- Alle legale datums worden identiek behandeld op beide tijdlijnen, ook buiten de oorspronkelijke demoperiode.
- Eén canoniek referentie-/herinneringsgegevensmodel is aangetoond en de dynamische foto- en audioregeling is op echte iPhone getest.
- Vijf interfacetalen zijn volledig gemigreerd; zesde taal zonder paginawijziging.
- De gebruiker keurt de bediening inclusief witte RH19-verhaalplaat, fotografie en pagina-navigatie op dezelfde PWA-origin goed.
- Nooit cookies, cache, IndexedDB, app of media verwijderen om een software-update te laten werken.
- Pas ná acceptatie merge naar de bestaande PWA-branch, met behoud van een herstelbare Git-commit. Een groene CI is **niet** hetzelfde als een geslaagde iPhone-gebruikerstest.
