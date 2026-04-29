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
  res.type("text/plain");
  res.send(`User-agent: *
Content-Signal: search=yes, ai-input=yes, ai-train=no
Allow: /

User-agent: OAI-SearchBot
Allow: /

User-agent: GPTBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: Claude-SearchBot
Allow: /

User-agent: Claude-User
Allow: /

User-agent: Google-Extended
Disallow: /

Sitemap: https://massclick.in/sitemap.xml`);
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
