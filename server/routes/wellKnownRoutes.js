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

const ANDROID_PACKAGE_NAME =
  process.env.ANDROID_APP_LINK_PACKAGE_NAME || "com.massclick.massclick";
const DEFAULT_ANDROID_SHA256_CERT_FINGERPRINTS = [
  // Debug signing certificate used by local Android debug builds.
  "F5:85:F4:C4:F2:38:1D:D4:B3:43:F8:E1:C4:E7:B3:4A:F8:55:04:6B:66:01:7E:8A:6D:BC:AF:F5:AC:49:43:61",
  // Release upload key from android/app/massclick_prod.jks.
  "4C:7D:AD:69:66:86:BC:26:66:8F:86:B6:90:68:2B:0F:7D:3C:48:F5:E5:87:95:E5:10:F0:42:82:C9:53:2C:73",
  // Play App Signing certificate from Play Console.
  "9A:46:79:C2:E4:63:C9:FD:21:7B:76:70:58:8B:D8:06:57:97:EB:E9:FA:75:02:11:1C:45:12:D0:F1:B2:59:52",
];
const IOS_BUNDLE_ID =
  process.env.IOS_APP_LINK_BUNDLE_ID || "com.massclick.massclick";
const IOS_TEAM_ID =
  process.env.IOS_APP_LINK_TEAM_ID || process.env.APPLE_TEAM_ID;

const splitCsv = (value) =>
  String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const sendAssociationJson = (res, body) => {
  res.type("application/json");
  res.set("Cache-Control", "public, max-age=3600");
  return res.status(200).send(JSON.stringify(body));
};

const sendMissingAssociationConfig = (res, message) => {
  res.type("application/json");
  res.set("Cache-Control", "no-store");
  return res.status(503).send(JSON.stringify({ success: false, message }));
};

const androidSha256Fingerprints = () => [
  ...new Set([
    ...DEFAULT_ANDROID_SHA256_CERT_FINGERPRINTS,
    ...splitCsv(process.env.ANDROID_APP_LINK_SHA256_CERT_FINGERPRINTS),
  ]),
];

const iosAppIds = () => {
  const configuredAppIds = splitCsv(process.env.IOS_APP_LINK_APP_IDS);
  if (configuredAppIds.length > 0) return configuredAppIds;
  if (!IOS_TEAM_ID) return [];
  return [`${IOS_TEAM_ID}.${IOS_BUNDLE_ID}`];
};

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

router.get("/.well-known/assetlinks.json", (req, res) => {
  const fingerprints = androidSha256Fingerprints();
  if (fingerprints.length === 0) {
    return sendMissingAssociationConfig(
      res,
      "Set ANDROID_APP_LINK_SHA256_CERT_FINGERPRINTS to enable Android App Links."
    );
  }

  return sendAssociationJson(res, [
    {
      relation: ["delegate_permission/common.handle_all_urls"],
      target: {
        namespace: "android_app",
        package_name: ANDROID_PACKAGE_NAME,
        sha256_cert_fingerprints: fingerprints,
      },
    },
  ]);
});

const sendAppleAppSiteAssociation = (req, res) => {
  const appIds = iosAppIds();
  if (appIds.length === 0) {
    return sendMissingAssociationConfig(
      res,
      "Set IOS_APP_LINK_TEAM_ID or IOS_APP_LINK_APP_IDS to enable iOS Universal Links."
    );
  }

  return sendAssociationJson(res, {
    applinks: {
      apps: [],
      details: [
        {
          appIDs: appIds,
          components: [
            {
              "/": "/*",
              comment: "Open Massclick app for supported web routes.",
            },
          ],
          paths: ["*"],
        },
      ],
    },
  });
};

router.get(
  "/.well-known/apple-app-site-association",
  sendAppleAppSiteAssociation
);
router.get("/apple-app-site-association", sendAppleAppSiteAssociation);

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
