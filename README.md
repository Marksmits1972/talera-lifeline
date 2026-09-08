# TALERA / LIFELINE

Broncode voor het TALERA/LIFELINE tijdlijnprototype.

De eerste GitHub-basis wordt overgenomen uit `TALERA_TIMELINE_CURRENT_WORKER` (v22 PHOTOBOOK) uit het projectarchief. De Worker wordt inhoudelijk ongewijzigd opgesplitst in kleine ES-modules zodat toekomstige wijzigingen beheersbaar en versieerbaar zijn.

## Structuur

- `src/index.js` — Cloudflare Worker entrypoint
- `src/html/chunk*.js` — huidige HTML/CSS/JS van het prototype, in delen

Cloudflare-configuratie wordt toegevoegd zodra de bestaande Worker-naam is bevestigd, zodat we niet per ongeluk een tweede Worker aanmaken.
