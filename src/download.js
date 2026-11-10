// Download handler, called by src/worker.js for GET /download
// Stripe Payment Links redirect buyers here with ?session_id={CHECKOUT_SESSION_ID}.
// We re-check that session with Stripe (server side) and only then serve the PDF from a private R2 bucket.
//
// Required configuration (Cloudflare Worker > Settings):
//   Secret   STRIPE_SECRET_KEY : a Stripe *restricted* key with read access to Checkout Sessions,
//                                PaymentIntents and Charges. Never put it in products.json or the repo.
//   Binding  PDFS              : R2 bucket (private), declared in wrangler.jsonc, holding the files named in products.json "file".
import catalog from "../products.json";

const SESSION_RE = /^cs_(live|test)_[A-Za-z0-9]{10,250}$/;

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

const baseHeaders = {
  "Cache-Control": "private, no-store",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "X-Robots-Tag": "noindex",
};

function html(status, title, body) {
  const doc = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex">
<title>${esc(title)} | ${esc(catalog.site.name)}</title><link rel="stylesheet" href="/styles.css"></head>
<body><main class="wrap"><h1>${esc(title)}</h1>${body}
<p><a href="/">Back to ${esc(catalog.site.name)}</a></p></main></body></html>`;
  return new Response(doc, {
    status,
    headers: {
      ...baseHeaders,
      "Content-Type": "text/html; charset=utf-8",
      "Content-Security-Policy":
        "default-src 'self'; style-src 'self'; img-src 'self' data:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
    },
  });
}

const contactLine = () =>
  `<p>If you think this is a mistake, email <a href="mailto:${esc(catalog.site.email)}">${esc(catalog.site.email)}</a> with your receipt.</p>`;

// Returns { ok:true, items:[product...] } or { ok:false, status, message }.
async function verify(sid, env) {
  const qs = new URLSearchParams();
  qs.append("expand[]", "line_items");
  qs.append("expand[]", "payment_intent.latest_charge");
  let res;
  try {
    res = await fetch(`https://api.stripe.com/v1/checkout/sessions/${sid}?${qs}`, {
      headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}` },
    });
  } catch {
    return { ok: false, status: 502, message: "We could not reach our payment provider. Please try again in a minute." };
  }
  if (res.status === 404) return { ok: false, status: 404, message: "We could not find that purchase." };
  if (!res.ok) return { ok: false, status: 502, message: "We could not verify your purchase right now. Please try again." };

  const s = await res.json();
  if (s.mode !== "payment" || s.payment_status !== "paid")
    return { ok: false, status: 402, message: "This purchase has not been paid." };

  const charge = s.payment_intent && typeof s.payment_intent === "object" ? s.payment_intent.latest_charge : null;
  if (charge && typeof charge === "object" && (charge.refunded || charge.disputed))
    return { ok: false, status: 403, message: "This purchase was refunded or disputed, so the download is no longer available." };

  const priceIds = new Set(((s.line_items && s.line_items.data) || []).map((li) => li.price && li.price.id).filter(Boolean));
  const items = catalog.products.filter((p) => p.stripePriceId && p.file && priceIds.has(p.stripePriceId));
  if (!items.length) return { ok: false, status: 403, message: "That purchase does not include a downloadable file." };
  return { ok: true, items };
}

export async function handleDownload(request, env) {
  const url = new URL(request.url);
  const sid = url.searchParams.get("session_id") || "";
  const slug = url.searchParams.get("file");

  if (!SESSION_RE.test(sid))
    return html(400, "Download link not valid", `<p>This link is missing or incomplete. Use the link you were sent after checkout.</p>${contactLine()}`);
  if (!env.STRIPE_SECRET_KEY || !env.PDFS)
    return html(500, "Downloads are not set up yet", `<p>Please email us and we will send your file by hand.</p>${contactLine()}`);

  const v = await verify(sid, env);
  if (!v.ok) return html(v.status, "We could not confirm your purchase", `<p>${esc(v.message)}</p>${contactLine()}`);

  if (slug) {
    const p = v.items.find((x) => x.slug === slug);
    if (!p) return html(403, "Not part of this purchase", `<p>That file is not included in this purchase.</p>${contactLine()}`);
    const obj = await env.PDFS.get(p.file);
    if (!obj) return html(404, "File unavailable", `<p>We could not find the file. Please email us.</p>${contactLine()}`);
    return new Response(obj.body, {
      headers: {
        ...baseHeaders,
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${p.file.replace(/[^A-Za-z0-9._-]/g, "_")}"`,
        ...(obj.size != null ? { "Content-Length": String(obj.size) } : {}),
      },
    });
  }

  const links = v.items
    .map(
      (p) =>
        `<li><a class="btn" href="/download?session_id=${encodeURIComponent(sid)}&amp;file=${encodeURIComponent(p.slug)}">Download ${esc(p.name)} (PDF)</a></li>`
    )
    .join("");
  return html(
    200,
    "Thank you for your purchase",
    `<p>Your payment is confirmed. Stripe has emailed your receipt.</p>
<ul class="plain">${links}</ul>
<p class="note">Bookmark this page. It is your link for this purchase, so please do not share it. If you lose it, email us your receipt and we will resend it.</p>`
  );
}
