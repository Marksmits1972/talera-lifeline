# TALERA work-orders: doelbewaking vóór de eerste commit

Dit is géén lijst met creatieve verboden. De assistent mag zelfstandig onderzoeken, programmeren en technische keuzes maken. De work-order borgt het definitief gekozen resultaat en voorkomt wijzigingen aan onderdelen die daar niet bij horen.

Gebruik voor elke substantiële PR één nieuw JSON-bestand: docs/work-orders/TALERA-<datum>-<onderwerp>.json.

**Vul in:** één einddoel; fase EXPLORE of EXACT_BUILD; bron van gebruikersbesluit; bestaande bron-commit + acceptatiestatus; wat onaangeroerd blijft; exacte bestandslijst; kerntechnische aannames met toetsing; acceptatietests; terugkeerroutine; gebruikersacceptatie PENDING tot deze werkelijk gegeven is.

De GitHub scopeguard scripts/check-talera-goal.mjs blokkeert afwijkingen van bestandscope en ontbrekende kernvelden. Bij een definitieve bouwopdracht laat hij geen onbewezen kernveronderstelling als OPEN passeren. In verkenningsfase mogen veronderstellingen OPEN blijven als ze expliciet onderzocht worden en er nog geen definitieve implementatie wordt geclaimd.

Beveiligingsgrens: de scopeguard bewijst NIET of het ontwerp visueel klopt of een iPhone daadwerkelijk werkt, of dat de gebruiker instemt. Daarom blijft de bestaande cyclus 'Bouw → Test → Groen licht → Gebruikersbeoordeling → Vastzetten' onverkort van kracht.

**Veilig werken:** main kan automatisch productie publiceren; daarom alleen op eigen branch, PR eerst beoordelen, geen merge zonder gebruikersakkoord. Bij eigen Worker controleren of hij dezelfde staging-/productiedata raakt.

De actuele leidende samenwerkingsafspraken staan in Google Drive:
https://docs.google.com/document/d/1kARohDQmBJ40jrBGkcHvd8uzE18zI91M2xCZ4b-JKFI/edit
