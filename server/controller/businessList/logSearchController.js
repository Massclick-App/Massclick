import { createHash } from "crypto";
import {
  createSearchLog,
  getAllSearchLogs,
  getMatchedSearchLogs,
  updateSearchData,
  getTopTrendingCategories,
} from "../../helper/businessList/logSearchHelper.js";
import { resolveCategoryIntent } from "./businessListController.js";
import CategoryModel from "../../model/category/categoryModel.js";
import { getSignedUrlByKey } from "../../s3Uploder.js";
import businessListModel from "../../model/businessList/businessListModel.js";
import {
  sendBusinessesToCustomer,
  sendBusinessLead,
  sendEnquiryBusinessLead,
  sendPremiumBusinessesToCustomer,
} from "../../helper/msg91/smsGatewayHelper.js";
import {
  evaluateWhatsAppSend,
  markWhatsAppSkipped,
} from "../../helper/msg91/whatsappReliabilityHelper.js";
import { getSettings } from "../../helper/systemSettings/settingsService.js";
import searchLogModel from "../../model/businessList/searchLogModel.js";
import userModel from "../../model/msg91Model/usersModels.js";
import { sendFCMNotification } from "../../helper/fcmHelper.js";
import { emitToRoom } from "../../websocket/roomManager.js";
import { buildRoom, WS_EVENTS } from "../../websocket/constants.js";
import enquiryModel from "../../model/enquiry/enquiryModel.js";
import { sendBusinessEnquiryEmail, sendCustomerBusinessInfoEmail } from "../../helper/email/emailService.js";
import delayedLeadDispatchModel from "../../model/businessList/delayedLeadDispatchModel.js";

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
        error.response?.data || error.message,
      );

      if (attempt < attempts) {
        await wait(1000 * attempt);
      }
    }
  }

  throw lastError;
};

const escapeRegex = (text = "") => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const maskMobile = (value = "") => {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.length <= 4) return digits || "none";
  return `***${digits.slice(-4)}`;
};

const leadLog = (traceId, message, data = {}) => {
  console.log(`[LeadFlow:${traceId || "no-trace"}] ${message}`, data);
};

const getDynamicCategoryRegex = (value = "") => {
  let text = value.toLowerCase().trim();

  text = text.replace(/\s+/g, " ");

  const spellingMap = {
    "nursery garden": "nursary garden",
    nursery: "nursary",
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
    escapeRegex(plural2),
  ];

  const uniqueWords = [...new Set(words)];

  return new RegExp(`^(${uniqueWords.join("|")})$`, "i");
};

export const dispatchLeadToBusinesses = async ({
  businesses = [],
  userDetails = {},
  leadData = {},
  savedLog,
  finalCategoryName = leadData.searchText || "",
  normalizedLocation = leadData.location || "global",
  waSettings = {},
  sendCustomerBusinessList = false,
  customerListBusinesses = businesses,
  phase = "standard",
  traceId = "",
} = {}) => {
  let businessSendSuccess = false;
  let customerSendSuccess = !sendCustomerBusinessList;
  let customerListDisabled = false;
  const notifiedBusinesses = [];

  leadLog(traceId, "dispatch:start", {
    phase,
    searchLogId: savedLog?._id?.toString?.() || "",
    businessesCount: businesses.length,
    customerListRequested: sendCustomerBusinessList,
    category: finalCategoryName,
    location: normalizedLocation,
  });

  const customerMobileRaw = userDetails.mobileNumber1 || leadData.customerMobile || "";
  const customerMobile10 =
    customerMobileRaw.startsWith("91") && customerMobileRaw.length === 12
      ? customerMobileRaw.slice(2)
      : customerMobileRaw;
  const capturedSearchText = (
    leadData.searchedUserText ||
    leadData.searchText ||
    finalCategoryName ||
    ""
  ).toLowerCase();
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const ownerNewLeadMap = new Map();

  for (const business of businesses) {
    const ownerMobile = extractIndianMobiles([
      business.contactList,
      business.whatsappNumber,
    ])[0];
    if (!ownerMobile) continue;
    const mobile10 =
      ownerMobile.startsWith("91") && ownerMobile.length === 12
        ? ownerMobile.slice(2)
        : ownerMobile;
    if (ownerNewLeadMap.has(mobile10)) continue;
    if (mobile10 === customerMobile10) continue;

    try {
      const captureResult = await userModel.updateOne(
        {
          mobileNumber1: mobile10,
          leadsData: {
            $not: {
              $elemMatch: {
                mobileNumber1: customerMobileRaw,
                searchedUserText: capturedSearchText,
                createdAt: { $gte: startOfToday },
              },
            },
          },
        },
        {
          $push: {
            leadsData: {
              email: userDetails.email || leadData.email || "",
              mobileNumber1: customerMobileRaw,
              mobileNumber2: userDetails.mobileNumber2 || "",
              searchedUserText: capturedSearchText,
              time: new Date().toLocaleString("en-IN", {
                timeZone: "Asia/Kolkata",
              }),
              userName: userDetails.userName || leadData.customerName || "",
              isWhatsappSend: false,
              isReaded: false,
              createdAt: new Date(),
              readAt: null,
            },
          },
        },
      );
      ownerNewLeadMap.set(mobile10, captureResult.modifiedCount > 0);
      leadLog(traceId, "owner-inbox:capture", {
        phase,
        businessId: business._id?.toString?.() || "",
        businessName: business.businessName,
        ownerMobile: maskMobile(mobile10),
        newLead: captureResult.modifiedCount > 0,
      });
    } catch (err) {
      console.error(
        `[LeadCapture] failed to persist lead for owner ${mobile10}:`,
        err.message,
      );
      ownerNewLeadMap.set(mobile10, false);
    }

    emitToRoom(
      buildRoom.business(mobile10),
      WS_EVENTS.LEAD_ANALYTICS_UPDATE,
      {
        category: finalCategoryName,
        location: normalizedLocation,
        customerName: userDetails.userName || leadData.customerName || "",
        newLead: ownerNewLeadMap.get(mobile10) === true,
        ts: new Date().toISOString(),
      },
    );
  }

  const ownerMobiles = businesses
    .flatMap((b) => extractIndianMobiles([b.contactList, b.whatsappNumber]))
    .filter(Boolean);
  const ownerMobilesForDB = ownerMobiles.map((m) =>
    m.startsWith("91") && m.length === 12 ? m.slice(2) : m,
  );

  const ownerUsersMap = new Map();
  if (ownerMobilesForDB.length > 0) {
    const now = new Date();
    const ownerUsers = await userModel
      .find(
        {
          mobileNumber1: { $in: ownerMobilesForDB },
          "fcmTokens.isActive": true,
        },
        { mobileNumber1: 1, fcmTokens: 1 },
      )
      .lean();

    for (const u of ownerUsers) {
      const activeTokens = u.fcmTokens.filter(
        (t) => t.isActive && new Date(t.expiresAt) > now,
      );

      if (activeTokens.length > 0) {
        ownerUsersMap.set("91" + u.mobileNumber1, activeTokens);
      }
    }
    leadLog(traceId, "push:owners-found", {
      phase,
      ownerMobiles: ownerMobilesForDB.length,
      ownersWithTokens: ownerUsersMap.size,
      tokens: [...ownerUsersMap.values()].reduce((sum, tokens) => sum + tokens.length, 0),
    });
  } else {
    console.log("[FCM] no valid owner mobiles - skipping FCM lookup");
    leadLog(traceId, "push:no-owner-mobiles", { phase });
  }

  const locationLabel =
    normalizedLocation === "global" ? "your area" : normalizedLocation;

  for (const [ownerMobile12, ownerTokens] of ownerUsersMap) {
    const fcmTitle = "New Lead Alert";
    const fcmBody = userDetails.userName || leadData.customerName
      ? `${userDetails.userName || leadData.customerName} is looking for "${finalCategoryName}" in ${locationLabel}. Open the app to respond.`
      : `Someone searched "${finalCategoryName}" in ${locationLabel}. Check your leads now!`;
    const fcmData = {
      type: "lead",
      category: finalCategoryName,
      location: normalizedLocation,
    };
    for (const tokenObj of ownerTokens) {
      sendFCMNotification(tokenObj.token, fcmTitle, fcmBody, fcmData, {
        channelId: "massclick_leads",
      })
        .then(() =>
          console.log(`[FCM] lead push sent OK -> ${ownerMobile12}`),
        )
        .catch((err) =>
          console.error(
            `[FCM] lead push failed -> ${ownerMobile12}:`,
            err.message,
          ),
        );
    }
  }

  for (const business of businesses) {
    const businessMobiles = extractIndianMobiles([
      business.contactList,
      business.whatsappNumber,
    ]);

    if (!businessMobiles.length) {
      console.warn(
        "[WhatsApp] no valid business mobile:",
        business.businessName,
      );
      continue;
    }

    for (const cleanMobile of businessMobiles) {
      try {
        if (waSettings.whatsapp_business_lead_alert) {
          leadLog(traceId, "whatsapp-owner:policy-check", {
            phase,
            businessId: business._id?.toString?.() || "",
            businessName: business.businessName,
            recipientMobile: maskMobile(cleanMobile),
          });
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
                sourceId: savedLog?._id,
                recipientMobile: sendPolicy.mobile || cleanMobile,
                category: leadData.searchText,
                location: leadData.location,
                customerName: leadData.customerName,
                customerMobile: leadData.customerMobile,
                businessId: business._id,
                businessName: business.businessName,
              },
              sendPolicy.skipReason,
            );
            console.warn(
              `[WhatsApp] skipped ${business.businessName} ${cleanMobile}: ${sendPolicy.skipReason}`,
            );
            leadLog(traceId, "whatsapp-owner:skipped", {
              phase,
              businessId: business._id?.toString?.() || "",
              businessName: business.businessName,
              recipientMobile: maskMobile(cleanMobile),
              reason: sendPolicy.skipReason,
            });
            continue;
          }

          await withRetry(
            () =>
              sendBusinessLead(sendPolicy.mobile, leadData, {
                sourceType: "search_lead",
                sourceId: savedLog?._id,
                businessId: business._id,
                businessName: business.businessName,
              }),
            `Business WhatsApp ${business.businessName} ${cleanMobile}`,
          );
          leadLog(traceId, "whatsapp-owner:sent", {
            phase,
            businessId: business._id?.toString?.() || "",
            businessName: business.businessName,
            recipientMobile: maskMobile(cleanMobile),
          });
        } else {
          console.warn("[WhatsApp] business lead alert disabled in settings");
          leadLog(traceId, "whatsapp-owner:disabled", { phase });
          continue;
        }

        businessSendSuccess = true;
        notifiedBusinesses.push({
          businessName: business.businessName,
          mobile: cleanMobile,
        });

        await wait(500);
      } catch (err) {
        console.error(
          "Business WhatsApp failed after retries:",
          err.response?.data || err.message,
        );
        leadLog(traceId, "whatsapp-owner:error", {
          phase,
          businessId: business._id?.toString?.() || "",
          businessName: business.businessName,
          recipientMobile: maskMobile(cleanMobile),
          error: err.response?.data || err.message,
        });
      }
    }
  }

  if (sendCustomerBusinessList) {
    const cleanCustomerMobile = extractIndianMobiles(
      userDetails.mobileNumber1 || leadData.customerMobile,
    )[0];

    if (cleanCustomerMobile) {
      try {
        if (waSettings.whatsapp_customer_business_list) {
          leadLog(traceId, "whatsapp-customer-list:send", {
            phase,
            recipientMobile: maskMobile(cleanCustomerMobile),
            businessesCount: customerListBusinesses.length,
          });
          await withRetry(
            () =>
              sendBusinessesToCustomer(
                cleanCustomerMobile,
                leadData,
                customerListBusinesses,
                {
                  sourceType: "customer_list",
                  sourceId: savedLog?._id,
                  customerListSendMode:
                    waSettings.whatsapp_customer_business_list_send_mode ||
                    "split",
                },
              ),
            `Customer WhatsApp ${cleanCustomerMobile}`,
          );
          leadLog(traceId, "whatsapp-customer-list:sent", {
            phase,
            recipientMobile: maskMobile(cleanCustomerMobile),
          });
        } else {
          console.warn(
            "[WhatsApp] customer business list disabled in settings",
          );
          customerListDisabled = true;
          leadLog(traceId, "whatsapp-customer-list:disabled", { phase });
        }

        if (!customerListDisabled) {
          customerSendSuccess = true;
        }
      } catch (err) {
        console.error(
          "Customer WhatsApp failed",
          err.response?.data || err.message,
        );
        leadLog(traceId, "whatsapp-customer-list:error", {
          phase,
          recipientMobile: maskMobile(cleanCustomerMobile),
          error: err.response?.data || err.message,
        });
      }
    } else {
      leadLog(traceId, "whatsapp-customer-list:no-mobile", { phase });
    }
  }

  leadLog(traceId, "dispatch:done", {
    phase,
    businessSendSuccess,
    customerSendSuccess,
    customerListDisabled,
    notifiedBusinessesCount: notifiedBusinesses.length,
    whatsappUpdated: businessSendSuccess && customerSendSuccess,
  });

  return {
    businessSendSuccess,
    customerSendSuccess,
    customerListDisabled,
    notifiedBusinesses,
    whatsappUpdated: businessSendSuccess && customerSendSuccess,
  };
};

export const logSearchAction = async (req, res) => {
  try {
    const {
      categoryName,
      location,
      district,
      masterLocationSlug,
      searchedUserText,
      userDetails,
      isKnownCategory = false,
      matchedBusinessIds = [],
    } = req.body;
    const reqId = Math.random().toString(36).slice(2, 8);
    const leadSettings = await getSettings();
    const rawSearchText = searchedUserText?.trim?.() || "";

    leadLog(reqId, "request:received", {
      categoryName,
      location,
      district,
      masterLocationSlug,
      searchedUserText: rawSearchText,
      isKnownCategory,
      matchedBusinessIdsCount: Array.isArray(matchedBusinessIds) ? matchedBusinessIds.length : 0,
      userNamePresent: Boolean(userDetails?.userName),
      customerMobile: maskMobile(userDetails?.mobileNumber1),
    });

    if (
      leadSettings.lead_guard_search_text_required !== false &&
      !rawSearchText
    ) {
      leadLog(reqId, "request:blocked-missing-search-text");
      return res.status(400).json({
        success: false,
        message: "Search text is mandatory",
      });
    }

    const cleanSearchText = (
      rawSearchText ||
      categoryName?.trim?.() ||
      "all categories"
    ).toLowerCase();
    const normalizedLocation = location?.toLowerCase().trim() || "global";
    // Both optional — callers predating the district-prefixed URL scheme send
    // neither. Empty string rather than "global": these have no sentinel, an
    // absent district simply means "not supplied".
    const normalizedDistrict = district?.toLowerCase().trim() || "";
    const normalizedMasterLocationSlug =
      masterLocationSlug?.toLowerCase().trim() || "";

    const isValidUser =
      userDetails &&
      userDetails.userName &&
      userDetails.userName.trim() &&
      userDetails.mobileNumber1 &&
      userDetails.mobileNumber1.trim();

    // const escapeRegex = (text = "") =>
    //   text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    // ── Resolve category used for analytics / lead grouping ────
    let finalCategoryName = "";
    let matchedCategoryFromSearch = null;

    if (
      isKnownCategory &&
      categoryName &&
      categoryName.trim() &&
      categoryName.toLowerCase() !== "all categories"
    ) {
      finalCategoryName = categoryName.trim();

      const categorySlugFromInput = categoryName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)+/g, "");

      const validCategory = await CategoryModel.findOne({
        slug: categorySlugFromInput,
      }).lean();

      if (validCategory) {
        matchedCategoryFromSearch = validCategory;
      }
    }

    if (!finalCategoryName) {
      const resolvedCategoryIntent = await resolveCategoryIntent(
        cleanSearchText,
        escapeRegex
      );
      const resolvedCategory = typeof resolvedCategoryIntent === "string"
        ? resolvedCategoryIntent
        : resolvedCategoryIntent?.category;

      if (resolvedCategory) {
        finalCategoryName = resolvedCategory;
        matchedCategoryFromSearch = await CategoryModel.findOne(
          {
            $or: [
              { category: { $regex: `^${escapeRegex(resolvedCategory)}$`, $options: "i" } },
              { categoryName: { $regex: `^${escapeRegex(resolvedCategory)}$`, $options: "i" } },
            ],
          }
        ).lean();
      } else {
        finalCategoryName = rawSearchText || categoryName || "all categories";
      }
    }

    const categorySlug = finalCategoryName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");

    const category = await CategoryModel.findOne(
      { slug: categorySlug },
      {
        category: 1,
        categoryName: 1,
        categoryImages: 1,
        categoryImageKey: 1,
        liveImageKey: 1,
      },
    ).lean();

    // ── Anonymous path ────────────────────────────────────────────────────────
    if (!isValidUser) {
      const fingerprint = anonFingerprint(req);
      const anonymousDedupeMinutes = nonNegativeInteger(
        leadSettings.lead_guard_anonymous_dedupe_minutes,
        5,
      );
      let recentAnon = null;

      if (
        leadSettings.lead_guard_anonymous_dedupe_enabled !== false &&
        anonymousDedupeMinutes > 0
      ) {
        const anonDedupeSince = new Date(
          Date.now() - anonymousDedupeMinutes * 60 * 1000,
        );
        recentAnon = await searchLogModel.findOne({
          categoryName: finalCategoryName,
          location: normalizedLocation,
          searchedUserText: cleanSearchText,
          isAnonymous: true,
          anonFingerprint: fingerprint,
          createdAt: { $gte: anonDedupeSince },
        });
      }

      if (!recentAnon) {
        await createSearchLog({
          categoryName: finalCategoryName,
          searchedUserText: cleanSearchText,
          location: normalizedLocation,
          district: normalizedDistrict,
          masterLocationSlug: normalizedMasterLocationSlug,
          userDetails: [],
          whatsapp: false,
          isAnonymous: true,
          anonFingerprint: fingerprint,
        });
      }

      leadLog(reqId, "request:anonymous-logged", {
        recentDuplicate: Boolean(recentAnon),
        detectedCategory: finalCategoryName,
        location: normalizedLocation,
      });
      return res.status(200).json({
        success: true,
        anonymous: true,
        message: "Anonymous search logged",
        detectedCategory: finalCategoryName,
      });
    }

    // ── Identified user path ──────────────────────────────────────────────────

    const userDedupeMinutes = nonNegativeInteger(
      leadSettings.lead_guard_user_dedupe_minutes,
      5,
    );
    let recentLog = null;

    if (
      leadSettings.lead_guard_user_dedupe_enabled !== false &&
      userDedupeMinutes > 0
    ) {
      const userDedupeSince = new Date(
        Date.now() - userDedupeMinutes * 60 * 1000,
      );
      recentLog = await searchLogModel.findOne({
        categoryName: { $regex: `^${finalCategoryName}$`, $options: "i" },
        location: normalizedLocation,
        "userDetails.mobileNumber1": userDetails.mobileNumber1,
        searchedUserText: cleanSearchText,
        createdAt: { $gte: userDedupeSince },
      });
    }
    if (recentLog?.whatsapp) {
      leadLog(reqId, "request:deduped-recent-whatsapp", {
        searchLogId: recentLog._id?.toString?.() || "",
        detectedCategory: finalCategoryName,
        location: normalizedLocation,
      });
      return res.status(200).json({
        success: true,
        message: "Lead already sent recently",
        detectedCategory: finalCategoryName,
      });
    }

    const savedLog =
      recentLog ||
      (await createSearchLog({
        categoryName: finalCategoryName,
        searchedUserText: cleanSearchText,
        location: normalizedLocation,
        district: normalizedDistrict,
        masterLocationSlug: normalizedMasterLocationSlug,
        userDetails: [
          {
            userName: userDetails.userName,
            mobileNumber1: userDetails.mobileNumber1,
            mobileNumber2: userDetails.mobileNumber2 || "",
            email: userDetails.email || "",
          },
        ],
        whatsapp: false,
        isAnonymous: false,
      }));

    // ── Lead guard: never fan out on an unresolved location ───────────────────
    // `normalizedLocation` falls back to "global" when the caller sent no usable
    // location. The location filter further down is skipped for "global", which
    // turned an unresolvable location into a nationwide broadcast: the query
    // degrades to "any live business in this category", sorted by amountPaid, so
    // the top-paying listings in the country received a lead for a search that
    // happened somewhere else entirely.
    //
    // Fail closed instead. The searchLog row above is already written, so demand
    // analytics and the admin lead view are unaffected — only the WhatsApp/FCM
    // dispatch is suppressed.
    if (
      leadSettings.lead_guard_require_location !== false &&
      normalizedLocation === "global"
    ) {
      leadLog(reqId, "request:lead-dispatch-blocked-global-location", {
        searchLogId: savedLog._id?.toString?.() || "",
      });
      return res.status(200).json({
        success: true,
        leadDispatched: false,
        message: "Search logged; lead not dispatched because the location could not be resolved",
        detectedCategory: finalCategoryName,
      });
    }

    const locationGroups = {
      trichy: ["trichy", "tiruchirappalli"],
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

    // const escapeRegex = (text = "") =>
    //   text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

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
          location: { $regex: `^${escapeRegex(normalize(l))}$`, $options: "i" },
        })),
      });
    }

    // Narrow by district when the caller resolved one. The free-text `location`
    // match above cannot disambiguate the 390 locality names shared across
    // districts — "Srirangam" alone matches every Srirangam in the state.
    // Businesses with no linked masterLocation are kept: they have no district
    // to compare, and excluding them would silently drop leads for unlinked
    // listings that the free-text match above already accepted.
    if (normalizedDistrict) {
      const districtAliases =
        districtAliasMap[normalizedDistrict] || [normalizedDistrict];
      searchMatchQuery.$and.push({
        $or: [
          ...districtAliases.map((d) => ({
            "masterLocation.district": {
              $regex: `^${escapeRegex(normalize(d))}$`,
              $options: "i",
            },
          })),
          { "masterLocation.district": { $in: [null, ""] } },
        ],
      });
    }

    if (uniqueCategoryMatchValues.length > 0) {
      searchMatchQuery.$and.push({
        $or: uniqueCategoryMatchValues.flatMap((value) => {
          const categoryRegex = getDynamicCategoryRegex(value);
          return [{ category: categoryRegex }, { keywords: categoryRegex }];
        }),
      });
    }

    if (searchMatchQuery.$and.length === 0) {
      delete searchMatchQuery.$and;
    }

    // Find matching businesses (limit to top 10)
    let businesses = [];

    if (Array.isArray(matchedBusinessIds) && matchedBusinessIds.length > 0) {
      const orderedIds = matchedBusinessIds
        .map((id) => id?.toString?.())
        .filter(Boolean)
        .slice(0, 10);

      const fetchedBusinesses = await businessListModel
        .find(
          { _id: { $in: orderedIds } },
          {
            businessName: 1,
            category: 1,
            keywords: 1,
            contactList: 1,
            whatsappNumber: 1,
            location: 1,
            street: 1,
            plotNumber: 1,
            averageRating: 1,
            premiumBusiness: 1,
          }
        )
        .lean();

      const businessById = new Map(
        fetchedBusinesses.map((business) => [business._id.toString(), business])
      );

      businesses = orderedIds
        .map((id) => businessById.get(id))
        .filter(Boolean);
      leadLog(reqId, "business-match:from-result-ids", {
        requested: orderedIds.length,
        found: businesses.length,
      });
    } else {
      businesses = await businessListModel
        .find(searchMatchQuery, {
          businessName: 1,
          category: 1,
          keywords: 1,
          contactList: 1,
          whatsappNumber: 1,
          location: 1,
          street: 1,
          plotNumber: 1,
          averageRating: 1,
          premiumBusiness: 1,
        })
        .sort({ amountPaid: -1, paidDate: -1, averageRating: -1, createdAt: -1 })
        .limit(10)
        .lean();
      leadLog(reqId, "business-match:from-query", {
        found: businesses.length,
        queryHasLocation: normalizedLocation && normalizedLocation !== "global",
        queryHasDistrict: Boolean(normalizedDistrict),
        categoryMatchValues: uniqueCategoryMatchValues,
      });
    }

    if (!businesses.length) {
      leadLog(reqId, "business-match:none", {
        detectedCategory: finalCategoryName,
        location: normalizedLocation,
      });
      return res.status(200).json({
        success: true,
        message: "Lead stored but no businesses found",
        detectedCategory: finalCategoryName,
      });
    }

    const leadData = {
      searchText: finalCategoryName,
      searchedUserText: cleanSearchText || finalCategoryName,

      location: normalizedLocation,

      customerName: userDetails.userName,

      customerMobile: userDetails.mobileNumber1,

      email: userDetails.email || "",
    };

    const waSettings = leadSettings;

    const premiumBusinesses = businesses.filter((business) => business.premiumBusiness === true);
    const normalBusinesses = businesses.filter((business) => business.premiumBusiness !== true);

    leadLog(reqId, "business-match:split", {
      total: businesses.length,
      premium: premiumBusinesses.length,
      normal: normalBusinesses.length,
      delayMinutes: nonNegativeInteger(waSettings.premium_lead_delay_minutes, 30),
    });

    if (!premiumBusinesses.length) {
      const dispatchResult = await dispatchLeadToBusinesses({
        businesses,
        userDetails,
        leadData,
        savedLog,
        finalCategoryName,
        normalizedLocation,
        waSettings,
        sendCustomerBusinessList: true,
        phase: "standard",
        traceId: reqId,
      });

      if (dispatchResult.customerListDisabled) {
        return res.status(202).json({
          success: true,
          message: "Lead stored but customer WhatsApp is disabled",
          detectedCategory: finalCategoryName,
          totalBusinesses: businesses.length,
          notifiedBusinesses: dispatchResult.notifiedBusinesses,
          whatsappUpdated: false,
        });
      }

      await searchLogModel.updateOne(
        { _id: savedLog._id },
        { whatsapp: dispatchResult.whatsappUpdated },
      );

      return res.status(202).json({
        success: true,
        message: dispatchResult.whatsappUpdated
          ? "Lead stored & WhatsApp sent"
          : "Lead stored but WhatsApp delivery failed",
        detectedCategory: finalCategoryName,
        totalBusinesses: businesses.length,
        notifiedBusinesses: dispatchResult.notifiedBusinesses,
        whatsappUpdated: dispatchResult.whatsappUpdated,
      });
    }

    const premiumDispatchResult = await dispatchLeadToBusinesses({
      businesses: premiumBusinesses,
      userDetails,
      leadData,
      savedLog,
      finalCategoryName,
      normalizedLocation,
      waSettings,
      sendCustomerBusinessList: false,
      phase: "premium",
      traceId: reqId,
    });

    let premiumCustomerWhatsappSent = false;
    const cleanCustomerMobile = extractIndianMobiles(userDetails.mobileNumber1)[0];
    if (cleanCustomerMobile && waSettings.whatsapp_customer_business_list) {
      try {
        await withRetry(
          () =>
            sendPremiumBusinessesToCustomer(
              cleanCustomerMobile,
              leadData,
              premiumBusinesses,
              {
                sourceType: "premium_customer_recommendation",
                sourceId: savedLog._id,
              },
            ),
          `Premium recommendation WhatsApp ${cleanCustomerMobile}`,
        );
        premiumCustomerWhatsappSent = true;
        leadLog(reqId, "whatsapp-premium-customer:sent", {
          recipientMobile: maskMobile(cleanCustomerMobile),
          premiumBusinessesCount: premiumBusinesses.length,
          template: "pr_reco",
        });
      } catch (err) {
        console.error(
          "Premium recommendation WhatsApp failed",
          err.response?.data || err.message,
        );
        leadLog(reqId, "whatsapp-premium-customer:error", {
          recipientMobile: maskMobile(cleanCustomerMobile),
          error: err.response?.data || err.message,
        });
      }
    } else if (!waSettings.whatsapp_customer_business_list) {
      console.warn("[WhatsApp] premium customer recommendation disabled because customer business list is disabled");
      leadLog(reqId, "whatsapp-premium-customer:disabled");
    } else {
      leadLog(reqId, "whatsapp-premium-customer:no-mobile");
    }

    const delayMinutes = nonNegativeInteger(waSettings.premium_lead_delay_minutes, 30);
    const delayedUntil = new Date(Date.now() + delayMinutes * 60 * 1000);
    const shouldDelayNormalBusinesses = normalBusinesses.length > 0 && delayMinutes > 0;
    let delayedJobId = null;

    if (normalBusinesses.length > 0) {
      if (delayMinutes === 0) {
        await dispatchLeadToBusinesses({
          businesses: normalBusinesses,
          userDetails,
          leadData,
          savedLog,
          finalCategoryName,
          normalizedLocation,
          waSettings,
          sendCustomerBusinessList: false,
          phase: "normal_immediate",
          traceId: reqId,
        });
      } else {
        const delayedJob = await delayedLeadDispatchModel.create({
          searchLogId: savedLog._id,
          traceId: reqId,
          businessIds: normalBusinesses.map((business) => business._id),
          leadData,
          userDetails: {
            userName: userDetails.userName || "",
            mobileNumber1: userDetails.mobileNumber1 || "",
            mobileNumber2: userDetails.mobileNumber2 || "",
            email: userDetails.email || "",
          },
          dueAt: delayedUntil,
          status: "scheduled",
        });
        delayedJobId = delayedJob._id;
        leadLog(reqId, "delayed-normal:scheduled", {
          delayedJobId: delayedJobId?.toString?.() || "",
          businessesCount: normalBusinesses.length,
          dueAt: delayedUntil,
          delayMinutes,
        });
      }
    } else {
      leadLog(reqId, "delayed-normal:none");
    }

    const whatsappUpdated =
      premiumDispatchResult.businessSendSuccess && premiumCustomerWhatsappSent;

    await searchLogModel.updateOne(
      { _id: savedLog._id },
      { whatsapp: whatsappUpdated },
    );

    return res.status(202).json({
      success: true,
      message: premiumCustomerWhatsappSent
        ? shouldDelayNormalBusinesses
          ? "Premium lead sent; normal business delivery scheduled"
          : "Premium lead sent"
        : "Premium lead stored but customer recommendation failed",
      detectedCategory: finalCategoryName,
      totalBusinesses: businesses.length,
      notifiedBusinesses: premiumDispatchResult.notifiedBusinesses,
      whatsappUpdated,
      premiumLeadFirst: true,
      premiumBusinessesCount: premiumBusinesses.length,
      delayedBusinessesCount: shouldDelayNormalBusinesses ? normalBusinesses.length : 0,
      immediateNormalBusinessesCount: delayMinutes === 0 ? normalBusinesses.length : 0,
      delayedUntil: shouldDelayNormalBusinesses ? delayedUntil : null,
      delayedJobId,
      premiumCustomerWhatsappSent,
    });
  } catch (error) {
    console.error("Error logging search:", error);

    return res.status(500).json({
      success: false,

      message: "Server error",
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
    if (error.message === "Invalid search log ID") {
      return res.status(400).json({ success: false, message: error.message });
    }

    if (error.message === "Search log not found") {
      return res.status(404).json({ success: false, message: error.message });
    }

    console.error("updateSearchAction error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getTrendingSearchesAction = async (req, res) => {
  try {
    const trending = await getTopTrendingCategories(10);

    const formatted = trending.map((item) => ({
      _id: item._id,
      categoryName: item.categoryName || item.category,
      totalSearches: item.totalSearches,
      categoryImageKey: item.categoryImageKey
        ? getSignedUrlByKey(item.categoryImageKey)
        : "",
      liveImageKey: item.liveImageKey
        ? getSignedUrlByKey(item.liveImageKey)
        : "",
      categoryImages: {
        webHero: item.categoryImages?.webHero
          ? getSignedUrlByKey(item.categoryImages.webHero)
          : "",
        webCard: item.categoryImages?.webCard
          ? getSignedUrlByKey(item.categoryImages.webCard)
          : "",
        webThumbnail: item.categoryImages?.webThumbnail
          ? getSignedUrlByKey(item.categoryImages.webThumbnail)
          : "",
        mobileVertical: item.categoryImages?.mobileVertical
          ? getSignedUrlByKey(item.categoryImages.mobileVertical)
          : "",
        mobileCard: item.categoryImages?.mobileCard
          ? getSignedUrlByKey(item.categoryImages.mobileCard)
          : "",
        mobileThumbnail: item.categoryImages?.mobileThumbnail
          ? getSignedUrlByKey(item.categoryImages.mobileThumbnail)
          : "",
      },
    }));

    return res.status(200).json({
      success: true,
      data: formatted,
    });
  } catch (error) {
    console.error("getTrendingSearchesAction error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch trending searches",
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
      customerEmail,
      message,
    } = req.body;
    const leadData = {
      category,
      location,
      customerName,
      customerMobile,
      customerEmail,
      message,
    };
    const leadSettings = await getSettings();

    // If businessId provided, send to that specific business (existing behaviour)
    if (businessId) {
      const business = await businessListModel.findById(businessId);

      if (!business) {
        return res.status(404).json({
          success: false,
          message: "Business not found",
        });
      }

      const mobile = extractIndianMobiles([
        business.whatsappNumber,
        business.contactList,
      ])[0];

      if (!mobile && !business.email) {
        return res.status(400).json({
          success: false,
          message: "Business does not have an enquiry email or mobile number",
        });
      }

      let whatsappSent = false;
      if (mobile) {
        await sendEnquiryBusinessLead(mobile, leadData, {
          sourceType: "enquiry",
          businessId: business._id,
          businessName: business.businessName,
        });
        whatsappSent = true;
      }

      await enquiryModel.create({
        fullName: customerName,
        businessName: business.businessName,
        businessCategory: category || business.category || "General",
        contactNumber: customerMobile,
        email: customerEmail,
        serviceInterest: category || "General Consultation",
        message: message || "General enquiry",
      });

      let emailSent = false;
      if (business.email) {
        try {
          emailSent = (await sendBusinessEnquiryEmail(business, leadData)).success === true;
        } catch (emailError) {
          console.error("sendBusinessEnquiryEmail failed:", emailError.message || emailError);
        }
      }

      return res.status(200).json({
        success: true,
        message: emailSent
          ? `Enquiry sent to the business by email${whatsappSent ? " and WhatsApp" : ""}`
          : "Enquiry sent to the business",
        emailSent,
        whatsappSent,
        totalBusinesses: 1,
        notifiedBusinesses: [{ businessName: business.businessName, mobile, email: business.email || "" }],
      });
    }

    // Otherwise, treat as category-level enquiry: find matching businesses and send
    const normalizedLocation = (location || "global").toLowerCase().trim();
    const categoryText = (category || "").toLowerCase().trim();

    // Same fail-closed guard as logSearch: "global" disables the location filter
    // below, which would broadcast this enquiry to businesses in every district.
    // An enquiry with no resolvable location has no correct set of recipients.
    if (
      leadSettings.lead_guard_require_location !== false &&
      normalizedLocation === "global"
    ) {
      return res.status(200).json({
        success: true,
        leadDispatched: false,
        message: "Enquiry not sent because the location could not be resolved",
        totalBusinesses: 0,
        notifiedBusinesses: [],
      });
    }

    // const escapeRegex = (text = "") =>
    //   text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

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
      searchMatchQuery.location = {
        $regex: `^${escapeRegex(normalizedLocation)}$`,
        $options: "i",
      };
    }

    if (categoryText) {
      const categoryRegex = getCategoryRegex(categoryText);
      searchMatchQuery.$or = [
        { category: categoryRegex },
        { keywords: categoryRegex },
      ];
    }

    const businesses = await businessListModel
      .find(searchMatchQuery, {
        businessName: 1,
        contactList: 1,
        whatsappNumber: 1,
        location: 1,
      })
      .limit(10)
      .lean();

    if (!businesses.length) {
      return res
        .status(200)
        .json({
          success: true,
          message: "No businesses found for this enquiry",
          totalBusinesses: 0,
        });
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
      notifiedBusinesses: notified,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      success: false,
    });
  }
};

export const sendBusinessInfoToCustomer = async (req, res) => {
  try {
    const { businessId, customerName, customerMobile, customerEmail } = req.body;
    if (!businessId) {
      return res.status(400).json({ success: false, message: "Business is required" });
    }

    const business = await businessListModel.findById(businessId).lean();
    if (!business) {
      return res.status(404).json({ success: false, message: "Business not found" });
    }

    let emailSent = false;
    let whatsappSent = false;
    if (customerEmail) {
      emailSent = (await sendCustomerBusinessInfoEmail(business, {
        name: customerName,
        email: customerEmail,
      })).success === true;
    }
    if (customerMobile) {
      await sendBusinessesToCustomer(
        customerMobile,
        {
          customerName,
          customerMobile,
          category: business.category,
          searchText: business.category,
          location: business.location,
        },
        [business],
        { sourceType: "business_detail_info", customerListSendMode: "single", businessId: business._id, businessName: business.businessName }
      );
      whatsappSent = true;
    }

    if (!emailSent && !whatsappSent) {
      return res.status(400).json({ success: false, message: "A valid email or mobile number is required" });
    }

    return res.json({
      success: true,
      emailSent,
      whatsappSent,
      message: `Business information sent${emailSent ? " by email" : ""}${emailSent && whatsappSent ? " and" : ""}${whatsappSent ? " by WhatsApp" : ""}`,
    });
  } catch (error) {
    console.error("sendBusinessInfoToCustomer failed:", error);
    return res.status(500).json({ success: false, message: "Unable to send business information" });
  }
};
