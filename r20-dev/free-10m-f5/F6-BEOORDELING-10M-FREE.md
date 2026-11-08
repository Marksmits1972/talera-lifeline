# TALERA Free — één definitieve 10M-architectuur- en kostenbeoordeling (8 november 2026)

## Wat betekent 10 miljoen Free?
**Doel:** tien miljoen geregistreerde, afzonderlijke Free-accounts, verspreid over de wereld, waarvan slechts een deel op elk moment actief is. **Niet:** tien miljoen gelijktijdige audio-/video-uploads, of tien miljoen gelijktijdige interacties op één sociale herinnering. De app heet Free voor de eindgebruiker; dat betekent niet dat Cloudflare-infrastructuur gratis is.

## Live bevestigd
- [Echte geïsoleerde EU F5-run 42513144276](https://github.com/Marksmits1972/talera-lifeline/actions/runs/42513144276) groen: 2 fictieve accounts, 1 verhaal-DO, 54 HTTP-verzoeken en 10 gelijktijdige accountreads; geen TALERA-productiebind.
- [Lokale F5-run 42513144239](https://github.com/Marksmits1972/talera-lifeline/actions/runs/42513144239) groen: sessies, geboortedatum, twee persoonlijke tijdlijnen, share/grant-revocation.
- Later ingebouwde accountgebonden IndexedDB-isolatie voorkomt dat twee gebruikers van hetzelfde iPhone-origin dezelfde Free-stories/files-store lezen. Originele fotobestanden, video/audio, de enkele presentatieplayer en cue-logica worden niet herschreven.
- Afzonderlijke F5-EU staging en originele PWA assets zijn aanwezig; de officiële app staat los.

## Schaalcontract
Cloudflare documentatie (gecontroleerd 8 november 2026):
- [Durable Objects-limieten](https://developers.cloudflare.com/durable-objects/platform/limits/): onbeperkt aantal individuele objecten per namespace op Workers Paid; één afzonderlijk object heeft een zachte grens van ~1.000 verzoeken per seconde. Bij een virale herinnering is **één sociaal story-object een reëel hotspotrisico**.
- [Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/): echte statische assetverzoeken gratis/onbeperkt, maar dynamische Worker-verzoeken vallen onder de Worker-billing; dit geldt ook voor de afgesloten QA-gate als die de Worker aanroept. QA is geen productiearchitectuur.
- [Workers-prijzen](https://developers.cloudflare.com/workers/platform/pricing/): op Workers Paid 10 miljoen dynamische Worker-verzoeken/maand inbegrepen en $0,30 per extra miljoen. Daarboven komt eventuele CPU-tijd.
- [Durable Objects-prijzen](https://developers.cloudflare.com/durable-objects/platform/pricing/): 1 miljoen DO RPC-verzoeken/maand inbegrepen, daarna $0,15 per extra miljoen, exclusief eventuele actief-gehouden duur en SQLite-row/storageverbruik.

**Request-only illustratie**, uitsluitend bij 10 miljoen geregistreerde accounts en de genoemde verzoekaannames per maand; zonder CPU, DO-duur, accountopslag, foutretries en abonnement:
| Scenario | Dynamische Worker-verzoeken | Aangenomen DO-verzoeken (2 per Worker-aanroep) | Worker meergebruik/maand | DO-request meergebruik/maand |
| --- | ---: | ---: | ---: | ---: |
| Gemiddeld 2 acties/account/maand | 20 miljoen | 40 miljoen | $3,00 | $5,85 |
| Gemiddeld 10 acties/account/maand | 100 miljoen | 200 miljoen | $27,00 | $29,85 |
| Gemiddeld 100 acties/account/maand | 1 miljard | 2 miljard | $297,00 | $299,85 |

**Belangrijk:** dit is nadrukkelijk geen complete of betrouwbare Cloudflare-maandfactuur. DO-duur, PBKDF2 CPU, opslaggroei, aantal daadwerkelijke sessie-/accountcalls en betaalplan kunnen de werkelijke kosten substantieel veranderen. In het bijzonder: één externe pageview is niet automatisch één DO-aanroep. Monitor werkelijke statistieken na uitrol.

## Laatste acceptatieregel — daarna stoppen
1. **F5 lokaal + echte EU — GESLAAGD**: nul foutieve accountoversteken, nul ongewenste fallbacks naar bestaande media/API, login/sessies/tijdlijnen/social/revoke groen. Bewijs: [42516137777](https://github.com/Marksmits1972/talera-lifeline/actions/runs/42516137777).
2. **Browsermediatest GESLAAGD op echte EU F5-stage in Chromium met iPhone-schermprofiel**: fictieve foto/video/audio, drie narratiecues, lokale save/reload, presentatie en accountwissel. **Nog open:** echte iPhone/Safari-camera, microfoon, swipes en originele player als handmatige acceptatie. Linux-WebKit zelf kon zelfs zonder TALERA-code geen Blob of File naar IndexedDB schrijven; dit testplatform is hier ongeldig als iPhone-bewijs.
3. **F6 verdeling en kosten**: Workers Paid en DO-limieten voldoen voor 10 miljoen `geregistreerde` accounts, mits echte belasting verspreid is; verifieer bij geleidelijke uitrol de werkelijke CPU, DO-duur en hotspotmonitoring.
4. **Pas na expliciete goedkeuring**, een gecontroleerde overschakeling. Een migratie van bestaande accounts of lokale media kan niet stilzwijgend gebeuren, omdat IndexedDB aan de web-origin is gebonden.

Dan status **Free gereed voor gecontroleerde uitrol**, niet “letterlijk tien miljoen gelijktijdige gebruikers bewezen”. Is een harde poort rood, **alleen die poort** herstellen en herhalen. Geen nieuwe zijprojecten. Premium pas daarna.

## Definitieve technische status 8 november 2026

**Integratiecode + cloudcontrole + mobiele browsermediastroom: GROEN.** Getest en vastgelegd in run [42516137777](https://github.com/Marksmits1972/talera-lifeline/actions/runs/42516137777). Werkelijke 10 miljoen gelijktijdige gebruikers niet gemeten; Workers Paid + onbeperkt aantal per-account Durable Objects maakt **10 miljoen geregistreerde accounts structureel passend**, met observatie op DO-hotspots, CPU en kosten bij gefaseerde uitrol.

**Enige fysieke acceptatie die niet door deze tooling kan worden uitgevoerd:** microfoon, camera en swipe/media/tijdlijn-presentatie in de daadwerkelijke iPhone/Safari-TALERA-PWA. Daarna het omschakelbesluit. Geen onnodige tests rond al groene onderdelen.
