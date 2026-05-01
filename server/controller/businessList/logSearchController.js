import { createHash } from "crypto";
import { createSearchLog, getAllSearchLogs, getMatchedSearchLogs, updateSearchData, getTopTrendingCategories } from "../../helper/businessList/logSearchHelper.js";
import CategoryModel from "../../model/category/categoryModel.js";
import { getSignedUrlByKey } from "../../s3Uploder.js";
import businessListModel from "../../model/businessList/businessListModel.js";
import { sendBusinessesToCustomer, sendBusinessLead } from "../../helper/msg91/smsGatewayHelper.js";
import searchLogModel from "../../model/businessList/searchLogModel.js";
import userModel from "../../model/msg91Model/usersModels.js";
import { sendFCMNotification } from "../../helper/fcmHelper.js";

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

    if (!searchedUserText || !searchedUserText.trim()) {
      return res.status(400).json({
        success: false,
        message: "Search text is mandatory"
      });
    }

    const cleanSearchText = searchedUserText.trim().toLowerCase();
    const normalizedLocation = location?.toLowerCase().trim() || "global";

    const isValidUser =
      userDetails &&
      userDetails.userName &&
      userDetails.userName.trim() &&
      userDetails.mobileNumber1 &&
      userDetails.mobileNumber1.trim();

    // ── Resolve category (runs for all users, logged in or not) ──────────────
    let finalCategoryName = "";

    if (
      categoryName &&
      categoryName.trim() &&
      categoryName.toLowerCase() !== "all categories"
    ) {
      finalCategoryName = categoryName.trim();
    } else {
      const matchedCategory = await CategoryModel.findOne({
        categoryName: { $regex: cleanSearchText, $options: "i" }
      }).lean();

      if (matchedCategory) {
        finalCategoryName = matchedCategory.categoryName;
      } else {
        const searchWords = cleanSearchText.split(" ");
        const possibleCategory = await CategoryModel.findOne({
          categoryName: { $regex: searchWords.join("|"), $options: "i" }
        }).lean();
        finalCategoryName = possibleCategory
          ? possibleCategory.categoryName
          : searchedUserText;
      }
    }

    const categorySlug = finalCategoryName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");

    const category = await CategoryModel.findOne(
      { slug: categorySlug },
      { categoryImageKey: 1 }
    ).lean();

    // ── Anonymous path ────────────────────────────────────────────────────────
    if (!isValidUser) {
      const fingerprint = anonFingerprint(req);
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);

      // Same dedup window as identified users, but keyed by IP+UA hash instead of mobile
      const recentAnon = await searchLogModel.findOne({
        categoryName: finalCategoryName,
        location: normalizedLocation,
        searchedUserText: cleanSearchText,
        isAnonymous: true,
        anonFingerprint: fingerprint,
        createdAt: { $gte: fiveMinAgo }
      });

      if (!recentAnon) {
        await createSearchLog({
          categoryName: finalCategoryName,
          categoryImage: category?.categoryImageKey || "",
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
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    const recentLog = await searchLogModel.findOne({
      categoryName: finalCategoryName,
      location: normalizedLocation,
      "userDetails.mobileNumber1": userDetails.mobileNumber1,
      searchedUserText: cleanSearchText,
      createdAt: { $gte: fiveMinutesAgo }
    });

    if (recentLog) {
      return res.status(200).json({
        success: true,
        message: "Lead already sent recently",
        detectedCategory: finalCategoryName
      });
    }

    const savedLog = await createSearchLog({
      categoryName: finalCategoryName,
      categoryImage: category?.categoryImageKey || "",
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

    const categoryRegex = getDynamicCategoryRegex(finalCategoryName);

    const businesses = await businessListModel.find(
      {
        category: categoryRegex,

        $or: locationList.map(loc => ({
          location: { $regex: loc, $options: "i" }
        })),

        isActive: true,
        businessesLive: true
      },
      {
        businessName: 1,
        contactList: 1,
        whatsappNumber: 1,
        location: 1,
        street: 1,
        plotNumber: 1,
        averageRating: 1
      }
    )
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

      searchText: searchedUserText,

      location: normalizedLocation,

      customerName: userDetails.userName,

      customerMobile: userDetails.mobileNumber1,

      email: userDetails.email || ""

    };

    let businessSendSuccess = false;

    let customerSendSuccess = false;

    const notifiedBusinesses = [];



    // Collect mobile numbers for batch FCM lookup (avoid per-business DB query)
    const ownerMobiles = businesses
      .map(b => cleanIndianMobile(b.contactList || b.whatsappNumber))
      .filter(Boolean);

    const ownerUsersMap = new Map();
    if (ownerMobiles.length > 0) {
      const now = new Date();
      const ownerUsers = await userModel.find(
        { mobileNumber1: { $in: ownerMobiles }, "fcmTokens.isActive": true },
        { mobileNumber1: 1, fcmTokens: 1 }
      ).lean();
      for (const u of ownerUsers) {
        const activeTokens = u.fcmTokens.filter(
          t => t.isActive && new Date(t.expiresAt) > now
        );
        if (activeTokens.length > 0) {
          ownerUsersMap.set(u.mobileNumber1, activeTokens);
        }
      }
    }

    for (const business of businesses) {

      const ownerMobile =
        business.contactList || business.whatsappNumber;

      const cleanMobile = cleanIndianMobile(ownerMobile);

      if (!cleanMobile) continue;

      try {

        await sendBusinessLead(cleanMobile, leadData);

        businessSendSuccess = true;

        notifiedBusinesses.push({

          businessName: business.businessName,

          mobile: cleanMobile

        });

        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (err) {

        console.error(

          "Business WhatsApp failed:",

          err.response?.data || err.message

        );

      }

      // Send FCM push to this business owner's active devices (fire-and-forget)
      const ownerTokens = ownerUsersMap.get(cleanMobile);
      if (ownerTokens && ownerTokens.length > 0) {
        const fcmTitle = "New Lead Alert 🔔";
        const fcmBody = `Someone searched "${searchedUserText}" in ${normalizedLocation}. Check your leads now!`;
        const fcmData = {
          type: "lead",
          category: finalCategoryName,
          location: normalizedLocation,
        };
        for (const tokenObj of ownerTokens) {
          sendFCMNotification(tokenObj.token, fcmTitle, fcmBody, fcmData).catch(
            err => console.error("FCM lead push failed:", err.message)
          );
        }
      }

    }

    const cleanCustomerMobile = cleanIndianMobile(
      userDetails.mobileNumber1
    );

    if (cleanCustomerMobile) {

      try {

        await sendBusinessesToCustomer(

          cleanCustomerMobile,

          leadData,

          businesses

        );

        customerSendSuccess = true;

      }

      catch (err) {

        console.error(

          "Customer WhatsApp failed",

          err.response?.data || err.message

        );

      }

    }

    await searchLogModel.updateOne(
      { _id: savedLog._id },
      { whatsapp: true }
    );

    return res.status(202).json({

      success: true,

      message: "Lead stored & WhatsApp sent",

      detectedCategory: finalCategoryName,

      totalBusinesses: businesses.length,

      notifiedBusinesses,

      whatsappUpdated: businessSendSuccess && customerSendSuccess

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
      ...item,
      categoryImage: item.categoryImage
        ? getSignedUrlByKey(item.categoryImage)
        : ""
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


