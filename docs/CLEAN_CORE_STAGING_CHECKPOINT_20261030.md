# TALERA clean rebuild – checkpoint 2026-10-30

**Bron:** `fix/clean-social-whatsapp-20261030` in talera-lifeline.

## Vastgesteld uitgangspunt
De eigenaar heeft expliciet bevestigd dat alle huidige accounts, herinneringen, berichten en reacties testgegevens zijn en dat een schone start is toegestaan, mits de softwarestructuur en goedgekeurde presentatie intact blijven. Oude gegevens zijn niet vereist als migratiebron. Er is echter nog niets uit de bestaande CORE verwijderd; dit blijft een aparte veilige staging-omgeving.

## Uitgevoerd
- Nieuwe schone EU-D1 `talera-clean-core-staging-20261030` (id `2dc891f9-a2ae-48cd-887d-119519a652c5`) aangemaakt met accounts, sessions, memories, comments, likes, shares, messages, auth_attempts en indexen.
- Nieuwe Worker `talera-clean-core-staging-20261030` succesvol gepubliceerd met TALERA-only routes voor registratie, login, account, herinneringen, berichten, hartjes, reacties, delen, intrekken en publieke lezer van één verhaal.
- Share tokens zijn willekeurig, niet afleidbaar uit account- en herinnerings-ID, als SHA-256-hash opgeslagen; toegang is beperkt in tijd, intrekbaar en accountvrij voor de ontvanger.
- Origincheck bij writes, HttpOnly/Secure/SameSite-sessiecookies, per-IP registratie-/loginlimiet, eigenaccountfiltering voor herinneringen en opmerkingen.
- Test met Cloudflare Browser Rendering: `/__health` antwoordt `ready:true`; niet-aangemelde `/api/me` weigert toegang; willekeurige ongeldige gasttoken geeft geen verhaal.
- Eerste volledige E2E-test vond een fout: PBKDF2 220.000 iteraties niet ondersteund door Cloudflare Workers (maximum 100.000). Hersteld tot 100.000 iteraties. Diagnosecode verwijderd en Worker opnieuw gepubliceerd.

## Nog expliciet NIET klaar
- Herhaalde geautomatiseerde registratie/E2E-test met de gerepareerde Worker werd door de gekoppelde toolveiligheidscontrole geblokkeerd; daarom niet bewezen dat registratie, sessie en gastlink als volledige keten werken.
- De V51-presentatie gebruikt nog niet de nieuwe clean-core Worker. Aanmelden en sociale acties moeten nog veilig op dezelfde TALERA-origin geïntegreerd worden.
- Er zijn nog geen media-, audio- of videoassets in de schone kern; WhatsApp-fotovoorvertoning ontbreekt nog.
- Nieuwe registratie heeft nog geen e-mailverificatie en moet voor productie strenger worden beoordeeld; geen productie-uitrol of claim van volledige veiligheid.
- Verder nodig: idempotente deelcreatie, mediarechten, uitnodigingspreview, volledig servergebonden berichtenbox, tests voor verschillende accounts en rollen, echte iPhone-WhatsApp-test.

**Beslisregel:** geen oude software of gegevens wissen, geen V51 vervangen en geen definitieve TALERA-link vrijgeven tot de nieuwe account/guest-link E2E-acceptatie groen is.