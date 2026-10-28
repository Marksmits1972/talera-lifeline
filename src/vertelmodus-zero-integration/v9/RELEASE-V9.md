# TALERA V9 — Kenmerken en kleine verbeteringen

**Status 28 oktober 2026:** aparte Cloudflare-testkandidaat **gebouwd**; automatische browsertests uitgevoerd; **nog niet op iPhone getest of goedgekeurd**.

## Links, versies en rollback
- Test: https://talera-pwa-persoonlijke-kenmerken-v9-test.mark-a39.workers.dev/
- Direct herinnering maken: https://talera-pwa-persoonlijke-kenmerken-v9-test.mark-a39.workers.dev/tell
- Menu: via **Meer** in de onderste navigatie, verwijst naar dezelfde bestaande menupagina /present?talera_menu=hub; vanuit het menu: **Instellingen → Mijn kenmerken**.
- Cloudflare Worker: `talera-pwa-persoonlijke-kenmerken-v9-test`, deployment `ed05616d-2734-4244-9332-26f48ef65744`, version `902395f6-60d9-4681-8ed2-707012ab57c2`.
- Onaangeroerde V8-basis en rollback: `talera-pwa-presentatie-herstel-v8-test`, deployment `420dda3a-4739-419c-b7d1-22541f01ffa3`, version `f9c43741-fbce-4741-bf85-d19c90140918`.
- GitHub: branch `feature/v9-kenmerken-instellingen-vertelpolish-20261028`, voortbouwend op `feature/v8-presentatie-keten-herstel-20261028`.
- De historische volledige integrated Cloudflare Worker is nog **niet** reproduceerbaar uit de GitHub-branch alleen. In v9/ staan de belangrijke bronfragmenten en dit releaserecord; V9 is uit de live V8 multipart-worker gekopieerd en daarna patchgewijs apart geüpload. NIET mergen/promoveren zonder gebruikersacceptatie.

## 25 voorgestelde kenmerken en standaard 12 favorieten
Totale lijst:
1. Familie
2. Vrienden
3. Vakantie
4. Jeugd
5. Baby
6. Basisschool
7. Middelbare school
8. Werk
9. Liefde
10. Kinderen
11. Verjaardag
12. Reizen
13. Studie
14. Sport
15. Hobby
16. Feest
17. Bruiloft
18. Wonen
19. Verhuizen
20. Huisdieren
21. Natuur
22. Gezondheid
23. Grootouders
24. Bijzondere momenten
25. Mijlpalen

De eerste twaalf staan standaard aangevinkt; iedere gebruiker kan aanvinken/uitvinken en eigen kenmerken toevoegen via het **bestaande** Meer → Instellingen → Mijn kenmerken. Dit is dezelfde existing TALERA-share/menu-component, geen tweede instellingenimplementatie. Het nieuwe *Meer*-item in de onderste hoofdnavigatie opent via het bestaande presentatiemenu, en sluit naar de hoofdpagina.

De bewerkpagina `+ Kenmerk toevoegen` biedt de gekozen favorieten en onderaan **zelf toevoegen**. Tags aan de huidige herinnering zijn selecteerbaar en met × te verwijderen. Nieuwe eigen tags worden ook favoriet. Tags in oude herinneringen worden **niet** gewist als ze niet langer favoriet zijn. De bestaande tags-store, manifest en publicatieschema's blijven leidend. Voorkeuren worden **lokaal** bewaard onder `talera-kenmerken-voorkeuren-v1` en nieuwe tags in de bestaande `talera-kenmerken-catalog-v1`. Nog geen accountcloudsynchronisatie. Elke workers.dev-origin heeft zijn eigen localStorage/IndexedDB.

## Kleine afgesproken verbeteringen
- **Schrijven:** synchrone `focus()` bij het openen, binnen het oorspronkelijke tap-event (iOS user activation) in plaats van uitsluitend na twee animatieframes. iPhone-toetsenbord moet nog op een echte iPhone bevestigd worden. Pop-up met foto's blijft hetzelfde.
- **Vertellen met foto's/video's:** licht crèmekleurige achtergrond `#f8f7f4` voor body, canvas, foto- en videoranden. Geen groen. Zelfde rustige bestaande knoppen.
- **Opnieuw:** opname gepauzeerd, reeds gespeelde video/beeld opgeborgen, foto-index terug naar nul, oorspronkelijke beeldvolgorde, tijdstempels en opnameduur weer op nul. Nieuwe recorder start altijd bij de eerste foto. Oud conceptgeluid blijft door de oudercomponent beschermd totdat de nieuwe opname + manifest-synchronisatie succesvol zijn opgeslagen. De actie heeft toegankelijke naam 'Opnieuw inspreken'.
- **Geluidsgolf bij terugluisteren:** bij opname zonder beelden wordt op intervallen van minimaal 80 ms de daadwerkelijke microfoonamplitude gemeten. Bij terugluisteren wordt deze gemeten envelop op basis van de audio-klok teruggetekend. De sampledata wordt in het **conceptmanifest** mee bewaard, na sluiten en heropenen weer geladen en bij opslagfalen teruggezet naar de vorige waarde. Geen extra audio-decoder of verbinding met luidspreker. De eerdere opname-/cuelogica blijft intact. Bestaande opnames zonder V9-amplitudegegevens krijgen hiermee niet achteraf een nauwkeurige golf.

## Uitgevoerde automatische mobiele Chromium-tests (390 × 844)
- /, /mijn-leven, /tell, /present en embedded-record-mode geven HTML zonder serverfouten. Onderste menu heeft één `Meer`-item; /present?talera_menu=hub opent het bestaande menu.
- Klik Meer → Instellingen → Mijn kenmerken: **precies 25** standaardkeuzes; **12** vooraf aangevinkt.
- Afvinken `Basisschool` bewaart de keuze in de juiste localStorage-sleutel. Eigen kenmerk `Mijn eerste motor` verschijnt met correcte spelling en is automatisch aangevinkt. De aanvankelijke codefout waardoor s's uit kenmerknamen wegvielen is hersteld en opnieuw getest.
- Bij `/tell` met opzettelijk beperkte voorkeuren (Familie + Mijn eerste motor) staan **alleen die twee** in de keuzelijst; zelfgemaakt kenmerk kan worden geselecteerd. Schrijf-pop-up opent met de focus op `taleraWriterText`, viewporthoogte 844px.
- Reset-beproeving in ingesloten verteller: handmatig beeld 3/3 → Opnieuw → beeld 1/3, fase `idle`, cues `Nog geen opname`, vorige voice blijft beschikbaar voor herstel.
- Geïsoleerde parent/iframe-SAVE-proef met een synthetische WAV Blob en waveform-data: ouder schrijft 'Opname bewaard'; na sluiten en opnieuw openen is de stem aanwezig en wordt opname opnieuw als `ready` geladen. **Dit bewijst niet dat een fysieke iPhone-microfoon ook bij heropening de golf daadwerkelijk laat bewegen**.
- Regressie op originele videoronde (gesimuleerd): video–foto–foto–foto–video met voice-einde toont video index 0 gevolgd door index 4, beide `muted=false`.
- Niets is op de echte gebruikers-iPhone uitgevoerd; bedoelde toegankelijkheid en echt geluid/microfoonbeweging vergen iPhone-acceptatie.

## Verplichte iPhone-test voor goedkeuring
1. Controleer of Meer op het hoofdoverzicht netjes uitlijnt en bij Instellingen → Mijn kenmerken uitkomt. Kies 12 (of minder), voeg een eigen kenmerk toe, keer terug naar een nieuwe herinnering en toets dat je alleen de favorieten ziet en gekoppelde tags behouden blijven.
2. Schrijven aantikken: pop-up én toetsenbord moeten **direct** openen zonder tweede tik; probeer ook een lang verhaal.
3. Vertellen met foto's/video's: geen groen vlak, maar dezelfde warme neutrale achtergrond.
4. Opnemen bij meerdere foto's, naar het laatste beeld gaan, Stop → Opnieuw: vanaf eerste foto en nieuwe timestamps. Test of de oude stem terug te halen is bij mislukte nieuwe opname.
5. Vertellen zónder media: tijdens inspreken geluidsgolf, tijdens terugluisteren een meebewegende golf; ook na sluiten en opnieuw openen van dezelfde conceptopname.
6. Regressie: foto/voice-synchronisatie, oorspronkelijk videogeluid na de stem, tijdlijnpublicatie, iOS Safari versus geïnstalleerde PWA.
7. V8 en eerdere testen blijven staan; nieuwe V9-origin bevat NIET vanzelf de eerder in V8 opgeslagen herinneringen. Geen destructieve migratie, geen productiepromotie zonder akkoord.
