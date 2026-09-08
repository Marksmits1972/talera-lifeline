# TALERA / LIFELINE

Broncode voor het TALERA/LIFELINE tijdlijnprototype.

De eerste GitHub-basis is overgenomen uit `TALERA_TIMELINE_CURRENT_WORKER` (v22 PHOTOBOOK) uit het projectarchief. De Worker is inhoudelijk opgesplitst in kleine ES-modules zodat toekomstige wijzigingen beheersbaar en versieerbaar zijn.

## Structuur

- `src/index.js` — Cloudflare Worker entrypoint
- `src/html/chunk*.js` — huidige HTML/CSS/JS van het prototype, in delen
- `wrangler.jsonc` — deploymentconfiguratie voor de bestaande Worker `talera-timeline-prototype`

## Deployment

De `main` branch is gekoppeld aan Cloudflare Workers Builds. Een commit op `main` start automatisch een productie-build/deployment.
