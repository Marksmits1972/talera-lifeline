# TALERA V61 — Opslag en back-up onder Instellingen

**Aanleiding:** gebruikersfeedback dat 'Opslag en herinneringen' in het hoofdmenu te veel lijkt op 'Door mij gedeeld' en 'Met mij gedeeld'.

## Ontwerpbesluit
- **Mijn TALERA**: 'Mijn mensen', 'Door mij gedeeld', 'Met mij gedeeld' blijven zichtbaar en los van technische opslag.
- De technische opslagfunctie verdwijnt uit het hoofdmenu **én** uit 'Mijn account'.
- Eén logische plek: **Mijn TALERA → Instellingen → Opslag en back-up**.
- In dat scherm blijft de bestaande **read-only** controle van lokale en accountgebonden aantallen werken, met de bestaande knop 'Opnieuw controleren'.
- Er bestaat **nog geen werkende back-up of herstel**. De tekst zegt dit nadrukkelijk; geen nepknop of impliciete toezegging dat foto's veilig in de cloud staan.
- Voor oudere directe URL's blijft `/present?talera_menu=storage` werken.
- Via de terugpijl kom je vanuit de opslagcontrole weer bij **Instellingen**, daarna bij **Mijn TALERA**. × sluit de menulaag.
- Geen persoonlijke records, opslagmedia, accounts, databasebindingen of andere menu-onderdelen wijzigen.

## Technische aanpak
Een atomair gepatchte wijziging boven op V60, die op V56 via servicebinding blijft werken. Oude V56–V60-URLs intact. Aparte Worker `talera-pwa-v61-opslag-onder-instellingen-20261101`.

## Test- en acceptatievoorwaarden
1. Het hoofdmenu toont **geen** 'Opslag en herinneringen' en heeft nog steeds de drie sociale keuzes.
2. 'Mijn account' heeft geen dubbel opslagonderdeel.
3. Instellingen bevat één ingang 'Opslag en back-up'; teller in het geopende scherm werkt.
4. Achtereenvolgens: Mijn TALERA → Instellingen → Opslag en back-up → Instellingen → Mijn TALERA, en × sluit.
5. Ook bij direct binnenkomen in de opslagweergave verschijnt een terugpijl, met veilige fallback naar het hoofdmenu.
6. Free-presentatie zonder gedwongen inloggen; delen, berichten en V59-accountisolatie blijven behouden.
7. GitHub-regressies; historische CI-breuk door twee oude ontbrekende bestanden blijft apart geregistreerd als issue #61.
8. Definitieve iPhone/Safari-acceptatie door gebruiker voordat de nieuwe versie als productievast wordt beschouwd.

**Status**: nieuwe UI-staging, read-only, geen gegevensmigratie.

## Verificatie 1 november 2026
- Cloudflare V61-testworker gepubliceerd op https://talera-pwa-v61-opslag-onder-instellingen-20261101.mark-a39.workers.dev/present
- Mobiele browsertest (390×844): hoofdmenu bevat **geen** opslagitem en toont de drie sociale opties. ‘Mijn account’ bevat **geen** tweede opslagitem.
- Instellingen toont exact één optie ‘Opslag en back-up’, met de verduidelijking ‘Bekijk opslag; back-up volgt’.
- Route `hub → settings → storage → settings → hub → gesloten` geslaagd na echte menuklikken (browserautomatisering).
- Rechtstreeks naar `?talera_menu=storage` opent dezelfde teller en vermeldt expliciet dat reservekopie en herstel nog ontbreken.
- Bestaande anonieme routes `/gedeeld` en `/meldingen` bleven bereikbaar en vereisten aanmelden; er is geen testaccount aangemaakt, geen upload en geen gegevensmigratie gedaan.
- V56–V60 blijven beschikbaar op hun ongewijzigde URL’s. Echte iPhone-acceptatie en twee-account-deeltest zijn nog open.

## Regressie en dataveiligheid — 1 november 2026
- GitHub Actions [run 41285306567](https://github.com/Marksmits1972/talera-lifeline/actions/runs/41285306567): **160 tests geslaagd, 2 gefaald**.
- Alle specifieke V61-tests (één opslagingang onder Instellingen, geen duplicaat, veilige terugnavigatie, atomaire bronpatch en ongewijzigde API-verzoeken) zijn geslaagd.
- De twee falende regressietests zijn bestaande controles die verwijzen naar ontbrekende oudere bestanden `xxory-test/src/tv-player.js` en `xxory-test/src/unified-webapp.js`; vastgelegd als [issue #61](https://github.com/Marksmits1972/talera-lifeline/issues/61).
- Controle van Cloudflare-deployments: V56 (id `21b44d0d-143b-4eb3-bb01-0cb4b9ea2969`) en V60 (id `8289899c-537d-421c-a767-e50ef741e548`) ongewijzigd. Nieuwe V61 heeft uitsluitend `V56_BASE`; geen eigen D1/R2.
- Bestaande Clean Core-recordaantallen na controle onveranderd: 4 accounts, 12 herinneringen, 23 berichten, 10 shares, 4 directe grants, 5 lokale koppelingen. Geen databasebewerkingen gedaan.
- Eerste vervolgpoort: daarna met twee vrijwillig aangemaakte testaccounts de complete deelketen, toegangsherroeping en zichtbaarheid van reacties/hartjes op twee toestellen testen. Dit is **nog geen bewezen werkende eindtest**.

**Release-status:** afzonderlijke V61-staging, iPhone-acceptatie van de gebruiker nog nodig.
