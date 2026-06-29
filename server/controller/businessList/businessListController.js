import { createBusinessList, viewBusinessList, findBusinessBySlug, viewAllBusiness, getDashboardChartsHelper, getPendingBusinessList, findBusinessesByCategory, getDashboardSummaryHelper, getAdminAnalyticsReportHelper, findBusinessByMobile, viewAllBusinessList, viewAllClientBusinessList, updateBusinessList, getTrendingSearches, deleteBusinessList, activeBusinessList, revertBusinessFromPaid } from "../../helper/businessList/businessListHelper.js";
import { BAD_REQUEST } from "../../errorCodes.js";
import businessListModel from "../../model/businessList/businessListModel.js";
import { getSignedUrlByKey } from "../../s3Uploder.js";
import categoryModel from "../../model/category/categoryModel.js";
import userModel from "../../model/userModel.js";
import { emitToRoom } from "../../websocket/roomManager.js";
import { buildRoom, WS_EVENTS } from "../../websocket/constants.js";
import { getCache, setCache } from "../../utils/redisClient.js";
import { enhanceSearchQuery, resolveCategory } from "../../utils/geminiQueryEnhancer.js";
import { invalidateSearchCache, invalidateDashboardCache, invalidateCategoryCache } from "../../utils/cacheInvalidation.js";
import { buildBusinessExportWorkbook } from "../../utils/businessExportXlsx.js";

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

    await invalidateSearchCache();
    await invalidateDashboardCache();
    await invalidateCategoryCache();

    res.send(result);

  } catch (error) {
    console.error("Error in addBusinessListAction:", error);

    if (error.name === "ValidationError") {
      return res.status(400).send({ message: error.message });
    }

    return res.status(400).send({
      message: error.message || "Error saving Business."
    });
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
    const liveStatus = (req.query.liveStatus || "").trim();
    const category = (req.query.category || "").trim();
    const location = (req.query.location || "").trim();
    const paymentStatus = (req.query.paymentStatus || "").trim();
    const createdFrom = (req.query.createdFrom || "").trim();
    const createdTo = (req.query.createdTo || "").trim();
    const sortBy = req.query.sortBy || "createdAt";
    const sortOrder = req.query.sortOrder === "asc" ? "asc" : "desc";

    const { list, total } = await viewAllBusinessList({
      role: userRole,
      userId,
      pageNo,
      pageSize,
      search,
      status,
      liveStatus,
      category,
      location,
      paymentStatus,
      createdFrom,
      createdTo,
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
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(25, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * limit;

    if (search.length < 2) {
      return res.send({
        items: [],
        total: 0,
        page,
        limit,
        hasMore: false,
        query: search
      });
    }

    const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const startsWithPattern = `^${escapedSearch}`;
    const containsPattern = escapedSearch;

    const [suggestionResult] = await businessListModel.aggregate([
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
          },
          normalizedCategory: {
            $toLower: {
              $trim: {
                input: { $ifNull: ["$category", ""] }
              }
            }
          }
        }
      },

      {
        $sort: { priority: 1, normalizedCategory: 1, businessName: 1, _id: 1 }
      },

      {
        $group: {
          _id: "$normalizedCategory",
          businessName: { $first: "$businessName" },
          category: { $first: "$category" },
          location: { $first: "$location" },
          priority: { $first: "$priority" },
          bannerImageKey: { $first: { $ifNull: ["$bannerImageKey", ""] } }
        }
      },

      {
        $facet: {
          metadata: [
            { $count: "total" }
          ],
          items: [
            { $sort: { priority: 1, category: 1 } },
            { $skip: skip },
            { $limit: limit },
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
                bannerImageKey: 1,
                categoryImageKey: {
                  $ifNull: ["$categoryData.categoryImageKey", ""]
                }
              }
            }
          ]
        }
      }
    ]);

    // 🔹 Deduplicate by category (show unique categories only)
    const total = suggestionResult?.metadata?.[0]?.total || 0;
    const suggestions = Array.isArray(suggestionResult?.items) ? suggestionResult.items : [];
    const items = suggestions.map((item) => ({
      businessName: item.businessName,
      category: item.category,
      location: item.location,
      priority: item.priority,
      bannerImageKey: item.bannerImageKey,
      bannerImage: item.bannerImageKey ? getSignedUrlByKey(item.bannerImageKey) : "",
      categoryImageKey: item.categoryImageKey,
      categoryImage: item.categoryImageKey ? getSignedUrlByKey(item.categoryImageKey) : ""
    }));

    return res.send({
      items,
      total,
      page,
      limit,
      hasMore: skip + items.length < total,
      query: search
    });

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

export const exportBusinessListAction = async (req, res) => {
  try {
    const { userRole, userId } = req.authUser;
    const search = (req.query.search || "").trim();
    const searchTerm = (req.query.searchTerm || "").trim();
    const status = req.query.status || "all";
    const liveStatus = (req.query.liveStatus || "").trim();
    const category = (req.query.category || "").trim();
    const location = (req.query.location || "").trim();
    const paymentStatus = (req.query.paymentStatus || "all").trim();
    const createdFrom = (req.query.createdFrom || "").trim();
    const createdTo = (req.query.createdTo || "").trim();
    const sortBy = req.query.sortBy || "createdAt";
    const sortOrder = req.query.sortOrder === "asc" ? "asc" : "desc";

    const { list } = await viewAllBusinessList({
      role: userRole,
      userId,
      pageNo: 1,
      pageSize: 100000,
      search,
      status,
      liveStatus,
      category: "",
      location: "",
      paymentStatus: "",
      createdFrom,
      createdTo,
      sortBy,
      sortOrder
    });

    const createdByIds = [
      ...new Set(
        list
          .map((business) => business.createdBy?._id || business.createdBy)
          .map((id) => String(id || ""))
          .filter((id) => /^[a-f\d]{24}$/i.test(id))
      ),
    ];

    const users = createdByIds.length
      ? await userModel
          .find({ _id: { $in: createdByIds } })
          .select("userName name fullName emailId email")
          .lean()
      : [];
    const usersById = new Map(users.map((user) => [String(user._id), user]));

    const { buffer, rowCount } = buildBusinessExportWorkbook(list, {
      usersById,
      filters: {
        searchTerm,
        category,
        location,
        paymentStatus,
      },
    });

    if (rowCount === 0) {
      return res.status(404).send({ message: "No business data found for export." });
    }

    const stamp = new Date().toISOString().slice(0, 10);
    const filename = `massclick-business-directory-${stamp}.xlsx`;

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Length", buffer.length);
    res.setHeader("X-Export-Row-Count", rowCount);
    return res.send(buffer);
  } catch (error) {
    console.error("Error in exportBusinessListAction:", error);
    return res.status(BAD_REQUEST.code).send({ message: error.message });
  }
};

const categoryIntentStopWords = new Set([
  "a",
  "an",
  "and",
  "around",
  "at",
  "best",
  "center",
  "centers",
  "centre",
  "centres",
  "contractor",
  "contractors",
  "dealer",
  "dealers",
  "for",
  "hospital",
  "hospitals",
  "in",
  "me",
  "near",
  "nearby",
  "of",
  "office",
  "on",
  "rent",
  "service",
  "services",
  "shop",
  "shops",
  "the",
  "to",
]);

const categoryIntentNormalize = (text = "") =>
  String(text)
    .toLowerCase()
    .trim()
    .replace(/&/g, " and ")
    .replace(/[-_]/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ");

const categoryIntentTokens = (text = "") =>
  categoryIntentNormalize(text).split(" ").filter(Boolean);

const hasCategoryIntentToken = (text = "", token = "") => {
  const tokens = categoryIntentTokens(text);
  if (tokens.includes(token)) return true;

  if (token.endsWith("s")) {
    return tokens.includes(token.slice(0, -1));
  }

  return tokens.includes(`${token}s`);
};

const scoreCategoryIntent = (candidate, rawTerm) => {
  const query = categoryIntentNormalize(rawTerm);
  const allTokens = categoryIntentTokens(query);
  const meaningfulTokens = allTokens.filter((token) => !categoryIntentStopWords.has(token));
  const requiredTokens = meaningfulTokens.length > 0 ? meaningfulTokens : allTokens;

  if (requiredTokens.length === 0) return 0;

  const categoryText = categoryIntentNormalize(candidate.category);
  const descriptionText = categoryIntentNormalize(candidate.description);
  const keywords = Array.isArray(candidate.keywords) ? candidate.keywords : [];
  const keywordTexts = keywords.map((keyword) => categoryIntentNormalize(keyword));
  const searchableText = [categoryText, descriptionText, ...keywordTexts].join(" ");

  if (!requiredTokens.every((token) => hasCategoryIntentToken(searchableText, token))) {
    return 0;
  }

  let score = 0;

  if (categoryText === query) score += 200;
  if (keywordTexts.some((keyword) => keyword === query)) score += 180;
  if (categoryText.includes(query)) score += 90;
  if (keywordTexts.some((keyword) => keyword.includes(query))) score += 80;

  const keywordWithAllTokens = keywordTexts.some((keyword) =>
    allTokens.every((token) => hasCategoryIntentToken(keyword, token))
  );
  if (keywordWithAllTokens) score += 70;

  for (const token of requiredTokens) {
    if (hasCategoryIntentToken(categoryText, token)) score += 30;
    if (keywordTexts.some((keyword) => hasCategoryIntentToken(keyword, token))) score += 20;
    if (hasCategoryIntentToken(descriptionText, token)) score += 5;
  }

  const matchedAllQueryTokens = allTokens.every((token) => hasCategoryIntentToken(searchableText, token));
  if (allTokens.length > requiredTokens.length && matchedAllQueryTokens) {
    score += 35;
  }

  return score;
};

export const resolveCategoryIntent = async (term, escapeRegex) => {
  const exactPattern = `^${escapeRegex(term)}$`;
  const exactMatch = await categoryModel.findOne(
    {
      $or: [
        { category: { $regex: exactPattern, $options: "i" } },
        { keywords: { $regex: exactPattern, $options: "i" } }
      ],
      isActive: true
    },
    { category: 1 }
  );

  if (exactMatch) return exactMatch.category;

  const requiredTokens = categoryIntentTokens(term).filter(
    (token) => !categoryIntentStopWords.has(token)
  );

  if (requiredTokens.length === 0) return "";

  const tokenRegex = requiredTokens.map(escapeRegex).join("|");
  const candidates = await categoryModel.find(
    {
      isActive: true,
      $or: [
        { category: { $regex: tokenRegex, $options: "i" } },
        { keywords: { $regex: tokenRegex, $options: "i" } },
        { description: { $regex: tokenRegex, $options: "i" } }
      ]
    },
    { category: 1, keywords: 1, description: 1 }
  ).limit(50);

  const bestMatch = candidates
    .map((candidate) => ({
      category: candidate.category,
      score: scoreCategoryIntent(candidate, term),
    }))
    .filter((candidate) => candidate.score > 0)
    .sort((a, b) => b.score - a.score)[0];

  return bestMatch?.category || "";
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

    const normalize = (text = "") =>
      text.toLowerCase().trim().replace(/&/g, " and ").replace(/[-_]/g, " ").replace(/\s+/g, " ");

    term = normalize(term);
    location = normalize(location);
    category = normalize(category);

    if (["all districts", "enter location manually"].includes(location)) {
      location = "";
    }

    const t0 = Date.now();
    console.log(`[Search] term:"${term}" location:"${location}" category:"${category}" page:${req.query.page || 1} sort:${req.query.sortBy || "relevant"}`);

    // Pagination
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize) || 20));
    const skip = (page - 1) * pageSize;

    // Geo coords for distance calculation
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);
    const hasGeo = !isNaN(lat) && !isNaN(lng) && !(lat === 0 && lng === 0);

    const escapeRegex = (text = "") => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    // ── Category resolution ───────────────────────────────────────────────────
    if (!category && term) {
      // Step 1: fast keyword/regex match against category names & keywords
      const keywordMatch = await resolveCategoryIntent(term, escapeRegex);
      if (keywordMatch) {
        console.log(`[Search] category via keyword match: "${keywordMatch}" (term cleared)`);
        category = keywordMatch;
        term = "";
      } else {
        // Step 2: keyword match failed — ask Gemini to pick from available categories
        console.log(`[Search] keyword match failed for "${term}" — trying Gemini category resolver`);
        const CAT_CACHE_KEY = "gemini:category_list";
        let allCategories = await getCache(CAT_CACHE_KEY).catch(() => null);
        if (!allCategories) {
          allCategories = await categoryModel
            .find({ isActive: true }, { category: 1, keywords: 1, _id: 0 })
            .lean();
          await setCache(CAT_CACHE_KEY, allCategories, 60 * 60 * 6).catch(() => {}); // 6h cache
          console.log(`[Search] loaded ${allCategories.length} categories from DB (cached 6h)`);
        } else {
          console.log(`[Search] loaded ${allCategories.length} categories from cache`);
        }

        const geminiCategory = await resolveCategory(term, allCategories);
        if (geminiCategory) {
          console.log(`[Search] category via Gemini: "${geminiCategory}" (term cleared)`);
          category = geminiCategory;
          term = "";
        } else {
          console.log(`[Search] no category resolved — falling back to text search for "${term}"`);
        }
      }
    }

    // ── Keyword expansion ─────────────────────────────────────────────────────
    // Only runs when a free-text term remains after category resolution
    if (term) {
      term = await enhanceSearchQuery(term, category);
    }

    console.log(`[Search] final → term:"${term}" category:"${category}" location:"${location}" sort:${req.query.sortBy || "relevant"}`);

    const matchQuery = { businessesLive: true, $and: [] };

    // Location filter
    if (location) {
      const locKey = location.toLowerCase().trim();
      const aliases = districtAliasMap[locKey] || [locKey];
      matchQuery.$and.push({
        $or: aliases.map((l) => ({
          location: { $regex: `^${escapeRegex(normalize(l))}$`, $options: "i" }
        }))
      });
    }

    // Category filter
    if (category) {
      const escaped = escapeRegex(category);
      matchQuery.$and.push({ category: { $regex: `^${escaped}$`, $options: "i" } });
    }

    // Text search
    if (term) {
      matchQuery.$text = { $search: term };
    }

    // Category-specific filters
    if (req.query.filters) {
      try {
        const activeFilters = JSON.parse(req.query.filters);
        for (const [key, value] of Object.entries(activeFilters)) {
          if (Array.isArray(value) && value.length > 0) {
            matchQuery.$and.push({ [`filters.${key}`]: { $in: value } });
          } else if (typeof value === "number") {
            // Range filter: "up to this value". DB stores prices as strings ("500"),
            // so $lte: 500 (number) never matches — BSON types don't coerce.
            // $convert to double handles both string and number storage.
            // $ifNull + onError guard against missing/non-numeric fields.
            matchQuery.$and.push({
              $expr: {
                $lte: [
                  { $convert: { input: { $ifNull: [`$filters.${key}`, value + 1] }, to: "double", onError: value + 1 } },
                  value
                ]
              }
            });
          } else if (value !== null && value !== undefined && value !== "") {
            matchQuery.$and.push({ [`filters.${key}`]: value });
          }
        }
      } catch (_) {}
    }

    // Universal filters
    const minRatingValue = Number(req.query.minRating);
    if (req.query.verified === "true") {
      matchQuery.$and.push({ "verification.isVerified": true });
    }
    if (req.query.featured === "true") {
      matchQuery.$and.push({ "badges.isFeatured": true });
    }
    if (req.query.sponsored === "true") {
      matchQuery.$and.push({ "badges.isSponsored": true });
    }
    if (req.query.trending === "true") {
      matchQuery.$and.push({ "badges.isTrending": true });
    }
    if (req.query.openNow === "true") {
      const now = new Date();
      const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      const todayName = dayNames[now.getDay()];
      const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
      matchQuery.$and.push({
        openingHours: {
          $elemMatch: {
            day: todayName,
            isClosed: false,
            open: { $lte: currentTime },
            close: { $gte: currentTime }
          }
        }
      });
    }

    if (matchQuery.$and.length === 0) delete matchQuery.$and;

    const activeFlags = ["verified", "featured", "sponsored", "trending", "openNow"]
      .filter(f => req.query[f] === "true");
    const minR = Number(req.query.minRating);
    if (Number.isFinite(minR) && minR > 0) activeFlags.push(`minRating:${minR}`);
    if (hasGeo) activeFlags.push("geo");
    if (activeFlags.length) console.log(`[Search] filters: ${activeFlags.join(" | ")}`);

    // Sort
    const sortByParam = req.query.sortBy || "relevant";
    const customSortMap = {
      rating:  { averageRating: -1, amountPaid: -1, createdAt: -1 },
      newest:  { createdAt: -1, amountPaid: -1 },
      popular: { "analytics.views": -1, amountPaid: -1, createdAt: -1 },
    };
    const useCustomSort = customSortMap[sortByParam];
    const useNearestSort = sortByParam === "nearest" && hasGeo;

    // Haversine distance stages — only added when user coordinates are provided.
    // Business coordinates at [0,0] (default/unset) get distance=null and sort last.
    const geoStages = hasGeo ? [
      {
        $addFields: {
          distance: {
            $cond: {
              if: { $and: [
                { $eq: [{ $arrayElemAt: ["$geoLocation.coordinates", 0] }, 0] },
                { $eq: [{ $arrayElemAt: ["$geoLocation.coordinates", 1] }, 0] }
              ]},
              then: null,
              else: {
                $let: {
                  vars: {
                    dLat: { $multiply: [{ $subtract: [{ $arrayElemAt: ["$geoLocation.coordinates", 1] }, lat] }, Math.PI / 180] },
                    dLng: { $multiply: [{ $subtract: [{ $arrayElemAt: ["$geoLocation.coordinates", 0] }, lng] }, Math.PI / 180] },
                    lat2R: { $multiply: [{ $arrayElemAt: ["$geoLocation.coordinates", 1] }, Math.PI / 180] },
                  },
                  in: {
                    $multiply: [
                      2 * 6371,
                      { $asin: { $sqrt: { $add: [
                        { $pow: [{ $sin: { $divide: ["$$dLat", 2] } }, 2] },
                        { $multiply: [
                          Math.cos(lat * Math.PI / 180),
                          { $cos: "$$lat2R" },
                          { $pow: [{ $sin: { $divide: ["$$dLng", 2] } }, 2] }
                        ]}
                      ]}}}
                    ]
                  }
                }
              }
            }
          }
        }
      },
      // Sentinel for sort: null distance becomes 999999 so nulls sort last ascending
      { $addFields: { _distanceSort: { $ifNull: ["$distance", 999999] } } }
    ] : [];

    const pipeline = [
      { $match: matchQuery },
      ...(term ? [{ $addFields: { textScore: { $meta: "textScore" } } }] : []),
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
          activeReviews: {
            $filter: {
              input: "$reviews",
              as: "review",
              cond: { $eq: ["$$review.status", "ACTIVE"] }
            }
          },
        }
      },
      {
        $addFields: {
          totalReviews: { $size: "$activeReviews" },
          averageRating: {
            $round: [
              { $ifNull: [{ $avg: "$activeReviews.rating" }, 0] },
              1
            ]
          },
          categoryPriority: {
            $cond: [
              category ? {
                $regexMatch: { input: "$category", regex: `^${escapeRegex(category)}$`, options: "i" }
              } : false,
              0,
              1
            ]
          }
        }
      },
      ...(Number.isFinite(minRatingValue) && minRatingValue > 0 ? [
        { $match: { averageRating: { $gte: minRatingValue } } }
      ] : []),
      ...geoStages,
      {
        $sort: useNearestSort
          ? { _distanceSort: 1, amountPaid: -1, createdAt: -1 }
          : (useCustomSort || {
              ...(term ? { textScore: -1 } : {}),
              categoryPriority: 1,
              amountPaid: -1,
              paidDate: -1,
              createdAt: -1
            })
      },
      { $skip: skip },
      { $limit: pageSize },
      { $project: { reviews: 0, activeReviews: 0, categoryPriority: 0, textScore: 0, _distanceSort: 0 } }
    ];

    const usesComputedRatingFilter = Number.isFinite(minRatingValue) && minRatingValue > 0;
    const totalPipeline = pipeline
      .filter(stage =>
        !Object.prototype.hasOwnProperty.call(stage, "$skip") &&
        !Object.prototype.hasOwnProperty.call(stage, "$limit") &&
        !Object.prototype.hasOwnProperty.call(stage, "$sort") &&
        !Object.prototype.hasOwnProperty.call(stage, "$project")
      )
      .concat({ $count: "total" });

    const [results, totalResult] = await Promise.all([
      businessListModel.aggregate(pipeline),
      usesComputedRatingFilter
        ? businessListModel.aggregate(totalPipeline)
        : businessListModel.countDocuments(matchQuery)
    ]);
    const total = usesComputedRatingFilter ? totalResult[0]?.total || 0 : totalResult;
    console.log(`[Search] → ${results.length} results (total:${total} hasMore:${page * pageSize < total}) in ${Date.now() - t0}ms`);

    // Sign image URLs
    results.forEach((b) => {
      if (b.bannerImageKey) b.bannerImage = getSignedUrlByKey(b.bannerImageKey);
      if (b.businessImagesKey?.length > 0) b.businessImages = b.businessImagesKey.map((k) => getSignedUrlByKey(k));
      if (b.kycDocumentsKey?.length > 0) b.kycDocuments = b.kycDocumentsKey.map((k) => getSignedUrlByKey(k));
    });

    res.send({ results, total, page, pageSize, hasMore: page * pageSize < total });

  } catch (err) {
    console.error(err);
    res.status(400).send({ message: err.message });
  }
};

export const nearbyBusinessesController = async (req, res) => {
  try {
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);
    const category = (req.query.category || "").trim();
    const limit = Math.min(12, Math.max(1, parseInt(req.query.limit) || 6));

    if (isNaN(lat) || isNaN(lng) || !category) {
      return res.status(400).send({ message: "lat, lng, and category are required" });
    }

    const escapeRegex = (text = "") => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const pipeline = [
      {
        $geoNear: {
          near: { type: "Point", coordinates: [lng, lat] },
          distanceField: "distanceMeters",
          maxDistance: 50000,  // 50km radius in meters
          query: {
            businessesLive: true,
            category: { $regex: `^${escapeRegex(category)}$`, $options: "i" }
          },
          spherical: true
        }
      },
      { $limit: limit },
      {
        $project: {
          businessName: 1, category: 1, location: 1, bannerImageKey: 1,
          verification: 1, badges: 1,
          contact: 1, whatsappNumber: 1, filters: 1, experience: 1, slug: 1,
          distance: { $round: [{ $divide: ["$distanceMeters", 1000] }, 2] }
        }
      },
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
          activeReviews: {
            $filter: {
              input: "$reviews",
              as: "review",
              cond: { $eq: ["$$review.status", "ACTIVE"] }
            }
          }
        }
      },
      {
        $addFields: {
          totalReviews: { $size: "$activeReviews" },
          averageRating: {
            $round: [
              { $ifNull: [{ $avg: "$activeReviews.rating" }, 0] },
              1
            ]
          }
        }
      },
      {
        $project: {
          reviews: 0,
          activeReviews: 0
        }
      }
    ];

    const results = await businessListModel.aggregate(pipeline);
    results.forEach((b) => {
      if (b.bannerImageKey) b.bannerImage = getSignedUrlByKey(b.bannerImageKey);
    });

    res.send(results);
  } catch (err) {
    console.error("nearbyBusinessesController error:", err);
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

    await invalidateSearchCache();
    await invalidateDashboardCache();
    await invalidateCategoryCache();

    res.send(business);
  } catch (error) {
    console.error(error);
    return res.status(400).send({ message: error.message });
  }
};

const SECTION_FIELD_MAPPING = {
  'address': ['plotNumber', 'street', 'pincode', 'location', 'globalAddress'],
  'contact': ['email', 'contact', 'contactList', 'whatsappNumber'],
  'business-info': ['gstin', 'experience'],
  'location-web': ['googleMap', 'geoLatitude', 'geoLongitude', 'website', 'geoLocation'],
  'social-media': ['facebook', 'instagram', 'youtube', 'pinterest', 'twitter', 'linkedin'],
  'banner-details': ['bannerImage', 'logoImage', 'businessDetails'],
  'opening-hours': ['openingHours'],
  'category-seo': ['category', 'keywords'],
  'display-seo': ['title', 'description', 'seoTitle', 'seoDescription', 'slug', 'filters'],
  'kyc-documents': ['kycDocuments'],
};

export const updateBusinessSectionAction = async (req, res) => {
  try {
    const { id } = req.params;
    const pathParts = req.originalUrl.split('/');
    const sectionName = pathParts[pathParts.length - 1].split('?')[0];

    const allowedFields = SECTION_FIELD_MAPPING[sectionName];
    if (!allowedFields) {
      return res.status(400).send({ message: `Unknown section: ${sectionName}` });
    }

    const filteredData = {};
    allowedFields.forEach(field => {
      if (field in req.body) {
        filteredData[field] = req.body[field];
      }
    });

    if (Object.keys(filteredData).length === 0) {
      return res.status(400).send({ message: `No valid fields provided for section: ${sectionName}` });
    }

    const businessData = {
      ...filteredData,
      updatedBy: req.authUser?.userId,
    };

    const business = await updateBusinessList(id, businessData);

    await invalidateSearchCache();
    await invalidateDashboardCache();
    await invalidateCategoryCache();

    res.send(business);
  } catch (error) {
    console.error("Error in updateBusinessSectionAction:", error);
    return res.status(400).send({ message: error.message });
  }
};

export const deleteBusinessListAction = async (req, res) => {
  try {
    const businessId = req.params.id;
    const business = await deleteBusinessList(businessId);

    await invalidateSearchCache();
    await invalidateDashboardCache();
    await invalidateCategoryCache();

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

    await invalidateSearchCache();
    await invalidateDashboardCache();
    await invalidateCategoryCache();

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

export const adminAnalyticsReportAction = async (req, res) => {
  try {
    const { userRole, userId } = req.authUser;

    const report = await getAdminAnalyticsReportHelper({
      role: userRole,
      userId,
    });

    return res.send({
      success: true,
      report,
    });
  } catch (error) {
    console.error("Admin Analytics Report Error:", error);
    return res.status(500).send({ message: error.message });
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

export const updateBusinessBadgesAction = async (req, res) => {
  try {
    const { id } = req.params;
    const { badges, verification } = req.body;

    if (!id) {
      return res.status(400).send({ message: "Business ID is required" });
    }

    const business = await businessListModel.findByIdAndUpdate(
      id,
      {
        badges: badges || {},
        verification: verification || {}
      },
      { new: true }
    );

    if (!business) {
      return res.status(404).send({ message: "Business not found" });
    }

    await invalidateSearchCache();
    await invalidateDashboardCache();
    await invalidateCategoryCache();

    res.status(200).send(business);

  } catch (error) {
    console.error("Error updating business badges:", error);
    return res.status(400).send({ message: error.message });
  }
};

export const revertPaidStatusAction = async (req, res) => {
  try {
    const businessId = req.params.id;

    const business = await revertBusinessFromPaid(businessId);

    await invalidateSearchCache();
    await invalidateDashboardCache();
    await invalidateCategoryCache();

    res.send({
      message: "Business reverted from paid to unpaid successfully",
      business,
    });
  } catch (error) {
    console.error(error);
    return res.status(400).send({ message: error.message });
  }
};
