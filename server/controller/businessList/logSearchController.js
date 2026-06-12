import { createHash } from "crypto";
import { createSearchLog, getAllSearchLogs, getMatchedSearchLogs, updateSearchData, getTopTrendingCategories } from "../../helper/businessList/logSearchHelper.js";
import CategoryModel from "../../model/category/categoryModel.js";
import { getSignedUrlByKey } from "../../s3Uploder.js";
import businessListModel from "../../model/businessList/businessListModel.js";
import { sendBusinessesToCustomer, sendBusinessLead, sendEnquiryBusinessLead } from "../../helper/msg91/smsGatewayHelper.js";
import { evaluateWhatsAppSend, markWhatsAppSkipped } from "../../helper/msg91/whatsappReliabilityHelper.js";
import { getSettings } from "../../helper/systemSettings/settingsService.js";
import searchLogModel from "../../model/businessList/searchLogModel.js";
import userModel from "../../model/msg91Model/usersModels.js";
import { sendFCMNotification } from "../../helper/fcmHelper.js";
import { emitToRoom } from "../../websocket/roomManager.js";
import { buildRoom, WS_EVENTS } from "../../websocket/constants.js";

const districtAliasMap = {
  tiruchirappalli: ["tiruchirappalli", "trichy"],
  trichy: ["tiruchirappalli", "trichy"],
};

// Short hash of IP + user-agent. 8 hex chars = 32-bit space, good enough for 5-min dedup.
const anonFingerprint = (req) => {
  const ip = req.ip || req.socket?.remoteAddress || "unknown";
  const ua = req.headers["user-agent"] || "unknown";
  return createHash("sha256").update(`${ip}:${ua}`).digest("hex").slice(0, 8);
};

const cleanIndianMobile = (mobile) => {
  if (!mobile) return null;

  let clean = mobile.replace(/\D/g, "");

  if (clean.startsWith("91") && clean.length === 12) {
    clean = clean.slice(2);
  }

  if (/^[6-9]\d{9}$/.test(clean)) {
    return "91" + clean;
  }

  return null;
};

const extractIndianMobiles = (value) => {
  if (!value) return [];

  const rawValues = Array.isArray(value) ? value : [value];
  const mobiles = rawValues.flatMap((raw) => {
    const text = raw?.toString() || "";
    const matches = text.match(/(?:\+?91[\s-]?)?[6-9]\d{9}/g) || [];
    return matches.map(cleanIndianMobile).filter(Boolean);
  });

  return [...new Set(mobiles)];
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const nonNegativeInteger = (value, fallback) => {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? Math.floor(number) : fallback;
};

const withRetry = async (fn, label, attempts = 3) => {
  let lastError;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      console.error(
        `${label} failed attempt ${attempt}/${attempts}:`,
        error.response?.data || error.message
      );

      if (attempt < attempts) {
        await wait(1000 * attempt);
      }
    }
  }

  throw lastError;
};

const escapeRegex = (text = "") =>
  text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const getDynamicCategoryRegex = (value = "") => {
  let text = value.toLowerCase().trim();

  text = text.replace(/\s+/g, " ");

  const spellingMap = {
    "nursery garden": "nursary garden",
    "nursery": "nursary"
  };

  if (spellingMap[text]) {
    text = spellingMap[text];
  }

  let singular = text;  

  if (text.endsWith("ies")) {
    singular = text.slice(0, -3) + "y";
  } else if (
    text.endsWith("ses") ||
    text.endsWith("xes") ||
    text.endsWith("zes") ||
    text.endsWith("ches") ||
    text.endsWith("shes")
  ) {
    singular = text.slice(0, -2);
  } else if (text.endsWith("s") && !text.endsWith("ss")) {
    singular = text.slice(0, -1);
  }

  const plural1 = singular + "s";
  const plural2 = singular.endsWith("y")
    ? singular.slice(0, -1) + "ies"
    : singular + "es";

  const words = [
    escapeRegex(text),
    escapeRegex(singular),
    escapeRegex(plural1),
    escapeRegex(plural2)
  ];

  const uniqueWords = [...new Set(words)];

  return new RegExp(`^(${uniqueWords.join("|")})$`, "i");
};

export const logSearchAction = async (req, res) => {
  try {
    const { categoryName, location, searchedUserText, userDetails } = req.body;
    const reqId = Math.random().toString(36).slice(2, 8);
    const leadSettings = await getSettings();
    const rawSearchText = searchedUserText?.trim?.() || "";

    if (leadSettings.lead_guard_search_text_required !== false && !rawSearchText) {
      return res.status(400).json({
        success: false,
        message: "Search text is mandatory"
      });
    }

    const cleanSearchText = (rawSearchText || categoryName?.trim?.() || "all categories").toLowerCase();
    const normalizedLocation = location?.toLowerCase().trim() || "global";

    const isValidUser =
      userDetails &&
      userDetails.userName &&
      userDetails.userName.trim() &&
      userDetails.mobileNumber1 &&
      userDetails.mobileNumber1.trim();

    // ── Resolve category using enhanced suggestions logic (top result only) ────
    let finalCategoryName = "";
    let matchedCategoryFromSearch = null;

    // First, try to match against categoryName if provided
    if (
      categoryName &&
      categoryName.trim() &&
      categoryName.toLowerCase() !== "all categories"
    ) {
      const categorySlugFromInput = categoryName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)+/g, "");

      const validCategory = await CategoryModel.findOne({
        slug: categorySlugFromInput
      }).lean();

      if (validCategory) {
        finalCategoryName = validCategory.categoryName || validCategory.category;
        matchedCategoryFromSearch = validCategory;
      }
    }

    // If no valid category from categoryName, search using the same logic as enhanced suggestions endpoint
    if (!finalCategoryName) {
      const escapedSearch = cleanSearchText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

      // Use the exact same matching logic as getEnhancedSuggestionsController
      const topMatches = await CategoryModel.aggregate([
        {
          $match: {
            isActive: true,
            $or: [
              { category: { $regex: escapedSearch, $options: "i" } },
              { categoryName: { $regex: escapedSearch, $options: "i" } },
              { keywords: { $regex: escapedSearch, $options: "i" } },
            ]
          }
        },
        { $limit: 1 }
      ]);

      if (topMatches.length > 0) {
        finalCategoryName = topMatches[0].categoryName || topMatches[0].category;
        matchedCategoryFromSearch = topMatches[0];
      } else {
        // Fallback: try word-by-word matching
        const searchWords = cleanSearchText.split(" ");
        const wordMatches = await CategoryModel.aggregate([
          {
            $match: {
              isActive: true,
              $or: [
                { category: { $regex: searchWords.join("|"), $options: "i" } },
                { categoryName: { $regex: searchWords.join("|"), $options: "i" } },
                { keywords: { $regex: searchWords.join("|"), $options: "i" } }
              ]
            }
          },
          { $limit: 1 }
        ]);

        if (wordMatches.length > 0) {
          finalCategoryName = wordMatches[0].categoryName || wordMatches[0].category;
          matchedCategoryFromSearch = wordMatches[0];
        } else {
          finalCategoryName = rawSearchText || categoryName || "all categories";
        }
      }
    }

    const categorySlug = finalCategoryName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");

    const category = await CategoryModel.findOne(
      { slug: categorySlug },
      { category: 1, categoryName: 1, categoryImages: 1, categoryImageKey: 1, liveImageKey: 1 }
    ).lean();

    // ── Anonymous path ────────────────────────────────────────────────────────
    if (!isValidUser) {
      const fingerprint = anonFingerprint(req);
      const anonymousDedupeMinutes = nonNegativeInteger(
        leadSettings.lead_guard_anonymous_dedupe_minutes,
        5
      );
      let recentAnon = null;

      if (leadSettings.lead_guard_anonymous_dedupe_enabled !== false && anonymousDedupeMinutes > 0) {
        const anonDedupeSince = new Date(Date.now() - anonymousDedupeMinutes * 60 * 1000);
        recentAnon = await searchLogModel.findOne({
          categoryName: finalCategoryName,
          location: normalizedLocation,
          searchedUserText: cleanSearchText,
          isAnonymous: true,
          anonFingerprint: fingerprint,
          createdAt: { $gte: anonDedupeSince }
        });
      }

      if (!recentAnon) {
        await createSearchLog({
          categoryName: finalCategoryName,
          searchedUserText: cleanSearchText,
          location: normalizedLocation,
          userDetails: [],
          whatsapp: false,
          isAnonymous: true,
          anonFingerprint: fingerprint,
        });
      }

      return res.status(200).json({
        success: true,
        anonymous: true,
        message: "Anonymous search logged",
        detectedCategory: finalCategoryName
      });
    }

    // ── Identified user path ──────────────────────────────────────────────────

    const userDedupeMinutes = nonNegativeInteger(
      leadSettings.lead_guard_user_dedupe_minutes,
      5
    );
    let recentLog = null;

    if (leadSettings.lead_guard_user_dedupe_enabled !== false && userDedupeMinutes > 0) {
      const userDedupeSince = new Date(Date.now() - userDedupeMinutes * 60 * 1000);
      recentLog = await searchLogModel.findOne({
        categoryName: { $regex: `^${finalCategoryName}$`, $options: "i" },
        location: normalizedLocation,
        "userDetails.mobileNumber1": userDetails.mobileNumber1,
        searchedUserText: cleanSearchText,
        createdAt: { $gte: userDedupeSince }
      });
    }
    if (recentLog?.whatsapp) {
      return res.status(200).json({
        success: true,
        message: "Lead already sent recently",
        detectedCategory: finalCategoryName
      });
    }

    const savedLog = recentLog || await createSearchLog({
      categoryName: finalCategoryName,
      searchedUserText: cleanSearchText,
      location: normalizedLocation,
      userDetails: [
        {
          userName: userDetails.userName,
          mobileNumber1: userDetails.mobileNumber1,
          mobileNumber2: userDetails.mobileNumber2 || "",
          email: userDetails.email || ""
        }
      ],
      whatsapp: false,
      isAnonymous: false,
    });

    const locationGroups = {
      trichy: ["trichy", "tiruchirappalli"]
    };

    let locationList = [normalizedLocation];

    for (const key in locationGroups) {
      if (locationGroups[key].includes(normalizedLocation)) {
        locationList = locationGroups[key];
        break;
      }
    }

    // ── Find matching businesses for WhatsApp/FCM sending ──────────────────────
    const normalize = (text = "") =>
      text
        .toLowerCase()
        .trim()
        .replace(/&/g, " and ")
        .replace(/[-_]/g, " ")
        .replace(/\s+/g, " ");

    const escapeRegex = (text = "") =>
      text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const categoryMatchValues = [
      finalCategoryName,
      matchedCategoryFromSearch?.category,
      matchedCategoryFromSearch?.categoryName,
      category?.category,
      category?.categoryName,
    ]
      .filter(Boolean)
      .map(normalize);

    const uniqueCategoryMatchValues = [...new Set(categoryMatchValues)];

    const searchMatchQuery = { $and: [] };

    if (leadSettings.lead_guard_live_business_only !== false) {
      searchMatchQuery.businessesLive = true;
    }

    // Add location filter
    if (normalizedLocation && normalizedLocation !== "global") {
      const locKey = normalizedLocation.toLowerCase().trim();
      const aliases = districtAliasMap[locKey] || [locKey];
      searchMatchQuery.$and.push({
        $or: aliases.map((l) => ({
          location: { $regex: `^${escapeRegex(normalize(l))}$`, $options: "i" }
        }))
      });
    }

    if (uniqueCategoryMatchValues.length > 0) {
      searchMatchQuery.$and.push({
        $or: uniqueCategoryMatchValues.flatMap((value) => {
          const categoryRegex = getDynamicCategoryRegex(value);
          return [
            { category: categoryRegex },
            { keywords: categoryRegex }
          ];
        })
      });
    }

    if (searchMatchQuery.$and.length === 0) {
      delete searchMatchQuery.$and;
    }

    // Find matching businesses (limit to top 10)
    const businesses = await businessListModel.find(
      searchMatchQuery,
      { businessName: 1, category: 1, keywords: 1, contactList: 1, whatsappNumber: 1, location: 1, street: 1, plotNumber: 1, averageRating: 1 }
    )
      .sort({ amountPaid: -1, paidDate: -1, averageRating: -1, createdAt: -1 })
      .limit(10)
      .lean();

    if (!businesses.length) {

      return res.status(200).json({
        success: true,
        message: "Lead stored but no businesses found",
        detectedCategory: finalCategoryName
      });

    }

    const leadData = {

      searchText: finalCategoryName,

      location: normalizedLocation,

      customerName: userDetails.userName,

      customerMobile: userDetails.mobileNumber1,

      email: userDetails.email || ""

    };

    const waSettings = leadSettings;

    let businessSendSuccess = false;

    let customerSendSuccess = false;

    const notifiedBusinesses = [];

    for (const business of businesses) {
      const ownerMobile = extractIndianMobiles([business.contactList, business.whatsappNumber])[0];
      if (!ownerMobile) continue;
      const mobile10 = ownerMobile.startsWith("91") && ownerMobile.length === 12
        ? ownerMobile.slice(2)
        : ownerMobile;
      emitToRoom(buildRoom.business(mobile10), WS_EVENTS.LEAD_ANALYTICS_UPDATE, {
        category: finalCategoryName,
        location: normalizedLocation,
        ts: new Date().toISOString(),
      });
    }

    const ownerMobiles = businesses
      .flatMap(b => extractIndianMobiles([b.contactList, b.whatsappNumber]))
      .filter(Boolean);

    console.log("[FCM] businesses found:", businesses.length, "| owner mobiles resolved:", ownerMobiles.length, ownerMobiles);

    // userModel stores mobileNumber1 as 10-digit (no 91 prefix); strip prefix for the DB query
    const ownerMobilesForDB = ownerMobiles.map(m =>
      m.startsWith("91") && m.length === 12 ? m.slice(2) : m
    );
    console.log("[FCM] querying userModel with 10-digit mobiles:", ownerMobilesForDB);

    const ownerUsersMap = new Map();
    if (ownerMobilesForDB.length > 0) {
      const now = new Date();
      const ownerUsers = await userModel.find(
        { mobileNumber1: { $in: ownerMobilesForDB }, "fcmTokens.isActive": true },
        { mobileNumber1: 1, fcmTokens: 1 }
      ).lean();
      console.log("[FCM] users with active fcmTokens found in DB:", ownerUsers.length);
      for (const u of ownerUsers) {
        const activeTokens = u.fcmTokens.filter(
          t => t.isActive && new Date(t.expiresAt) > now
        );
        console.log(`[FCM] user ${u.mobileNumber1}: total tokens=${u.fcmTokens.length}, active+valid=${activeTokens.length}`);
        if (activeTokens.length > 0) {
          // Key by 12-digit (91-prefixed) to match what the business loop uses
          ownerUsersMap.set("91" + u.mobileNumber1, activeTokens);
        }
      }
    } else {
      console.log("[FCM] no valid owner mobiles — skipping FCM lookup");
    }

    for (const business of businesses) {

      const businessMobiles = extractIndianMobiles([business.contactList, business.whatsappNumber]);

      if (!businessMobiles.length) {
        console.warn("[WhatsApp] no valid business mobile:", business.businessName);
        continue;
      }

      for (const cleanMobile of businessMobiles) {

      try {

        if (waSettings.whatsapp_business_lead_alert) {
          const sendPolicy = await evaluateWhatsAppSend({
            mobile: cleanMobile,
            template: "business_lead_alert_v2",
            sourceType: "search_lead",
            category: leadData.searchText,
            location: leadData.location,
            customerMobile: leadData.customerMobile,
          });

          if (!sendPolicy.allowed) {
            await markWhatsAppSkipped(
              {
                templateName: "business_lead_alert_v2",
                sourceType: "search_lead",
                sourceId: savedLog._id,
                recipientMobile: sendPolicy.mobile || cleanMobile,
                category: leadData.searchText,
                location: leadData.location,
                customerName: leadData.customerName,
                customerMobile: leadData.customerMobile,
                businessId: business._id,
                businessName: business.businessName,
              },
              sendPolicy.skipReason
            );
            console.warn(
              `[WhatsApp] skipped ${business.businessName} ${cleanMobile}: ${sendPolicy.skipReason}`
            );
            continue;
          }

          await withRetry(
            () =>
              sendBusinessLead(sendPolicy.mobile, leadData, {
                sourceType: "search_lead",
                sourceId: savedLog._id,
                businessId: business._id,
                businessName: business.businessName,
              }),
            `Business WhatsApp ${business.businessName} ${cleanMobile}`
          );
        } else {
          console.warn("[WhatsApp] business lead alert disabled in settings");
          continue;
        }

        businessSendSuccess = true;

        notifiedBusinesses.push({

          businessName: business.businessName,

          mobile: cleanMobile

        });

        await wait(500);

      } catch (err) {

        console.error(

          "Business WhatsApp failed after retries:",

          err.response?.data || err.message

        );

      }

      // Send FCM push to this business owner's active devices (fire-and-forget)
      const ownerTokens = ownerUsersMap.get(cleanMobile);
      console.log(`[FCM] ${business.businessName} (${cleanMobile}): tokens to notify=${ownerTokens?.length ?? 0}`);
      if (ownerTokens && ownerTokens.length > 0) {
        const fcmTitle = "New Lead Alert 🔔";
        const fcmBody = `Someone searched "${finalCategoryName}" in ${normalizedLocation}. Check your leads now!`;
        const fcmData = {
          type: "lead",
          category: finalCategoryName,
          location: normalizedLocation,
        };
        for (const tokenObj of ownerTokens) {
          console.log(`[FCM] sending to token ${tokenObj.token.slice(0, 20)}... (platform: ${tokenObj.platform})`);
          sendFCMNotification(tokenObj.token, fcmTitle, fcmBody, fcmData)
            .then(() => console.log(`[FCM] push sent OK → ${business.businessName}`))
            .catch(err => console.error(`[FCM] push failed → ${business.businessName}:`, err.message));
        }
      } else {
        console.log(`[FCM] no tokens for ${business.businessName} — push skipped`);
      }

    }

    }
    const cleanCustomerMobile = extractIndianMobiles(userDetails.mobileNumber1)[0];

    if (cleanCustomerMobile) {

      try {

        if (waSettings.whatsapp_customer_business_list) {
          await withRetry(
            () =>
              sendBusinessesToCustomer(cleanCustomerMobile, leadData, businesses, {
                sourceType: "customer_list",
                sourceId: savedLog._id,
              }),
            `Customer WhatsApp ${cleanCustomerMobile}`
          );
        } else {
          console.warn("[WhatsApp] customer business list disabled in settings");
          return res.status(202).json({
            success: true,
            message: "Lead stored but customer WhatsApp is disabled",
            detectedCategory: finalCategoryName,
            totalBusinesses: businesses.length,
            notifiedBusinesses,
            whatsappUpdated: false
          });
        }

        customerSendSuccess = true;

      }

      catch (err) {

        console.error(

          "Customer WhatsApp failed",

          err.response?.data || err.message

        );

      }

    }

    const whatsappUpdated = businessSendSuccess && customerSendSuccess;

    await searchLogModel.updateOne(
      { _id: savedLog._id },
      { whatsapp: whatsappUpdated }
    );

    return res.status(202).json({

      success: true,

      message: whatsappUpdated
        ? "Lead stored & WhatsApp sent"
        : "Lead stored but WhatsApp delivery failed",

      detectedCategory: finalCategoryName,

      totalBusinesses: businesses.length,

      notifiedBusinesses,

      whatsappUpdated

    });

  }

  catch (error) {

    console.error("Error logging search:", error);

    return res.status(500).json({

      success: false,

      message: "Server error"

    });

  }

};

export const viewLogSearchAction = async (req, res) => {
  try {
    const logs = await getAllSearchLogs();
    res.status(200).json(logs);
  } catch (error) {
    console.error("Error fetching search logs:", error);
    res.status(500).json({ message: "Failed to fetch search logs" });
  }
};

export const viewSearchAction = async (req, res) => {
  try {
    const { category, keywords = [] } = req.body;

    if (!category && keywords.length === 0) {
      return res.status(400).json({ message: "Category or keywords required" });
    }

    const logs = await getMatchedSearchLogs(category, keywords);
    res.status(200).json(logs);

  } catch (error) {
    console.error("Error fetching matched search logs:", error);
    res.status(500).json({ message: "Failed to fetch search logs" });
  }
};
export const updateSearchAction = async (req, res) => {
  try {
    const searchID = req.params.id;

    if (!searchID) {
      return res.status(400).json({ message: "Search log ID required" });
    }

    const updateData = {
      ...req.body,
      updatedAt: new Date(),
      updatedBy: req.authUser?.userId || null,
    };

    const updatedLog = await updateSearchData(searchID, updateData);

    return res.status(200).json({
      success: true,
      data: updatedLog,
    });

  } catch (error) {
    console.error("updateSearchAction error:", error);
    return res.status(500).json({ message: error.message });
  }
};

export const getTrendingSearchesAction = async (req, res) => {
  try {
    const trending = await getTopTrendingCategories(10);

    const formatted = trending.map(item => ({
      _id: item._id,
      categoryName: item.categoryName || item.category,
      totalSearches: item.totalSearches,
      categoryImageKey: item.categoryImageKey ? getSignedUrlByKey(item.categoryImageKey) : "",
      liveImageKey: item.liveImageKey ? getSignedUrlByKey(item.liveImageKey) : "",
      categoryImages: {
        webHero: item.categoryImages?.webHero ? getSignedUrlByKey(item.categoryImages.webHero) : "",
        webCard: item.categoryImages?.webCard ? getSignedUrlByKey(item.categoryImages.webCard) : "",
        webThumbnail: item.categoryImages?.webThumbnail ? getSignedUrlByKey(item.categoryImages.webThumbnail) : "",
        mobileVertical: item.categoryImages?.mobileVertical ? getSignedUrlByKey(item.categoryImages.mobileVertical) : "",
        mobileCard: item.categoryImages?.mobileCard ? getSignedUrlByKey(item.categoryImages.mobileCard) : "",
        mobileThumbnail: item.categoryImages?.mobileThumbnail ? getSignedUrlByKey(item.categoryImages.mobileThumbnail) : ""
      }
    }));

    return res.status(200).json({
      success: true,
      data: formatted
    });

  } catch (error) {
    console.error("getTrendingSearchesAction error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch trending searches"
    });
  }
};


export const sendEnquiryLead = async (req, res) => {
  try {
    const {
      businessId,
      category,
      location,
      customerName,
      customerMobile,
      customerEmail
    } = req.body;
    const leadData = {
      category,
      location,
      customerName,
      customerMobile,
      customerEmail
    };
    const leadSettings = await getSettings();

    // If businessId provided, send to that specific business (existing behaviour)
    if (businessId) {
      const business = await businessListModel.findById(businessId);

      if (!business) {
        return res.status(404).json({
          success: false,
          message: "Business not found"
        });
      }

      const mobile = extractIndianMobiles([business.whatsappNumber, business.contactList])[0];

      if (!mobile) {
        return res.status(400).json({
          success: false,
          message: "Business does not have a valid enquiry mobile"
        });
      }

      await sendEnquiryBusinessLead(mobile, leadData, {
        sourceType: "enquiry",
        businessId: business._id,
        businessName: business.businessName,
      });

      return res.status(200).json({
        success: true,
        message: "Lead sent to business",
        totalBusinesses: 1,
        notifiedBusinesses: [{ businessName: business.businessName, mobile }]
      });
    }

    // Otherwise, treat as category-level enquiry: find matching businesses and send
    const normalizedLocation = (location || "global").toLowerCase().trim();
    const categoryText = (category || "").toLowerCase().trim();

    const escapeRegex = (text = "") => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const getCategoryRegex = (val) => {
      try {
        return getDynamicCategoryRegex(val);
      } catch (e) {
        return new RegExp(`^${escapeRegex(val)}$`, "i");
      }
    };

    const searchMatchQuery = {};

    if (leadSettings.lead_guard_live_business_only !== false) {
      searchMatchQuery.businessesLive = true;
    }

    if (normalizedLocation && normalizedLocation !== "global") {
      searchMatchQuery.location = { $regex: `^${escapeRegex(normalizedLocation)}$`, $options: "i" };
    }

    if (categoryText) {
      const categoryRegex = getCategoryRegex(categoryText);
      searchMatchQuery.$or = [{ category: categoryRegex }, { keywords: categoryRegex }];
    }

    const businesses = await businessListModel.find(searchMatchQuery, { businessName: 1, contactList: 1, whatsappNumber: 1, location: 1 }).limit(10).lean();

    if (!businesses.length) {
      return res.status(200).json({ success: true, message: "No businesses found for this enquiry", totalBusinesses: 0 });
    }

    const notified = [];
    for (const b of businesses) {
      const mobile = extractIndianMobiles([b.whatsappNumber, b.contactList])[0];
      if (!mobile) continue;
      try {
        await sendEnquiryBusinessLead(mobile, leadData, {
          sourceType: "enquiry",
          businessId: b._id,
          businessName: b.businessName,
        });
        notified.push({ businessName: b.businessName, mobile });
        await wait(300);
      } catch (err) {
        console.error("sendEnquiryBusinessLead failed:", err.message || err);
      }
    }

    return res.status(200).json({
      success: true,
      message: "Lead sent to matching businesses",
      totalBusinesses: businesses.length,
      notifiedBusinesses: notified
    });

  } catch (err) {
    console.log(err);
    res.status(500).json({
      success: false
    });
  }
};
