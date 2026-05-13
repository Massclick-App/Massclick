import mongoose from "mongoose";
import dotenv from "dotenv";

import categoryModel from "../model/category/categoryModel.js";

dotenv.config();

const MONGO_URI = process.env.MONGO_URL;

const cleanString = (value = "") => {
  return value.trim();
};

const runCategoryCleanup = async () => {

  try {

    await mongoose.connect(MONGO_URI);

    console.log("MongoDB Connected");

    const categories = await categoryModel.find({});

    let updatedCount = 0;

    for (const category of categories) {

      const updatedData = {};

      Object.keys(category._doc).forEach((key) => {

        const value = category[key];

        // STRING CLEAN
        if (typeof value === "string") {

          updatedData[key] = cleanString(value);
        }

        // ARRAY CLEAN
        else if (Array.isArray(value)) {

          updatedData[key] = value.map((item) => {

            if (typeof item === "string") {
              return cleanString(item);
            }

            return item;
          });
        }

        // OTHER TYPES
        else {

          updatedData[key] = value;
        }
      });

      await categoryModel.updateOne(
        { _id: category._id },
        {
          $set: updatedData,
        }
      );

      updatedCount++;

      console.log(
        `CLEANED : ${category.category}`
      );
    }

    console.log("\n======================");
    console.log(`TOTAL CLEANED : ${updatedCount}`);
    console.log("======================\n");

    process.exit(0);

  } catch (error) {

    console.log("SCRIPT ERROR :", error);

    process.exit(1);
  }
};

runCategoryCleanup();