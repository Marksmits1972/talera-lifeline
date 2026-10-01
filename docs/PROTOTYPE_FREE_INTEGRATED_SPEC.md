# TALERA Free — complete lokale cyclus

Opdracht gebruiker 1 oktober 2026: bouw de vastgelegde Free-opdracht als één samenhangende oplevering. Bron: projectmaster, bouwprompt 30 september 2026. Dit vervangt de eerdere beperking tot één foto en handmatige tekst. De bevroren referentie en overige Workers blijven intact.

## Modules en publieke aansluitingen

- Opslag bezit IndexedDB-records en blobs. `commitMedia(story,item)` bewaart de referentie en nieuwe bytes atomair en leest terug. Audio gebruikt dezelfde bestaande mediastore met `kind:audio`; geen vernietigende schemaverandering.
- Recorder bezit microfoon, MediaRecorder, chunks en de opnamelevenscyclus. `createRecorder({save,onState,onLevel,onError})` levert start/pauze/hervatten/stoppen/busy. Geen spraakherkenning, uploads of transcriptie.
- Foto-import bezit de begrensde importwachtrij, vingerafdruk en EXIF-controle. `importPhotos(files,{getStory,existingFingerprints,commit,preview,progress})` verwerkt één origineel tegelijk. Maximaal 12 per herinnering en 64 MB per origineel zijn technische proefgrenzen.
- De ervaring verbindt deze interfaces met de bestaande orbs, tekstpanel, tijdlijn, lokale audioplayer en fotonavigatie. De bridge bezit de huidige herinnering; de modules lezen/schrijven die alleen via callbacks.
- Reservekopie bezit een versieerbaar pakket met checksums en valideert alles vóór atomair herstel. Nieuwe versie ondersteunt audio; eerdere foto/tekstkopieën blijven leesbaar.
- Service worker bewaart uitsluitend vaste appcode en assets. Persoonlijke bytes blijven uitsluitend in IndexedDB. Manifest/installatie blijven op dezelfde bestaande Free-origin.

## Complete route en acceptatie

Foto’s kiezen → directe context → compacte bytes veilig bewaren → datum bevestigen of expliciet onbekend → typen en/of opnemen → pauze/hervatten/stoppen → lokaal terugluisteren → Op mijn tijdlijn → dezelfde herinnering openen, foto’s bladeren, tekst lezen, audio afspelen → bewerken/verwijderen → volledige reservekopie bewaren en terugzetten.

Opnemen begint alleen na een bewuste tap en toestemming. Periodieke checkpoints bewaren ontvangen chunks lokaal als onvolledig; stoppen finaliseert ze. Schermvergrendeling/appwissel beëindigt de opname met een expliciete onderbrekingsstatus. Plotselinge beëindiging vóór de eerste ontvangen chunk kan niet worden hersteld. Incomplete chunks hoeven volgens de browserspecificatie niet zelfstandig afspeelbaar te zijn: de interface belooft daarom geen gegarandeerd herstel van een onderbroken opname.

Offline wordt pas gemeld nadat de volledige vaste shell gecachet is. Updates activeren na sluiten van de oude context; geen gedwongen verversing tijdens opnemen. Safari en beginscherm-PWA moeten apart mobiel worden getest. Browseropslag en OS-bewaarmenu worden niet voorgesteld als gegarandeerde permanente opslag of automatische maptoegang.

## Bewijs en grenzen

Interne integriteits-, recorder-, pakket-, UI- en shellcontroles zijn nodig voor publicatie. De daadwerkelijke iPhone-microfoon, hoorbare playback, bestandbewaring, offline/appwissel/telefoonherstart, PWA-context en Android blijven mobiele acceptatie tot werkelijk getest. Geen nieuwe baseline zonder mobiele gebruikersgoedkeuring.


## Uitgevoerde controles op 1 oktober 2026

| Onderdeel | Bewijs |
|---|---|
| Atomair bewaren van meerdere foto's en audio; onbekende datum | Intern geslaagd; quota/missende referenties beschadigen oude inhoud niet |
| Recorder pauze/hervatten, finaliseren, checkpoints, onderbreking, weigering, opslagfout | Intern gesimuleerd en geslaagd; geen bewijs van hoorbare echte opname |
| Reservekopie inclusief audio, foto/thumbnailbytes, tekst en metadata | Intern herstel uit zelfstandig bestand geslaagd; beschadiging afgewezen; v1 blijft leesbaar |
| Begrensde import, exacte duplicaten, foutisolatie, EXIF versus lastModified | Intern geslaagd |
| Offline-shell, navigatie, cache-opruiming en uitsluitend vaste codeverzoeken | Intern geslaagd; live scherm bevestigt cachevoorbereiding; werkelijk netwerk uit op telefoon nog open |
| Twee foto’s, tekst, onbekende datum, tijdlijn, bladeren en heropenen | Live cloudbrowser bevestigd met niet-persoonlijke proefbeelden |
| Microfoon ontbreekt | Live foutmelding bevestigd; deze testbrowser heeft geen microfoon |
| Mobiele Safari/PWA en Android, hoorbare playback, onderbreking, telefoonherstart, Bestanden | Nog te testen door gebruiker; geen mobiele baseline vastgelegd |

Tijdens de live test blokkeerde een blijvende statusmelding tikken op de tijdlijnknop. De melding krijgt daarom pointer-events:none en verdwijnt na 4,5 seconden. De tekst/foto-route kon vóór die correctie met toetsenbediening wel worden afgerond. Een eerste meervoudige foto-import faalde zonder behouden fouttekst; daarop blijft de werkelijke fout nu zichtbaar. Herhaalde selectie en de duplicaatproef slaagden. De oorspronkelijke oorzaak van die eerste fout is niet bewezen.


De reguliere updateknop wacht op het opslaan van de actuele tekst en blokkeert tijdens opname of foto-import. Intern bevestigd met een uitgestelde save. De route `/update` is een handmatige migratie voor eerdere offline-shells: eerst verhaal bewaren en andere TALERA-tabs sluiten, daarna wachten op volledig geïnstalleerde shell en activeren. Deze route wist geen database of media.
