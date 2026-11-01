# TALERA V60 — Altijd terug naar Mijn TALERA

**Aanleiding:** iPhone-screenshot 1 november 2026 van ‘Mijn account’ toont alleen sluiten (×), zonder terugknop. De menucontroller verborg de knop zodra `state.history` leeg was. Dit treedt op bij `?talera_menu=account`, rechtstreeks openen vanuit de onderbalk, en na inloggen waarbij de geschiedenis wordt leeggemaakt.

## Besluit / acceptatie
- **Ieder submenu** (Mijn account, Mijn mensen, Door mij gedeeld, Met mij gedeeld, Berichten, Privacy, Instellingen, Opslag, etc.) toont linksboven een terugpijl.
- Bij normale navigatie gaat de pijl één stap terug; zonder eerdere menustap gaat hij naar het **hoofdmenu Mijn TALERA**, niet naar een lege toestand.
- In het hoofdmenu is de pijl verborgen; sluiten via het kruisje rechtsboven brengt de gebruiker terug naar de presentatie en menubalk.
- Directe link naar een submenu of openen vanuit de onderste navigatiebalk volgt exact dezelfde regel.
- V59-cache-isolatie, V58-opslagoverzicht en V57-deellinks moeten intact blijven.

## Technische scope
- Alleen patch van twee bestaande menu-instructies in `/__clean/menu-integration.mjs`:
  1. `back.hidden` gebaseerd op `state.view==='hub'` i.p.v. een lege navigatiehistorie.
  2. `backOne` valt bij lege historie vanuit een submenu terug naar `hub`.
- De bestaande X-knop, accountbackend, opslag en media krijgen geen wijziging.
- De patches van V57–V59 worden behouden; bij upstream-wijzigingen geen gedeeltelijke patch.

## Testvolgorde
1. Unit: direct geopend account, geneste menu's, direct berichten, afwijkende upstreambron, niet-menu-requests.
2. Staging mobiele viewport: account → terug → Mijn TALERA; Berichten → terug → Mijn TALERA; Privacy/Instellingen → terug; X → sluit.
3. Echte iPhone Safari acceptatie, inclusief terugpijl aanraken en presentatiebediening.

**Geen productiemerge zonder de eigenaaracceptatie.** V56 t/m V59 blijven intact en rechtstreeks bereikbaar.
