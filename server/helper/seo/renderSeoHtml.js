import fs from "fs";
import path from "path";
import { getSeoMeta } from "./seoHelper.js";
import { escapeHtml } from "../../utils/htmlUtils.js";

const CLIENT_BUILD_PATH = process.env.REACT_BUILD_PATH;

export const renderSeoHtml = async (req, res) => {
  try {
    const [location, category] = req.path.split("/").filter(Boolean);

    const seo = await getSeoMeta({
      pageType: "category",
      category,
      location,
    });

    if (!CLIENT_BUILD_PATH) {
      throw new Error("REACT_BUILD_PATH environment variable not set");
    }

    const indexPath = path.join(CLIENT_BUILD_PATH, "index.html");
    let html = fs.readFileSync(indexPath, "utf8");

    html = html
      .replace(/<title>.*?<\/title>/,
        `<title>${escapeHtml(seo.title || "")}</title>`
      )
      .replace(
        "</head>",
        `
<meta name="description" content="${escapeHtml(seo.description || "")}" />
<meta name="keywords" content="${escapeHtml(seo.keywords || "")}" />
<meta name="robots" content="${escapeHtml(seo.robots || "index,follow")}" />
<link rel="canonical" href="${escapeHtml(seo.canonical || "")}" />

<meta property="og:title" content="${escapeHtml(seo.title || "")}" />
<meta property="og:description" content="${escapeHtml(seo.description || "")}" />
<meta property="og:url" content="${escapeHtml(seo.canonical || "")}" />
<meta property="og:type" content="website" />

</head>`
      );

    res.send(html);
  } catch (e) {
    console.error("SEO HTML ERROR:", e);
    if (CLIENT_BUILD_PATH) {
      const indexPath = path.join(CLIENT_BUILD_PATH, "index.html");
      res.sendFile(indexPath);
    } else {
      res.status(500).send("Build path not configured");
    }
  }
};
