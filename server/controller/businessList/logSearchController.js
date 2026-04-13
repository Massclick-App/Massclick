import { createSearchLog, getAllSearchLogs, getMatchedSearchLogs, updateSearchData, getTopTrendingCategories } from "../../helper/businessList/logSearchHelper.js";
import CategoryModel from "../../model/category/categoryModel.js";
import { getSignedUrlByKey } from "../../s3Uploder.js";
import businessListModel from "../../model/businessList/businessListModel.js";
import { sendBusinessesToCustomer, sendBusinessLead, sendCustomerBusinessList } from "../../helper/msg91/smsGatewayHelper.js";
// import leadsRotationModel from "../../model/leadsData/leadsRotationalModel.js";
import searchLogModel from "../../model/businessList/searchLogModel.js";

// export const logSearchAction = async (req, res) => {
//   try {
//     const { categoryName, location, searchedUserText, userDetails } = req.body;

//     const categorySlug = categoryName
//       ?.toLowerCase()
//       .replace(/[^a-z0-9]+/g, "-")
//       .replace(/(^-|-$)+/g, "");

//     const category = await CategoryModel.findOne(
//       { slug: categorySlug },
//       { categoryImageKey: 1 }
//     ).lean();

//     const filteredUser = [
//       {
//         userName: userDetails?.userName || "",
//         mobileNumber1: userDetails?.mobileNumber1 || "",
//         mobileNumber2: userDetails?.mobileNumber2 || "",
//         email: userDetails?.email || ""
//       }
//     ];

//     await createSearchLog({
//       categoryName,
//       categoryImage: category?.categoryImageKey || "",
//       location,
//       searchedUserText,
//       userDetails: filteredUser
//     });

//     res.status(202).json({
//       success: true,
//       message: "Search logged successfully"
//     });

//   } catch (error) {
//     console.error("Error logging search:", error);
//     res.status(500).json({
//       success: false,
//       message: "Error logging search"
//     });
//   }
// };

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

export const logSearchAction = async (req, res) => {
  try {
    const { categoryName, location, searchedUserText, userDetails } = req.body;

    console.log("📥 Incoming Search Request", {
      categoryName,
      location,
      searchedUserText,
      userDetails
    });

    // -----------------------------
    // 1. VALIDATION
    // -----------------------------
    if (!searchedUserText?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Search text is mandatory"
      });
    }

    const cleanSearchText = searchedUserText.trim().toLowerCase();
    const normalizedLocation = (location || "global").toLowerCase().trim();

    const isValidUser =
      userDetails?.userName?.trim() &&
      userDetails?.mobileNumber1?.trim();

    if (!isValidUser) {
      console.warn("❌ Invalid user details", userDetails);

      return res.status(200).json({
        success: false,
        message: "Valid name and mobile number required"
      });
    }

    // -----------------------------
    // 2. CATEGORY RESOLUTION
    // -----------------------------
    let finalCategoryName = "Other";

    if (categoryName && categoryName.toLowerCase() !== "all categories") {
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
          categoryName: {
            $regex: searchWords.join("|"),
            $options: "i"
          }
        }).lean();

        if (possibleCategory) {
          finalCategoryName = possibleCategory.categoryName;
        }
      }
    }

    // -----------------------------
    // 3. CATEGORY SLUG (CRITICAL FIX)
    // -----------------------------
    const categorySlug = finalCategoryName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");

    console.log("📌 Category Resolved", {
      finalCategoryName,
      categorySlug
    });

    // -----------------------------
    // 4. CATEGORY LOOKUP
    // -----------------------------
    const category = await CategoryModel.findOne(
      { slug: categorySlug },
      { categoryImageKey: 1 }
    ).lean();

    console.log("🖼 Category Lookup", {
      categorySlug,
      found: !!category
    });

    // -----------------------------
    // 5. DUPLICATE PREVENTION
    // -----------------------------
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    const recentLog = await searchLogModel.findOne({
      categoryName: finalCategoryName,
      location: normalizedLocation,
      "userDetails.mobileNumber1": userDetails.mobileNumber1,
      createdAt: { $gte: fiveMinutesAgo }
    });

    if (recentLog) {
      console.warn("⛔ Duplicate request blocked");

      return res.status(200).json({
        success: true,
        message: "Lead already sent recently"
      });
    }

    // -----------------------------
    // 6. SAVE SEARCH LOG
    // -----------------------------
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

    console.log("💾 Search Log Saved", savedLog._id);

    // -----------------------------
    // 7. LOCATION GROUPING
    // -----------------------------
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

    // -----------------------------
    // 8. BUSINESS LOOKUP (FIXED)
    // -----------------------------
    const businesses = await businessListModel.find({
      categorySlug, // 🔥 FIXED HERE
      location: {
        $in: locationList.map(loc => new RegExp(loc, "i"))
      },
      isActive: true,
      businessesLive: true
    })
    .limit(10)
    .lean();

    console.log("🏪 Business Lookup Result", {
      categorySlug,
      locationList,
      count: businesses.length
    });

    // -----------------------------
    // 9. NO BUSINESSES FOUND (VISIBLE FAIL)
    // -----------------------------
    if (!businesses.length) {
      console.warn("⚠️ No businesses found");

      return res.status(200).json({
        success: false,
        message: "No businesses found for this category/location",
        debug: {
          categorySlug,
          location: normalizedLocation
        }
      });
    }

    // -----------------------------
    // 10. LEAD DATA
    // -----------------------------
    const leadData = {
      searchText: searchedUserText,
      location: normalizedLocation,
      customerName: userDetails.userName,
      customerMobile: userDetails.mobileNumber1,
      email: userDetails.email || ""
    };

    // -----------------------------
    // 11. SEND BUSINESS WHATSAPP
    // -----------------------------
    let successCount = 0;
    const notifiedBusinesses = [];

    for (const business of businesses) {
      const ownerMobile = business.contactList || business.whatsappNumber;
      const cleanMobile = cleanIndianMobile(ownerMobile);

      console.log("📤 Business Candidate", {
        name: business.businessName,
        rawMobile: ownerMobile,
        cleanMobile
      });

      if (!cleanMobile) {
        console.warn("❌ Invalid mobile skipped", business.businessName);
        continue;
      }

      try {
        await sendBusinessLead(cleanMobile, leadData);

        successCount++;

        notifiedBusinesses.push({
          businessName: business.businessName,
          mobile: cleanMobile
        });

      } catch (err) {
        console.error("❌ WhatsApp failed", {
          business: business.businessName,
          error: err.response?.data || err.message
        });
      }
    }

    // -----------------------------
    // 12. CUSTOMER WHATSAPP
    // -----------------------------
    const cleanCustomerMobile = cleanIndianMobile(userDetails.mobileNumber1);

    let customerSendSuccess = false;

    if (cleanCustomerMobile) {
      try {
        await sendBusinessesToCustomer(
          cleanCustomerMobile,
          leadData,
          businesses
        );

        customerSendSuccess = true;
      } catch (err) {
        console.error("❌ Customer WhatsApp failed", err.message);
      }
    }

    // -----------------------------
    // 13. UPDATE LOG
    // -----------------------------
    await searchLogModel.findByIdAndUpdate(savedLog._id, {
      whatsapp: successCount > 0
    });

    // -----------------------------
    // 14. FINAL RESPONSE
    // -----------------------------
    console.log("✅ PROCESS COMPLETED", {
      category: finalCategoryName,
      totalBusinesses: businesses.length,
      notified: notifiedBusinesses.length,
      customerSendSuccess
    });

    return res.status(200).json({
      success: true,
      message: "Search processed",
      data: {
        category: finalCategoryName,
        totalBusinesses: businesses.length,
        notifiedBusinesses,
        businessSendSuccess: successCount > 0,
        customerSendSuccess
      }
    });

  } catch (error) {
    console.error("🔥 CRASH ERROR:", error);

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


