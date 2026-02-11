import { createBusinessList, viewBusinessList, findBusinessBySlug, getDashboardChartsHelper,getPendingBusinessList, findBusinessesByCategory,getDashboardSummaryHelper,findBusinessByMobile, viewAllBusinessList, viewAllClientBusinessList, updateBusinessList, getTrendingSearches, deleteBusinessList, activeBusinessList } from "../../helper/businessList/businessListHelper.js";
import { BAD_REQUEST } from "../../errorCodes.js";
import businessListModel from "../../model/businessList/businessListModel.js";
import { getSignedUrlByKey } from "../../s3Uploder.js";

export const addBusinessListAction = async (req, res) => {
  try {
    const reqBody = req.body;

    if (req.authUser && req.authUser.userId) {
      reqBody.createdBy = req.authUser.userId;
    } else {
      return res.status(401).send({ message: "Unauthorized: Missing userId" });
    }

    const result = await createBusinessList(reqBody);
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
    if (search.length < 2) return res.send([]);

    const startsWithRegex = new RegExp(`^${search}`, "i");
    const containsRegex = new RegExp(search, "i");

    const suggestions = await businessListModel.aggregate([
      {
        $match: {
          businessesLive: true,
          $or: [
            { category: containsRegex },
            { businessName: containsRegex },
            { location: containsRegex },
            { locationDetails: containsRegex }
          ]
        }
      },
      {
        $addFields: {
          priority: {
            $switch: {
              branches: [
                {
                  case: {
                    $or: [
                      { $regexMatch: { input: "$category", regex: startsWithRegex } },
                      { $regexMatch: { input: "$businessName", regex: startsWithRegex } }
                    ]
                  },
                  then: 1  
                },
                {
                  case: {
                    $or: [
                      { $regexMatch: { input: "$category", regex: containsRegex } },
                      { $regexMatch: { input: "$businessName", regex: containsRegex } }
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
      { $sort: { priority: 1 } },
      { $limit: 15 },
      {
        $project: {
          businessName: 1,
          category: 1,
          location: 1,
          locationDetails: 1,
          priority: 1
        }
      }
    ]);

    res.send(suggestions);
  } catch (err) {
    console.error(err);
    res.status(400).send({ message: err.message });
  }
};


export const mainSearchController = async (req, res) => {
  try {
    const { term = "", location = "", category = "" } = req.query;

    const query = {
      businessesLive: true,
      $and: []
    };

  
    if (location.trim()) {
      const loc = new RegExp(location.trim(), "i");

      query.$and.push({
        $or: [
          { location: loc },
          { street: loc },
          { plotNumber: loc },
          { pincode: loc },
          { locationDetails: loc }
        ]
      });
    }

  
    if (category.trim()) {
      const cat = new RegExp(category.trim(), "i");
      query.$and.push({
        $or: [
          { category: cat },
          { keywords: cat },
          { slug: cat },
          { seoTitle: cat },
          { seoDescription: cat },
          { title: cat },
          { description: cat },
          { businessName: cat }
        ]
      });
    }

    if (term.trim()) {
      const t = new RegExp(term.trim(), "i");
      query.$and.push({
        $or: [
          { businessName: t },
          { category: t },
          { description: t },
          { seoDescription: t },
          { seoTitle: t },
          { title: t },
          { slug: t },
          { keywords: t }
        ]
      });
    }

    if (query.$and.length === 0) delete query.$and;

  
    const results = await businessListModel.find(query).lean();

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
    res.status(BAD_REQUEST.code).send({ message: err.message });
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
        const location = req.query.location; 

        const trendingList = await getTrendingSearches(4, location); 

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
