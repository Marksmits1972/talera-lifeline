# TALERA V13 — architectuur-opschoning en releasepoort

Status: **dynamische tijdsgrenzen, geboortejaarinstelling en ontdubbelde RH19-voorbeeldcatalogus automatisch getest; overige eisen nog niet af. NIET definitief goedgekeurd / niet uitgerold**.

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
- **GEREALISEERD:** De originele 50 RH19-voorbeeldherinneringen staan nu alleen in `src/reference-memories.js`; RH19 en de telefoon delen deze bron. Golden snapshot-hash `5805a021` test ID, datum, oorspronkelijk verhaal en foto; de oude import is een re-export.
- **GEREALISEERD IN CODE, IPHONE-ACCEPTATIE OPEN:** RH19 en de telefoontijdlijn gebruiken `src/life-range.js`, start = vroegste herinnering of eerder geboortejaar, einde = vandaag. RH19's dichtheidsweergave wordt bij nieuwe herinneringen opnieuw berekend. De maximale zichtbare overzichtszoom en het gedrag bij tientallen jaren moeten nog visueel worden getest.
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


## iPhone Free-herstel: platformspecifieke blokkade, geen valse veiligheid

- Het bestaande IndexedDB en de OPFS-map van een web-app zijn beide opslag binnen hetzelfde WebKit-/origin-kader. De WebKit-opslagregels kunnen onder ruimte- of bewaarcondities ook zo'n map samen met IndexedDB laten verdwijnen. Een automatisch aangemaakte OPFS-kopie is daarom **niet** de onafhankelijke iPhone-back-up die we de gebruiker willen beloven. Bron: https://webkit.org/blog/14403/updates-to-storage-policy/ en https://webkit.org/blog/12257/the-file-system-access-api-with-origin-private-file-system/ .
- iOS Safari biedt de web-app momenteel niet de vereiste standaard `showDirectoryPicker` om buiten de app zelfstandig naar een permanent gekozen map in Bestanden te schrijven. Bron: https://openpwa.net/reference/capabilities/file-system-access/ .
- Een werkbare Free-back-up moet dus aantoonbaar exporteren naar een door de gebruiker opgeslagen bestand (Bestanden/ander medium), mét veilige import/herstel en ongewijzigde originele media; of later via een daarvoor geschikte native iOS-integratie. **Niet doen alsof dit al automatisch kan.**
- Er wordt **geen nieuwe duplicerende on-device database** aangemaakt als surrogaat voor een externe back-up. Dit zou opslag verdubbelen zonder de beloofde onafhankelijkheid.
- Premium kan later een apart beveiligd Cloudflare-opslagmiddel bieden volgens hetzelfde canonieke herinneringscontract, met herstel en export na beëindiging.
