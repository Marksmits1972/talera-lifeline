# TALERA — Vertel

Schone herbouw van de vertelcyclus op basis van de leidende ontwerpbesluiten van 9 september 2026.

## Structuur

- `src/worker.js` — kleine Worker-entry; alleen API-routing en static-assets fallback.
- `src/api.js` — D1/R2-opslag, eenmalige AI-verrijking, metadata, media en delen.
- `public/index.html` — minimale app-shell.
- `public/style.css` — TALERA-presentatie en de Levende Kern.
- `public/client.js` — expliciete client-state-machine voor de hele vertelervaring.

De oude v20-interface wordt niet verder gepatcht. De nieuwe flow is vanaf de bron opnieuw opgebouwd: startkeuze, foto-start, expliciete microfoonactivatie, first-speech semantiek met technische pre-roll, één Pauze/Klaar?-bedieningsplek, veilige lokale opslag, eenmalige AI-verwerking, één bevestigingsoverzicht, gerichte correctie en optionele media.

GitHub `main` deployt via Cloudflare Builds naar Worker `xxory-test`.
