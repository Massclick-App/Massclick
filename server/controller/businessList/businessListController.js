import { createBusinessList, viewBusinessList, findBusinessBySlug, viewAllBusiness, getDashboardChartsHelper, getPendingBusinessList, findBusinessesByCategory, getDashboardSummaryHelper, getAdminAnalyticsReportHelper, findBusinessByMobile, viewAllBusinessList, viewAllClientBusinessList, updateBusinessList, getTrendingSearches, deleteBusinessList, activeBusinessList, revertBusinessFromPaid } from "../../helper/businessList/businessListHelper.js";
import { BAD_REQUEST } from "../../errorCodes.js";
import businessListModel from "../../model/businessList/businessListModel.js";
import gmapsLeadsModel from "../../model/gmapsLeads/gmapsLeadsModel.js";
import { getObjectBufferByKey, getSignedUrlByKey } from "../../s3Uploder.js";
import { assetUrl } from "../../utils/assetUrl.js";
import categoryModel from "../../model/category/categoryModel.js";
import masterLocationModel from "../../model/locationModel/masterLocationModel.js";
import userModel from "../../model/userModel.js";
import { emitToRoom } from "../../websocket/roomManager.js";
import { buildRoom, WS_EVENTS } from "../../websocket/constants.js";
import { getCache, setCache } from "../../utils/redisClient.js";
import { invalidateSearchCache, invalidateDashboardCache, invalidateCategoryCache } from "../../utils/cacheInvalidation.js";
import { buildBusinessExportWorkbook } from "../../utils/businessExportXlsx.js";
import { ensureBusinessCertificates, regenerateBusinessCertificates } from "../../helper/businessList/businessCertificateHelper.js";
import {
  resolveLocationForSearch,
  resolveLocationSearchScope,
  resolveRouteLocation,
} from "../../helper/location/locationResolver.js";
import { getLocationUrlPath } from "../../helper/location/locationSlug.js";
import { getSettings } from "../../helper/systemSettings/settingsService.js";

const DEFAULT_SEARCH_NEARBY_RADIUS_KM = 20;
const MIN_SEARCH_NEARBY_RADIUS_KM = 1;
const MAX_SEARCH_NEARBY_RADIUS_KM = 100;

const clampSearchNearbyRadiusKm = (value) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return DEFAULT_SEARCH_NEARBY_RADIUS_KM;
  return Math.min(
    MAX_SEARCH_NEARBY_RADIUS_KM,
    Math.max(MIN_SEARCH_NEARBY_RADIUS_KM, Math.round(number))
  );
};

const getSearchNearbyRadiusKm = async () => {
  try {
    const settings = await getSettings();
    return clampSearchNearbyRadiusKm(settings?.search_nearby_radius_km);
  } catch (error) {
    console.error("[Search] failed to read nearby radius setting:", error.message);
    return DEFAULT_SEARCH_NEARBY_RADIUS_KM;
  }
};

const attachPublicLocationPaths = (businesses = []) =>
  businesses.map((business) => {
    const resolvedLocation = Array.isArray(business._resolvedLocation)
      ? business._resolvedLocation[0]
      : null;
    if (resolvedLocation) {
      business.publicLocationPath = getLocationUrlPath(resolvedLocation);
    }
    delete business._resolvedLocation;
    return business;
  });

const ensureCertificatesForActivation = async (previousBusiness, business) => {
  const businessWithCertificates = await ensureBusinessCertificates(business);
  const certificateBusiness = businessWithCertificates || business;
  const newlyVerified =
    !previousBusiness?.verification?.isVerified && !!certificateBusiness?.verification?.isVerified;
  const newlyTrusted =
    !previousBusiness?.badges?.isTrust && !!certificateBusiness?.badges?.isTrust;

  if (!newlyVerified && !newlyTrusted) {
    return certificateBusiness;
  }

  console.log("[Certificate] Certificate generated; delivery will be included with the invoice email.");

  return certificateBusiness;
};

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
    const { location, slug, district } = req.query;

    if (!location || !slug) {
      return res
        .status(BAD_REQUEST.code)
        .send({ message: "Location and slug are required" });
    }

    const result = await findBusinessBySlug({ location, slug, district });

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
    const createdBy = (req.query.createdBy || "").trim();
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
      createdBy,
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

    const result = await findBusinessesByCategory(category, { locationText: district });

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

    const escapeRegex = (text = "") => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const resolvedIntent = await resolveCategoryIntent(search, escapeRegex);
    const searchIntent = buildSearchIntent({
      originalQuery: search,
      resolvedIntent,
      searchMode: "suggestion",
    });
    const suggestionSearch = searchIntent.correctedQuery || search;
    const escapedSearch = escapeRegex(suggestionSearch);
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
      query: search,
      searchIntent
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

const categoryIntentBaseNormalize = (text = "") =>
  String(text)
    .toLowerCase()
    .trim()
    .replace(/&/g, " and ")
    .replace(/[-_]/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const categoryIntentNormalize = (text = "") => categoryIntentBaseNormalize(text);

const getCategoryIntentQueryInfo = (term = "") => {
  const normalizedQuery = categoryIntentBaseNormalize(term);
  const correctedQuery = categoryIntentNormalize(term);
  return {
    normalizedQuery,
    correctedQuery,
    correctionApplied: Boolean(normalizedQuery && correctedQuery && normalizedQuery !== correctedQuery),
  };
};

const editDistance = (left = "", right = "") => {
  const a = String(left);
  const b = String(right);
  if (a === b) return 0;
  if (!a) return b.length;
  if (!b) return a.length;

  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  const current = Array(b.length + 1).fill(0);

  for (let i = 1; i <= a.length; i += 1) {
    current[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(
        previous[j] + 1,
        current[j - 1] + 1,
        previous[j - 1] + cost,
      );
    }
    previous.splice(0, previous.length, ...current);
  }

  return previous[b.length];
};

const getCategoryVocabularyTokens = (candidates = []) => {
  const tokens = new Set();
  for (const candidate of candidates) {
    [
      candidate.category,
      candidate.subcategory,
      ...(Array.isArray(candidate.keywords) ? candidate.keywords : []),
    ].filter(Boolean).forEach((value) => {
      categoryIntentTokens(value).forEach((token) => {
        if (!categoryIntentStopWords.has(token) && token.length >= 4) {
          tokens.add(token);
        }
      });
    });
  }
  return [...tokens];
};

const getFuzzyCategoryIntentTerm = (term = "", candidates = []) => {
  const rawTokens = categoryIntentBaseNormalize(term).split(" ").filter(Boolean);
  const vocabulary = getCategoryVocabularyTokens(candidates);
  if (rawTokens.length === 0 || vocabulary.length === 0) return "";

  let changed = false;
  const correctedTokens = rawTokens.map((rawToken) => {
    if (categoryIntentStopWords.has(rawToken) || rawToken.length < 5) return rawToken;
    if (vocabulary.includes(rawToken)) return rawToken;

    const maxDistance = rawToken.length >= 8 ? 2 : 1;
    let best = null;
    let secondDistance = Infinity;

    for (const candidateToken of vocabulary) {
      if (Math.abs(candidateToken.length - rawToken.length) > maxDistance) continue;
      if (candidateToken[0] !== rawToken[0]) continue;
      const distance = editDistance(rawToken, candidateToken);
      if (distance < (best?.distance ?? Infinity)) {
        secondDistance = best?.distance ?? Infinity;
        best = { token: candidateToken, distance };
      } else if (distance < secondDistance) {
        secondDistance = distance;
      }
    }

    if (best && best.distance <= maxDistance && secondDistance > best.distance) {
      changed = true;
      return best.token;
    }

    return rawToken;
  });

  return changed ? correctedTokens.join(" ") : "";
};

const categoryIntentTokens = (text = "") =>
  categoryIntentNormalize(text).split(" ").filter(Boolean);

const categoryIntentMeaningfulTokens = (text = "") =>
  categoryIntentTokens(text).filter((token) => !categoryIntentStopWords.has(token));

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
  const meaningfulTokens = categoryIntentMeaningfulTokens(query);
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

const scorePartialCategoryIntent = (candidate, rawTerm) => {
  const queryTokens = categoryIntentMeaningfulTokens(rawTerm);
  if (queryTokens.length < 2) return 0;

  const categoryText = categoryIntentNormalize(candidate.category);
  const descriptionText = categoryIntentNormalize(candidate.description);
  const keywordTexts = (Array.isArray(candidate.keywords) ? candidate.keywords : [])
    .map((keyword) => categoryIntentNormalize(keyword));
  const searchableText = [categoryText, ...keywordTexts, descriptionText].join(" ");
  const matchedTokens = queryTokens.filter((token) =>
    hasCategoryIntentToken(searchableText, token)
  );

  // A multi-word search must match most of a short query, or at least three
  // words from a longer query. This prevents a generic word such as
  // "equipment" from resolving catering searches to gym/crane categories.
  const minimumMatches = queryTokens.length <= 3
    ? 2
    : Math.max(3, Math.ceil(queryTokens.length * 0.6));
  if (matchedTokens.length < minimumMatches) {
    const strongSingleCategoryToken =
      matchedTokens.length === 1 &&
      matchedTokens[0].length >= 4 &&
      hasCategoryIntentToken(categoryText, matchedTokens[0]);
    if (!strongSingleCategoryToken) return 0;
  }

  let score = matchedTokens.length * 100;
  score += (matchedTokens.length / queryTokens.length) * 200;

  for (const token of matchedTokens) {
    if (hasCategoryIntentToken(categoryText, token)) score += 50;
    if (keywordTexts.some((keyword) => hasCategoryIntentToken(keyword, token))) score += 30;
    if (hasCategoryIntentToken(descriptionText, token)) score += 5;
  }

  // Prefer categories containing adjacent words from the user's original
  // phrase, e.g. "catering equipment" over unrelated "* equipment" entries.
  for (let index = 0; index < queryTokens.length - 1; index += 1) {
    const phrase = `${queryTokens[index]} ${queryTokens[index + 1]}`;
    if (categoryText.includes(phrase)) score += 120;
    if (keywordTexts.some((keyword) => keyword.includes(phrase))) score += 80;
  }

  return score;
};

const getCategoryIntentSearchableText = (candidate = {}) => {
  const categoryText = categoryIntentNormalize(candidate.category);
  const descriptionText = categoryIntentNormalize(candidate.description);
  const keywordTexts = (Array.isArray(candidate.keywords) ? candidate.keywords : [])
    .map((keyword) => categoryIntentNormalize(keyword));
  return [categoryText, descriptionText, ...keywordTexts].join(" ");
};

const getCategoryIntentRemainingTerm = (candidate = {}, rawTerm = "") => {
  const searchableText = getCategoryIntentSearchableText(candidate);
  const remainingTokens = categoryIntentMeaningfulTokens(rawTerm).filter(
    (token) => !hasCategoryIntentToken(searchableText, token)
  );
  return remainingTokens.join(" ");
};

const categoryIntentConfidence = (score, source) => {
  if (source === "exact") return "high";
  if (source === "strict" && score >= 160) return "high";
  return "medium";
};

const getCategoryIntentSuggestionTerm = (candidate = {}, rawTerm = "") => {
  const normalizedRawTerm = categoryIntentNormalize(rawTerm);
  const queryTokens = categoryIntentMeaningfulTokens(rawTerm);
  if (!normalizedRawTerm || queryTokens.length === 0) return "";

  const phraseSources = [
    { value: candidate.category, priority: 30 },
    { value: candidate.subcategory, priority: 20 },
    ...(Array.isArray(candidate.keywords)
      ? candidate.keywords.map((keyword) => ({ value: keyword, priority: 40 }))
      : []),
  ];

  const scoredPhrases = phraseSources
    .map(({ value, priority }) => {
      const phrase = String(value || "").trim();
      const normalizedPhrase = categoryIntentNormalize(phrase);
      const phraseTokens = categoryIntentTokens(phrase);
      if (!phrase || !normalizedPhrase || phraseTokens.length === 0) return null;

      const matchedTokenCount = queryTokens.filter((queryToken) =>
        phraseTokens.some((phraseToken) =>
          hasCategoryIntentToken(normalizedPhrase, queryToken) ||
          (queryToken.length >= 3 && phraseToken.startsWith(queryToken))
        )
      ).length;

      if (matchedTokenCount === 0) return null;

      let score = priority + (matchedTokenCount * 100);
      if (matchedTokenCount === queryTokens.length) score += 120;
      if (normalizedPhrase === normalizedRawTerm) score += 400;
      if (normalizedPhrase.startsWith(normalizedRawTerm)) score += 260;
      if (normalizedPhrase.includes(normalizedRawTerm)) score += 180;

      return {
        phrase,
        tokenCount: phraseTokens.length,
        score,
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score || a.tokenCount - b.tokenCount || a.phrase.length - b.phrase.length);

  return scoredPhrases[0]?.phrase || candidate.category || "";
};

const buildCategoryIntentResult = ({ candidate, score, source, term, correctedTerm = "" }) => {
  const queryInfo = getCategoryIntentQueryInfo(term);
  const correctedQuery = correctedTerm
    ? getCategoryIntentSuggestionTerm(candidate, correctedTerm) || correctedTerm
    : queryInfo.correctedQuery;
  return {
    category: candidate.category,
    confidence: categoryIntentConfidence(score, source),
    score,
    source,
    normalizedQuery: queryInfo.normalizedQuery,
    correctedQuery,
    correctionApplied: Boolean(queryInfo.normalizedQuery && correctedQuery && queryInfo.normalizedQuery !== correctedQuery),
    remainingTerm: getCategoryIntentRemainingTerm(candidate, correctedQuery || term),
  };
};

const buildSearchIntent = ({
  originalQuery = "",
  resolvedIntent = null,
  resolvedCategory = "",
  searchMode = "text",
  textSearchTerm = "",
  shouldShowSuggestion = false,
} = {}) => {
  const queryInfo = resolvedIntent || getCategoryIntentQueryInfo(originalQuery);
  const finalCategory = resolvedCategory || resolvedIntent?.category || "";
  const correctionApplied = Boolean(queryInfo.correctionApplied);
  return {
    originalQuery: String(originalQuery || "").trim(),
    normalizedQuery: queryInfo.normalizedQuery || categoryIntentBaseNormalize(originalQuery),
    correctedQuery: queryInfo.correctedQuery || categoryIntentNormalize(originalQuery),
    textSearchTerm,
    resolvedCategory: finalCategory || null,
    correctionApplied,
    correctionConfidence: correctionApplied ? (resolvedIntent?.confidence || "medium") : "",
    confidence: resolvedIntent?.confidence || "",
    source: resolvedIntent?.source || "",
    searchMode,
    shouldShowNotice: Boolean(correctionApplied && finalCategory && searchMode !== "suggestion"),
    shouldShowSuggestion: Boolean(
      (shouldShowSuggestion || searchMode === "suggestion") &&
      correctionApplied &&
      queryInfo.correctedQuery
    ),
  };
};

export const resolveCategoryIntent = async (term, escapeRegex, options = {}) => {
  const { allowFuzzy = true } = options;
  const exactPattern = `^${escapeRegex(term)}$`;
  const exactCategoryMatch = await categoryModel.findOne(
    {
      category: { $regex: exactPattern, $options: "i" },
      isActive: true
    },
    { category: 1, keywords: 1, description: 1 }
  );

  const exactMatch = exactCategoryMatch || await categoryModel.findOne(
    {
      keywords: { $regex: exactPattern, $options: "i" },
      isActive: true
    },
    { category: 1, keywords: 1, description: 1 }
  );

  if (exactMatch) {
    return buildCategoryIntentResult({
      candidate: exactMatch,
      score: 1000,
      source: "exact",
      term,
    });
  }

  const requiredTokens = categoryIntentMeaningfulTokens(term);

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
  ).limit(200);

  const strictMatch = candidates
    .map((candidate) => ({
      candidate,
      score: scoreCategoryIntent(candidate, term),
    }))
    .filter((result) => result.score > 0)
    .sort((a, b) => b.score - a.score)[0];

  if (strictMatch?.candidate?.category) {
    return buildCategoryIntentResult({
      candidate: strictMatch.candidate,
      score: strictMatch.score,
      source: "strict",
      term,
    });
  }

  const partialMatch = candidates
    .map((candidate) => ({
      candidate,
      score: scorePartialCategoryIntent(candidate, term),
    }))
    .filter((result) => result.score > 0)
    .sort((a, b) => b.score - a.score)[0];

  if (partialMatch?.candidate?.category) {
    return buildCategoryIntentResult({
        candidate: partialMatch.candidate,
        score: partialMatch.score,
        source: "partial",
        term,
    });
  }

  if (!allowFuzzy) return "";

  const fuzzyCandidates = candidates.length
    ? candidates
    : await categoryModel.find(
        { isActive: true },
        { category: 1, subcategory: 1, keywords: 1, description: 1 },
      ).limit(1000);
  const fuzzyTerm = getFuzzyCategoryIntentTerm(term, fuzzyCandidates);

  if (fuzzyTerm && fuzzyTerm !== categoryIntentBaseNormalize(term)) {
    const fuzzyMatch = fuzzyCandidates
      .map((candidate) => ({
        candidate,
        score: Math.max(
          scoreCategoryIntent(candidate, fuzzyTerm),
          scorePartialCategoryIntent(candidate, fuzzyTerm),
        ),
      }))
      .filter((result) => result.score > 0)
      .sort((a, b) => b.score - a.score)[0];

    if (fuzzyMatch?.candidate?.category) {
      return buildCategoryIntentResult({
        candidate: fuzzyMatch.candidate,
        score: fuzzyMatch.score,
        source: "fuzzy",
        term,
        correctedTerm: fuzzyTerm,
      });
    }
  }

  return "";
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
    let { term = "", location = "", category = "", district = "" } = req.query;
    const originalTermParam = String(term || "").trim();
    const originalCategoryParam = String(category || "").trim();
    // Preserved pre-normalize: resolveRouteLocation needs the URL-shaped
    // segment ("srirangam"), not the free-text-normalized form used for
    // regex fallback matching further down (which turns hyphens into spaces
    // — fine for matching against free text, wrong for matching a slug).
    const rawLocationParam = location;

    const normalize = (text = "") =>
      text.toLowerCase().trim().replace(/&/g, " and ").replace(/[-_]/g, " ").replace(/\s+/g, " ");

    term = normalize(term);
    location = normalize(location);
    category = normalize(category);
    // district is left as-is, not run through the free-text normalize()
    // above — it's a clean URL segment, not free text needing space
    // -normalization for regex matching. resolveRouteLocation's own
    // publicSlugify() does the actual comparison-safe normalization.
    district = (district || "").trim();

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
    // Resolve category intent for both free-text searches and category-shaped
    // route params. A URL like /budget-hotels-in-mukkompu can arrive as
    // category="budget hotels"; that should still resolve to Hotels with
    // "budget" kept as a ranking modifier instead of becoming an exact filter.
    let categoryModifierTokens = [];
    let searchIntent = null;
    let resolvedCategoryForResponse = null;
    const applyCategoryIntent = (resolvedIntent, { clearTerm = false, sourceLabel = "category" } = {}) => {
      if (resolvedIntent?.category) {
        category = resolvedIntent.category;
        resolvedCategoryForResponse = resolvedIntent.category;
        categoryModifierTokens = categoryIntentMeaningfulTokens(resolvedIntent.remainingTerm)
          .slice(0, 5);
        searchIntent = buildSearchIntent({
          originalQuery: sourceLabel === "category param" ? originalCategoryParam : originalTermParam,
          resolvedIntent,
          searchMode: "category",
        });
        console.log(
          `[Search] ${sourceLabel} via ${resolvedIntent.confidence} intent: "${resolvedIntent.category}" remaining:"${resolvedIntent.remainingTerm || ""}"`,
        );
        if (clearTerm) term = "";
        return true;
      }
      return false;
    };

    if (category) {
      const resolvedIntent = await resolveCategoryIntent(category, escapeRegex, { allowFuzzy: false });
      applyCategoryIntent(resolvedIntent, { sourceLabel: "category param" });
    } else if (term) {
      const resolvedIntent = await resolveCategoryIntent(term, escapeRegex, { allowFuzzy: false });
      if (!applyCategoryIntent(resolvedIntent, { clearTerm: true, sourceLabel: "category" })) {
        console.log(`[Search] no category resolved — falling back to text search for "${term}"`);
      }
    }

    console.log(`[Search] final → term:"${term}" category:"${category}" location:"${location}" sort:${req.query.sortBy || "relevant"}`);

    const matchQuery = { businessesLive: true, $and: [] };

    // ── Location filter ──────────────────────────────────────────────────────
    // Resolve the location text to a masterlocations node, then match linked
    // businesses by slug prefix. Related search groups can expand sibling
    // nodes and safely recover broad neighborhood address entries without
    // widening to the whole administrative zone. Unlinked businesses retain
    // the legacy exact-text fallback while linkage coverage grows.
    let resolvedLocation = null;
    let locationSearchScope = null;
    let locationClauseIndex = -1;
    // Set only when an optional `district` param resolved to a real district
    // doc. This is the actual fix for the cross-district name collision (390
    // locality/ward/zone names shared by 2+ districts, e.g. "Anna Nagar" in
    // 4): a bare `location=srirangam` is ambiguous on its own, but paired
    // with `district=trichy` it disambiguates to one exact node instead of
    // whatever resolveLocationForSearch's free-text ranking happens to pick.
    let districtScopeDoc = null;

    if (district) {
      const routeResolution = await resolveRouteLocation({
        districtSlug: district,
        locationSlug: rawLocationParam,
      }).catch((err) => {
        console.error("[Search] district route resolve failed:", err.message);
        return { districtDoc: null, locationDoc: null };
      });
      districtScopeDoc = routeResolution.districtDoc;
      if (routeResolution.locationDoc) {
        resolvedLocation = routeResolution.locationDoc;
        locationSearchScope = await resolveLocationSearchScope(resolvedLocation).catch((err) => {
          console.error("[Search] location scope expansion failed:", err.message);
          return null;
        });
      }
    }

    // Legacy free-text path — completely unchanged behavior, and only runs
    // when a district wasn't supplied (or didn't resolve to anything real).
    // A caller sending both `district` and `location` never falls into this
    // branch even if the location didn't resolve WITHIN that district —
    // falling through to nationwide free-text matching would silently
    // re-introduce the exact ambiguity `district` was sent to avoid.
    if (!resolvedLocation && !districtScopeDoc && location) {
      resolvedLocation = await resolveLocationForSearch(location).catch((err) => {
        console.error("[Search] location resolve failed:", err.message);
        return null;
      });
      if (resolvedLocation) {
        locationSearchScope = await resolveLocationSearchScope(resolvedLocation).catch((err) => {
          console.error("[Search] location scope expansion failed:", err.message);
          return null;
        });
      }
    }
    const slugPrefixRegex = locationSearchScope?.slugPrefixRegex ||
      (resolvedLocation
        ? new RegExp(`^${escapeRegex(resolvedLocation.slug)}(-|$)`)
        : null);

    if (resolvedLocation) {
      console.log(`[Search] location resolved: "${location}" -> ${resolvedLocation.level}:${resolvedLocation.slug}`);
      // Fallback matches the node's own name(s) against unlinked businesses'
      // free text. The district name joins only for district-level searches —
      // a "mettur" search must not sweep in every unlinked "Salem" business.
      const locKey = location.toLowerCase().trim();
      const fallbackNames = [
        ...new Set([
          locKey,
          ...(districtAliasMap[locKey] || []),
          resolvedLocation.locality || resolvedLocation.ward || resolvedLocation.zone,
          ...(resolvedLocation.level === "district" ? [resolvedLocation.district] : []),
          ...(resolvedLocation.alternateNames || []),
        ].filter(Boolean).map((n) => normalize(n))),
      ];
      const groupAddressRegexes = locationSearchScope?.searchGroupSlug
        ? locationSearchScope.addressNames.map(
            (name) => new RegExp(escapeRegex(name), "i"),
          )
        : [];
      const districtKey = normalize(resolvedLocation.district || "");
      const districtNames = [
        ...new Set([
          districtKey,
          ...(districtAliasMap[districtKey] || []),
        ].filter(Boolean)),
      ];
      const groupDistrictMatches = [
        {
          "masterLocation.district": {
            $regex: `^${escapeRegex(resolvedLocation.district || "")}$`,
            $options: "i",
          },
        },
        ...(locationSearchScope?.pincodes?.length
          ? [{ pincode: { $in: locationSearchScope.pincodes } }]
          : []),
        ...districtNames.map((name) => ({
          location: {
            $regex: `^${escapeRegex(name)}$`,
            $options: "i",
          },
        })),
      ];
      const groupedAddressMatch = groupAddressRegexes.length > 0
        ? {
            $and: [
              { $or: groupDistrictMatches },
              {
                $or: groupAddressRegexes.flatMap((regex) => [
                  { location: regex },
                  { street: regex },
                  { globalAddress: regex },
                ]),
              },
            ],
          }
        : null;
      locationClauseIndex = matchQuery.$and.length;
      matchQuery.$and.push({
        $or: [
          { "masterLocation.slug": slugPrefixRegex },
          ...(groupedAddressMatch ? [groupedAddressMatch] : []),
          {
            "masterLocation.locationId": null,
            $or: fallbackNames.map((l) => ({
              location: { $regex: `^${escapeRegex(l)}$`, $options: "i" }
            })),
          },
        ],
      });
    } else if (districtScopeDoc) {
      // District resolved but no location segment (district-wide
      // /:district/:category), or the location segment didn't resolve to
      // anything within this district — scope purely to the district via the
      // already-denormalized masterLocation.district field. Deliberately
      // does NOT fall back to nationwide free-text matching like the
      // `else if (location)` legacy branch below: the caller already told us
      // which district it means, and matching outside it would be wrong, not
      // just imprecise.
      locationClauseIndex = matchQuery.$and.length;
      matchQuery.$and.push({
        "masterLocation.district": {
          $regex: `^${escapeRegex(districtScopeDoc.district)}$`,
          $options: "i",
        },
      });
    } else if (location) {
      // Nothing resolved — legacy behavior untouched.
      const locKey = location.toLowerCase().trim();
      const aliases = districtAliasMap[locKey] || [locKey];
      locationClauseIndex = matchQuery.$and.length;
      matchQuery.$and.push({
        $or: aliases.map((l) => ({
          location: { $regex: `^${escapeRegex(normalize(l))}$`, $options: "i" }
        }))
      });
    }

    if (category) {
      const escaped = escapeRegex(category);
      const exactCategoryOrKeyword = { $regex: `^${escaped}$`, $options: "i" };
      matchQuery.$and.push({
        $or: [
          { category: exactCategoryOrKeyword },
          { keywords: exactCategoryOrKeyword }
        ]
      });
    }

    let textSearchTerm = "";

    // Text search. Generic words such as "service" and "near" are useful
    // for understanding category intent, but dangerous as a raw fallback:
    // one useful word plus one generic word must not become "every business
    // containing the generic word".
    if (term) {
      textSearchTerm = categoryIntentMeaningfulTokens(term).join(" ");
      if (textSearchTerm) {
        if (textSearchTerm !== term) {
          console.log(`[Search] text fallback cleaned "${term}" -> "${textSearchTerm}"`);
        }
        matchQuery.$text = { $search: textSearchTerm };
      } else {
        matchQuery.$and.push({ _id: null });
        console.log(`[Search] ignored generic-only text fallback for "${term}"`);
      }
      if (!searchIntent) {
        searchIntent = buildSearchIntent({
          originalQuery: originalTermParam,
          searchMode: textSearchTerm ? "text" : "blocked-generic",
          textSearchTerm,
        });
      }
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

    const getPointCoordinates = (point) => {
      const coordinates = point?.coordinates;
      if (!Array.isArray(coordinates) || coordinates.length < 2) return null;
      const pointLng = Number(coordinates[0]);
      const pointLat = Number(coordinates[1]);
      if (!Number.isFinite(pointLng) || !Number.isFinite(pointLat)) return null;
      if (pointLng === 0 && pointLat === 0) return null;
      if (pointLng < 68 || pointLng > 98 || pointLat < 6 || pointLat > 38) return null;
      return { lng: pointLng, lat: pointLat };
    };

    const averageCoordinatesForPincode = async ({
      model,
      pincode,
      coordinatesPath,
      match = {},
      sourceLabel,
    }) => {
      if (!/^\d{6}$/.test(pincode || "")) return null;
      const [row] = await model.aggregate([
        {
          $match: {
            ...match,
            pincode,
            [`${coordinatesPath}.0`]: { $gte: 68, $lte: 98 },
            [`${coordinatesPath}.1`]: { $gte: 6, $lte: 38 },
          },
        },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            lng: { $avg: { $arrayElemAt: [`$${coordinatesPath}`, 0] } },
            lat: { $avg: { $arrayElemAt: [`$${coordinatesPath}`, 1] } },
          },
        },
      ]).catch((err) => {
        console.error(`[Search] ${sourceLabel} pincode origin lookup failed:`, err.message);
        return [];
      });

      const point = getPointCoordinates({ coordinates: [row?.lng, row?.lat] });
      return point ? { ...point, count: row.count, source: sourceLabel } : null;
    };

    const compactUnique = (values = []) => [
      ...new Set(values.map((value) => normalize(value || "")).filter(Boolean)),
    ];

    const getLocationLeafNames = () => {
      const levelName = resolvedLocation?.locality ||
        resolvedLocation?.ward ||
        resolvedLocation?.zone ||
        resolvedLocation?.district;
      return compactUnique([
        location,
        levelName,
        ...(resolvedLocation?.alternateNames || []),
      ]);
    };

    const getSearchOriginNameVariants = () => {
      const names = getLocationLeafNames();
      const expanded = [];
      for (const name of names) {
        expanded.push(name);
        expanded.push(name.replace(/\btrichy\b/g, "tiruchirappalli"));
        expanded.push(name.replace(/\btiruchirappalli\b/g, "trichy"));
        expanded.push(name.replace(/\btiruchchirappalli\b/g, "trichy"));
      }
      return compactUnique(expanded);
    };

    const resolveGmapsLocationOrigin = async () => {
      const locationNameVariants = getSearchOriginNameVariants();
      if (!locationNameVariants.length) return null;

      const pincode = /^\d{6}$/.test(resolvedLocation?.pincode || "")
        ? resolvedLocation.pincode
        : "";
      const districtNames = compactUnique([
        resolvedLocation?.district,
        ...(districtAliasMap[normalize(resolvedLocation?.district || "")] || []),
        resolvedLocation?.district === "Tiruchirappalli" ? "Trichy" : "",
        resolvedLocation?.district === "Tiruchirappalli" ? "Trichirappalli" : "",
      ]);
      const locationRegexes = locationNameVariants.map((name) => new RegExp(escapeRegex(name), "i"));

      const candidates = await gmapsLeadsModel
        .find({
          "geoLocation.coordinates.0": { $gte: 68, $lte: 98 },
          "geoLocation.coordinates.1": { $gte: 6, $lte: 38 },
          $or: locationRegexes.flatMap((regex) => [
            { name: regex },
            { formatted_address: regex },
          ]),
        }, {
          name: 1,
          formatted_address: 1,
          massclick_location: 1,
          search_query: 1,
          google_types: 1,
          geoLocation: 1,
        })
        .limit(40)
        .lean()
        .catch((err) => {
          console.error("[Search] gmaps origin lookup failed:", err.message);
          return [];
        });

      const scored = candidates
        .map((candidate) => {
          const point = getPointCoordinates(candidate.geoLocation);
          if (!point) return null;

          const nameText = normalize(candidate.name || "");
          const addressText = normalize(candidate.formatted_address || "");
          const contextText = normalize([
            candidate.formatted_address,
            candidate.massclick_location,
            candidate.search_query,
          ].filter(Boolean).join(" "));
          const hasDistrictContext = districtNames.length === 0 ||
            districtNames.some((name) => contextText.includes(name)) ||
            (pincode && contextText.includes(pincode));
          if (!hasDistrictContext) return null;

          let score = 0;
          for (const variant of locationNameVariants) {
            if (nameText === variant) score = Math.max(score, 110);
            if (nameText.includes(variant)) score = Math.max(score, 95);
            if (addressText.includes(variant)) score = Math.max(score, 80);
          }

          const googleTypes = Array.isArray(candidate.google_types)
            ? candidate.google_types
            : [];
          if (googleTypes.includes("transit_station")) score += 10;
          if (googleTypes.includes("train_station")) score += 10;
          if (pincode && addressText.includes(pincode)) score += 5;

          return score >= 80
            ? {
                ...point,
                score,
                name: candidate.name,
                source: "gmaps-leads",
              }
            : null;
        })
        .filter(Boolean)
        .sort((left, right) => right.score - left.score);

      if (!scored.length) return null;
      const best = scored[0];
      console.log(`[Search] gmaps origin candidate "${best.name}" score:${best.score}`);
      return best;
    };

    const resolveSearchOrigin = async () => {
      const exactPoint = getPointCoordinates(resolvedLocation?.coordinates);
      if (exactPoint) return { ...exactPoint, source: "masterLocation" };

      const gmapsPoint = await resolveGmapsLocationOrigin();
      if (gmapsPoint) return gmapsPoint;

      if (resolvedLocation?.level === "locality") return null;

      const pincode = /^\d{6}$/.test(resolvedLocation?.pincode || "")
        ? resolvedLocation.pincode
        : null;
      if (!pincode) return null;

      const masterLocationPoint = await averageCoordinatesForPincode({
        model: masterLocationModel,
        pincode,
        coordinatesPath: "coordinates.coordinates",
        match: { isActive: true, level: { $in: ["locality", "ward"] } },
        sourceLabel: "masterLocation-pincode",
      });
      if (masterLocationPoint) return masterLocationPoint;

      return averageCoordinatesForPincode({
        model: businessListModel,
        pincode,
        coordinatesPath: "geoLocation.coordinates",
        match: { businessesLive: true },
        sourceLabel: "business-pincode",
      });
    };

    const coordinateAtExpression = (coordinatesExpression, index) => ({
      $convert: {
        input: { $arrayElemAt: [{ $ifNull: [coordinatesExpression, []] }, index] },
        to: "double",
        onError: null,
        onNull: null,
      },
    });

    const validPointExpression = (pointLngExpression, pointLatExpression) => ({
      $and: [
        { $ne: [pointLngExpression, null] },
        { $ne: [pointLatExpression, null] },
        { $not: [{ $and: [{ $eq: [pointLngExpression, 0] }, { $eq: [pointLatExpression, 0] }] }] },
        { $gte: [pointLngExpression, 68] },
        { $lte: [pointLngExpression, 98] },
        { $gte: [pointLatExpression, 6] },
        { $lte: [pointLatExpression, 38] },
      ],
    });

    const distanceExpression = ({ coordinatesExpression, originLat, originLng }) => ({
      $let: {
        vars: {
          pointLng: coordinateAtExpression(coordinatesExpression, 0),
          pointLat: coordinateAtExpression(coordinatesExpression, 1),
        },
        in: {
          $cond: {
            if: validPointExpression("$$pointLng", "$$pointLat"),
            then: {
              $let: {
                vars: {
                  dLat: { $multiply: [{ $subtract: ["$$pointLat", originLat] }, Math.PI / 180] },
                  dLng: { $multiply: [{ $subtract: ["$$pointLng", originLng] }, Math.PI / 180] },
                  lat2R: { $multiply: ["$$pointLat", Math.PI / 180] },
                },
                in: {
                  $multiply: [
                    2 * 6371,
                    { $asin: { $sqrt: { $add: [
                      { $pow: [{ $sin: { $divide: ["$$dLat", 2] } }, 2] },
                      { $multiply: [
                        Math.cos(originLat * Math.PI / 180),
                        { $cos: "$$lat2R" },
                        { $pow: [{ $sin: { $divide: ["$$dLng", 2] } }, 2] }
                      ]}
                    ]}}}
                  ]
                }
              }
            },
            else: null,
          },
        },
      },
    });

    const buildDistanceStages = ({
      coordinatesExpression,
      originLat,
      originLng,
      distanceField,
      sortField,
    }) => [
      {
        $addFields: {
          [distanceField]: distanceExpression({ coordinatesExpression, originLat, originLng }),
        },
      },
      { $addFields: { [sortField]: { $ifNull: [`$${distanceField}`, 999999] } } }
    ];

    const resolvedLocationOrigin = await resolveSearchOrigin();
    const useSearchedLocationSort =
      sortByParam === "relevant" && Boolean(resolvedLocationOrigin);
    if (useSearchedLocationSort) {
      console.log(
        `[Search] ranking from ${resolvedLocationOrigin.source} origin ${resolvedLocationOrigin.lat},${resolvedLocationOrigin.lng}`,
      );
    }

    // Haversine distance from the user's device is included whenever provided
    // so cards can show it, but it only affects ranking for sortBy=nearest.
    const geoStages = hasGeo
      ? buildDistanceStages({
          coordinatesExpression: "$geoLocation.coordinates",
          originLat: lat,
          originLng: lng,
          distanceField: "distance",
          sortField: "_distanceSort",
        })
      : [];

    const businessGeoLng = coordinateAtExpression("$geoLocation.coordinates", 0);
    const businessGeoLat = coordinateAtExpression("$geoLocation.coordinates", 1);
    const rankLocationLng = coordinateAtExpression("$_rankLocationCoordinates", 0);
    const rankLocationLat = coordinateAtExpression("$_rankLocationCoordinates", 1);
    const searchedLocationRankStages = useSearchedLocationSort ? [
      {
        $lookup: {
          from: "masterlocations",
          localField: "masterLocation.locationId",
          foreignField: "_id",
          as: "_rankLocation",
          pipeline: [{
            $project: {
              _id: 0,
              coordinates: 1,
            },
          }],
        },
      },
      {
        $addFields: {
          _rankLocationCoordinates: {
            $arrayElemAt: ["$_rankLocation.coordinates.coordinates", 0],
          },
        },
      },
      {
        $addFields: {
          _searchRankCoordinates: {
            $cond: [
              validPointExpression(businessGeoLng, businessGeoLat),
              "$geoLocation.coordinates",
              {
                $cond: [
                  validPointExpression(rankLocationLng, rankLocationLat),
                  "$_rankLocationCoordinates",
                  null,
                ],
              },
            ],
          },
        },
      },
      ...buildDistanceStages({
        coordinatesExpression: "$_searchRankCoordinates",
        originLat: resolvedLocationOrigin.lat,
        originLng: resolvedLocationOrigin.lng,
        distanceField: "locationDistance",
        sortField: "_locationDistanceSort",
      }),
      {
        $addFields: {
          locationDistanceBand: {
            $switch: {
              branches: [
                { case: { $and: [{ $ne: ["$locationDistance", null] }, { $lte: ["$locationDistance", 2] }] }, then: 0 },
                { case: { $and: [{ $ne: ["$locationDistance", null] }, { $lte: ["$locationDistance", 5] }] }, then: 1 },
                { case: { $and: [{ $ne: ["$locationDistance", null] }, { $lte: ["$locationDistance", 10] }] }, then: 2 },
                { case: { $and: [{ $ne: ["$locationDistance", null] }, { $lte: ["$locationDistance", 20] }] }, then: 3 },
              ],
              default: 4,
            },
          },
        },
      },
    ] : [];

    const relevantSort = {
      locationPriority: 1,
      ...(useSearchedLocationSort ? {
        locationDistanceBand: 1,
      } : {}),
      categoryPriority: 1,
      categoryModifierScore: -1,
      ...(textSearchTerm ? { textScore: -1 } : {}),
      ...(useSearchedLocationSort ? {
        _locationDistanceSort: 1,
      } : {}),
      paidPriority: 1,
      verifiedPriority: 1,
      averageRating: -1,
      "badges.priorityScore": -1,
      paidDate: -1,
      createdAt: -1,
      _id: 1
    };

    const keywordTextExpression = {
      $reduce: {
        input: { $ifNull: ["$keywords", []] },
        initialValue: "",
        in: { $concat: ["$$value", " ", "$$this"] },
      },
    };
    const categoryModifierScoreParts = categoryModifierTokens.map((token) => {
      const regex = `(^|[^a-z0-9])${escapeRegex(token)}([^a-z0-9]|$)`;
      return {
        $cond: [
          {
            $or: [
              { $regexMatch: { input: { $ifNull: ["$businessName", ""] }, regex, options: "i" } },
              { $regexMatch: { input: { $ifNull: ["$category", ""] }, regex, options: "i" } },
              { $regexMatch: { input: keywordTextExpression, regex, options: "i" } },
              { $regexMatch: { input: { $ifNull: ["$seoTitle", ""] }, regex, options: "i" } },
              { $regexMatch: { input: { $ifNull: ["$seoDescription", ""] }, regex, options: "i" } },
              { $regexMatch: { input: { $ifNull: ["$description", ""] }, regex, options: "i" } },
              { $regexMatch: { input: { $ifNull: ["$businessDetails", ""] }, regex, options: "i" } },
              { $regexMatch: { input: { $ifNull: ["$globalAddress", ""] }, regex, options: "i" } },
            ],
          },
          1,
          0,
        ],
      };
    });

    const runAggregation = async (matchQueryForRun, { nearbyRadiusKm = null } = {}) => {
    const pipeline = [
      { $match: matchQueryForRun },
      ...(textSearchTerm ? [{ $addFields: { textScore: { $meta: "textScore" } } }] : []),
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
          paidPriority: {
            $cond: [
              { $eq: ["$amountPaid", true] },
              0,
              1
            ]
          },
          verifiedPriority: {
            $cond: [
              { $eq: ["$verification.isVerified", true] },
              0,
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
          },
          // Businesses verified into the searched location subtree rank above
          // legacy free-text fallback matches.
          locationPriority: {
            $cond: [
              slugPrefixRegex ? {
                $regexMatch: {
                  input: { $ifNull: ["$masterLocation.slug", ""] },
                  regex: slugPrefixRegex.source
                }
              } : false,
              0,
              1
            ]
          },
          categoryModifierScore: categoryModifierScoreParts.length
            ? { $sum: categoryModifierScoreParts }
            : 0,
        }
      },
      ...(Number.isFinite(minRatingValue) && minRatingValue > 0 ? [
        { $match: { averageRating: { $gte: minRatingValue } } }
      ] : []),
      ...searchedLocationRankStages,
      ...(Number.isFinite(nearbyRadiusKm) && useSearchedLocationSort ? [
        {
          $match: {
            $or: [
              { locationPriority: 0 },
              { locationDistance: { $lte: nearbyRadiusKm } },
            ],
          },
        },
      ] : []),
      ...geoStages,
      {
        $sort: useNearestSort
          ? { _distanceSort: 1, amountPaid: -1, createdAt: -1 }
          : (useCustomSort || relevantSort)
      },
      { $skip: skip },
      { $limit: pageSize },
      // Resolve each result's OWN collision-resolved publicLocationSlug (the
      // same field the whole district-URL scheme is built on — see
      // helper/location/locationSlug.js), keyed off the already-linked
      // masterLocation.locationId, so the client can build a business detail
      // URL that names the business's real locality. Without this the
      // client falls back to the free-text `location` field, which can be
      // as coarse as the district name itself ("Trichy") for businesses
      // whose location text was never cleaned up — producing a URL like
      // /business/trichy/trichy/... that has lost all locality specificity.
      // Only joined on the final paginated page (after $skip/$limit), not
      // the full match set, to keep this cheap.
      {
        $lookup: {
          from: "masterlocations",
          localField: "masterLocation.locationId",
          foreignField: "_id",
          as: "_resolvedLocation",
          pipeline: [{
            $project: {
              _id: 0,
              district: 1,
              zone: 1,
              ward: 1,
              locality: 1,
              level: 1,
              publicLocationSlug: 1,
            },
          }],
        },
      },
      {
        $addFields: {
          publicLocationSlug: {
            $arrayElemAt: ["$_resolvedLocation.publicLocationSlug", 0],
          },
        },
      },
      ...(useSearchedLocationSort ? [
        {
          $addFields: {
            locationDistance: {
              $cond: [
                { $ne: ["$locationDistance", null] },
                { $round: ["$locationDistance", 2] },
                null,
              ],
            },
          },
        },
      ] : []),
      {
        $project: {
          reviews: 0,
          activeReviews: 0,
          paidPriority: 0,
          verifiedPriority: 0,
          categoryPriority: 0,
          locationPriority: 0,
          categoryModifierScore: 0,
          textScore: 0,
          _distanceSort: 0,
          _rankLocation: 0,
          _rankLocationCoordinates: 0,
          _searchRankCoordinates: 0,
          _locationDistanceSort: 0,
          locationDistanceBand: 0,
        },
      },
    ];

    const usesComputedRatingFilter = Number.isFinite(minRatingValue) && minRatingValue > 0;
    const usesAggregationCount =
      usesComputedRatingFilter ||
      (Number.isFinite(nearbyRadiusKm) && useSearchedLocationSort);
    const totalPipeline = pipeline
      .filter(stage =>
        !Object.prototype.hasOwnProperty.call(stage, "$skip") &&
        !Object.prototype.hasOwnProperty.call(stage, "$limit") &&
        !Object.prototype.hasOwnProperty.call(stage, "$sort") &&
        !Object.prototype.hasOwnProperty.call(stage, "$project")
      )
      .concat({ $count: "total" });

    const [results, totalResult] = await Promise.all([
      businessListModel.aggregate(pipeline).then(attachPublicLocationPaths),
      usesAggregationCount
        ? businessListModel.aggregate(totalPipeline)
        : businessListModel.countDocuments(matchQueryForRun)
    ]);
    const total = usesAggregationCount ? totalResult[0]?.total || 0 : totalResult;
    return { results, total };
    };

    let { results, total } = await runAggregation(matchQuery);
    console.log(`[Search] → ${results.length} results (total:${total} hasMore:${page * pageSize < total}) resolvedCategory:"${category || ""}" in ${Date.now() - t0}ms`);

    const originalSearchQuery = originalTermParam || originalCategoryParam;
    if (total === 0 && originalSearchQuery && !searchIntent?.shouldShowNotice) {
      const suggestedIntent = await resolveCategoryIntent(originalSearchQuery, escapeRegex, { allowFuzzy: true });
      if (suggestedIntent?.category && suggestedIntent.correctionApplied) {
        searchIntent = buildSearchIntent({
          originalQuery: originalSearchQuery,
          resolvedIntent: suggestedIntent,
          searchMode: "suggestion",
          shouldShowSuggestion: true,
        });
        console.log(
          `[Search] zero-result suggestion for "${originalSearchQuery}" -> "${suggestedIntent.correctedQuery}" (${suggestedIntent.category})`,
        );
      }
    }

    // ── Nearby-pincode top-up ─────────────────────────────────────────────────────
    // A location search that comes up thin (< MIN_RESULTS) widens to include
    // businesses in neighboring pincodes instead of surfacing a sparse page.
    // Original matches are kept — the location clause is OR'd with the
    // nearby-pincode clause, not replaced. Nearby candidates come from
    // geo-proximity on masterlocations first; only if that finds nothing do
    // we fall back to a numeric ±5 window on the pincode itself
    // (e.g. 600005 → 600000-600010).
    const MIN_RESULTS = 5;
    let isNearbySearch = false;
    let fallbackTier = null;
    let nearbySearchRadiusKm = DEFAULT_SEARCH_NEARBY_RADIUS_KM;
    if (total < MIN_RESULTS && locationClauseIndex >= 0) {
      nearbySearchRadiusKm = await getSearchNearbyRadiusKm();
      const nearbySearchRadiusMeters = nearbySearchRadiusKm * 1000;
      const triedPincodes = locationSearchScope?.pincodes?.length
        ? locationSearchScope.pincodes
        : (resolvedLocation?.pincode ? [resolvedLocation.pincode] : []);

      const originCoordinates = resolvedLocationOrigin
        ? [resolvedLocationOrigin.lng, resolvedLocationOrigin.lat]
        : null;
      const hasOriginCoordinates =
        Array.isArray(originCoordinates) &&
        originCoordinates.length === 2 &&
        !(originCoordinates[0] === 0 && originCoordinates[1] === 0);

      let nearbyPincodes = [];

      if (hasOriginCoordinates) {
        const nearbyLocations = await masterLocationModel
          .find({
            isActive: true,
            level: { $in: ["locality", "ward"] },
            pincode: { $nin: triedPincodes, $ne: null },
            coordinates: {
              $nearSphere: {
                $geometry: { type: "Point", coordinates: originCoordinates },
                $maxDistance: nearbySearchRadiusMeters,
              },
            },
          })
          .limit(500)
          .lean()
          .catch((err) => {
            console.error("[Search] nearby-pincode geo lookup failed:", err.message);
            return [];
          });

        nearbyPincodes = [
          ...new Set(nearbyLocations.map((loc) => loc.pincode).filter(Boolean)),
        ];
      }

      // Geo found nothing (or there were no coordinates to search from) —
      // fall back to a numeric window around the searched pincode itself.
      if (nearbyPincodes.length === 0) {
        const pincodeCenter = /^\d{6}$/.test(location)
          ? location
          : (/^\d{6}$/.test(resolvedLocation?.pincode || "") ? resolvedLocation.pincode : null);

        if (pincodeCenter) {
          const centerNum = parseInt(pincodeCenter, 10);
          const windowPincodes = [];
          for (let offset = -5; offset <= 5; offset += 1) {
            if (offset === 0) continue;
            const candidate = centerNum + offset;
            if (candidate < 100000 || candidate > 999999) continue;
            windowPincodes.push(String(candidate));
          }
          nearbyPincodes = windowPincodes.filter((p) => !triedPincodes.includes(p));
        }
      }

      if (nearbyPincodes.length > 0) {
        console.log(`[Search] only ${total} result(s) for "${location}" — topping up with ${nearbyPincodes.length} nearby pincode(s) within ${nearbySearchRadiusKm}km`);
        const originalLocationClause = matchQuery.$and[locationClauseIndex];
        const widenedMatchQuery = { ...matchQuery, $and: [...matchQuery.$and] };
        widenedMatchQuery.$and[locationClauseIndex] = {
          $or: [originalLocationClause, { pincode: { $in: nearbyPincodes } }],
        };

        const widenedResult = await runAggregation(widenedMatchQuery, {
          nearbyRadiusKm: nearbySearchRadiusKm,
        });
        if (widenedResult.total > total) {
          ({ results, total } = widenedResult);
          isNearbySearch = true;
          fallbackTier = "pincode";
          console.log(`[Search] → nearby-pincode top-up found ${widenedResult.total} result(s) total`);
        }
      }

    }

    // Sign image URLs
    results.forEach((b) => {
      if (b.bannerImageKey) b.bannerImage = getSignedUrlByKey(b.bannerImageKey);
      if (b.logoImageKey) b.logoImage = getSignedUrlByKey(b.logoImageKey);
      if (b.businessImagesKey?.length > 0) b.businessImages = b.businessImagesKey.map((k) => getSignedUrlByKey(k));
      if (b.kycDocumentsKey?.length > 0) b.kycDocuments = b.kycDocumentsKey.map((k) => getSignedUrlByKey(k));
      const certificateVersion = b.certificates?.generatedAt || b.updatedAt;
      if (b.certificates?.verifiedCertificateKey) {
        b.certificates.verifiedCertificateUrl = assetUrl(b.certificates.verifiedCertificateKey, { version: certificateVersion });
      }
      if (b.certificates?.trustCertificateKey) {
        b.certificates.trustCertificateUrl = assetUrl(b.certificates.trustCertificateKey, { version: certificateVersion });
      }
    });

    res.send({
      results,
      total,
      page,
      pageSize,
      hasMore: page * pageSize < total,
      resolvedCategory: resolvedCategoryForResponse || (category && total > 0 ? category : null),
      searchIntent,
      isNearbySearch,
      fallbackTier,
      nearbySearchRadiusKm,
    });

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
          businessName: 1, category: 1, location: 1, masterLocation: 1, bannerImageKey: 1, logoImageKey: 1,
          verification: 1, badges: 1, certificates: 1,
          // publicId is required to build this card's detail URL — an
          // inclusion projection drops it silently otherwise, leaving every
          // nearby card unlinkable.
          contact: 1, whatsappNumber: 1, filters: 1, experience: 1, slug: 1, publicId: 1,
          distance: { $round: [{ $divide: ["$distanceMeters", 1000] }, 2] }
        }
      },
      // Same resolution as mainSearchController's business-detail-URL fix
      // (see the comment there): the free-text `location` field alone can
      // be as coarse as the district name, so resolve the business's own
      // collision-resolved publicLocationSlug via its linked
      // masterLocation.locationId.
      {
        $lookup: {
          from: "masterlocations",
          localField: "masterLocation.locationId",
          foreignField: "_id",
          as: "_resolvedLocation",
          pipeline: [{
            $project: {
              _id: 0,
              district: 1,
              zone: 1,
              ward: 1,
              locality: 1,
              level: 1,
              publicLocationSlug: 1,
            },
          }],
        },
      },
      {
        $addFields: {
          publicLocationSlug: {
            $arrayElemAt: ["$_resolvedLocation.publicLocationSlug", 0],
          },
        },
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
          activeReviews: 0,
          masterLocation: 0,
        }
      }
    ];

    const results = attachPublicLocationPaths(await businessListModel.aggregate(pipeline));
    results.forEach((b) => {
      if (b.bannerImageKey) b.bannerImage = getSignedUrlByKey(b.bannerImageKey);
      if (b.logoImageKey) b.logoImage = getSignedUrlByKey(b.logoImageKey);
      const certificateVersion = b.certificates?.generatedAt || b.updatedAt;
      if (b.certificates?.verifiedCertificateKey) {
        b.certificates.verifiedCertificateUrl = assetUrl(b.certificates.verifiedCertificateKey, { version: certificateVersion });
      }
      if (b.certificates?.trustCertificateKey) {
        b.certificates.trustCertificateUrl = assetUrl(b.certificates.trustCertificateKey, { version: certificateVersion });
      }
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
    const previousBusiness = await businessListModel.findById(businessId).lean();

    const businessData = {
      ...req.body,
      updatedBy: req.authUser?.userId,
    };

    const business = await updateBusinessList(businessId, businessData);
    const businessWithCertificates = await ensureCertificatesForActivation(previousBusiness, business);

    await invalidateSearchCache();
    await invalidateDashboardCache();
    await invalidateCategoryCache();

    res.send(businessWithCertificates || business);
  } catch (error) {
    console.error(error);
    return res.status(400).send({ message: error.message });
  }
};

const SECTION_FIELD_MAPPING = {
  'address': ['businessName', 'plotNumber', 'street', 'pincode', 'location', 'masterLocation', 'globalAddress'],
  'contact': ['email', 'contact', 'contactList', 'whatsappNumber'],
  'business-info': ['gstin', 'experience'],
  'location-web': ['googleMap', 'geoLatitude', 'geoLongitude', 'website', 'geoLocation'],
  'social-media': ['facebook', 'instagram', 'youtube', 'pinterest', 'twitter', 'linkedin'],
  'banner-details': ['bannerImage', 'logoImage', 'businessDetails'],
  'gallery-images': ['businessImages'],
  'opening-hours': ['openingHours'],
  'category-seo': ['category', 'keywords'],
  'display-seo': ['title', 'description', 'seoTitle', 'seoDescription', 'slug', 'filters'],
  'kyc-documents': ['kycDocuments', 'retainedKycDocuments'],
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
      days: req.query.days,
      location: req.query.location,
      createdBy: req.query.createdBy,
      dateFrom: req.query.dateFrom,
      dateTo: req.query.dateTo,
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

    const previousBusiness = await businessListModel.findById(id).lean();

    if (!previousBusiness) {
      return res.status(404).send({ message: "Business not found" });
    }

    const normalizedBadges = {
      ...(badges || {}),
      isTrust: !!(badges?.isTrust || badges?.isTrusted)
    };
    delete normalizedBadges.isTrusted;

    const business = await businessListModel.findByIdAndUpdate(
      id,
      {
        badges: normalizedBadges,
        verification: verification || {}
      },
      { new: true }
    );

    const businessWithCertificates = await ensureCertificatesForActivation(previousBusiness, business.toObject());

    await invalidateSearchCache();
    await invalidateDashboardCache();
    await invalidateCategoryCache();

    res.status(200).send(businessWithCertificates || business);

  } catch (error) {
    console.error("Error updating business badges:", error);
    return res.status(400).send({ message: error.message });
  }
};

const sanitizeDownloadFilename = (value = "document") =>
  String(value || "document")
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 140) || "document";

const getDownloadExtension = (key = "", contentType = "") => {
  const keyExtension = String(key).split("?")[0].match(/\.([a-z0-9]+)$/i)?.[1];
  if (keyExtension) return keyExtension.toLowerCase();

  const extensionByType = {
    "image/svg+xml": "svg",
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/webp": "webp",
    "application/pdf": "pdf",
  };

  return extensionByType[String(contentType).toLowerCase()] || "bin";
};

const resolveBusinessDocumentDownload = (business, type, index) => {
  if (type === "verified") {
    return {
      key: business.certificates?.verifiedCertificateKey,
      label: "Verified Certificate",
    };
  }

  if (type === "trust") {
    return {
      key: business.certificates?.trustCertificateKey,
      label: "Trust Certificate",
    };
  }

  if (type === "kyc") {
    const documentIndex = Number(index);
    const keys = Array.isArray(business.kycDocumentsKey) ? business.kycDocumentsKey : [];

    return {
      key: Number.isInteger(documentIndex) && documentIndex >= 0 ? keys[documentIndex] : "",
      label: `KYC Document ${Number.isInteger(documentIndex) ? documentIndex + 1 : ""}`.trim(),
    };
  }

  return { key: "", label: "Business Document" };
};

export const regenerateBusinessCertificatesAction = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).send({ message: "Business ID is required" });
    }

    const regenerateResult = await regenerateBusinessCertificates(id);
    const business = regenerateResult?.business || regenerateResult;
    const trace = regenerateResult?.trace || null;

    if (!business) {
      return res.status(404).send({ message: "Business not found" });
    }

    await invalidateSearchCache();
    await invalidateDashboardCache();
    await invalidateCategoryCache();

    return res.status(200).send({
      success: true,
      message: "Certificates regenerated successfully",
      business,
      trace,
    });
  } catch (error) {
    console.error("Error regenerating business certificates:", error);
    return res.status(error.statusCode || 400).send({ message: error.message });
  }
};

export const downloadBusinessDocumentAction = async (req, res) => {
  try {
    const { id } = req.params;
    const { type, index } = req.query;

    if (!id) {
      return res.status(400).send({ message: "Business ID is required" });
    }

    const business = await businessListModel
      .findById(id)
      .select("businessName name certificates kycDocumentsKey")
      .lean();

    if (!business) {
      return res.status(404).send({ message: "Business not found" });
    }

    const { key, label } = resolveBusinessDocumentDownload(business, type, index);

    if (!key) {
      return res.status(404).send({ message: "Document not found for this business." });
    }

    const object = await getObjectBufferByKey(key);
    const contentType = object?.contentType || "application/octet-stream";
    const extension = getDownloadExtension(key, contentType);
    const baseName = sanitizeDownloadFilename(business.businessName || business.name || "business");
    const documentName = sanitizeDownloadFilename(label);
    const filename = `${baseName} - ${documentName}.${extension}`;

    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Length", object.content.length);
    return res.send(object.content);
  } catch (error) {
    console.error("Error downloading business document:", error);
    return res.status(error.statusCode || 400).send({ message: error.message });
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
