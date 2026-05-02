import { ObjectId } from "mongodb";
import searchLogModel from "../../model/businessList/searchLogModel.js"


export const createSearchLog = async function (data = {}) {
  try {
    const searchLogDocument = new searchLogModel(data);
    const result = await searchLogDocument.save();
    return result;
  } catch (error) {
    console.error("Error saving Search Log:", error);
    return null;
  }
};


export const getAllSearchLogs = async () => {
    try {
        const logs = await searchLogModel.find().sort({ createdAt: -1 }); 
        return logs;
    } catch (error) {
        console.error("Error fetching Search Logs:", error);
        return [];
    }
};

export const getMatchedSearchLogs = async (category, keywords) => {
  try {
    const regexCategory = new RegExp(category, "i");
    const regexKeywords = keywords.map(k => new RegExp(k, "i"));

    const logs = await searchLogModel.find({
      $or: [
        { category: regexCategory },
        { categoryName: regexCategory },
        { searchCategory: regexCategory },

        { searchedUserText: { $in: regexKeywords } },
        { title: { $in: regexKeywords } },
        { description: { $in: regexKeywords } },
        { meta: { $in: regexKeywords } },
        { note: { $in: regexKeywords } },
      ]
    })
    .sort({ createdAt: -1 })
    .limit(5000);  

    return logs;

  } catch (error) {
    console.error("Error fetching Search Logs:", error);
    return [];
  }
};

export const updateSearchData = async (id, data) => {
  if (!ObjectId.isValid(id)) {
    throw new Error("Invalid search log ID");
  }

  const searchData = await searchLogModel.findByIdAndUpdate(
    id,
    { $set: data },
    { new: true }
  );

  if (!searchData) throw new Error("Search log not found");

  return searchData;
};


export const getTopTrendingCategories = async (limit = 10) => {
  try {
    const result = await searchLogModel.aggregate([
      {
        $match: {
          categoryName: {
            $exists: true,
            $ne: "",
            $not: /^[a-f\d]{24}$/i
          }
        }
      },

      {
        $group: {
          _id: { $toLower: "$categoryName" },
          totalSearches: { $sum: 1 },

          categoryImage: { $first: "$categoryImage" }
        }
      },

      { $sort: { totalSearches: -1 } },
      { $limit: limit },

      {
        $project: {
          _id: 0,
          categoryName: "$_id",
          totalSearches: 1,
          categoryImage: 1
        }
      }
    ]);

    return result;

  } catch (error) {
    console.error("getTopTrendingCategories error:", error);
    return [];
  }
};


