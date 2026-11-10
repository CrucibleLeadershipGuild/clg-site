// Zero-dependency static site generator. Usage: node build.mjs
// Reads products.json, writes the site to dist/.
import { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync } from "node:fs";
import { join } from "node:path";

const data = JSON.parse(readFileSync("products.json", "utf8"));
const { site, products, mentoring } = data;
const OUT = "dist";

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

// Only allow https checkout links, so a typo in products.json cannot inject a javascript: URL.
const safeUrl = (u) => (typeof u === "string" && u.startsWith("https://") ? u : "");

const SYM = { USD: "$", GBP: "£", EUR: "€", AUD: "A$" };
const money = (p) => `${SYM[p.currency] || p.currency + " "}${p.amount}`;

function buyButton(url, label) {
  const u = safeUrl(url);
  return u
    ? `<a class="btn" href="${esc(u)}" rel="noopener">${esc(label)}</a>`
    : `<span class="btn btn-disabled" aria-disabled="true">Coming soon</span>`;
}

// Inline a brand SVG. The source files @import Google Fonts in a <style> block, which is blocked
// by our CSP and ignored inside <img>, so we strip it and style text via /styles.css (self-hosted Cinzel).
function logo(variant) {
  const name = site.logo || "seal";
  let svg;
  try {
    svg = readFileSync(join("brand", `${name}-${variant}.svg`), "utf8");
  } catch {
    throw new Error(`Missing brand/${name}-${variant}.svg. Set site.logo to seal, ascent or vessel.`);
  }
  return svg
    .replace(/<style>[\s\S]*?<\/style>/, "")
    .replace(/<svg ([^>]*?)\swidth="\d+"\sheight="\d+"/, `<svg $1 class="logo logo-${variant}" role="img" aria-label="${esc(site.name)}"`)
    .trim();
}

function page({ title, description, path, body, noindex = false }) {
  const canonical = site.url.replace(/\/$/, "") + path;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
${noindex ? '<meta name="robots" content="noindex">\n' : ""}<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(canonical)}">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="preload" href="/fonts/cinzel-latin-700-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/styles.css">
</head>
<body>
<header class="wrap bar">
  <a class="brand" href="/" aria-label="${esc(site.name)} home">${logo("primary")}</a>
  <nav><a href="/#products">Products</a><a href="/mentoring/">Mentoring</a></nav>
</header>
<main class="wrap">
${body}
</main>
<footer class="foot"><div class="wrap foot-in">
  <a class="brand" href="/" aria-label="${esc(site.name)} home">${logo("reversed")}</a>
  <p>&copy; ${new Date().getFullYear()} ${esc(site.name)}</p>
  <p><a href="/terms/">Terms &amp; refunds</a> · <a href="/privacy/">Privacy</a> · <a href="mailto:${esc(site.email)}">Contact</a></p>
</div></footer>
</body>
</html>
`;
}

const write = (path, html) => {
  const dir = join(OUT, path);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "index.html"), html);
};

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
cpSync("static", OUT, { recursive: true });

// Home
write(
  "",
  page({
    title: `${site.name}: ${site.tagline}`,
    description: site.tagline,
    path: "/",
    body: `<section class="hero"><h1>${esc(site.tagline)}</h1>
<p>Practical PDF guides and one-on-one mentoring from ${esc(site.name)}.</p></section>
<section id="products"><h2>Products</h2><div class="grid">
${products
  .map(
    (p) => `<article class="card"><h3><a href="/products/${esc(p.slug)}/">${esc(p.name)}</a></h3>
<p>${esc(p.summary)}</p><p class="price">${esc(p.price)}</p>
<a class="link" href="/products/${esc(p.slug)}/">Details</a></article>`
  )
  .join("\n")}
</div></section>
<section><h2>${esc(mentoring.headline)}</h2><p>${esc(mentoring.intro)}</p>
<a class="link" href="/mentoring/">See plans</a></section>`,
  })
);

// Product pages
for (const p of products) {
  write(
    `products/${p.slug}`,
    page({
      title: `${p.name} | ${site.name}`,
      description: p.summary,
      path: `/products/${p.slug}/`,
      body: `<article><h1>${esc(p.name)}</h1>
${p.description.map((d) => `<p>${esc(d)}</p>`).join("\n")}
<h2>What you get</h2><ul>${p.includes.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>
<p class="price">${esc(p.price)}</p>
${buyButton(p.checkoutUrl, "Buy now")}
<p class="note">Checkout is handled securely by Stripe. After payment you land on your download page. Bookmark it, because that page is your link. If you lose it, email us your receipt. All sales of digital products are final; see <a href="/terms/#digital-products">Terms &amp; refunds</a>. ${esc(site.availability)}</p></article>`,
    })
  );
}

// Mentoring
write(
  "mentoring",
  page({
    title: `${mentoring.headline} | ${site.name}`,
    description: mentoring.intro,
    path: "/mentoring/",
    body: `<h1>${esc(mentoring.headline)}</h1><p>${esc(mentoring.intro)}</p><p class="note">${esc(site.availability)}</p><div class="grid">
${mentoring.plans
  .map(
    (pl) => `<article class="card"><h3>${esc(pl.name)}</h3>
<p class="price">${esc(money(pl.prices[0]))} <small>${esc(pl.interval)}</small></p>
${pl.prices.length > 1 ? `<p class="note">${pl.prices.slice(1).map((p) => `${esc(money(p))} ${esc(p.region)}`).join(" · ")}</p>` : ""}
<ul>${pl.features.map((f) => `<li>${esc(f)}</li>`).join("")}</ul>
${buyButton(pl.checkoutUrl, "Subscribe")}</article>`
  )
  .join("\n")}
</div>
<section><h2>How booking works</h2>
<p>Every plan includes one dedicated hour per week. After you subscribe, we email you a private link to our calendar so you can book your sessions at times that suit you. Times are shown in your own time zone.</p>
<h2>Cancelling</h2>
<p>To receive a prorated refund for unused sessions, send us ${mentoring.policy.noticeDays} days' written notice. See the <a href="/terms/#mentoring">full cancellation and refund terms</a>.</p>
${safeUrl(site.portalUrl) ? `<p>To update your card or download invoices, <a href="${esc(safeUrl(site.portalUrl))}" rel="noopener">open your billing portal</a>.</p>` : ""}</section>`,
  })
);

// Post-checkout page for mentoring subscribers (set as the Payment Link's confirmation redirect).
write(
  "thanks/mentoring",
  page({
    title: `Welcome | ${site.name}`,
    description: "Mentoring subscription confirmed",
    path: "/thanks/mentoring/",
    noindex: true,
    body: `<h1>Thank you for subscribing</h1>
<p>Your payment went through, and Stripe has emailed your receipt.</p>
<h2>Next step: book your sessions</h2>
<p>We will email you a private link to our calendar. Use it to book your weekly hour. Please do not share the link. If you have not heard from us within one business day, email <a href="mailto:${esc(site.email)}">${esc(site.email)}</a>.</p>
<p class="note">To cancel, see the <a href="/terms/#mentoring">cancellation and refund terms</a>.</p>`,
  })
);

// Legal placeholders (merchant of record will require real terms/refund/privacy pages)
const legal = (slug, title) =>
  write(
    slug,
    page({
      title: `${title} | ${site.name}`,
      description: title,
      path: `/${slug}/`,
      body: `<p>Crucible Leadership Guild is committed to protecting our customers personal information. This privacy notice applies to customers of our digital products and services, (“Services”) and describes Crucible Leadership Guild’s practices regarding the collection, use, protection and disclosure of your personal information.</p>

<p>We may update this privacy policy from time to time. We will post the most recent version to our website at ${site.name} for you to access at any time. If you have any questions about this policy you can contact us at <a href="mailto:${esc(site.email)}?subject=Website%20Feedback">Contact Support</a>.</p>

<h2>Information We Collect</h2>
<p>When you subscribe to and use our Services, Crucible Leadership Guild collects certain types of information about you. We may collect this information (i) directly from you when you provide it to us, such as when you purchase products or services, complete a form on our website, or send us an email; (2) automatically through use of our Services; or (3) from third parties.</p>

<p>1. Customer information. In providing our Services to you, we collect certain information that identifies you individually or can be reasonably used to identify you individually (Personally Identifiable Information) or (PII). The type of Personally Identifiable Information we collect may include items such as your name, billing address, telephone number(s), bank account number, credit card number and other similar account information. PII does not include de-identified, aggregate or anonymous information that taken alone does not identify you individually. We also collect non-personally identifiable information, including usage statistics, traffic data, the domain names and IP addresses of our website visitors and other information. This information will be treated as PII when it is associated or otherwise combined with information that can identify you.</p>

<p>2. Digital products. Through your use of downloading any of our digital products, we may collect PII in the form of information for billing.</p>

<p>3. Subscription services. Through your use of our Subscription Services, we automatically collect subscriber list information, which is limited to your name, email address and telephone number.</p>


<h2>Use and Sharing of Information</h2>
<p>1. Use policy. We consider PII confidential and use it to provide our Services and for related business purposes, including without limitation to monitor for, detect and protect against fraud and unauthorized use of our Services, to communicate with you, for billing and collection purposes, and for accounting and tax purposes.</p>

<p>2. Sharing policy. Crucible Leadership Guild may disclose your PII and other information it collects to another entity (i) when it is necessary to render, or conduct a legitimate business activity related to the Services we provide to you or to confirm or update information provided by you; (ii) when permitted or required by law; (iii) for mailing list or other purposes, subject to your ability to limit the disclosure; or (iv) as otherwise authorized by you. When we provide your information to a third party for purposes of a business function, we will restrict their use of your information to the purposes for which it is disclosed and will prohibit any such third party receiving PII from further disclosure or use of the PII obtained from us.</p>

<p>3. Governmental entities and legal requests. If permitted by and subject to compliance with any federal law requirements, Crucible Leadership Guild may disclose PII about you to governmental entities or to comply with valid legal process. Federal law provides generally that governmental entities must obtain a court order for disclosure of PII and can do so only upon a showing of clear and convincing evidence that you are reasonably suspected of engaging in criminal activity, and the information sought would be material to the case. The law also generally affords customers an opportunity to appear and contest the disclosure of PII to a government entity pursuant to a court order. With respect to non-governmental entities, federal law generally allows those entities to obtain information about you only with a court order and notice to you the customer.</p>

<p>4. Enforcement of our rights. We reserve the right to use or disclose PII about you without your consent only when such disclosure is permissible by applicable law (a) to protect our customers, employees, or property, (b) in emergency situations, (c) to enforce our rights in court or elsewhere, or directly with you, for violations of service terms, conditions or policies and/or (d) as otherwise required by law.</p>

<p>5. Cookies. We may collect information using cookies, web beacons or similar technologies. These methods permit us to collect various types of information, including which pages you visit, how you use the Services, which of our email messages you read and other information.</p>

<p>6. Third-party websites and services. This privacy policy does not apply to websites or internet services offered by third parties that you may visit through use of our Services. We recommend that you review the terms of service and privacy policies of those websites and services.</p>

<p>7. Children’s privacy. The websites provided by Crucible Leadership Guild are not directed at, or intended for use by, children. Children should always get permission from a parent or guardian before sending personal information over the Internet. If you believe your child may have provided us with personal information, you can contact us and request that we delete the information. You can find more information about protecting children ‘s privacy by contacting the Federal Trade Commission (“FTC”) or viewing its website at <a href="https://www.ftc.gov" target="_blank" rel="noopener noreferrer">www.ftc.gov</a>.</p>

<h2>Customer Access and Choice</h2>
<p>You may check the accuracy of your PII in your account by contacting us at <a href="mailto:${esc(site.email)}?subject=Website%20Feedback">Contact Support</a>. In most cases, the PII contained in these records consists solely of billing information. If your review reveals an error in our records, Crucible Leadership Guild will correct it. You will only be permitted to examine records that contain PII about your account and no other account.</p>

<p>You have the right to prohibit or limit certain kinds of disclosures and marketing. You may contact Crucible Leadership Guild at <a href="mailto:${esc(site.email)}?subject=Website%20Feedback">Contact Support</a> to ask us to put your name on our internal company (Do Not Call) and (Do Not Mail) lists so that you do not receive marketing or promotional telephone calls or postal mail from us or made at our request.</p>

<p>You also have the right to prohibit or limit disclosure of your PII for (mailing list) or other purposes as described above in this notice. You may contact us at <a href="mailto:${esc(site.email)}?subject=Website%20Feedback">Contact Support</a> to restrict such disclosures. Please include your name, email address and phone number when contacting us for this purpose.</p>

<h2>Retention of Information</h2>
<p>Crucible Leadership Guild may retain PII and other information, in its regular business records while you are a customer and for a period of time after you are no longer a customer until such information is no longer needed for any business, tax or legal purpose.</p>

<h2>Security of Information</h2>
<p>We protect against the loss, misuse and alteration of PII we collect through the use of appropriate administrative, technical and physical safeguards. Our servers are protected by reasonable physical and electronic security measures, and we use encryption wherever required or if we feel it is warranted. However, we cannot guarantee that these practices will prevent every unauthorized attempt to access, use, or disclose PII.</p>

<p>Thank you for choosing Crucible Leadership Guild.</p>

<p>Effective: November 8, 2026</p>`,
    })
  );
{
  const N = mentoring.policy.noticeDays;
  const ex = mentoring.plans.find((p) => p.sessionsPerPeriod > 1) || mentoring.plans[0];
  const price = Number(ex.prices[0].amount), per = price / ex.sessionsPerPeriod;
  const left = ex.sessionsPerPeriod - 1;
  write(
    "terms",
    page({
      title: `Terms & refund policy | ${site.name}`,
      description: "Terms, cancellation and refund policy",
      path: "/terms/",
      body: `<h1>Terms &amp; refund policy</h1>
<h2>Terms of Use</h2>
<p>This website is owned and operated by Crucible Leadership Guild. Please read the Website Terms and Conditions stated below (the “Website Terms and Conditions”). By using this website, you agree to abide by these Website Terms and Conditions. We reserve the right to change these Website Terms and Conditions as needed without notice. By continuing to use the website after we post any changes, you accept and agree to our terms and conditions, as modified.</p>

<h2>Privacy</h2>
<p>Crucible Leadership Guild respects the privacy of visitors to our website. You may review our Privacy Statement located on this website for more details.</p>

<h2>Feedback</h2>
<p>If you have any questions or comments about this website or want to bring to our attention any material you believe to be inaccurate, please contact us at <a href="mailto:${esc(site.email)}?subject=Website%20Feedback">Contact Support</a>. We will, if appropriate, respond to you.</p>

<h2>Contents and Linking</h2>
<p>The material that appears on this website is for general informational purposes only. While we try to ensure that any posted information is both current and accurate, we cannot be held responsible for any inadvertent errors. This website may not be updated daily, and therefore certain information may not be the very latest information available. Before you act on information you’ve found on our website, you should independently confirm any facts that are important to your decision. Crucible Leadership Guild is not responsible for information provided by any advertisers or others, including those to whose websites we link. By linking to another website, we are not endorsing that website or any product or service offered on that site. Although we make this website freely available and accessible to the general public, we do not give up our rights, or anyone else’s rights, to the materials appearing on the website. The materials available through this website are solely the property of Crucible Leadership Guild and are protected by copyright, trademark and other intellectual property laws. Except for the limited licenses expressly granted to you in these Website Terms and Conditions, Crucible Leadership Guild reserves all other rights and licenses. You have permission to display and print for your personal, non-commercial use any information you see on this website, but you may not otherwise reproduce or modify any of the materials without the prior written consent of Crucible Leadership Guild. You are not permitted to distribute copies of materials found on this website in any form (including by e-mail or other electronic means), without prior written permission from Crucible Leadership Guild. Requests for permission to reproduce or distribute materials found on this website should be sent to leadership@crucibleleadershipguild.com. Crucible Leadership Guild welcomes links to the home page of this website so long as the link does not state or imply any affiliation, connection, sponsorship, or approval of your site by Crucible Leadership Guild. We do not permit framing or inline linking to our website or any portion of it.</p>

<h2>Trademarks</h2>
<p>You are not permitted to use any trademark or service mark appearing on this website without the prior written consent of Crucible Leadership Guild. Our logo are registered trademarks and/or service marks of Crucible Leadership Guild. Other trademarks appearing on this website or other sites linked to from this website are the property of Crucible Leadership Guild or their respective owners.</p>

<h2>Ordering Products and Services</h2>
<p>Some products and services of Crucible Leadership Guild may be ordered through this website. All orders you make through this website are subject to the availability, terms, and other conditions that apply to the particular products and services when you place your order. All products and services, their contents, availability, and pricing are subject to change at any time without notice. We encourage you to read the terms and disclaimers accompanying any products or services that you order through this website before making a purchase.</p>

<h2>Submissions and Postings Disclosure</h2>
<p>You are solely responsible for any information that you submit or post on this website. Do not submit, post, or transmit any defamatory, abusive, obscene, threatening, or illegal material, or any other material that could be considered offensive and/or infringes on the rights of others. We retain the right to deny access to anyone who we believe has violated these terms or any other term of these Website Terms and Conditions. At our discretion, we may monitor, delete, move, or edit any submissions or posts that we consider unacceptable or inappropriate, whether for legal or other reasons. We will comply with all requirements of the law regarding disclosure of any submissions or postings on this website to others, including to law enforcement agencies and parties making civil legal requests. We will also comply with any other requirements of the law regarding disclosure of other aspects of your use of this website. Crucible Leadership Guild encourages you to provide feedback about this website and our products and services. We will consider any communications you send to this website or Crucible Leadership Guild through other means to be non-confidential. Those submissions become the sole property of Crucible Leadership Guild, and we may choose to reproduce, use, publish, modify, disclose, distribute, or otherwise use these communications in any way and for any purpose as we feel is appropriate. All such uses by Crucible Leadership Guild will be without liability or obligation of any kind to you for compensation. These uses may include use of the content of any such communications, including any works, marks, names, ideas, inventions, concepts, techniques or know-how disclosed therein, for any purpose.</p>

<h2>Termination</h2>
<p>Crucible Leadership Guild reserves the right at any time to terminate your use of this website if you fail to comply in full with any items in these Website Terms and Conditions, or any other terms, agreements, or policies that apply to this website.</p>

<h2>Indemnification</h2>
<p>You agree to indemnify, defend, and hold harmless Crucible Leadership Guild (including its parents, subsidiaries, and affiliates and all of their respective officers, directors, employees, agents, licensors, suppliers, and any third-party information providers) against all claims, losses, expenses, damages, and costs (including reasonable attorney fees) resulting from any breach of these Website Terms and Conditions or unauthorized use of this website. Your indemnification obligation will apply beyond the termination of these Website Terms and Conditions. At our expense and election, we reserve the right to assume the exclusive defense and control of any matter subject to indemnification by you, and you agree to cooperate with Crucible Leadership Guild in connection with our defense.</p>

<h2>Disclaimer of Warranties and Liability</h2>
<p>Use of this website is solely at your own risk. Because of the number of possible sources of information available through the website, and the uncertainties of electronic distribution, Crucible Leadership Guild cannot be held responsible for any interruptions, delays, omissions, inaccuracies, or other problems with such information. If you rely on this website or any material available through this website, you do so at your own risk. You are solely responsible should any damage to your computer system or loss of data result from any material and/or data downloaded from, or otherwise provided through, this website. This website is provided to you “as is,” “with all faults,” and “as available.” Crucible Leadership Guild and its agents and licensors cannot warrant the accuracy, completeness, usefulness, timeliness, non-infringement, merchantability, or fitness for a particular purpose of the information available through the website. Crucible Leadership Guild does not guarantee that the website will be error-free, continuously available or free of viruses or other potentially harmful works. Under no circumstances is Crucible Leadership Guild, including its parents, subsidiaries, affiliates, agents and licensees, liable to you or anyone else for any damages arising out of any use or misuse of this website, including, without limitation, liability for consequential, special, incidental, indirect, or similar damages, even if advised beforehand of the possibility of such damages, regardless of the form or cause of action including, but not limited to, contract, negligence, and other tort actions. Because some states do not allow the exclusion or limitation of certain categories of damages, the above limitation may not apply to you. In such states, the liability of Crucible Leadership Guild and its agents and licensors is limited to the fullest extent permitted by such state law. You agree that the liability of Crucible Leadership Guild (including its parents, subsidiaries, and affiliates) and its agents and licensors, if any, arising out of any kind of legal claim in any way connected to the website shall not exceed the amount you paid to Crucible Leadership Guild for use of the website.</p>

<h2>Miscellaneous</h2>
<p>To obtain access to certain services on our website, you may be required to enter personal information. You agree that the information you supply during that  process will be accurate, complete, and apply to you. You will not enter information under the name of, nor attempt to enter the service under the name of, another person. You will be responsible for preserving the confidentiality of your information and will notify us of any known or suspected unauthorized use of your information. At certain places on this website there may be additional or other terms and policies that apply to your use of this website and the services on it. By using the website or those services, you agree to abide by those terms and policies. We can change those terms and policies as needed at our discretion. By continuing to use the website after we post any changes, you accept and agree to those terms and policies, as modified. These Website Terms and Conditions have been written in accordance with the laws of the state of Florida. By using this website, you consent to the exclusive jurisdiction of the state and federal courts in Florida, in all disputes arising out of or relating to these Website Terms and Conditions or this website. In the event that any portion of these Website Terms and Conditions are held to be unenforceable, the unenforceable portion shall be construed in accordance with applicable law as nearly as possible to reflect the original intentions of the parties, and the remainder of the provisions shall remain in full force and effect. By using this website, you agree to abide by the terms of these Website Terms and Conditions. We hope you enjoy using this website, and we welcome suggestions for improvements.</p>

<h2 id="digital-products">Digital products (PDF guides and courses)</h2>
<p>All sales of digital products are final. Our PDF guides and courses are delivered for immediate download after payment, so we do not offer refunds or exchanges once a purchase is complete.</p>
<p>If you have trouble downloading or opening your file, email <a href="mailto:${esc(site.email)}">${esc(site.email)}</a> with your receipt and we will help you get it. Nothing in these terms limits any rights you have under the consumer laws where you live.</p>
<h2 id="mentoring">Mentoring subscriptions</h2>
<h2>Availability</h2>
<p>${esc(site.availability)} We cannot accept orders or subscriptions from customers outside the United States.</p>
<p>Each plan includes one dedicated hour per week to ask questions, discuss problems and develop action plans to move forward as a leader.</p>
<h3>Booking sessions</h3>
<p>After you subscribe we email you a private link to our calendar. Use it to book your sessions. Please do not share the link.</p>
<h3>Cancellation and refunds</h3>
<ol>
<li>Send your cancellation as written notice (email is fine) to <a href="mailto:${esc(site.email)}">${esc(site.email)}</a>.</li>
<li>To receive a prorated refund for unused sessions, we must receive your notice at least ${N} days before your cancellation takes effect. Your cancellation takes effect ${N} days after we receive your notice, or on a later date you name. You can keep booking sessions until then.</li>
<li>Your refund covers sessions you have paid for that fall after the date your cancellation takes effect. It is calculated as the number of those unused sessions multiplied by the per-session price (the plan price divided by the number of weekly sessions in that billing period).</li>
<li>Sessions during the ${N}-day notice period, and sessions already held or missed, are not refunded.</li>
<li>Refunds go back to the original payment method. Any tax collected on the refunded amount is refunded too.</li>
<li>Nothing in these terms limits any rights you have under the consumer laws where you live.</li>
</ol>
<h3>Example</h3>
<p>The ${esc(ex.name)} plan costs ${esc(money(ex.prices[0]))} for ${ex.sessionsPerPeriod} weekly sessions, so each session is worth $${per.toFixed(2)}. If your cancellation takes effect after the first session of a paid period, the remaining ${left} sessions are refunded: ${left} &times; $${per.toFixed(2)} = $${(left * per).toFixed(2)}.</p>`,
    })
  );
}
legal("privacy", "Privacy policy");

// Sitemap
const paths = ["/", "/mentoring/", "/terms/", "/privacy/", ...products.map((p) => `/products/${p.slug}/`)];
const base = site.url.replace(/\/$/, "");
writeFileSync(
  join(OUT, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${paths
    .map((p) => `<url><loc>${esc(base + p)}</loc></url>`)
    .join("\n")}\n</urlset>\n`
);
writeFileSync(join(OUT, "robots.txt"), `User-agent: *\nAllow: /\nDisallow: /download\nDisallow: /thanks/\nSitemap: ${base}/sitemap.xml\n`);

console.log(`Built ${paths.length} pages into ${OUT}/`);
