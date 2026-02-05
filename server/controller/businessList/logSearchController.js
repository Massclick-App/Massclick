import { createSearchLog, getAllSearchLogs, getMatchedSearchLogs, updateSearchData, getTopTrendingCategories } from "../../helper/businessList/logSearchHelper.js";
import CategoryModel from "../../model/category/categoryModel.js";
import { getSignedUrlByKey } from "../../s3Uploder.js";
import businessListModel from "../../model/businessList/businessListModel.js";
import { sendWhatsAppMessage } from "../../helper/msg91/smsGatewayHelper.js";
import leadsRotationModel from "../../model/leadsData/leadsRotationalModel.js";

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

export const logSearchAction = async (req, res) => {
  try {
    const { categoryName, location, searchedUserText, userDetails } = req.body;

    if (!categoryName || !categoryName.trim()) {
      return res.status(400).json({
        success: false,
        message: "Category selection is mandatory"
      });
    }

    const finalCategoryName = categoryName.trim();

    const normalizedLocation = location?.toLowerCase().trim() || "global";

    const categorySlug = finalCategoryName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");

    const category = await CategoryModel.findOne(
      { slug: categorySlug },
      { categoryImageKey: 1 }
    ).lean();

    const filteredUser = [
      {
        userName: userDetails?.userName || "",
        mobileNumber1: userDetails?.mobileNumber1 || "",
        mobileNumber2: userDetails?.mobileNumber2 || "",
        email: userDetails?.email || ""
      }
    ];

    await createSearchLog({
      categoryName: finalCategoryName,        
      categoryImage: category?.categoryImageKey || "",
      location: normalizedLocation,
      searchedUserText,                      
      userDetails: filteredUser
    });

    const businesses = await businessListModel.find(
      {
        category: finalCategoryName,           
        location: { $regex: new RegExp(`^${normalizedLocation}$`, "i") },
        isActive: true,
        businessesLive: true
      },
      { businessName: 1, contactList: 1, whatsappNumber: 1 }
    ).lean();

    if (!businesses.length) {
      return res.status(200).json({
        success: true,
        message: "Search logged, no matching businesses for this category & location"
      });
    }

    const rotation = await leadsRotationModel.findOneAndUpdate(
      { category: finalCategoryName, location: normalizedLocation },
      { $setOnInsert: { lastIndex: -1 } },
      { new: true, upsert: true }
    );

    const nextIndex = (rotation.lastIndex + 1) % businesses.length;
    const selectedBusiness = businesses[nextIndex];

    const leadData = {
      searchText: searchedUserText || finalCategoryName,
      location: normalizedLocation,
      customerName: userDetails?.userName || "Unknown",
      customerMobile: userDetails?.mobileNumber1 || "",
      email: userDetails?.email || ""
    };

    const hasValidUserDetails =
      userDetails &&
      (
        userDetails.userName ||
        userDetails.mobileNumber1 ||
        userDetails.mobileNumber2 ||
        userDetails.email
      );

    const ownerMobile =
      selectedBusiness.contactList || selectedBusiness.whatsappNumber;

    if (ownerMobile && hasValidUserDetails) {
      try {
        await sendWhatsAppMessage(ownerMobile, leadData);
      } catch (err) {
        console.error(
          `WhatsApp failed for ${selectedBusiness.businessName}`,
          err.message
        );
      }
    }

    await leadsRotationModel.updateOne(
      { category: finalCategoryName, location: normalizedLocation },
      { $set: { lastIndex: nextIndex } }
    );

    return res.status(202).json({
      success: true,
      message: "Search logged successfully",
      category: finalCategoryName,
      searchedText: searchedUserText,
      sentTo: hasValidUserDetails ? selectedBusiness.businessName : null
    });

  } catch (error) {
    console.error("Error logging search:", error);
    return res.status(500).json({
      success: false,
      message: "Error logging search"
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


