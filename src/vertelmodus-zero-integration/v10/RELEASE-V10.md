# TALERA V10 — Schrijven, Kenmerken en Presentatiefoto's

**28 oktober 2026 — aparte TESTKANDIDAAT, NIET door gebruiker goedgekeurd.**

## Deployment en herstel
- V10: https://talera-pwa-v10-schrijf-kenmerken-presentatie-test.mark-a39.workers.dev/
- V10 Worker `talera-pwa-v10-schrijf-kenmerken-presentatie-test`, deployment `765111b7-3cfb-4c2c-a218-3907dcedd547`, Cloudflare versie `41581fd2-95c8-409d-9a6e-eb290ae99a75`.
- V9 blijft op een afzonderlijke origin actief en is **niet gewijzigd**: `talera-pwa-persoonlijke-kenmerken-v9-test`, deployment `ed05616d-2734-4244-9332-26f48ef65744`, versie `902395f6-60d9-4681-8ed2-707012ab57c2`.
- GitHub branch `feature/v10-tags-writer-photo-i18n-20261028` van V9-branche. Niet mergen of CURRENT wijzigen zonder expliciete gebruikersacceptatie.
- Historische volledig geïntegreerde Worker is nog niet volledig reproduceerbaar vanuit GitHub CI. De V10-bronbestanden in deze map zijn doelgerichte bron-delta's; de uitvoerbare kandidaat is separaat via Cloudflare Workers multipart-geüpload.

## Wijzigingen

### Kenmerken op herinnering: één duidelijke bevestiging
- `+ Kenmerk toevoegen` toont alleen gekozen favorieten, in dezelfde bestaande bewerkpagina.
- Iedere optie is een knop met `aria-pressed`; wijzigingen worden **voorlopig** in een aparte selectie bijgehouden.
- Één **Toevoegen** verwerkt de selectie in het bestaande `g.tags`-concept en sluit het menu; **Annuleren**, opnieuw de toggle drukken of Escape sluit zonder nieuwe keuzes op te slaan.
- Geen eigen-kenmerk-input in dit venster, geen dubbele knop. Eigen kenmerken blijven uitsluitend te beheren via **Meer → Instellingen → Mijn kenmerken**.
- Gekoppelde kenmerken die niet in de huidige favorietenlijst voorkomen blijven intact. De bestaande conceptopslag en publicatie worden hergebruikt.

### Schrijven met iOS-toetsenbord
- Bestaande V4 `taleraV4WriterMotion` vervangen door één aangepaste scroll- en cursorberekening.
- De oude V8 `height:100dvh!important` overschreef de echte `visualViewport.height`, waardoor het venster het toetsenbord niet correct kon volgen. V10 gebruikt nu expliciete CSS-variabelen voor zichtbare hoogte en bovenrand, bijgewerkt bij viewport scroll/resize/rotatie.
- Het tekstveld groeit zonder eigen interne scrollbar; de bestaande schrijfcontainer is de enige hoofd-scroll. De cursorpositie wordt uit een tekstspiegel berekend met het correcte coördinatenstelsel tussen editor en scrollcontainer. Nieuwe tekst en handmatige cursorwijzigingen schuiven omhoog.
- De directe iOS-focus uit V9 is behouden. Schrijfvenster, fotografie en `#story` conceptopslag zijn niet gedupliceerd.

### Presentatie: consequent foto vóór blur
- In de bestaande RH19-presentatieadapter een gerichte CSS-regelset toegevoegd, **geen nieuwe fotoviewer en geen nieuwe gebarenafhandeling**.
- Achtergrondfoto: beperkte `blur(14px)` op `opacity: .17`, zonder kleurverschuivende saturatie. Dubbele `.photo-aligned-blur` wordt verborgen. De gewone foto blijft scherp op opacity 1.
- Bij gesynchroniseerde eigen fotobeelden is de atmosferische achtergrond eveneens subtieler. De onderkant krijgt één lichte niet-vervagende contrastgradient voor verhaaltekst; het tijdlijnglas wordt minder zwaar. Staand/liggend fotomateriaal moet in iPhone-test visueel beoordeeld worden.

### Taalstructuur
- **Geen tweede vertaalsysteem.** De bestaande `TALERA_V23_TRANSLATIONS`-catalogus is uitgebreid met 45 sleutels per taal: Nederlands, Engels, Duits, Frans en Spaans.
- V10 `tags.js`, `settings.js` en de zichtbare schrijfpop-up verwijzen naar dezelfde vertaalsleutels. De 25 voorgestelde kenmerken hebben stabiele naam-sleutels `tag.name.<id>` per taal.
- Oude opgeslagen kenmerkwaarden blijven voorlopig de bekende Nederlandstalige labelnamen, als compatibiliteitslaag; deze worden in het scherm via de vaste sleutels vertaald. Zelfgemaakte kenmerken blijven eigen tekst en worden niet automatisch vertaald.
- **Auditgrens:** V10 centraliseert de nieuwe/gewijzigde onderdelen. In oudere delen van de ca. 1,8MB geïntegreerde code staan nog vaste Nederlandse teksten. Deze zijn **niet allemaal gemigreerd** in V10; dat mag niet als voltooid wereldwijde-i18n-migratie worden gepresenteerd. Nieuwe schermteksten voortaan altijd via de V23-catalogus en taalafhankelijke opmaak; legacy apart per module migreren, niet blind met een zoek-en-vervangactie.

## Uitgevoerde automatische tests op mobiele Chromium (390 x 844)
1. **PASS**: /, /tell, /mijn-leven, /present en beide Vertelmodus-iframevarianten laden met status 200, zonder serverexception.
2. **PASS**: Kenmerkmenu toont 12 favorieten, een **Toevoegen**-knop, geen vrij invoerveld. Vakantie aanklikken verandert het concept nog niet; **Annuleren** laat het leeg. Na opnieuw aanvinken en **Toevoegen** verschijnt de tag en sluit het venster.
3. **PASS**: Een lang verhaal met 75 tekstregels behoudt focus en rolt in de schrijfcontainer mee (scrollTop ~3421), editorhoofdscroll zonder dubbele scrollbar.
4. **PASS, gesimuleerde iPhone-toetsenbordhoogte**: `visualViewport.height` tijdelijk op 424px gezet en resize gestuurd: overlay effectief 424px, scroller ~358px en cursor blijft bij einde. **Dit is geen echte iOS Safari-keyboardtest.**
5. **PASS**: vijf locales leveren de verwachte vertalingen van tag-, primaire-school- en schrijftitels. In het kenmerkmenu bij `en` verschijnen `Add tag`, `Family`, `Friends`, `Holiday`.
6. **PASS**: bestaande Meer → Instellingen → Mijn kenmerken toont 25 keuzes, waarvan 12 standaard aan; labels zijn ook in Engels zichtbaar, eigen kenmerk blijft mogelijk.
7. **PASS**: computed CSS in /present toont hoofdbeeld `filter:none; opacity:1`, `.photo-aligned-blur display:none`, atmosferische achtergrond `blur(14px);opacity:.17`.
8. **PASS**: een foto importeren, titel geven en via `Op mijn tijdlijn plaatsen` publiceren toont de nieuwe kaart en de presentatielink.
9. **PASS (gesimuleerde mediaevents)**: na voice-einde video 0 en daarna video 4 in oorspronkelijke volgorde, beide met `muted=false`.

## Nog te toetsen op echte iPhone
- Of het echte Safari/standalone toetsenbord meteen verschijnt en of de cursor tijdens lange **gedicteerde** teksten zichtbaar blijft, ook middenin een woord corrigeren, scrollen, eerdere tekst aanraken.
- Of staande en liggende foto's en foto’s met erg verschillende kleuren visueel mooi en gelijkmatig worden getoond (geen dubbele blur of ongewenste kleurverschuiving).
- Of de kenmerkenkeuze na sluiten/heropenen en op bestaande eigen herinneringen blijft bestaan.
- Of alle eerdere stem-/beeldtijdstempels, tik/swipe, opnamegolf en videogeluid tijdens echte HEVC/iPhone-video's goed blijven werken.
- V10 heeft een eigen workers.dev-origin en dus aparte IndexedDB/localStorage. Oude V9-herinneringen worden niet automatisch in V10 getoond. Wis V9 niet.

## Acceptatieregel
Markeer de bovenstaande punten apart als **gebouwd**, **automatisch getest**, **echt op iPhone getest** en **door gebruiker goedgekeurd**. V10 blijft een testkandidaat totdat de gebruiker de iPhone-weergave accepteert.
