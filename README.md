# HelloSaudi.sa – Astro + Cloudflare Pages

A multilingual Saudi Arabia information portal with the original gold/silver and utility dashboard preserved.

## Included

- Astro static website with English (`/en/`), Malayalam (`/ml/`) and Arabic (`/ar/`, RTL).
- Minimal responsive homepage, navigation, topic landing pages and article templates.
- Gold & silver landing page and links into the original utility dashboard.
- Original uploaded application preserved at `/tools/` without editing its HTML.
- Original Cloudflare Worker API preserved and copied to `dist/_worker.js` during build.
- Sitemap, robots.txt, redirects, basic security headers and favicon.

## Existing features preserved

The original `index.html` is copied to `public/tools/index.html`. Its original JavaScript, embedded styles and interface remain intact. The uploaded `_worker.js` is preserved as `functions_worker_original.js` and copied to `dist/_worker.js` by the build script.

The existing API routes remain:
- `/api/gold`
- `/api/silver`
- `/api/fx`
- `/api/fuel`

The existing worker optionally uses a KV binding named `GOLD_KV` for gold price history. Without it, the original dashboard should continue to work without that optional history.

## Requirements

- Node.js 20.3+ recommended
- npm

## Local development

```bash
npm install
npm run dev
```

Open the local URL shown by Astro.

## Build

```bash
npm run build
```

This generates the static website in `dist/` and copies the Cloudflare Pages advanced-mode Worker to `dist/_worker.js`.

## Cloudflare Pages deployment

1. Push this project to a GitHub repository.
2. In Cloudflare, open **Workers & Pages → Create → Pages → Connect to Git**.
3. Select the repository.
4. Build command: `npm run build`
5. Build output directory: `dist`
6. Deploy.

This project uses the Pages advanced-mode Worker pattern: `dist/_worker.js` calls `env.ASSETS.fetch(request)` for static assets and handles the existing `/api/*` routes.

Do not configure the project as a standard Pages Functions project at the same time as this advanced-mode Worker unless you deliberately migrate the routing architecture.

## Domain

Connect `hellosaudisa.com` to the Pages project. Keep the current production site online until the preview deployment has been tested. Configure `www` and the apex domain in Cloudflare and choose one canonical host. Use Cloudflare Redirect Rules or the Pages `_redirects` file to redirect the alternate host.

## Important pre-launch checks

1. Confirm permission and terms for retrieving/reusing rate data from the upstream KSA Expats pages. The original Worker includes a reminder to obtain permission.
2. Test all four API endpoints in production. Upstream HTML changes can break the existing parser.
3. If an API fails, show an unavailable/error state; do not invent or silently substitute market rates.
4. Confirm the gold and silver update timestamps and source attribution.
5. The article pages included are starter editorial templates. Verify every government procedure, URL, fee and eligibility rule against current official sources before publishing as factual step-by-step instructions.
6. Replace `Replace-with-your-contact-email` on the contact page.
7. Complete the privacy policy based on the analytics, cookies, ads and third-party services actually enabled.
8. Review the disclaimer and local legal requirements.
9. Test Arabic direction and typography on real mobile devices.
10. The `GOLD_KV` binding is optional and only needed for the original gold history feature.

## Content editing

Starter language content and homepage article cards are in `src/data/site.js`. Layout components are in `src/components/`. Page templates are in `src/pages/`.

For future article publishing, create a content collection or Markdown/MDX files per locale rather than editing page templates.

## Known scope boundaries

- The new portal shell, category pages and starter article pages are available in English, Malayalam and Arabic. The preserved legacy calculator dashboard remains the original English/Malayalam interface; its original UI has not been rewritten into Arabic in this migration.
- The four starter article pages are editorial scaffolds, not fully researched official instructions. Verify the relevant government process and links before publishing them as definitive how-to guides.
- Contact email and privacy-policy details are intentionally marked for owner completion.
- A full production Astro build was not run in the preparation environment because dependency installation did not complete. Run `npm install` and `npm run build` locally or through Cloudflare's Git build, then review the build log before connecting the live domain.
