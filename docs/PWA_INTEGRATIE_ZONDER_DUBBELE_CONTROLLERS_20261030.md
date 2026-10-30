# TALERA — Integratiecontract zonder dubbele code (30 oktober 2026)

## Besluit
De gebruiker bevestigt dat de functioneel geteste kern voor accounts, hartjes, reacties, berichten en accountdelen moet worden geïntegreerd in de oorspronkelijk goedgekeurde TALERA-PWA. Geen tweede PWA-vormgeving, geen herbouw van goedgekeurde foto- en presentatieschermen, geen dubbele controllers.

## Gecontroleerd
- Cloudflare staging-Worker `talera-pwa-v51-clean-social-integration-20261030`: bundel van circa 2,23 MB, gebruikt goedgekeurde bestaande PWA als onderlaag via `taleraV46Worker`.
- De V51-staging onderdrukt `talera-share-experience-controller`, `talera-v12-react-controller`, share-align en presentatielabel op `/present`.
- V51 heeft al `/__clean/ui-integration.mjs` met één compacte sociale balk, reacties en deelformulier, maar `socialAdapter.commit` en `shareAdapter.publish/createInvite` staan nog op expliciete niet-gereed-fouten.
- De gescheiden `talera-clean-core-staging-20261030` heeft geteste TALERA-accounts, sessies, eigenaar- en ontvangergebonden herinneringen, hartjes, gesprekken, meldingen, zoeken en delen met toestemming.
- CORE-testdata hoeft niet gemigreerd te worden; de goedgekeurde presentatie, mediaregels en navigatie wel behouden.

## Exacte vervanging, geen extra laag
1. V51 `socialAdapter` aansluiten op één same-origin API van TALERA-kern (autorisatie per account + memoryId).
2. V51 `shareAdapter` aansluiten op dezelfde identiteit en de afgesproken tijdelijke gastlinkroute; intern delen via dezelfde unieke account-ID; niet twee aparte deelvensters tonen.
3. Het bestaande TALERA-accountscherm in PWA-instellingen gebruiken voor registreren, aanmelden, zoeken en vindbaarheid. Het losse /test-formulier niet in de productie-PWA opnemen.
4. In bestaand PWA-berichtenpaneel conversaties op memoryId groeperen, reageren, hartjes en ongelezen teller uit dezelfde database ophalen. Geen oude test-/democounters gebruiken.
5. De bestaande presentatieschermen, foto-overgangen, gebaren, muziek-/video-modus en compacte bediening ongemoeid laten.
6. Oudere controllers pas uitschakelen als de nieuwe centrale controller aan de juiste runtime is gekoppeld. Nooit twee actieve listeners voor dezelfde actie.
7. Accountvalidatie is TALERA-eigen; Cloudflare Access mag geen aanmeldscherm aan klanten tonen. Account-ID mag niet als publiek autorisatiebewijs dienen.

## Veilig integratiepad
- Nieuwe afzonderlijke staging-Worker, niet live V50/V51 overschrijven.
- TALERA-accountservice als service binding of interne same-origin API; géén kopie van de complete accountdatabase of dubbele auth-worker.
- Per stap controleren: app opent, bestaande presentatie blijft intact, onderliggend memoryId correct, UI bevat één sociale balk en één sharecomponent.
- Daarna end-to-end: account A deelt met B, B ziet exact één herinnering, reageert, A krijgt bericht; hartje en gesprek; 7 dagen sessie; privacy zoeken met unieke @naam; tijdelijke WhatsApp-link; verwijderen/intrekken.
- Pas na goedgekeurde browser-/iPhone-test migreren. Data in huidige testdatabase niet ongevraagd wissen.

## Momenteel nog open
De V51-moduleadapters zijn nog NIET gekoppeld aan de clean-core API, en daarom is dit document géén claim dat de oorspronkelijke PWA de nieuwe kern reeds gebruikt.
