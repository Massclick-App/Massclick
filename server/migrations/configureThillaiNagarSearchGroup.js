import mongoose from "mongoose";
import dotenv from "dotenv";

import masterLocationModel from "../model/locationModel/masterLocationModel.js";

dotenv.config();

const APPLY = process.argv.includes("--apply");
const SEARCH_GROUP_SLUG = "tamil-nadu-tiruchirappalli-thillai-nagar";
const SEARCH_GROUP_NAMES = [
  "Thillai Nagar",
  "Thillainagar",
  "Thillai Nager",
  "West Thillai Nagar",
  "Thillai Nagar West",
];
const MEMBER_SLUG_PATTERN =
  /^tamil-nadu-tiruchirappalli-k-abishekapuram-thillai-nagar-(?:east|main)(?:-|$)/;
const EXPECTED_MEMBER_COUNT = 8;

const uniqueStrings = (values = []) => [
  ...new Set(values.map((value) => String(value || "").trim()).filter(Boolean)),
];

const run = async () => {
  if (!process.env.MONGO_URL) {
    throw new Error("MONGO_URL is required.");
  }

  // Existing collection indexes use deliberate names that differ from
  // Mongoose's generated names, so this migration manages only its own index.
  await mongoose.connect(process.env.MONGO_URL, { autoIndex: false });

  const members = await masterLocationModel
    .find({
      district: "Tiruchirappalli",
      slug: MEMBER_SLUG_PATTERN,
      isActive: true,
    })
    .sort({ slug: 1 })
    .lean();

  if (members.length !== EXPECTED_MEMBER_COUNT) {
    throw new Error(
      `Expected ${EXPECTED_MEMBER_COUNT} active Thillai Nagar members, found ${members.length}.`,
    );
  }

  const operations = members.map((member) => {
    const isWard = member.level === "ward";
    const alternateNames = isWard
      ? uniqueStrings([
          ...(member.alternateNames || []),
          ...SEARCH_GROUP_NAMES,
        ])
      : member.alternateNames || [];
    const keywords = isWard
      ? uniqueStrings([
          ...(member.keywords || []),
          ...alternateNames.map((name) => name.toLowerCase()),
        ])
      : member.keywords || [];

    return {
      updateOne: {
        filter: { _id: member._id },
        update: {
          $set: {
            searchGroupSlug: SEARCH_GROUP_SLUG,
            searchGroupNames: SEARCH_GROUP_NAMES,
            alternateNames,
            keywords,
          },
        },
      },
    };
  });

  console.log(
    `${APPLY ? "APPLY" : "DRY RUN"}: ${operations.length} Thillai Nagar masterlocations`,
  );
  for (const member of members) {
    console.log(`- ${member.level}: ${member.slug}`);
  }

  if (!APPLY) {
    console.log("No changes written. Re-run with --apply to update the dev database.");
    return;
  }

  const result = await masterLocationModel.bulkWrite(operations);
  const indexes = await masterLocationModel.collection.indexes();
  const hasSearchGroupIndex = indexes.some(
    (index) => index.key?.searchGroupSlug === 1,
  );
  if (!hasSearchGroupIndex) {
    try {
      await masterLocationModel.collection.createIndex(
        { searchGroupSlug: 1 },
        { name: "search_group_slug" },
      );
    } catch (error) {
      // Mongoose can finish auto-index creation between indexes() and
      // createIndex(). The equivalent index is already usable in that case.
      if (error?.code !== 85) throw error;
    }
  }

  console.log(
    `Matched: ${result.matchedCount}; modified: ${result.modifiedCount}; index ready.`,
  );
};

run()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
