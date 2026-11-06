# TALERA — werkprotocol CURRENT (GitHub-spiegel)

**Leidende bron in Google Drive:** https://docs.google.com/document/d/1kARohDQmBJ40jrBGkcHvd8uzE18zI91M2xCZ4b-JKFI/edit

## Waarom
Samen bouwen moet creatief blijven, maar mag niet ongemerkt afbuigen van een definitief TALERA-ontwerp. Dit is geen beperking van programmeervrijheid: zelfstandig technisch werk is standaard, stoppen bij een wezenlijke afwijking is uitzondering.

## Besluitmoment
- **VERKENNEN**: vrij onderzoeken en opties vergelijken, maar cruciale aannames toetsen vóór groot bouwtraject.
- **EXACT BOUWEN**: gebruiker heeft doel/volgorde definitief gekozen. Dat is de opdracht; als het niet kan, bewezen beperking vóór een alternatief; verander geen doel door een andere app, demo of techniek in te voeren.

## Werkanker (geen gebruikersonderzoek-formulier)
1. Doel in één zin.
2. Fase en bron definitief besluit.
3. Baseline met commit en werkelijke acceptatiestatus.
4. Beschermde knoppen, navigatie, opgeslagen gegevens, speler, uploadstroom.
5. Verifieerbare kernveronderstellingen.
6. Toegestane bestanden.
7. Acceptatietests incl. echte iPhone en rollback.

## Doorlopend controleren
Na iedere substantiële stap: 'Is dit exact wat gevraagd is, of een eigen oplossing?' Code die compileert is onvoldoende als UX, volgorde of bediening afwijkt.

## Geen schijnzekerheid
- Een geslaagde build betekent niet een iPhone-goedgekeurde applicatie.
- Een afzonderlijke Worker betekent niet afzonderlijke opslag.
- Apple-/browserbeperkingen vooraf controleren.
- Bekende onzekerheid expliciet benoemen, maar zelfstandig alternatieve implementatieroutes onderzoeken binnen hetzelfde doel.

## Rollen
Gebruiker: bepaalt doel, definitief ontwerp, afwijkingen en akkoord op productie. Assistent: onderzoekt, bouwt, test en beschermt bestaand werk zelfstandig. Vraag alleen om toestemming bij wezenlijke koersafwijking/risico.

## Technische borging
Een PR krijgt een `docs/work-orders/TALERA-*.json` en is onderworpen aan de GitHub scopeguard. Scopeguard bewaakt bestandsgrenzen en ingevulde bewijsvelden; echte gedragstoetsing en goedkeuring blijven afzonderlijk.

## Geldigheid
Dit is een nieuw doelbewakingsdeel bovenop de bestaande TALERA cyclus 'Bouw → Test → Groen licht → Gebruikersbeoordeling → Vastzetten'. Het eerder vastgelegde protocol staat hier:
https://docs.google.com/document/d/1FYM0_bVGtiohoD-5381M4-S2U6OrS-F7Nv3I_CvH_w0/edit

**Deze PR wijzigt geen bestaande TALERA-appcode.** Bij voorkeur eerst de PR en workflow inspecteren, daarna pas opnemen in `main` met uitdrukkelijke toestemming.
