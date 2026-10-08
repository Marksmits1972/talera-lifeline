# TALERA Business Filmstrip — isolated Cloudflare preview

This experiment is based on `reference/prototype-free-final-r19h2-20261001` and deploys only from `experiment/business-filmstrip-r19h2`.

Cloudflare Worker: `talera-business-filmstrip`

Builds: GitHub → Cloudflare Workers Builds, with production branch `experiment/business-filmstrip-r19h2`.

Root directory: `/`

Deploy command: `npx wrangler deploy --config experiments/business-filmstrip/wrangler.jsonc`

Entry point: `experiments/business-filmstrip/worker.js`

The root TALERA Worker, Life Space freeze branch, D1 and R2 resources must remain untouched. No storage bindings are required for this demo.
