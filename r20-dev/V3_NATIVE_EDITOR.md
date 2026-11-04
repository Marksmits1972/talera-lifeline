# TALERA V3 — direct naar de bestaande PWA-editor

- **Nieuwe test-Worker:** `talera-v61-r20-native-bewerken-v3-20261104`
- **Nieuwe URL:** `https://talera-v61-r20-native-bewerken-v3-20261104.mark-a39.workers.dev/present`
- **Deployed version:** `8062f270-80aa-44b0-90d8-5686e2aef840`
- **Basis (read-only service binding):** `talera-pwa-v61-r20-goedgekeurd-herstelpunt-20261104`
- **Vertrouwde oude ontwikkel-Worker:** `talera-pwa-v61-kleine-kruisjes-staging-20261104` — ongewijzigd
- **Beschermd herstelpunt:** `talera-pwa-v61-r20-goedgekeurd-herstelpunt-20261104` — ongewijzigd

## Slechts een koppeling

Het vaste potloodje vraagt bij aanraking de actieve herinnerings-ID op. Bij persoonlijke herinneringen verwijst het direct naar `/tell?edit=<id>`. Bij ingebouwde voorbeeldherinneringen verwijst het naar `/tell?editDemo=<id>` en maakt de bestaande native `/tell`-editor in diezelfde bestaande werkblad-layout een tijdelijk bewerkconcept met datum, titel en tekst. De V2-maatwerkeditor is niet opgenomen in deze Worker.

Voorbeeld-ID's zijn code-data, geen persoonlijk opslagrecord: bestaande foto's uit de demo worden niet gekopieerd. Toegevoegde eigen foto's/video's worden bij publiceren opgeslagen als een nieuw persoonlijk lokaal record. De native bestaande verwijderbevestiging verbergt het gekozen codevoorbeeld in de ontwikkeltijdlijn via de lokale voorkeur `talera-dev-hidden-examples-r20-v1`; de vaste broncode blijft beschikbaar.

De bestaande mediaopslag, presentatiebeelden, blur, vertelsynchronisatie en Free/Premium-onderdelen zijn niet aangepast.

**Teststatus:** Cloudflare upload en broncode-readback gecontroleerd. De iPhone-gebruikersroute is nog niet live getest. De nieuwe URL heeft eigen browseropslag en deelt geen IndexedDB met de oude ontwikkellink. Doe geen destructieve tests met echte herinneringen zonder back-up.
