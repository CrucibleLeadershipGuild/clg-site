# Crucible Leadership Guild site

Static site plus one small Cloudflare Pages Function (`functions/download.js`). Needs Node 18+ to build.

## Edit
All content lives in `products.json`.
- Products: set `stripePriceId` (the Stripe Price ID, `price_...`), `file` (the PDF's name in your R2 bucket) and `checkoutUrl` (the Stripe Payment Link, must start with `https://`). Until `checkoutUrl` is set the button shows "Coming soon".
- Mentoring plans: set each plan's `checkoutUrl` to its subscription Payment Link.
- `site.portalUrl`: optional Stripe customer portal login link (shown on the mentoring page).

## Build and preview
    node build.mjs
    npx serve dist

## Deploy (Cloudflare Pages)
Push to GitHub, then create a Pages project: build command `node build.mjs`, output directory `dist`. Keep `functions/` and `products.json` at the repository root.
`static/_headers` sets security headers; the CSP blocks third-party scripts. Stripe Payment Links are plain links, so no CSP change is needed.

## Stripe setup (what you must do; it cannot be done from the code)
1. Create products and Prices in Stripe: two one-time PDF prices, three recurring mentoring prices (weekly, monthly, every 3 months).
2. Create a Payment Link for each. Enable "Collect customer addresses" and automatic tax (Stripe Tax) on each; limit shipping/billing to the United States.
3. After-payment behavior, "Don't show confirmation page" with a redirect:
   - PDFs: `https://crucibleleadershipguild.com/download?session_id={CHECKOUT_SESSION_ID}`
   - Mentoring: `https://crucibleleadershipguild.com/thanks/mentoring/`
4. Customer portal: configure it, and turn OFF immediate cancellation so the 30-day written-notice policy governs. Paste the login link into `site.portalUrl`.
5. Create a restricted API key (read access to Checkout Sessions, PaymentIntents, Charges).

## PDF delivery setup (Cloudflare)
1. Create a private R2 bucket and upload the two PDFs under the exact names in `products.json` `file`.
2. Pages project > Settings > Bindings: add an R2 binding named `PDFS` pointing to that bucket.
3. Pages project > Settings > Variables and Secrets: add secret `STRIPE_SECRET_KEY` (the restricted key).
4. Test with Stripe test mode first: buy with card 4242 4242 4242 4242, confirm you land on the download page and the PDF downloads, then refund the test payment and confirm the page now refuses.

How it works: the download page re-checks the purchase with Stripe on every request (paid, matching price, not refunded or disputed). The session link is effectively a password, so anyone you share it with can download. It is not limited by count or time.

## Before launch
- Set `site.url` and `site.email` in `products.json`.
- Replace the placeholder terms and privacy pages in `build.mjs` with lawyer-reviewed text. Add a refund policy for the digital products (the terms currently cover mentoring only).
- Read Stripe's prohibited and restricted businesses list for coaching/mentoring, and confirm your account is approved for it.
- Confirm sessions per billing period (Pro 4, Advanced 13) and rules for missed or rescheduled sessions.
- Confirm Florida sales-tax treatment of digital downloads with the Florida Department of Revenue or a CPA, and watch other states' economic-nexus thresholds.
- Calendar links: keep them private (never on the site) and retire a subscriber's link when they cancel.
