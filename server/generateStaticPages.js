import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import dotenv from "dotenv";

import businessListModel from "./model/businessList/businessListModel.js";
import seoModel from "./model/seoModel/seoModel.js";
import { slugify } from "./slugify.js";

dotenv.config();

const BUILD_PATH =
"/var/www/massclickQA/client/ui-app/build";

const createFolder = (folder) => {
  if (!fs.existsSync(folder))
    fs.mkdirSync(folder, { recursive: true });
};

const generatePages = async () => {

  await mongoose.connect(process.env.MONGO_URL);

  console.log("Connected to MongoDB");

  const template = fs.readFileSync(
    path.join(BUILD_PATH, "index.html"),
    "utf8"
  );

  const categories = await businessListModel.aggregate([
    {
      $match: {
        isActive: true,
        businessesLive: true
      }
    },
    {
      $group: {
        _id: {
          location: "$location",
          category: "$category"
        }
      }
    }
  ]);

  console.log("Generating pages:", categories.length);

  for (const item of categories) {

    const locationSlug = slugify(item._id.location);
    const categorySlug = slugify(item._id.category);

    const folderPath = path.join(
      BUILD_PATH,
      locationSlug,
      categorySlug
    );

    createFolder(folderPath);

    const seo = await seoModel.findOne({
      location: item._id.location,
      category: item._id.category
    }).lean();

    let html = template;

    if (seo) {

      html = html.replace(
        /<title>.*<\/title>/,
        `<title>${seo.title || "Massclick"}</title>`
      );

      html = html.replace(
        "</head>",
        `
<meta name="description" content="${seo.description || ""}">
<meta name="keywords" content="${seo.keywords || ""}">
<link rel="canonical" href="https://massclick.in/${locationSlug}/${categorySlug}">
<meta name="robots" content="index,follow">

<meta property="og:title" content="${seo.title || ""}">
<meta property="og:description" content="${seo.description || ""}">
<meta property="og:url" content="https://massclick.in/${locationSlug}/${categorySlug}">
<meta property="og:type" content="website">

</head>`
      );

    }

    fs.writeFileSync(
      path.join(folderPath, "index.html"),
      html
    );

    console.log("Created:", locationSlug + "/" + categorySlug);

  }

  console.log("All pages generated");

  process.exit();

};

generatePages();