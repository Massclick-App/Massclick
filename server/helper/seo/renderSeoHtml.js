import fs from "fs";
import path from "path";
import { getSeoMeta } from "../helper/seo/seoHelper.js";

const indexPath = path.resolve("client/ui-app/build/index.html");

export const renderSeoHtml = async (req, res) => {
  try {
    const [location, category] = req.path.split("/").filter(Boolean);

    const seo = await getSeoMeta({
      pageType: "category",
      category,
      location,
    });

    let html = fs.readFileSync(indexPath, "utf8");

    html = html
      .replace(/<title>.*?<\/title>/,
        `<title>${seo.title}</title>`
      )
      .replace(
        "</head>",
        `
<meta name="description" content="${seo.description || ""}" />
<meta name="keywords" content="${seo.keywords || ""}" />
<meta name="robots" content="${seo.robots || "index,follow"}" />
<link rel="canonical" href="${seo.canonical || ""}" />

<meta property="og:title" content="${seo.title}" />
<meta property="og:description" content="${seo.description || ""}" />
<meta property="og:url" content="${seo.canonical || ""}" />
<meta property="og:type" content="website" />

</head>`
      );

    res.send(html);
  } catch (e) {
    console.error("SEO HTML ERROR:", e);
    res.sendFile(indexPath);
  }
};
