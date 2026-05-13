import mongoose from "mongoose";
import dotenv from "dotenv";

import businessListModel from "../model/businessList/businessListModel.js";

dotenv.config();

const MONGO_URI = process.env.MONGO_URL;

const cleanString = (value = "") => {
  return value.trim();
};

const runCleanup = async () => {

  try {

    await mongoose.connect(MONGO_URI);

    console.log("MongoDB Connected");

    const businesses = await businessListModel.find({});

    let updatedCount = 0;

    for (const business of businesses) {

      const updatedData = {};

      Object.keys(business._doc).forEach((key) => {

        const value = business[key];

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

      await businessListModel.updateOne(
        { _id: business._id },
        {
          $set: updatedData,
        }
      );

      updatedCount++;

      console.log(
        `CLEANED : ${business.businessName}`
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

runCleanup();