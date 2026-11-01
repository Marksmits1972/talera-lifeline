# TALERA V62 — één berichtenstroom per herinnering in Free-back-up

**Datum:** 1 november 2026. **Status:** Gebouwd en gedeployed op bestaande V62-staging; echte iPhone-acceptatie blijft open.

## Ontwerpbesluit
De herinnering heeft **één gesprek**, niet een afzonderlijke WhatsApp-chat en een TALERA-chat. Het bestaande canonieke sociale systeem haalt accountreacties uit `comments` en gastreacties uit `guest_comments`, en toont deze samen in chronologische volgorde. De toegangspoort is irrelevant voor de gebruiker.

## Export
- Onder **Mijn TALERA → Instellingen → Opslag en back-up → Back-up maken** leest TALERA nog steeds alleen de bestaande lokale `stories` en `files` voor de herinneringen en media.
- Bij ieder lokaal verhaal controleert de PWA via de reeds bestaande, **geauthenticeerde GET-endpoints** `/api/pwa/memory-link?localMemoryId=...` en `/api/threads/:memoryId` of er een online gekoppeld gesprek bestaat. Er worden hierbij **geen Free-verhaalteksten, foto's, audio of video geüpload**.
- Indien beschikbaar worden alle via de huidige endpoint opgehaalde account- en gastreacties in **één** geordende berichtenlijst `threads` opgenomen, met `localId`, bericht-ID, afzendernaam, tekst, tijdstip, antwoordrelatie en gaststatus.
- Eventueel eerder lokaal herstelde berichten worden samengevoegd. Dubbelen verdwijnen op bericht-ID; inhoudsconflicten blokkeren stil overschrijven.
- Het bestand behoudt de bestaande extensie `.talerabackup`, met een gecontroleerd **manifestversie 2**. Bestaande **versie 1**-bestanden (zonder gesprek) blijven importeerbaar.
- Bestandsheader, manifest en media-SHA-256 blijven gecontroleerd zoals voorheen. Alle berichten maken deel uit van hetzelfde gehashte manifest.
- Als de eigenaar **niet aangemeld** is of de online endpoint onbereikbaar is, wordt een lokale reservekopie nog steeds mogelijk, maar TALERA toont nadrukkelijk dat **online gesprekken niet gecontroleerd konden worden**. Geen misleidende claim van een volledige berichtenback-up.
- De huidige backend toont maximaal **200 reacties per gesprek**. Bij het bereiken van die grens **weigert** de export een onterecht 'volledige' berichtenback-up te maken. Volledige pagination boven deze grens is een afzonderlijk open punt vóór algemene vrijgave.

## Herstel
- TALERA toont vóór herstel aantallen nieuwe herinneringen, media en reacties.
- Herstelde berichten worden als inert JSON-blob per uniek `localId + commentId` in de **bestaande `files`-objectstore** bewaard, onder de interne prefix `talera-thread-archive-v1:`. Er is **geen nieuwe tabel, database, Worker of tweede berichtenregister**.
- De controle op alle berichtrecords vindt plaats **vóór** de transactiewijziging. Alleen nog niet bestaande berichten worden met `add()` toegevoegd in dezelfde bestaande IndexedDB-transactie als nieuwe herinneringen/media; bij afwijkende bestaande records volgt een conflictmelding.
- De bestaande presentatieadapter haalt de herstelde berichten in **hetzelfde sociale commentaarpaneel** op en combineert ze op bericht-ID met eventuele live serverreacties. Geen afzonderlijke WhatsApp-box en geen dubbele tekst.
- Zonder herstelde online accountkoppeling zijn historische berichten **alleen te lezen**. Het normale invoerformulier wordt dan niet getoond; boven de berichten staat **'Opgeslagen berichten uit back-up · alleen lezen.'**
- TALERA publiceert nooit opnieuw oude berichten namens de oorspronkelijke afzender. Indien de accountkoppeling bestaat, blijft normaal online reageren beschikbaar.
- Verwijderen van browserdata wist zowel lokale verhalen als lokale berichten; het onafhankelijke bestand via Bestanden blijft dan de herstelbron.

## Bestaande componenten, geen nieuwe architectuur
- `src/mijn-talera/free-backup.txt`: lokale archive v2, online read-only checks, herstel en `socialSnapshot(localId, live)`.
- `src/mijn-talera/social-archive-adapter-snippet.txt`: onderhoudbare bron voor de gewijzigde bestaande social adapter in V56; de daadwerkelijke bestaande V56-Worker is aangepast, zonder nieuwe service.
- Bestaande V56 social `ui-integration.mjs`: uitsluitend compacte alleen-lezen-status en verbergen van invoerveld bij offline historisch gesprek.
- `test/free-backup-local-restore.test.mjs`: contractcontroles voor export, herstel, één gesprek, back-compatibiliteit en lokaal lezen.

## Getest met fictieve berichten, zonder echte klantgegevens
1. Twee online reacties (één account, één WhatsApp-gast) worden in dezelfde geordende backup v2 opgenomen.
2. Na wissen van uitsluitend fictieve testrecords: één verhaal plus beide reacties hersteld, afzendernamen en volgorde behouden.
3. Een tweede herstel voegt geen dubbele reacties toe.
4. Samenvoegen van één al live aanwezige reactie met twee gearchiveerde berichten geeft twee, niet drie resultaten.
5. De gerestaureerde reactie is werkelijk zichtbaar in het **bestaande** `#talera-clean-panel`-venster. Zonder ingelogd account verschijnt 'alleen lezen' en **geen reactievak**.
6. Een v1-back-up zonder conversaties is nog geldig en het normale online reactievak blijft bereikbaar als er geen alleen-lezen archief is.
7. V62-presentatie, Vertellen en Kennisbank openen zonder Worker-exceptie.

## Versies / terugval
- **V56 sociaal:** `053d9b75-4087-425c-ac21-17b22be3f2fd`; deployment `a9cdd6b2-5167-4b96-8690-410f8c154502`. Vorige deployment `2798dcd1-5ff3-428e-b812-500783b2a7bf` blijft bestaan.
- **V62 back-up:** `a44fa97d-b667-493f-a632-69242ed72e54`; deployment `53a6cb4f-ce97-4ba0-890e-a7e55dc57503`. Vorige deployment `6a148092-4d47-48dd-b0e4-254f19e74538` blijft bestaan.

## Open vóór definitieve productievrijgave
1. Echte iPhone/Bestanden-app: één bestand bewaren buiten de browser en herstellen met persoonlijk voorbereide testgegevens.
2. Test vanuit ingelogd Free-account met bestaande account- en WhatsApp-reacties; test opnieuw laden op tweede testtoestel zonder oude lokale database.
3. Voor gesprekken van 200 of meer reacties is geauthenticeerde pagination nodig. Huidige code weigert een incomplete 'complete' back-up.
4. Verifieer iOS-opslagdruk en omvangrijke foto/audio/video-pakketten.

**Niet gewijzigd:** serverberichten, afzenders, likes, sociale rechten, commerciële modules, AI-gedrag en abonnementen.
