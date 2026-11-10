// Cloudflare Worker entry. Static files in dist/ are served by the assets binding;
// only GET /download (no matching static file) reaches this code.
import { handleDownload } from "./download.js";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/download") {
      if (request.method !== "GET" && request.method !== "HEAD")
        return new Response("Method not allowed", { status: 405, headers: { Allow: "GET, HEAD" } });
      return handleDownload(request, env);
    }
    return env.ASSETS.fetch(request);
  },
};
