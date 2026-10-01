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
