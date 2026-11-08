# TALERA Free — schaalcode gebouwd voor maximaal 10 miljoen gebruikers

Datum: 8 november 2026. Status: nieuwe schaalcode plus lokale uitvoerings- en privacytests GESLAAGD, maar GEEN productie-uitrol en geen 10 miljoen echte gebruikers getest.

## Wat daadwerkelijk is gebouwd

Nieuwe afzonderlijke Free-Worker boven de ongewijzigde goedgekeurde TALERA account-/geboortedatum-Worker. Een automatische build haalt exact gelijkblijvende JavaScript en CSS uit twee volledig anonieme snapshots van de huidige TALERA-app. Alleen identieke codeblokken van minstens 12 KiB worden gedeeld, als gehashte/versienummer-gebaseerde bestanden via Cloudflare Workers Static Assets. Kleinere code blijft inline zodat een mobiel toestel niet onnodig veel losse requests krijgt.

Voor de drie volledige anonieme schermen zijn beide HTML-snapshots bovendien byte-identiek. Zij worden bij GET zonder cookie, zonder Authorization en zonder query voortaan via een versienummer-gebaseerde Cloudflare asset-shell afgehandeld zonder aanroep van de account-Worker, persoonlijke database of geboortedatumservice. Aangemelde bezoekers en API-aanvragen blijven naar de bestaande account-Worker gaan. Persoonlijke HTML krijgt altijd private/no-store. Geen privégegevens belanden in de gedeelde cache.

De volledige bestaande vertelcyclus, foto's, audio, video, presentatie, tijdlijn, accountdata en bestaande cloudresources zijn ongewijzigd. De build gebruikt slechts twee anonieme GET's per pagina tegen de werkende openbare TALERA-testkandidaat.

## Werkelijk gemeten met de lokale Cloudflare Worker-runtime

GitHub Actions: https://github.com/Marksmits1972/talera-lifeline/actions/runs/42493578810

| Scherm | Bestaande HTML | Nieuwe anonieme HTML | Besparing in ongecomprimeerde HTML | Externe gedeelde codebestanden |
| --- | ---: | ---: | ---: | ---: |
| Mijn leven | 585.945 bytes | 86.783 bytes | ongeveer 85% | 6 |
| Presentatie | 518.851 bytes | 175.712 bytes | ongeveer 66% | 10 |
| Vertellen | 398.415 bytes | 127.826 bytes | ongeveer 68% | 5 |

Er zijn 16 unieke immutable bestanden (11 JavaScript, 5 CSS). Alle 16 zijn succesvol door de echte lokaal gestarte Cloudflare Worker-serviceruntime geleverd en byte-voor-byte gecontroleerd. Alle 3 uitgelogde schermen reageerden met correcte HTML en zonder upstream accountdatabase. De 11 automatische tests op privacy, accountafscherming, toegestane scripts, cookies, Authorization, queryparameters en API-routing zijn geslaagd. De Cloudflare Wrangler dry-run voor de complete configuratie is geslaagd. Een kleine lokale 1/5/20-gelijktijdigheidsproef gaf geen fouten, maar is geen cloud-stresstest.

Dit zijn ongecomprimeerde bronbytebesparingen, NIET een gemeten mobiele laadtijd of een bewezen tienmiljoen-capaciteit. Een eerste mobiel bezoek moet de losse gedeelde assets nog downloaden; daarna kunnen die uit de cache komen.

## Nog belangrijke grenzen

1. De werkelijk aangemelde Free-gebruiker gebruikt mogelijk nog de bestaande account-/geboortedatum-Worker plus de afzonderlijke D1-database. Dat staat op gespannen voet met het uitgangspunt "Free is alleen code en lokale herinneringen". Dat deel is NIET opgelost door deze caching. Eerst expliciet vaststellen welke Free-accounts wel of geen cloudroute vereisen; bestaande account- of geboortedatumafspraken niet stilzwijgend wijzigen.
2. De bestaande PWA is nog niet met deze externe code op een echte iPhone/Safari in alle functiecombinaties getest. De standaardcode en servertransformaties zijn ongewijzigd, maar het uitvoeringsgedrag in echte browsers moet worden gevalideerd.
3. De stagingconfig wijst bewust naar niet-bestaande testservice en een dummy-D1. De nieuwe Free-Worker is nog NIET op echte Cloudflare-cloudservers uitgerold. Er is niets gewijzigd aan de werkende app.
4. Echte grootschalige cloudbelasting, piekopvang, CDN-hitratio, de p95/p99, kosten en foutpercentage zijn nog NIET gemeten. Tien miljoen gebruikers is een doel, geen claim.
5. Cloudflare Static Assets schaalt automatisch over de cloud en heeft onbeperkt/gratis statisch assetverkeer. Dynamische Worker-aanvragen vallen onder de Cloudflare Workers-abonnementsgrenzen. TALERA Free als product mag niet worden verward met Cloudflare Workers Free als abonnement.

## Resterende Free-afronding

Maak een compleet onafhankelijke Cloudflare-stagingbackend met eigen fictieve accountdata; publiceer deze schaalversie alleen daarop. Doorloop mobiele iPhone-tests, inclusief lokale herinneringen, foto's, audio, video, accountstatus en updates. Bepaal en verifieer het schaalpad voor ingelogde Free-gebruikers, die anders toch D1 kunnen belasten. Voer pas daarna gecontroleerde echte verkeerstrappen op staging uit, met vooraf afgesproken budget en zonder massale verzoeken naar de bestaande TALERA-PWA.

Werkpad: r20-dev/free-10m-delivery. Concept PR #93: https://github.com/Marksmits1972/talera-lifeline/pull/93 . Geen merge en geen live deploy zonder gebruikersgoedkeuring.

Cloudflare-docs: https://developers.cloudflare.com/workers/static-assets/ ; https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/ ; https://developers.cloudflare.com/workers/platform/limits/
