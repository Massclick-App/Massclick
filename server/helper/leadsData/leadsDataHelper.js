import message91UserModel from "../../model/msg91Model/usersModels.js";
import searchLogModel from "../../model/businessList/searchLogModel.js";

export const getCategoryBasedLeads = async (mobileNumber) => {
  const normalizedMobile = String(mobileNumber).trim();

  const user = await message91UserModel.findOne({
    mobileNumber1: normalizedMobile,
  }).lean();

  if (!user) {
    throw new Error("User not found");
  }

  const rawCategory = user?.businessCategory?.category || "";

  let searchLogs = [];

  if (rawCategory) {
    const baseCategory = rawCategory
      .toLowerCase()
      .replace(/[^a-z]/g, "")
      .replace(/s$/, "");

    const categoryWordRegex = new RegExp(`\\b${baseCategory}s?\\b`, "i");

    searchLogs = await searchLogModel.find({
      $or: [
        { categoryName: categoryWordRegex },
        {
          categoryName: /all categories/i,
          searchedUserText: categoryWordRegex,
        },
        { searchedUserText: categoryWordRegex },
      ],
    })
      .sort({ createdAt: -1 })
      .lean();
  }

  return {
    user: {
      userName: user.userName,
      mobileNumber1: user.mobileNumber1,
      category: rawCategory || null,
    },
    leadsData: user.leadsData || [],
    matchedSearchLogs: searchLogs,
  };
};
