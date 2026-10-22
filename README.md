# noa

noa's website and Studio: experimental and speculative design. A fork of the Huit builder (Huit-Studio/website), kept separate.

- `public/site.js`: section library (incl. the worm `creature`, `specimens`, `notes`, `hello`), page renderer, first content (SEED).
- `public/site.css`: website styles, published with every release.
- `public/studio.*`: the editor at `/studio/` (behind Cloudflare Access): Website, Projects (specimens), Tone of voice, Guides, References, Posts with calendar and AI drafts, Analytics.
- `src/worker.js`: storage (D1), images, publishing, sitemap, analytics.

Publishing freezes every page as HTML in D1.

Setup: D1 database `noa` (id in `wrangler.jsonc`), connect the repo in Workers Builds, add an Access app for `/studio` and `/api`, put its AUD in `ACCESS_AUD`.
Local: `npx wrangler dev --local --var ACCESS_TEAM_DOMAIN:` and send `cf-access-authenticated-user-email: lea@huit.studio`.
