import {
  createSearchLog,
  getAllSearchLogs,
  getMatchedSearchLogs,
  updateSearchData,
  getTopTrendingCategories
} from "../../helper/businessList/logSearchHelper.js";
import CategoryModel from "../../model/category/categoryModel.js";
import { getSignedUrlByKey } from "../../s3Uploder.js";
import businessListModel from "../../model/businessList/businessListModel.js";
import {
  sendBusinessesToCustomer,
  sendBusinessLead
} from "../../helper/msg91/smsGatewayHelper.js";
import searchLogModel from "../../model/businessList/searchLogModel.js";

/**
 * Cleans and formats Indian mobile numbers to E.164 format
 * @param {string} mobile - Raw mobile number input
 * @returns {string|null} - Formatted mobile number with country code or null if invalid
 */
const cleanIndianMobile = (mobile) => {
  if (!mobile) return null;

  // Remove all non-digit characters
  let clean = mobile.replace(/\D/g, "");

  // Remove '91' prefix if present and length is exactly 12
  if (clean.startsWith("91") && clean.length === 12) {
    clean = clean.slice(2);
  }

  // Validate Indian mobile number (starts with 6-9 and has 10 digits)
  if (/^[6-9]\d{9}$/.test(clean)) {
    return "91" + clean;
  }

  return null;
};

/**
 * Main controller action to log a user search and trigger WhatsApp notifications
 * @route POST /api/search/log
 */
export const logSearchAction = async (req, res) => {
  console.log("[SearchLog] Starting search log process");
  console.log("[SearchLog] Request body:", {
    categoryName: req.body.categoryName,
    location: req.body.location,
    searchedUserText: req.body.searchedUserText,
    userDetails: req.body.userDetails ? {
      userName: req.body.userDetails.userName,
      mobileNumber1: req.body.userDetails.mobileNumber1,
      email: req.body.userDetails.email
    } : null
  });

  try {
    const { categoryName, location, searchedUserText, userDetails } = req.body;

    // Step 1: Validate required search text
    console.log("[SearchLog] Step 1: Validating search text");
    if (!searchedUserText || !searchedUserText.trim()) {
      console.log("[SearchLog] ❌ Search text validation failed - empty text");
      return res.status(400).json({
        success: false,
        message: "Search text is mandatory"
      });
    }

    const cleanSearchText = searchedUserText.trim().toLowerCase();
    const normalizedLocation = location?.toLowerCase().trim() || "global";
    console.log("[SearchLog] ✅ Search text valid:", cleanSearchText);
    console.log("[SearchLog] Location normalized:", normalizedLocation);

    // Step 2: Validate user details (name and mobile required)
    console.log("[SearchLog] Step 2: Validating user details");
    const isValidUser =
      userDetails &&
      userDetails.userName &&
      userDetails.userName.trim() &&
      userDetails.mobileNumber1 &&
      userDetails.mobileNumber1.trim();

    if (!isValidUser) {
      console.log("[SearchLog] ❌ User validation failed - missing name or mobile");
      return res.status(200).json({
        success: false,
        message: "Valid name and mobile number required"
      });
    }
    console.log("[SearchLog] ✅ User details valid");

    // Step 3: Determine or match category
    console.log("[SearchLog] Step 3: Determining category");
    let finalCategoryName = "";

    if (
      categoryName &&
      categoryName.trim() &&
      categoryName.toLowerCase() !== "all categories"
    ) {
      // Use provided category if valid
      finalCategoryName = categoryName.trim();
      console.log("[SearchLog] Using provided category:", finalCategoryName);
    } else {
      // Attempt to match category from search text
      console.log("[SearchLog] Attempting to match category from search text");
      
      // Try exact match first
      const matchedCategory = await CategoryModel.findOne({
        categoryName: { $regex: cleanSearchText, $options: "i" }
      }).lean();

      if (matchedCategory) {
        finalCategoryName = matchedCategory.categoryName;
        console.log("[SearchLog] ✅ Exact category match found:", finalCategoryName);
      } else {
        // Try word-based partial match
        console.log("[SearchLog] No exact match, trying word-based match");
        const searchWords = cleanSearchText.split(" ");
        const possibleCategory = await CategoryModel.findOne({
          categoryName: {
            $regex: searchWords.join("|"),
            $options: "i"
          }
        }).lean();

        finalCategoryName = possibleCategory
          ? possibleCategory.categoryName
          : "Other";
        console.log("[SearchLog] Category determined:", finalCategoryName);
      }
    }

    // Step 4: Fetch category details for image
    console.log("[SearchLog] Step 4: Fetching category details");
    const categorySlug = finalCategoryName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");

    const category = await CategoryModel.findOne(
      { slug: categorySlug },
      { categoryImageKey: 1 }
    ).lean();
    console.log("[SearchLog] Category image key:", category?.categoryImageKey || "None");

    // Step 5: Check for duplicate logs within 5 minutes
    console.log("[SearchLog] Step 5: Checking for duplicate logs");
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const recentLog = await searchLogModel.findOne({
      categoryName: finalCategoryName,
      location: normalizedLocation,
      "userDetails.mobileNumber1": userDetails.mobileNumber1,
      createdAt: { $gte: fiveMinutesAgo }
    });

    if (recentLog) {
      console.log("[SearchLog] ⚠️ Duplicate log detected within 5 minutes - skipping WhatsApp");
      return res.status(200).json({
        success: true,
        message: "Lead already sent recently (5 min protection)",
        detectedCategory: finalCategoryName
      });
    }
    console.log("[SearchLog] ✅ No duplicate found");

    // Step 6: Save search log to database
    console.log("[SearchLog] Step 6: Saving search log");
    const savedLog = await createSearchLog({
      categoryName: finalCategoryName,
      categoryImage: category?.categoryImageKey || "",
      searchedUserText,
      location: normalizedLocation,
      userDetails: [
        {
          userName: userDetails.userName,
          mobileNumber1: userDetails.mobileNumber1,
          mobileNumber2: userDetails.mobileNumber2 || "",
          email: userDetails.email || ""
        }
      ],
      whatsapp: false
    });
    console.log("[SearchLog] ✅ Search log saved with ID:", savedLog._id);

    // Step 7: Build location list for business search
    console.log("[SearchLog] Step 7: Building location variations");
    const locationGroups = {
      trichy: ["trichy", "tiruchirappalli"]
    };

    let locationList = [normalizedLocation];
    for (const key in locationGroups) {
      if (locationGroups[key].includes(normalizedLocation)) {
        locationList = locationGroups[key];
        console.log("[SearchLog] Location group matched:", key, "→", locationList);
        break;
      }
    }

    // Step 8: Find matching businesses
    console.log("[SearchLog] Step 8: Finding matching businesses");
    const businesses = await businessListModel.find(
      {
        category: { $regex: `^${finalCategoryName}$`, $options: "i" },
        location: {
          $in: locationList.map(loc => new RegExp(loc, "i"))
        },
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

    console.log("[SearchLog] Found", businesses.length, "matching businesses");

    if (!businesses.length) {
      console.log("[SearchLog] ⚠️ No businesses found - skipping WhatsApp notifications");
      return res.status(200).json({
        success: true,
        message: "Lead stored but no businesses found",
        detectedCategory: finalCategoryName
      });
    }

    // Step 9: Prepare lead data for WhatsApp notifications
    console.log("[SearchLog] Step 9: Preparing lead data");
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

    // Step 10: Send WhatsApp notifications to businesses
    console.log("[SearchLog] Step 10: Sending WhatsApp to businesses");
    for (const [index, business] of businesses.entries()) {
      const ownerMobile = business.contactList || business.whatsappNumber;
      const cleanMobile = cleanIndianMobile(ownerMobile);

      if (!cleanMobile) {
        console.log(`[SearchLog] ⚠️ Business ${index + 1}: Invalid mobile number`);
        continue;
      }

      try {
        console.log(`[SearchLog] Sending WhatsApp to business ${index + 1}/${businesses.length}:`, business.businessName);
        await sendBusinessLead(cleanMobile, leadData);
        businessSendSuccess = true;

        notifiedBusinesses.push({
          businessName: business.businessName,
          mobile: cleanMobile
        });
        console.log(`[SearchLog] ✅ WhatsApp sent to business:`, business.businessName);

        // Add delay between messages to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (err) {
        console.error(
          `[SearchLog] ❌ Business WhatsApp failed for ${business.businessName}:`,
          err.response?.data || err.message
        );
      }
    }

    // Step 11: Send WhatsApp notification to customer
    console.log("[SearchLog] Step 11: Sending WhatsApp to customer");
    const cleanCustomerMobile = cleanIndianMobile(userDetails.mobileNumber1);
    if (cleanCustomerMobile) {
      try {
        console.log("[SearchLog] Sending business list to customer");
        await sendBusinessesToCustomer(
          cleanCustomerMobile,
          leadData,
          businesses
        );
        customerSendSuccess = true;
        console.log("[SearchLog] ✅ WhatsApp sent to customer");
      } catch (err) {
        console.error(
          "[SearchLog] ❌ Customer WhatsApp failed:",
          err.response?.data || err.message
        );
      }
    } else {
      console.log("[SearchLog] ⚠️ Invalid customer mobile number - skipping");
    }

    // Step 12: Update search log WhatsApp status
    console.log("[SearchLog] Step 12: Updating WhatsApp status in log");
    const updated = await searchLogModel.findOneAndUpdate(
      { _id: savedLog._id, whatsapp: false },
      { whatsapp: true },
      { new: true }
    );

    if (!updated) {
      console.log("[SearchLog] ⚠️ WhatsApp flag already set - duplicate prevention");
      return res.status(200).json({
        success: true,
        message: "Duplicate blocked"
      });
    }
    console.log("[SearchLog] ✅ WhatsApp flag updated");

    // Step 13: Return success response
    console.log("[SearchLog] ✅ Process completed successfully");
    return res.status(202).json({
      success: true,
      message: "Lead stored & WhatsApp sent",
      detectedCategory: finalCategoryName,
      totalBusinesses: businesses.length,
      notifiedBusinesses,
      whatsappUpdated: businessSendSuccess && customerSendSuccess
    });

  } catch (error) {
    console.error("[SearchLog] ❌ Fatal error in logSearchAction:", error);
    console.error("[SearchLog] Error stack:", error.stack);
    
    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

// Other controller functions remain unchanged
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