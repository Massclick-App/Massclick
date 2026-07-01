import express from "express";
import { register } from "../utils/metrics.js";
import {
  SITE_ORIGIN,
  API_CATALOG_PROFILE,
  API_CATALOG_PATH,
  API_DOCS_PATH,
  publicApiCatalog,
} from "../config/apiCatalog.js";

const router = express.Router();

router.get("/metrics", async (req, res) => {
  res.set("Content-Type", register.contentType);
  res.end(await register.metrics());
});

router.get("/robots.txt", (req, res) => {
  res.type("text/plain; charset=utf-8");
  res.set("Cache-Control", "public, max-age=86400");
  res.status(200).send(`# https://www.robotstxt.org/robotstxt.html

User-agent: *
Allow: /

# ── Google ───────────────────────────────────────────────
User-agent: Googlebot
Allow: /

# Google AI training (Gemini)
User-agent: Google-Extended
Allow: /

# ── OpenAI ───────────────────────────────────────────────
User-agent: GPTBot
Allow: /

User-agent: OAI-SearchBot
Allow: /

User-agent: ChatGPT-User
Allow: /

# ── Anthropic / Claude ───────────────────────────────────
User-agent: ClaudeBot
Allow: /

User-agent: Claude-SearchBot
Allow: /

User-agent: Claude-User
Allow: /

User-agent: anthropic-ai
Allow: /

# ── Perplexity ───────────────────────────────────────────
User-agent: PerplexityBot
Allow: /

# ── Apple Intelligence ───────────────────────────────────
User-agent: Applebot
Allow: /

User-agent: Applebot-Extended
Allow: /

# ── Amazon / Alexa ───────────────────────────────────────
User-agent: Amazonbot
Allow: /

# ── Meta / Facebook ──────────────────────────────────────
User-agent: FacebookBot
Allow: /

# ── Microsoft / Bing ─────────────────────────────────────
User-agent: bingbot
Allow: /

# ── You.com ──────────────────────────────────────────────
User-agent: YouBot
Allow: /

# ── Cohere ───────────────────────────────────────────────
User-agent: cohere-ai
Allow: /

# ── ByteDance / TikTok ───────────────────────────────────
User-agent: Bytespider
Allow: /

# ── Admin / API routes ───────────────────────────────────
User-agent: *
Disallow: /admin
Disallow: /api/

Sitemap: https://massclick.in/sitemap.xml
`);
});

router.get("/health", (req, res) => {
  res.status(200).json({ success: true, uptime: process.uptime() });
});

router.get(API_CATALOG_PATH, (req, res) => {
  const body = {
    linkset: [
      {
        anchor: `${SITE_ORIGIN}${API_CATALOG_PATH}`,
        "service-doc": [{ href: `${SITE_ORIGIN}${API_DOCS_PATH}`, type: "text/html" }],
        item: publicApiCatalog,
      }
    ]
  };
  res.set("Content-Type", `application/linkset+json; profile="${API_CATALOG_PROFILE}"`);
  return res.status(200).send(JSON.stringify(body));
});

router.get(API_DOCS_PATH, (req, res) => {
  res.type("text/html; charset=utf-8");
  return res.status(200).send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Massclick API Discovery</title>
  <meta
    name="description"
    content="API discovery page for Massclick public endpoints, catalog, and health resources."
  />
</head>
<body style="font-family: Arial, sans-serif; padding: 24px; line-height: 1.6;">
  <h1>Massclick API Discovery</h1>
  <p>This page lists public-facing API resources exposed by Massclick for agents, integrations, and developers.</p>
  <p>Machine-readable catalog: <a href="${API_CATALOG_PATH}">${SITE_ORIGIN}${API_CATALOG_PATH}</a></p>
  <ul>
    ${publicApiCatalog.map((entry) => `<li><a href="${entry.href}">${entry.title}</a> <code>${entry.href}</code></li>`).join("")}
  </ul>
</body>
</html>`);
});

export default router;
