// helper/footer/termsAndConditionsHelper.js

import { ObjectId } from "mongodb";
import termsAndConditionsModel from "../../model/footer/termsAndConditionsModel.js";

export const createTermsAndConditions =
  async function (reqBody = {}) {
    try {
      const items = Array.isArray(reqBody.data)
        ? reqBody.data
        : [];

      if (!items.length) {
        throw new Error("Data array is required");
      }

      const payload = {
        data: items.map((item) => ({
          header: item.header?.trim(),
          content: item.content?.trim(),
        })),
      };

      const document =
        new termsAndConditionsModel(payload);

      const result = await document.save();
      return result;
    } catch (error) {
      console.error(
        "Error creating Terms & Conditions:",
        error
      );

      if (error.name === "ValidationError") {
        throw new Error(
          Object.values(error.errors)
            .map((e) => e.message)
            .join(", ")
        );
      }

      throw error;
    }
  };

export const viewTermsAndConditions = async (id) => {
  try {
    if (!ObjectId.isValid(id)) {
      throw new Error("Invalid Terms ID");
    }

    const result =
      await termsAndConditionsModel
        .findById(id)
        .lean();

    if (!result) {
      throw new Error(
        "Terms & Conditions not found"
      );
    }

    return result;
  } catch (error) {
    console.error(
      "Error fetching Terms & Conditions:",
      error
    );
    throw error;
  }
};

export const viewAllTermsAndConditions =
  async ({
    pageNo,
    pageSize,
    search,
    sortBy,
    sortOrder,
  }) => {
    try {
      let query = {};

      if (search && search.trim() !== "") {
        query.$or = [
          {
            "data.header": {
              $regex: search,
              $options: "i",
            },
          },
          {
            "data.content": {
              $regex: search,
              $options: "i",
            },
          },
        ];
      }

      let sortQuery = {
        createdAt: -1,
      };

      if (sortBy) {
        sortQuery = {
          [sortBy]: sortOrder,
        };
      }

      const total =
        await termsAndConditionsModel.countDocuments(
          query
        );

      const list =
        await termsAndConditionsModel
          .find(query)
          .sort(sortQuery)
          .skip((pageNo - 1) * pageSize)
          .limit(pageSize)
          .lean();

      return { list, total };
    } catch (error) {
      console.error(
        "Error fetching all Terms & Conditions:",
        error
      );
      throw error;
    }
  };

export const updateTermsAndConditions =
  async (id, reqBody = {}) => {
    try {
      if (!ObjectId.isValid(id)) {
        throw new Error("Invalid Terms ID");
      }

      const items = Array.isArray(reqBody.data)
        ? reqBody.data
        : [];

      if (!items.length) {
        throw new Error("Data array is required");
      }

      const payload = {
        data: items.map((item) => ({
          header: item.header?.trim(),
          content: item.content?.trim(),
        })),
      };

      const result =
        await termsAndConditionsModel.findByIdAndUpdate(
          id,
          payload,
          {
            new: true,
            runValidators: true,
          }
        );

      if (!result) {
        throw new Error(
          "Terms & Conditions not found"
        );
      }

      return result;
    } catch (error) {
      console.error(
        "Error updating Terms & Conditions:",
        error
      );
      throw error;
    }
  };

export const deleteTermsAndConditions =
  async (id) => {
    try {
      if (!ObjectId.isValid(id)) {
        throw new Error("Invalid Terms ID");
      }

      const result =
        await termsAndConditionsModel.findByIdAndDelete(
          id
        );

      if (!result) {
        throw new Error(
          "Terms & Conditions not found"
        );
      }

      return result;
    } catch (error) {
      console.error(
        "Error deleting Terms & Conditions:",
        error
      );
      throw error;
    }
  };