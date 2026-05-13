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
          _id: { $toLower: { $trim: { input: "$categoryName" } } },
          totalSearches: { $sum: 1 },
          categoryImage: { $max: "$categoryImage" },
          liveImage: { $max: "$liveImage" },
          // Extract all 6 image variants from searchLog documents
          webHero: { $max: "$categoryImages.webHero" },
          webCard: { $max: "$categoryImages.webCard" },
          webThumbnail: { $max: "$categoryImages.webThumbnail" },
          mobileVertical: { $max: "$categoryImages.mobileVertical" },
          mobileCard: { $max: "$categoryImages.mobileCard" },
          mobileThumbnail: { $max: "$categoryImages.mobileThumbnail" }
        }
      },
      { $sort: { totalSearches: -1 } },
      { $limit: limit * 3 },
      {
        $lookup: {
          from: "category",
          let: { catName: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: [{ $toLower: "$categoryName" }, "$$catName"] }
              }
            },
            { $project: { categoryImages: 1, categoryImageKey: 1, _id: 0 } },
            { $limit: 1 }
          ],
          as: "categoryDoc"
        }
      },
      {
        $addFields: {
          // Use variants from searchLog. If empty, try category lookup, otherwise use categoryImage fallback
          webHero: {
            $cond: {
              if: { $and: [{ $ne: ["$webHero", ""] }, { $ne: ["$webHero", null] }] },
              then: "$webHero",
              else: {
                $cond: {
                  if: { $gt: [{ $size: "$categoryDoc" }, 0] },
                  then: { $arrayElemAt: ["$categoryDoc.categoryImages.webHero", 0] },
                  else: "$categoryImage"
                }
              }
            }
          },
          webCard: {
            $cond: {
              if: { $and: [{ $ne: ["$webCard", ""] }, { $ne: ["$webCard", null] }] },
              then: "$webCard",
              else: {
                $cond: {
                  if: { $gt: [{ $size: "$categoryDoc" }, 0] },
                  then: { $arrayElemAt: ["$categoryDoc.categoryImages.webCard", 0] },
                  else: ""
                }
              }
            }
          },
          webThumbnail: {
            $cond: {
              if: { $and: [{ $ne: ["$webThumbnail", ""] }, { $ne: ["$webThumbnail", null] }] },
              then: "$webThumbnail",
              else: {
                $cond: {
                  if: { $gt: [{ $size: "$categoryDoc" }, 0] },
                  then: { $arrayElemAt: ["$categoryDoc.categoryImages.webThumbnail", 0] },
                  else: ""
                }
              }
            }
          },
          mobileVertical: {
            $cond: {
              if: { $and: [{ $ne: ["$mobileVertical", ""] }, { $ne: ["$mobileVertical", null] }] },
              then: "$mobileVertical",
              else: {
                $cond: {
                  if: { $gt: [{ $size: "$categoryDoc" }, 0] },
                  then: { $arrayElemAt: ["$categoryDoc.categoryImages.mobileVertical", 0] },
                  else: ""
                }
              }
            }
          },
          mobileCard: {
            $cond: {
              if: { $and: [{ $ne: ["$mobileCard", ""] }, { $ne: ["$mobileCard", null] }] },
              then: "$mobileCard",
              else: {
                $cond: {
                  if: { $gt: [{ $size: "$categoryDoc" }, 0] },
                  then: { $arrayElemAt: ["$categoryDoc.categoryImages.mobileCard", 0] },
                  else: ""
                }
              }
            }
          },
          mobileThumbnail: {
            $cond: {
              if: { $and: [{ $ne: ["$mobileThumbnail", ""] }, { $ne: ["$mobileThumbnail", null] }] },
              then: "$mobileThumbnail",
              else: {
                $cond: {
                  if: { $gt: [{ $size: "$categoryDoc" }, 0] },
                  then: { $arrayElemAt: ["$categoryDoc.categoryImages.mobileThumbnail", 0] },
                  else: ""
                }
              }
            }
          },
          // Keep legacy fields as-is (don't overwrite with new variants)
          // categoryImage and liveImage come directly from searchLog
          // They are only populated if actual legacy images were uploaded
        }
      },
      {
        $match: {
          categoryImage: { $exists: true, $nin: ["", null] }
        }
      },
      { $limit: limit },
      {
        $project: {
          _id: 0,
          categoryName: "$_id",
          totalSearches: 1,
          categoryImage: 1,
          liveImage: 1,
          webHero: 1,
          webCard: 1,
          webThumbnail: 1,
          mobileVertical: 1,
          mobileCard: 1,
          mobileThumbnail: 1
        }
      }
    ]);

    return result;

  } catch (error) {
    console.error("getTopTrendingCategories error:", error);
    return [];
  }
};


