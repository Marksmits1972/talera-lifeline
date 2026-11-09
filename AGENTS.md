# TALERA / LIFELINE — verplichte werkafspraken voor ontwikkelassistenten

**Leidend samenwerkingsprotocol (CURRENT):** https://docs.google.com/document/d/1kARohDQmBJ40jrBGkcHvd8uzE18zI91M2xCZ4b-JKFI/edit
**Bestaande bouw-test-goedkeuring-regels:** https://docs.google.com/document/d/1FYM0_bVGtiohoD-5381M4-S2U6OrS-F7Nv3I_CvH_w0/edit

Dit bestand beschrijft ontwikkelgedrag. Het verandert geen applicatiegedrag en traint geen AI-model.
Ook ChatGPT-projectinstructies moeten apart door de projecteigenaar worden ingesteld.

## 1. WAT blijft leidend, HOE is jouw verantwoordelijkheid
- Gebruiker bepaalt het *doel* en het definitieve ontwerp; de agent bepaalt zo zelfstandig mogelijk de implementatie.
- **VERKENNEN:** creatief onderzoeken, alternatieven vergelijken, technische mogelijkheden verifiëren.
- **EXACT BOUWEN:** zodra gebruiker 'precies zo bouwen' zegt, geen verborgen herontwerp, oude flow of extra scherm invoeren; voer gedrag, volgorde en acceptatie uit zoals besloten.
- Als bestaande code afwijkt van een definitief besluit: onderzoek en pas code aan; pas nooit zonder toestemming het besluit aan oude code aan.
- Nieuw idee? Bespreek als afzonderlijke optie; niet stilzwijgend onderdeel van het werk maken.

## 2. Minimaal werkanker bij elke substantiële wijziging
Leg vast (zie `docs/work-orders/`):
1. Eén zin met exact, waarneembaar einddoel.
2. Fase: VERKENNEN of EXACT BOUWEN; bron van het ontwerpbesluit.
3. Werkelijke baseline: repository, commit, bewezen acceptatiestatus.
4. Onaantastbare functies/knoppen/navigatie/data en toegestane wijzigingsbestanden.
5. Kerntechnische aannames + onafhankelijk bewijs.
6. Relevante geautomatiseerde tests en toets op echt apparaat.
7. Rollback en publicatiegrens.

Geen lang formulier in gewone gesprekken. De agent bewaakt de doelkaart zelf.

## 3. Vrij programmeren, zorgvuldig beslissen
- Autonoom: code onderzoeken, technische details uitwerken, bouwen, fouten corrigeren, relevant testen.
- Niet autonoom: een definitief doel veranderen, buiten scope werken, gegevens of productie beïnvloeden, `main` mergen, een nieuwe speler/importmotor maken waar dat verboden is.
- Bij technische onzekerheid eerst onderzoeken; zeg niet zonder bewijs 'kan wel' of 'kan niet'. Bouw geen alternatief dat niet hetzelfde resultaat bereikt.
- Onderbreek voor een wezenlijk afwijkend doel of risico; niet voor routinevragen.

## 4. Regressie-, release- en waarheidsregels
- `main` is gekoppeld aan Cloudflare: wijzigingen in `main` kunnen productie publiceren.
- Werk bij voorkeur op een afzonderlijke branch met exacte basiscommit en een testomgeving.
- Gescheiden Worker betekent niet automatisch gescheiden data: servicebindings, R2, D1 en API's afzonderlijk controleren.
- Een geslaagde build is GEEN bewijs dat de app op een iPhone functioneel is goedgekeurd.
- Tests: huidige functie, ongewijzigde beschermde functies, relevante import/navigatie/vertelling, echte iPhone wanneer iOS bepalend is.
- Geen groen licht of claim 'betrouwbaar' zonder passend bewijs en gebruikersacceptatie.

## 5. DOELBEWAKING — controle tijdens én na bouw
Na elke substantiële stap: bouw ik nog het gevraagde resultaat? Zijn beschermd gedrag en codegrenzen intact? Zijn platformaannames bewezen? Is dit de afgesproken versie? Is het resultaat werkelijk getest?
Zo niet: herstel zelf binnen scope, of leg noodzakelijke ontwerpafwijking ter besluit voor.

## 6. GitHub work-order guard
Bij elke nieuwe code-PR naar `main`: voeg één gewijzigde `docs/work-orders/TALERA-*.json` toe met doel, fase, baseline, beschermd gedrag, aannames, toetsing en `allowed_files`.
De GitHub-workflow `talera-goal-guard.yml` vergelijkt de PR-diff met de expliciet toegestane bestanden en verifieert dat vereiste velden zijn ingevuld.
De guard kan **niet** beoordelen of UI/UX semantisch klopt of of een gebruiker akkoord heeft gegeven; werkelijke acceptatie blijft vereist.

**Nooit** eigen technische vrijheid verwarren met vrijheid om het gebruikersdoel te veranderen.
