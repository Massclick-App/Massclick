import { createBusinessList, viewBusinessList, findBusinessBySlug, viewAllBusiness, getDashboardChartsHelper, getPendingBusinessList, findBusinessesByCategory, getDashboardSummaryHelper, findBusinessByMobile, viewAllBusinessList, viewAllClientBusinessList, updateBusinessList, getTrendingSearches, deleteBusinessList, activeBusinessList } from "../../helper/businessList/businessListHelper.js";
import { BAD_REQUEST } from "../../errorCodes.js";
import businessListModel from "../../model/businessList/businessListModel.js";
import { getSignedUrlByKey } from "../../s3Uploder.js";
import categoryModel from "../../model/category/categoryModel.js";
import { emitToRoom } from "../../websocket/roomManager.js";
import { buildRoom, WS_EVENTS } from "../../websocket/constants.js";
import { getCache, setCache } from "../../utils/redisClient.js";

export const addBusinessListAction = async (req, res) => {
  try {
    const reqBody = req.body;

    if (req.authUser && req.authUser.userId) {
      reqBody.createdBy = req.authUser.userId;
    } else {
      return res.status(401).send({ message: "Unauthorized: Missing userId" });
    }

    const result = await createBusinessList(reqBody);

    emitToRoom(buildRoom.admin(), WS_EVENTS.BUSINESS_PENDING, {
      businessName: result.businessName,
      category: result.category,
      location: result.location,
      ts: new Date().toISOString(),
    });

    res.send(result);

  } catch (error) {
    console.error("Error in addBusinessListAction:", error);

    if (error.name === "ValidationError") {
      return res.status(400).send(error.message);
    }

    return res.status(400).send("Error saving Business.");
  }
};

export const trackQrDownload = async (req, res) => {
  try {
    const { id } = req.params;

    const business = await businessListModel.findById(id);

    if (!business) {
      return res.status(404).send({ message: "Business not found" });
    }

    if (!business.qrDownloads) {
      business.qrDownloads = [];
    }

    business.qrDownloads.push({
      downloadedAt: new Date(),
      downloadedBy: req.authUser?.userId || null,
    });

    await business.save();

    res.send({ success: true });

  } catch (err) {
    console.error("QR Download Error:", err);
    res.status(400).send({ message: err.message });
  }
};

export const getBusinessBySlugAction = async (req, res) => {
  try {
    const { location, slug } = req.query;

    if (!location || !slug) {
      return res
        .status(BAD_REQUEST.code)
        .send({ message: "Location and slug are required" });
    }

    const result = await findBusinessBySlug({ location, slug });

    if (!result) {
      return res.status(404).send({ message: "Business not found" });
    }

    res.send(result);
  } catch (error) {
    console.error("❌ getBusinessBySlugAction error:", error);
    return res
      .status(BAD_REQUEST.code)
      .send(error.message || "Failed to fetch business");
  }
};

export const viewBusinessListAction = async (req, res) => {
  try {
    const businessId = req.params.id;
    const business = await viewBusinessList(businessId);
    res.send(business);
  } catch (error) {
    console.error(error);
    return res.status(BAD_REQUEST.code).send({ message: error.message });
  }
};

export const viewAllBusinessAction = async (req, res) => {
  try {
    const businesses = await viewAllBusiness();
    res.send(businesses);
  } catch (error) {
    console.error(error);
    return res.status(BAD_REQUEST.code).send({ message: error.message });
  }
};

export const viewAllBusinessListAction = async (req, res) => {
  try {
    const { userRole, userId } = req.authUser;

    const pageNo = parseInt(req.query.pageNo) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;

    const search = (req.query.search || "").trim();
    const status = req.query.status || "all";
    const sortBy = req.query.sortBy || "createdAt";
    const sortOrder = req.query.sortOrder === "asc" ? "asc" : "desc";

    const { list, total } = await viewAllBusinessList({
      role: userRole,
      userId,
      pageNo,
      pageSize,
      search,
      status,
      sortBy,
      sortOrder
    });

    return res.send({
      data: list,
      total,
      pageNo,
      pageSize,
    });

  } catch (error) {
    console.error("Error in viewAllBusinessListAction:", error);
    return res.status(BAD_REQUEST.code).send({ message: error.message });
  }
};

export const viewAllClientBusinessListAction = async (req, res) => {
  try {
    const allBusiness = await viewAllClientBusinessList();
    res.send(allBusiness);
  } catch (error) {
    console.error(error);
    return res.status(BAD_REQUEST.code).send({ message: error.message });
  }
};

export const viewBusinessByCategory = async (req, res) => {
  try {
    const { category, district } = req.query;

    if (!category)
      return res.status(400).send({ message: "Category is required" });

    const result = await findBusinessesByCategory(category, district);

    res.status(200).send(result);

  } catch (error) {
    res.status(400).send({ message: error.message });
  }
};

export const getSuggestionsController = async (req, res) => {
  try {
    const search = (req.query.search || "").trim();

    if (search.length < 2) {
      return res.send([]);
    }

    const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const startsWithPattern = `^${escapedSearch}`;
    const containsPattern = escapedSearch;

    const suggestions = await businessListModel.aggregate([
      {
        $match: {
          businessesLive: true,
          $or: [
            { category: { $regex: containsPattern, $options: "i" } },
            { businessName: { $regex: containsPattern, $options: "i" } },
            { location: { $regex: containsPattern, $options: "i" } },
            { keywords: { $regex: containsPattern, $options: "i" } }
          ]
        }
      },

      {
        $addFields: {
          priority: {
            $switch: {
              branches: [
                // Priority 1: Category or businessName starts with search term
                {
                  case: {
                    $or: [
                      {
                        $regexMatch: {
                          input: "$category",
                          regex: startsWithPattern,
                          options: "i"
                        }
                      },
                      {
                        $regexMatch: {
                          input: "$businessName",
                          regex: startsWithPattern,
                          options: "i"
                        }
                      }
                    ]
                  },
                  then: 1
                },
                // Priority 2: Category or businessName contains search term
                {
                  case: {
                    $or: [
                      {
                        $regexMatch: {
                          input: "$category",
                          regex: containsPattern,
                          options: "i"
                        }
                      },
                      {
                        $regexMatch: {
                          input: "$businessName",
                          regex: containsPattern,
                          options: "i"
                        }
                      }
                    ]
                  },
                  then: 2
                }
              ],
              default: 3
            }
          }
        }
      },

      {
        $sort: { priority: 1 }
      },

      {
        $limit: 15
      },

      {
        $lookup: {
          from: "categories",
          let: { businessCategory: "$category" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $regexMatch: {
                    input: "$category",
                    regex: "$$businessCategory",
                    options: "i"
                  }
                }
              }
            }
          ],
          as: "categoryData"
        }
      },

      {
        $unwind: {
          path: "$categoryData",
          preserveNullAndEmptyArrays: true
        }
      },

      {
        $project: {
          _id: 0,
          businessName: 1,
          category: 1,
          location: 1,
          priority: 1,

          // business banner
          bannerImageKey: { $ifNull: ["$bannerImageKey", ""] },

          // category image (from matched category document)
          categoryImageKey: {
            $ifNull: ["$categoryData.categoryImageKey", ""]
          }
        }
      }
    ]);

    // 🔹 Deduplicate by category (show unique categories only)
    const seen = new Set();
    const uniqueSuggestions = [];

    suggestions.forEach((item) => {
      const categoryKey = (item.category || "").toLowerCase();

      if (categoryKey && !seen.has(categoryKey)) {
        seen.add(categoryKey);
        uniqueSuggestions.push(item);
      }
    });

    const finalData = uniqueSuggestions.map((item) => {
      return {
        businessName: item.businessName,
        category: item.category,
        location: item.location,
        priority: item.priority,

        bannerImageKey: item.bannerImageKey,
        bannerImage: item.bannerImageKey
          ? getSignedUrlByKey(item.bannerImageKey)
          : "",

        categoryImageKey: item.categoryImageKey,
        categoryImage: item.categoryImageKey
          ? getSignedUrlByKey(item.categoryImageKey)
          : ""
      };
    });

    return res.send(finalData);

  } catch (err) {
    console.log(err);
    return res.status(400).send({
      success: false,
      message: err.message
    });
  }
};

const districtAliasMap = {
  tiruchirappalli: ["tiruchirappalli", "trichy"],
  trichy: ["tiruchirappalli", "trichy"],
};

export const getEnhancedSuggestionsController = async (req, res) => {
  try {
    const search = (req.query.search || "").trim();
    const location = (req.query.location || "").trim();

    if (search.length < 2) {
      return res.send([]);
    }

    const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const containsPattern = escapedSearch;

    // Get matching categories
    const categories = await categoryModel.aggregate([
      {
        $match: {
          isActive: true,
          $or: [
            { category: { $regex: containsPattern, $options: "i" } },
            { keywords: { $regex: containsPattern, $options: "i" } },
            { description: { $regex: containsPattern, $options: "i" } }
          ]
        }
      },
      { $limit: 10 }
    ]);

    // For each category, get business count
    const suggestionsWithCount = await Promise.all(
      categories.map(async (cat) => {
        const matchQuery = {
          businessesLive: true,
          category: { $regex: `^${escapedSearch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" }
        };

        if (location) {
          const locKey = location.toLowerCase().trim();
          const aliases = districtAliasMap[locKey] || [locKey];
          matchQuery.location = {
            $in: aliases.map(
              (l) => new RegExp(`^${l}$`, "i")
            )
          };
        }

        const count = await businessListModel.countDocuments({
          businessesLive: true,
          category: cat.category,
          ...(location && {
            location: {
              $in: (districtAliasMap[location.toLowerCase().trim()] || [location]).map(
                (l) => new RegExp(`^${l}$`, "i")
              )
            }
          })
        });

        return {
          category: cat.category,
          description: cat.description || cat.title || "",
          categoryImage: cat.categoryImageKey
            ? getSignedUrlByKey(cat.categoryImageKey)
            : "",
          categoryImageKey: cat.categoryImageKey,
          count: count,
          location: location || "All Districts",
          slug: cat.slug,
          relatedKeywords: Array.isArray(cat.keywords) ? cat.keywords : []
        };
      })
    );

    // Filter categories with at least 1 business
    const filtered = suggestionsWithCount.filter((s) => s.count > 0);

    return res.send(filtered);
  } catch (err) {
    console.error(err);
    res.status(400).send({ message: err.message });
  }
};

export const mainSearchController = async (req, res) => {
  try {
    let { term = "", location = "", category = "" } = req.query;

    // 🔥 Improved normalize (handles &, -, _, spaces)
    const normalize = (text = "") =>
      text
        .toLowerCase()
        .trim()
        .replace(/&/g, " and ")
        .replace(/[-_]/g, " ")
        .replace(/\s+/g, " ");

    term = normalize(term);
    location = normalize(location);
    category = normalize(category);

    // 🔹 Escape regex special chars
    const escapeRegex = (text = "") =>
      text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    // 🔹 Handle singular/plural
    const getWordVariations = (word = "") => {
      const w = word.toLowerCase().trim();
      if (!w) return [];

      if (w.endsWith("s")) {
        return [w, w.slice(0, -1)];
      } else {
        return [w, w + "s"];
      }
    };

    // 🔥 Flexible matcher (supports space, -, &, _)
    const makeFlexible = (val = "") =>
      escapeRegex(val).replace(/\s+/g, "[-\\s&]+");

    const matchQuery = {
      businessesLive: true,
      $and: []
    };

    // ===============================
    // 📍 LOCATION
    // ===============================
    if (location) {
      const locKey = location.toLowerCase().trim();
      const aliases = districtAliasMap[locKey] || [locKey];

      matchQuery.$and.push({
        $or: aliases.map((l) => ({
          location: { $regex: `^${escapeRegex(normalize(l))}$`, $options: "i" }
        }))
      });
    }

    // ===============================
    // 🏷 CATEGORY
    // ===============================
    if (category) {
      const variations = getWordVariations(category);

      const categoryConditions = variations.flatMap((val) => {
        const escaped = escapeRegex(val);

        return [
          { category: { $regex: escaped, $options: "i" } },
          { keywords: { $regex: escaped, $options: "i" } }
        ];
      });

      matchQuery.$and.push({
        $or: categoryConditions
      });
    }

    // ===============================
    // 🔍 TERM SEARCH
    // ===============================
    if (term) {
      // 🔹 Split multi-word searches into individual words
      const words = term.split(/\s+/).filter(w => w.trim());

      const termConditions = [];

      words.forEach((word) => {
        const variations = getWordVariations(word);

        variations.forEach((val) => {
          const escaped = escapeRegex(val);

          // For each word, create OR conditions across all fields
          termConditions.push(
            { businessName: { $regex: escaped, $options: "i" } },
            { category: { $regex: escaped, $options: "i" } },
            { slug: { $regex: escaped, $options: "i" } },
            { keywords: { $regex: escaped, $options: "i" } }
          );
        });
      });

      if (termConditions.length > 0) {
        matchQuery.$and.push({
          $or: termConditions
        });
      }
    }

    if (matchQuery.$and.length === 0) {
      delete matchQuery.$and;
    }

    const results = await businessListModel.aggregate([
      { $match: matchQuery },

      {
        $lookup: {
          from: "businessreviews",
          localField: "_id",
          foreignField: "businessId",
          as: "reviews"
        }
      },

      {
        $addFields: {
          totalReviews: { $size: "$reviews" },
          // Calculate priority based on category match
          categoryPriority: {
            $cond: [
              category ? {
                $regexMatch: {
                  input: "$category",
                  regex: `^${escapeRegex(category)}$`,
                  options: "i"
                }
              } : false,
              0,  // Exact category match = highest priority (0)
              1   // Other matches = lower priority (1)
            ]
          }
        }
      },

      {
        $sort: {
          categoryPriority: 1,   // Exact category matches first
          amountPaid: -1,        // Then paid businesses
          paidDate: -1,          // Then newest payments
          createdAt: -1          // Then newest registrations
        }
      },

      {
        $project: {
          reviews: 0,
          categoryPriority: 0    // Don't return this field
        }
      }
    ]);

    // ===============================
    // 🖼 IMAGE URL SIGNING
    // ===============================
    results.forEach((b) => {
      if (b.bannerImageKey) {
        b.bannerImage = getSignedUrlByKey(b.bannerImageKey);
      }

      if (b.businessImagesKey?.length > 0) {
        b.businessImages = b.businessImagesKey.map((k) =>
          getSignedUrlByKey(k)
        );
      }

      if (b.kycDocumentsKey?.length > 0) {
        b.kycDocuments = b.kycDocumentsKey.map((k) =>
          getSignedUrlByKey(k)
        );
      }
    });

    res.send(results);

  } catch (err) {
    console.error(err);
    res.status(400).send({ message: err.message });
  }
};

export const updateBusinessListAction = async (req, res) => {
  try {
    const businessId = req.params.id;

    const businessData = {
      ...req.body,
      updatedBy: req.authUser?.userId,
    };

    const business = await updateBusinessList(businessId, businessData);

    res.send(business);
  } catch (error) {
    console.error(error);
    return res.status(400).send({ message: error.message });
  }
};

export const deleteBusinessListAction = async (req, res) => {
  try {
    const businessId = req.params.id;
    const business = await deleteBusinessList(businessId);
    res.send({ message: "business deleted successfully", business });
  } catch (error) {
    console.error(error);
    return res.status(400).send({ message: error.message });
  }
};

export const activeBusinessListAction = async (req, res) => {
  try {
    const businessId = req.params.id;
    const { activeBusinesses } = req.body;

    const business = await activeBusinessList(businessId, activeBusinesses);

    res.send({
      message: `Business ${business.activeBusinesses ? "activated" : "deactivated"} successfully`,
      business,
    });
  } catch (error) {
    console.error(error);
    res.status(400).send({ message: error.message });
  }
};

export const getTrendingSearchesAction = async (req, res) => {
  try {
    const location = req.query.location || "all";
    const cacheKey = `trending-categories:${location}`;

    // Try to get from cache first
    const cachedData = await getCache(cacheKey);
    if (cachedData) {
      return res.send(cachedData);
    }

    const trendingList = await getTrendingSearches(4, location);

    // Cache for 4 hours (trending data changes more frequently)
    await setCache(cacheKey, trendingList, 14400);

    res.send(trendingList);
  } catch (error) {
    console.error(error);
    return res.status(500).send({ message: "Failed to fetch trending data" });
  }
};

export const findBusinessByMobileAction = async (req, res) => {
  try {
    const mobile = req.params.mobile;

    if (!mobile) {
      return res.status(400).send({ message: "Mobile number is required" });
    }

    const business = await findBusinessByMobile(mobile);

    return res.send({
      success: true,
      business: business || null
    });

  } catch (error) {
    console.error("Error in findBusinessByMobileAction:", error);
    return res.status(BAD_REQUEST.code).send({ message: error.message });
  }
};

export const dashboardSummaryAction = async (req, res) => {
  try {
    const { userRole, userId } = req.authUser;


    const summary = await getDashboardSummaryHelper({
      role: userRole,
      userId
    });

    return res.send({
      success: true,
      ...summary
    });

  } catch (error) {
    console.error("Dashboard Summary Error:", error);
    return res.status(500).send({ message: error.message });
  }
};


export const dashboardChartsAction = async (req, res) => {
  try {
    const { userRole, userId } = req.authUser;

    const data = await getDashboardChartsHelper({
      role: userRole,
      userId
    });

    return res.send({
      success: true,
      ...data
    });

  } catch (error) {
    console.error("Dashboard Charts Error:", error);
    return res.status(500).send({ message: "Chart data fetch failed" });
  }
};

export const getPendingBusinessAction = async (req, res) => {
  try {
    const result = await getPendingBusinessList();

    res.status(200).send({
      success: true,
      data: result,
    });

  } catch (error) {
    console.error("Pending business error:", error);
    return res.status(400).send({ message: error.message });
  }
};
