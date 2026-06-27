import mongoose from "mongoose";
import authorMasterModel from "../model/seoModel/authorMasterModel.js";

const generateSlug = (displayName) => {
  return displayName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

export const populateAuthorSlugs = async () => {
  try {
    console.log("Starting author slug migration...");

    const authors = await authorMasterModel.find({ $or: [{ slug: null }, { slug: "" }] });

    console.log(`Found ${authors.length} authors without slugs`);

    if (authors.length === 0) {
      console.log("No authors need slug population");
      return;
    }

    let updated = 0;
    for (const author of authors) {
      if (author.displayName) {
        author.slug = generateSlug(author.displayName);
        await author.save();
        updated++;
        console.log(`Updated: ${author.displayName} -> ${author.slug}`);
      }
    }

    console.log(`Migration complete! Updated ${updated} authors`);
  } catch (error) {
    console.error("Migration failed:", error);
    throw error;
  }
};
