# TALERA Free — accountopslag zonder gedeelde D1

8 november 2026. **Gebouwd en lokaal getest, NIET uitgerold.** Dit is de tweede concrete Free-schaalstap, bovenop de eerder gerealiseerde gedeelde app-code in PR #93. Het doel blijft 10.000.000 Free-gebruikers. Premium is geen onderdeel van deze wijziging.

## 1. Eenvoudige gegevensroute

Voor iedere accountgeboortedatum loopt het pad:
**bestaand geverifieerd account-ID → exact één eigen Cloudflare Durable Object → eigen duurzame opslag**.

Er is geen globale tussenlijst, geen account-naar-shardregister en geen centrale D1 voor de geboortedatum. De ID wordt rechtstreeks omgezet naar de bestendige DO-naam. Actieve accounts hebben ieder eigen opslag; honderdduizenden inactieve accounts hoeven niet actief in het geheugen te draaien. Dit gebruikt Cloudflare Durable Objects en is bedoeld om automatisch mee te schalen, maar de echte wereldwijde capaciteit en kosten moeten nog gemeten worden.

De TALERA Free-code en de geboortedatum-/tijdlijn-transformaties blijven functioneel gelijk. De originele officiële code is niet gewijzigd; er is alleen in deze geïsoleerde branch een afzonderlijke kopie van de Worker gemaakt, waarbij precies de twee geboortedatumdatabaseacties direct naar Durable Objects gaan.

## 2. Veiligheid en eigendom

- Alleen de bestaande accountservice mag bepalen welke account-ID geldig is; een queryparameter van de aanvrager mag geen accountselectie worden.
- Ieder accountobject kan uitsluitend zijn eigen gegevens zien en opslaan. Voor persoonlijke profielen blijven de bestaande sessie- en origincontrole actief.
- Een schrijfactie wordt pas bevestigd nadat de duurzame DO-opslag heeft geschreven.
- Bij onbereikbare accountopslag krijgt een aangemelde gebruiker voor accountgegevens of persoonlijke tijdlijn een expliciete 503; er wordt niet stilzwijgend een verkeerde demo-geboortedatum gebruikt.
- Er staat GEEN klantinformatie in deze GitHub-branch, de testbestanden of gedeelde CDN-assets. Alleen fictieve accounts.
- De oorspronkelijke geboortedatum-D1 en alle echte accounts zijn onaangetast. **Er is GEEN migratie uitgevoerd**.

## 3. Werkelijk uitgevoerde tests

**Geslaagde GitHub-run:** https://github.com/Marksmits1972/talera-lifeline/actions/runs/42503099259

- De Cloudflare Worker met DO-binding compileert werkelijk (dry-run, geen publicatie).
- De oorspronkelijke Free-schermen en gedeelde code blijven beschermd door de bestaande regressietests.
- 16/16 afzonderlijke Node-tests voor routing, privacy, DOB-validatie, no-store, sessies en fail-closed foutafhandeling geslaagd.
- 1.000.000 **fictieve accountnamen** door de router berekend, zonder opslag of netwerk; dit toont deterministische adressering, NIET een miljoen actieve gebruikers.
- 64 aparte fictieve accounts hebben in de **echte lokaal gestarte Cloudflare Workers-runtime** ieder een eigen DO-opslag gekregen. 64 schrijfacties en 195 leesverificaties voltooid.
- Zowel bij 1, 8 als 32 gelijktijdige lokale leessessies bleven de 64 accounts gescheiden en gegevens correct. Een client die een andere account-ID in de URL opgeeft krijgt niet diens geboortedatum.
- Geboortedatum van een testaccount blijft in dezelfde DO aanwezig **na werkelijk stoppen en herstarten** van de lokale Worker.
- Testregistratie, profielopvraag, gepersonaliseerde presentatie, geweigerde onbevoegde aanvraag, ongeldige datum en onjuiste herkomst zijn gecontroleerd.
- In lokale testconfig is de bestaande echte inlogservice vervangen door een uitdrukkelijk fictieve accountidentificatie. Geen Cloudflare productie-API of echte TALERA-accountdata is gebruikt.
- Een ontbrekende account-DO laat de privéprofielpagina's nu expliciet falen (503) in plaats van een persoonlijk tijdlijnanker stilzwijgend te vervangen.

## 4. NIET gereed / noodzakelijke vervolgstappen

**A. Bestaande accountauthenticatie.** Deze oplossing vervangt alléén de gedeelde D1 voor accountgeboortedata. Voor registratie, login en controle van de bestaande talera_sid-cookie wordt nog steeds de oorspronkelijke TALERA_BASE-service geraadpleegd. De capaciteit, globale database-indeling en limieten van die inlogservice zijn NIET bewezen. Dit blijft een mogelijk knelpunt voor 10 miljoen Free-gebruikers. Een volledig nieuwe auth-dienst wordt niet stilzwijgend geïntroduceerd; dat zou continuïteit, wachtwoorden en sessies in gevaar kunnen brengen.

**B. Migratie van mogelijk bestaande geboortedata.** De officiële kandidaat gebruikte een aparte D1. Voordat de nieuwe route ooit op echte accounts mag worden geactiveerd, moet eerst een read-only inventaris volgen. Daarna een beveiligde en controleerbare eenmalige migratie naar per-account DO inclusief ID-validatie, volledige datavergelijking en bescherming tegen gelijktijdige accountwijzigingen. Oude data blijven behouden totdat iedere overgedragen record is geverifieerd. Pas na expliciete acceptatie mag worden omgeschakeld. Rollback vereist dat nieuwe wijzigingen niet verloren gaan; een ongeteste terugschakeling naar de oude D1 is verboden.

**C. Cloudstaging en echte belastingsproef.** De nieuwe Worker is nog niet op Cloudflare gepubliceerd. Eerst een volledig afzonderlijke stagingomgeving met eigen test-DO-namespace, testaccounts, expliciete kostenlimiet en mobiele functionele controle. Daarna loadtests in stappen en evaluatie van requestfouten, p95/p99, loginverkeer, DO-kosten en privacy. Geen zware test op de bestaande TALERA-PWA.

**D. Identiteit en bereik.** Verifieer het echte formaat van account-ID's in de loginbackend voordat de strikte Durable Object-router voor echte accounts wordt ingeschakeld. Verifieer de exacte user flow en login/sessie afhandeling op echte devices met testaccounts.

**Eindoordeel:** per-account opslagroutes technisch gebouwd en lokaal gecontroleerd. De bestaande centrale geboortedatum-D1 is uit dit nieuwe opslagpad verdwenen, maar 10.000.000 echte Free-gebruikers zijn nog niet bewezen. De originele inlogbackend en migratie zijn afzonderlijke kritieke open punten. **Niet deployen of mergen.**

Bestanden: free-account-router.mjs, free-account-home.mjs, free-birthdate-worker.mjs, free-account-local-harness.mjs, free-account-local-test.mjs en testworkflow. Eerste Free-verdeelcode staat in PR #93; dit is de tweede fase in een aparte nieuwe draft PR.

Cloudflare Durable Objects documentatie: https://developers.cloudflare.com/durable-objects/ en https://developers.cloudflare.com/durable-objects/platform/limits/
