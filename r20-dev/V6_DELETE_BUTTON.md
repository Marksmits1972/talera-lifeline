# TALERA V6 — Knop 'Herinnering verwijderen' in de bestaande bewerkpagina

**Aparte testlink:** https://talera-v61-r20-verwijderknop-v6-20261104.mark-a39.workers.dev/tell

**Cloudflare Worker:** `talera-v61-r20-verwijderknop-v6-20261104`  
**Nieuwe versie:** `3bf8cdc6-065c-419a-ade3-33dd97fd9dcf`  
**Eigen GitHub-branch:** `dev/r20-verwijderknop-v6-20261104`

## Wijziging

- V6 gebruikt een **servicebinding naar de volledig werkende V5** `talera-v61-r20-rechtstreeks-bewerken-v5-20261104`.
- Iedere gewone pagina wordt exact zoals in V5 getoond.
- Alleen bij `GET /tell?edit=local-...` worden een klein script en wat CSS toegevoegd. De bestaande editorcode blijft volledig intact.
- De knop **Verwijderen** komt helemaal rechts op dezelfde regel als **+ Kenmerk toevoegen**, alleen indien de lokale geheugenopslag `TaleraMemories.get(id)` bevestigt dat de huidige ID een persoonlijke gepubliceerde herinnering is (`source='pwa-local'`).
- De knop opent een compacte bevestigingspopup met **Annuleren** en **Definitief verwijderen**.
- Bij bevestiging vraagt de knop nogmaals dezelfde opgeslagen ID op en gebruikt de **bestaande** `TaleraMemories.remove(id)`; die functie verwijdert het verhaalrecord en uitsluitend mediabestanden die niet door andere herinneringen gedeeld worden.
- Daarna volgt navigatie naar `/mijn-leven`, zodat het verhaal niet meer in de normale tijdlijnlijst staat.
- De knop verschijnt niet bij concepten, andere gebruikers, demo-ID's of de gewone 'nieuw maken'-editor.
- Er is geen tweede bewerkscherm en er is geen nieuwe opslagdatabase of media-engine.

## Grenzen en tests

- V5 en goedgekeurd R20 bleven op hun oude versienummers: `01268c39-a298-40e5-b03e-345d718e3b7c` en `1f65e254-3bc7-418a-8015-236fe5e5d441`.
- Cloudflare heeft de volledige nieuwe broncode exact teruggegeven en de Workers-subdomeinpublicatie bevestigd.
- Browser/end-to-end iPhone-gedrag moet nog door gebruiker worden getest. HTTP-check buiten Cloudflare kon DNS van workers.dev in de gereedschapscontainer niet oplossen.
- **De editor kan nog een afzonderlijk werkconcept bewaren in zijn eigen draftsysteem.** De huidige knop verwijdert het gepubliceerde record en bijbehorende niet-hergebruikte media; het conceptbeheer wordt in deze beperkte versie niet aangepast om opnieuw de werkende editor te riskeren.
- Nieuwe Cloudflare Workers-links gebruiken per subdomein **eigen lokale browseropslag**. Voor testen van verwijderen moet eerst op deze V6-link een persoonlijke herinnering zijn aangemaakt. Maak vóór destructieve tests een lokale back-up.
