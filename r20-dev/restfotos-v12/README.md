# TALERA V12 — restfoto's na gesproken herinnering

## Definitieve technische basis
Beschermde goedgekeurde V9: `talera-v9-stille-luxe-stijlstaging-20261104`.
Afzonderlijke test-Worker: `talera-v12-restfotos-veilige-test-20261105`.
GitHub branch: `feature/talera-v12-restfotos-veilige-activatie-20261105`.

**Belangrijk:** de echte goedgekeurde V9 gebruikt een *ingebouwde* speler
(`taleraInlineVoiceEnded`), geen nieuw iframe-venster. De eerdere V10/V11 en
eerste V12-experimenten gingen ten onrechte uit van een ouder iframe-spelerpad.
Deze V12 vervangt die experimenten; geen extra speler of diagnose-overlays.

## Eén aanvulling, geen verbouwing
Alleen `GET /present` krijgt een kleine helper `taleraInlineRemainingPhotos(s)`
en één gewijzigde aanroep van `audio.onended`. De oorspronkelijke
`taleraInlineVoiceEnded(s)` blijft letterlijk ongewijzigd en zorgt na de
extra foto's voor de *bestaande* videoronde met geluid.

De helper leest de bestaande `s.frames` (media keys) en al genormaliseerde
`s.cues` (waarbij `mediaId` gekoppeld is aan het bijbehorende beeld).
Een foto waarvan de media-key niet in de gesproken cue-IDs voorkomt, wordt
via de bestaande `taleraInlineSetFrame` getoond, vier seconden per foto.
Video's worden nooit als restfoto behandeld. Na de laatste foto wordt de
oorspronkelijke `taleraInlineVoiceEnded(s)` aangeroepen.

De helper hergebruikt `ordinaryTimer`, die door de oorspronkelijke
`taleraInlineDispose` bij verlaten van een herinnering al wordt opgeruimd.
Geen nieuwe speler, extra index, opslagbewerking, opname-tijdcode of
aangepaste video-afhandeling.

## Tests en bescherming
- `restfotos.test.mjs`: ID-vergelijking, 2 en 3 ontbrekende foto's, dubbele
  tijdcodes, video overgeslagen, originele overgang, navigatie-annulering.
- `smoke-live.mjs`: 5 routes, oorspronkelijke V9-HTML byte-identiek
  behalve precies de helper en één `audio.onended`-aanroep.
- `browser-smoke.mjs`: echte lokale IndexedDB-herinnering met 5 foto's,
  1 video, echte WAV-stemopname en drie tijdcodes. Uitkomst: foto's op
  index 3, 4, 5 na de stem, circa 4 seconden elk, daarna originele video
  met `muted=false`; originele recorder onaangetast.
- V9, V10, V11 en de onderliggende TALERA-workers zijn niet aangepast.
- Browser/gebruikersopslag verschilt per Worker-host en geïnstalleerde PWA.
  Gebruik de V12-testlink in dezelfde Safari-context; verwijder geen oude app.

CI: `https://github.com/Marksmits1972/talera-lifeline/actions`.
Rollback: uitsluitend deze losse V12 Worker niet meer gebruiken.
