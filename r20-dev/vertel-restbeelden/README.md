# TALERA V10 — Teruggedraaid na melding beschadigde vertelmodus

**Herstel uitgevoerd:** 5 november 2026, 12:01 (Europe/Amsterdam).

De gebruiker meldde dat de teller/vertelmodus na de vereenvoudiging beschadigd was. Daarom is de laatste vereenvoudigde V10-aanpassing direct teruggedraaid.

## Waarnaar teruggezet?

- Afzonderlijke V10-test-Worker: `talera-vertel-restbeelden-v10-test-20261105`
- Herstelde eerdere Worker-versie: `8b6a2a29-4487-4fe7-8ecc-f63464321331`
- Nieuw rollback-deployment: `700f71d5-83f9-4b9f-92c4-8d3f03180249` (100% verkeer)
- Laatste vereenvoudigde testversie `21db9955-a8f2-40d3-915d-21d0ed0372b2` is **niet meer actief**.
- GitHub-bestanden `vertel-restbeelden.worker.mjs`, `vertel-restbeelden.test.mjs` en `smoke-live.mjs` zijn teruggezet naar de toestand vóór de vereenvoudiging (`8de18fab06d85fa96407376b5449afa6ba8abe2c`).
- Beschermde V9 blijft `683c6aaf-8dd0-42de-b6e4-f3bd80d7de06`.
- Goedgekeurde stijlstaging blijft `bc36d913-49f8-4f4d-b00d-3d5894a11146`.

## Functioneel uitgangspunt

Deze rollback herstelt de **voorafgaande testcode**: de gebruiker gaf daarbij aan dat de bestaande vertelcyclus inclusief de videofunctie met oorspronkelijk geluid werkte, maar dat de resterende onbesproken foto's nog niet automatisch verschenen. Dat laatste probleem is dus **niet opgelost**. Er wordt niet opnieuw aan de vertelmodus gebouwd zonder een nieuwe opdracht.

**Testadres:** https://talera-vertel-restbeelden-v10-test-20261105.mark-a39.workers.dev/

Bewaar de bestaande herinneringen en verwijder de geïnstalleerde app niet. Het aparte testadres heeft eigen lokale opslag.
