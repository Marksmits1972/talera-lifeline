# ISO-001 — projectisolatie: geverifieerde bevindingen en vrijgavevoorwaarden

Status: **GEBLOKKEERD / NIET VRIJGEGEVEN**. Peildatum: 29 oktober 2026.

## Bewijs uit uitsluitend leesacties
- GitHub-repositories voor TALERA, SWIMM en SWIMMPOINT zijn apart, maar dezelfde beheerdersverbinding heeft toegang tot meerdere projecten. Een repo-grens alleen vormt dus geen rechtenisolatie.
- Cloudflare gebruikt op dit moment één account voor de drie merken plus oudere XXORY-prototypes. R2 en D1 zijn afzonderlijk benoemd; accountbrede toegangsrechten en secret-scope zijn niet bewezen gescheiden.
- De TALERA LifeLine `wrangler.jsonc` bevat de binding `SHARE_PREVIEWS` naar `xxory-test-media-eu`. Dit is een daadwerkelijk gedeclareerde infrastructuurafhankelijkheid, geen bewijs van een datalek.
- CI-run 40859699084: ISO-R2-controle faalt terecht op die binding. Bestaande suite faalt tevens door ontbrekende `xxory-test/src/tv-player.js` en `xxory-test/src/unified-webapp.js`. ISO-D1-test en TALERA-Workernaamtest slagen.
- CI rood betekent geen samenvoeging of productie-implementatie.

## Veilige oplossing, nog niet uitgevoerd
1. Inventariseer alle TALERA Workers die de bestaande XXORY-opslag raadplegen; bepaal voor iedere binding de daadwerkelijke gegevenssoort en het doel. Verwijder, vervang of migreer niets op basis van alleen een naam.
2. Ontwerp indien nodig een TALERA-eigen mediabucket met eigen toegangsrechten; neem eerst een onafhankelijke back-up, test met synthetische gegevens, vergelijk checksums, verifieer privacy en draai een rollbackproef.
3. Beperk de AI-regisseur tot een expliciete allowlist van uitsluitend TALERA GitHub-repositories, Talera Cloudflare Workers en niet-productie-assets. Eis menselijke toestemming voor deploy, sleutels, databankmutaties en publicatie.
4. Laat gescheiden machine-identiteiten/credentials en hun werkelijke scopes door een beheerder aantonen. Binnen hetzelfde Cloudflare-account kan een accountbreed token alle projectgrenzen omzeilen.
5. Maak negatieve tests: een TALERA-regisseur moet elke SWIMM- of SWIMMPOINT-write weigeren, en vice versa. Test ook onverwachte resource IDs, gewijzigde branch, secrets, productiedeploy en indirecte CI-triggers.
6. Test de bestaande LifeLine-toepassing vóór en ná een eventuele geïsoleerde migratie. Behoud de originele media en oude Workers totdat eigenaar, QA en beheerder herstel en rechten accepteren.

## Stopregel
Geen automatische wijziging van Cloudflare-configuraties, buckets, databases, Workers, geheimen of live-branches tot de rechtenisolatie technisch bewezen is en eigenaarakkoord bestaat.

Verband: masterbouwplan B083, B091–B097, B100, B101, B115, TL-29.03, G05/G06. Bewijs: https://github.com/Marksmits1972/talera-lifeline/actions/runs/40859699084 en PR #58.
