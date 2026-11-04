# TALERA R20 V4 — bestaande bewerkpagina, verwijderknop

**Nieuwe testlink:** https://talera-v61-r20-native-bewerken-v4-20261104.mark-a39.workers.dev/present

**Nieuwe aparte Worker:** `talera-v61-r20-native-bewerken-v4-20261104`

**Cloudflare-versie:** `dfd5adc0-27ce-4cb2-9e84-b08afb28dfc9`

**GitHub branch:** `dev/r20-native-bewerken-v4-20261104`

## Wijziging

- Het vaste potloodje koppelt aan de actuele herinnerings-ID.
- Persoonlijk opgeslagen lokale herinneringen openen rechtstreeks via `/tell?edit=<storyId>` in de **bestaande PWA-editor**.
- Ingebouwde codevoorbeelden openen dezelfde `/tell`-editor via `/tell?editDemo=<id>`, met het oorspronkelijke testnummer als bron. De codevoorbeelden zelf zijn geen persoonlijke opslagrecords.
- De knop **Herinnering volledig verwijderen** staat **direct onder de bestaande foto/videovakken** in het native `/tell`-werkblad, bij demo's, eigen opgeslagen herinneringen en concepten.
- Bij concepten/demovoorbeelden gebruikt de knop de bestaande `taleraV7AskDelete`-bevestigingsfunctie. Voorbeelden worden na verwijderen alleen lokaal verborgen uit de ontwikkeltijdlijn. 
- Bij eigen gepubliceerde lokale herinneringen wordt na een aparte bevestiging de bestaande `TaleraMemories.remove(id)`-functie gebruikt. Deze verwijdert de herinnering en uitsluitend niet elders gebruikte mediabestanden.
- De V2 zelfgebouwde editor is NIET aanwezig in V4. Er is geen nieuwe pagina/extra edit-UI-laag; de bestaande `workView()`-pagina blijft intact.
- Geen wijzigingen aan foto- of presentatiecode/blur, vertel-tijdcodes, Free/Premium of data-opslagformaten.

## Veiligheid / resultaten

- V4 staat op een **eigen workers.dev-subdomein**, niet op bestaande links.
- Goedkeurde R20-versie `1f65e254-3bc7-418a-8015-236fe5e5d441` bleef ongewijzigd.
- Vertrouwde staging `dc7c5565-065c-4942-92fe-a71f6e465597` bleef ongewijzigd.
- V3 `8062f270-80aa-44b0-90d8-5686e2aef840` bleef ongewijzigd.
- Cloudflare broncode gelezen na upload en **exact** geverifieerd; native patch is programmatisch getest tegen V56-decoded `/tell`-HTML. **Op een iPhone nog niet end-to-end getest**.
- Nieuwe herkomst (subdomein) heeft een aparte IndexedDB. Persoonlijke foto’s op andere links verschijnen daar niet automatisch; pas bij testen met echte herinneringen eerst back-up maken.

**Opmerking:** de verwijderknop is een functionele uitbreiding in het *bestaande* werkblad en gebruikt geen los beheerpagina-prototype.
