# Crucible Leadership Guild site

Static site plus one small Cloudflare Worker (`src/worker.js`, `src/download.js`). Needs Node 18+ to build.

## Edit
All content lives in `products.json`.
- Products: set `stripePriceId` (the Stripe Price ID, `price_...`), `file` (the PDF's name in your R2 bucket) and `checkoutUrl` (the Stripe Payment Link, must start with `https://`). Until `checkoutUrl` is set the button shows "Coming soon".
- Mentoring plans: set each plan's `checkoutUrl` to its subscription Payment Link.
- `site.portalUrl`: optional Stripe customer portal login link (shown on the mentoring page).

## Build and preview
    node build.mjs
    npx serve dist

## Deploy (Cloudflare Workers with static assets)
Cloudflare creates a Worker, not a Pages project, when you connect a Git repo. This repo is set up for that.
- `wrangler.jsonc` names the Worker `clg-site`, serves `dist/` as static assets and binds the R2 bucket `clg-pdfs` as `PDFS`.
- `src/worker.js` serves static files and routes `GET /download` to `src/download.js`.
- Build command: `node build.mjs`. Deploy command: `npx wrangler deploy`.
- Create the bucket BEFORE the first deploy, or the deploy fails: `npx wrangler r2 bucket create clg-pdfs`.
- Keep `wrangler.jsonc`, `src/` and `products.json` at the repository root.
`static/_headers` sets security headers for static files; the CSP blocks third-party scripts. Stripe Payment Links are plain links, so no CSP change is needed.

### Custom domain
Worker > Settings > Domains & Routes > Add > Custom domain. Add `crucibleleadershipguild.com` and `www.crucibleleadershipguild.com`. If Cloudflare refuses because a DNS record already exists, delete that old web record (`A`, `AAAA` or `CNAME` for the same name; never `MX` or `TXT`) and add the domain again.

## Stripe setup (what you must do; it cannot be done from the code)
1. Create products and Prices in Stripe: two one-time PDF prices, three recurring mentoring prices (weekly, monthly, every 3 months).
2. Create a Payment Link for each. Enable "Collect customer addresses" and automatic tax (Stripe Tax) on each; limit shipping/billing to the United States.
3. After-payment behavior, "Don't show confirmation page" with a redirect:
   - PDFs: `https://YOUR-DOMAIN/download?session_id={CHECKOUT_SESSION_ID}`
   - Mentoring: `https://YOUR-DOMAIN/thanks/mentoring/`
4. Customer portal: configure it, and turn OFF immediate cancellation so the 30-day written-notice policy governs. Paste the login link into `site.portalUrl`.
5. Create a restricted API key (read access to Checkout Sessions, PaymentIntents, Charges).

## PDF delivery setup (Cloudflare)
1. Create the private R2 bucket (`npx wrangler r2 bucket create clg-pdfs`) and upload the two PDFs under the exact names in `products.json` `file`. Do not enable public access.
2. The `PDFS` binding comes from `wrangler.jsonc`; do not add it again by hand.
3. Worker > Settings > Variables and Secrets: add secret `STRIPE_SECRET_KEY` (the restricted key), then redeploy.
4. Test with Stripe test mode first: buy with card 4242 4242 4242 4242, confirm you land on the download page and the PDF downloads, then refund the test payment and confirm the page now refuses.

How it works: the download page re-checks the purchase with Stripe on every request (paid, matching price, not refunded or disputed). The session link is effectively a password, so anyone you share it with can download. It is not limited by count or time.

## Before launch
- Set `site.url` and `site.email` in `products.json`.
- Replace the placeholder terms and privacy pages in `build.mjs` with lawyer-reviewed text. Add a refund policy for the digital products (the terms currently cover mentoring only).
- Read Stripe's prohibited and restricted businesses list for coaching/mentoring, and confirm your account is approved for it.
- Confirm sessions per billing period (Pro 4, Advanced 13) and rules for missed or rescheduled sessions.
- Confirm Florida sales-tax treatment of digital downloads with the Florida Department of Revenue or a CPA, and watch other states' economic-nexus thresholds.
- Calendar links: keep them private (never on the site) and retire a subscriber's link when they cancel.
