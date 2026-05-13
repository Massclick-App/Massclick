import mongoose from "mongoose";
import dotenv from "dotenv";

import businessListModel from "../model/businessList/businessListModel.js";
import categoryModel from "../model/category/categoryModel.js";

dotenv.config();

const MONGO_URI = process.env.MONGO_URL;

const normalizeText = (text = "") => {
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
};

const updateBusinessCategories = async () => {

  try {

    await mongoose.connect(MONGO_URI);

    console.log("MongoDB Connected");

    const categories = await categoryModel.find({
      isActive: true,
    });

    const businesses = await businessListModel.find({});

    let updatedCount = 0;
    let skippedCount = 0;

    for (const business of businesses) {

      const businessCategory = normalizeText(
        business.category
      );

      const matchedCategory = categories.find(
        (category) =>
          normalizeText(category.category) ===
          businessCategory
      );

      if (!matchedCategory) {

        skippedCount++;

        console.log(
          `SKIPPED : ${business.businessName} -> ${business.category}`
        );

        continue;
      }

      const updatePayload = {
        keywords: matchedCategory.keywords || [],
        slug: matchedCategory.slug || "",
        seoTitle: matchedCategory.seoTitle || "",
        seoDescription:
          matchedCategory.seoDescription || "",
        title: matchedCategory.title || "",
        description:
          matchedCategory.description || "",
      };

      await businessListModel.updateOne(
        {
          _id: business._id,
        },
        {
          $set: updatePayload,
        }
      );

      updatedCount++;

      console.log(
        `UPDATED : ${business.businessName} -> ${matchedCategory.category}`
      );
    }

    console.log("\n=================================");
    console.log(`TOTAL UPDATED : ${updatedCount}`);
    console.log(`TOTAL SKIPPED : ${skippedCount}`);
    console.log("=================================\n");

    process.exit(0);

  } catch (error) {

    console.log("SCRIPT ERROR :", error);

    process.exit(1);
  }
};

updateBusinessCategories();