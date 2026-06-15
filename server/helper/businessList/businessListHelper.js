import { ObjectId } from "mongodb";
import businessListModel from "../../model/businessList/businessListModel.js";
import SearchLogModel from "../../model/businessList/searchLogModel.js";
import mongoose from "mongoose";
import { uploadImageToS3, getSignedUrlByKey } from "../../s3Uploder.js";
import locationModel from "../../model/locationModel/locationModel.js";
import userModel from "../../model/userModel.js";
import QRCode from "qrcode";
import categoryModel from "../../model/category/categoryModel.js";
import gmapsLeadsModel from "../../model/gmapsLeads/gmapsLeadsModel.js";
import enquiryModel from "../../model/enquiry/enquiryModel.js";

// Silently mark any gmaps lead with a matching phone as imported
const autoMarkGmapsLeadImported = async (contact) => {
  if (!contact) return;
  try {
    await gmapsLeadsModel.updateMany(
      { phone: contact, imported_to_main: { $ne: true } },
      { $set: { imported_to_main: true } }
    );
  } catch (e) {
    console.warn("gmaps auto-mark failed:", e.message);
  }
};

// Auto-copy keywords from category when business is created
export const copyKeywordsFromCategory = async (categoryName) => {
  try {
    if (!categoryName) return [];

    const category = await categoryModel.findOne({
      category: new RegExp(`^${categoryName}$`, "i")
    }).lean();

    if (!category || !Array.isArray(category.keywords)) {
      return [];
    }

    return category.keywords;
  } catch (err) {
    console.error("Error copying keywords from category:", err.message);
    return [];
  }
};

export const createBusinessList = async (reqBody = {}) => {
  try {
    if (!reqBody.businessName && reqBody.name) {
      reqBody.businessName = reqBody.name;
    }

    if (!reqBody.name && reqBody.businessName) {
      reqBody.name = reqBody.businessName;
    }

    if (reqBody.bannerImage) {
      const uploadResult = await uploadImageToS3(
        reqBody.bannerImage,
        `businessList/banners/banner-${Date.now()}`
      );

      reqBody.bannerImageKey = uploadResult.key;
      delete reqBody.bannerImage;
    }

    if (Array.isArray(reqBody.businessImages) && reqBody.businessImages.length > 0) {
      const businessImageKeys = await Promise.all(
        reqBody.businessImages.map(async (img, i) => {
          const uploadResult = await uploadImageToS3(
            img,
            `businessList/gallery/image-${Date.now()}-${i}`
          );
          return uploadResult.key;
        })
      );

      reqBody.businessImagesKey = businessImageKeys;
      delete reqBody.businessImages;
    }


    if (Array.isArray(reqBody.kycDocuments) && reqBody.kycDocuments.length > 0) {
      const kycDocumentsKey = await Promise.all(
        reqBody.kycDocuments.map(async (doc, i) => {
          const uploadResult = await uploadImageToS3(
            doc,
            `businessList/kyc/document-${Date.now()}-${i}`
          );
          return uploadResult.key;
        })
      );

      reqBody.kycDocumentsKey = kycDocumentsKey;
      delete reqBody.kycDocuments;
    }

    // Auto-copy keywords from category if not provided
    if (!reqBody.keywords || reqBody.keywords.length === 0) {
      const categoryKeywords = await copyKeywordsFromCategory(reqBody.category);
      if (categoryKeywords.length > 0) {
        reqBody.keywords = categoryKeywords;
      }
    }

    const businessListDocument = new businessListModel(reqBody);
    const savedBusiness = await businessListDocument.save();



    const publicReviewUrl = `${process.env.PUBLIC_BASE_URL}/write-review/${savedBusiness._id}/0`;


    const qrBase64 = await QRCode.toDataURL(publicReviewUrl);

    const qrUploadResult = await uploadImageToS3(
      qrBase64,
      `businessList/qr/review-${savedBusiness._id}`
    );


    savedBusiness.qrCode = {
      qrText: publicReviewUrl,
      qrImageKey: qrUploadResult.key,
      createdAt: new Date()
    };

    await savedBusiness.save();

    // Auto-mark any matching GMaps lead as imported
    autoMarkGmapsLeadImported(savedBusiness.contact);

    const result = savedBusiness.toObject();

    result.qrCode.qrImage = getSignedUrlByKey(
      savedBusiness.qrCode.qrImageKey
    );

    return result;

  } catch (error) {
    console.error("Error saving business:", error);
    throw error;
  }
};

export const findBusinessBySlug = async ({ location, slug }) => {
  try {
    const business = await businessListModel.findOne({
      location: new RegExp(`^${location}$`, "i"),
      businessName: new RegExp(slug.replace(/-/g, " "), "i"),
      isActive: true,
      businessesLive: true,
    }).lean();

    if (!business) return null;

    if (business.bannerImageKey) {
      business.bannerImage = getSignedUrlByKey(business.bannerImageKey);
    }

    if (business.businessImagesKey?.length > 0) {
      business.businessImages = business.businessImagesKey.map((key) =>
        getSignedUrlByKey(key)
      );
    }

    if (business.kycDocumentsKey?.length > 0) {
      business.kycDocuments = business.kycDocumentsKey.map((key) =>
        getSignedUrlByKey(key)
      );
    }

    return business;
  } catch (error) {
    console.error("❌ findBusinessBySlug error:", error);
    throw error;
  }
};
export const viewBusinessList = async (id) => {
  if (!ObjectId.isValid(id)) throw new Error("Invalid business ID");

  const business = await businessListModel.findById(id).lean();
  if (!business) throw new Error("Business not found");

  if (business.bannerImageKey) business.bannerImage = getSignedUrlByKey(business.bannerImageKey);
  if (business.businessImagesKey?.length > 0) {
    business.businessImages = business.businessImagesKey.map(key => getSignedUrlByKey(key));
  }
  if (business.kycDocumentsKey?.length > 0)
    business.kycDocuments = business.kycDocumentsKey.map((key) => getSignedUrlByKey(key));


  return business;
};

export const viewAllBusiness = async () => {
  const businesses = await businessListModel
    .find()
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();

  const updatedBusinesses = businesses.map((business) => {
    if (business.bannerImageKey) {
      business.bannerImage = getSignedUrlByKey(business.bannerImageKey);
    }

    if (business.businessImagesKey?.length > 0) {
      business.businessImages = business.businessImagesKey.map((key) =>
        getSignedUrlByKey(key)
      );
    }

    if (business.kycDocumentsKey?.length > 0) {
      business.kycDocuments = business.kycDocumentsKey.map((key) =>
        getSignedUrlByKey(key)
      );
    }

    return business;
  });

  return updatedBusinesses;
};

export const findBusinessesByCategory = async (category, district) => {
  const matchQuery = {
    businessesLive: true,
    $or: [
      { category: { $regex: category, $options: "i" } },
      { keywords: { $regex: category, $options: "i" } }
    ]
  };

  if (
    district &&
    district !== "All Districts" &&
    district !== "Enter location manually..."
  ) {
    matchQuery.$and = [
      {
        $or: [
          { district: { $regex: district, $options: "i" } },
          { location: { $regex: district, $options: "i" } },
          { locationDetails: { $regex: district, $options: "i" } },
          { street: { $regex: district, $options: "i" } },
          { pincode: { $regex: district, $options: "i" } }
        ]
      }
    ];
  }

  const businessList = await businessListModel.aggregate([
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
  ]);

  if (!businessList.length) return [];

  return businessList.map((business) => {
    if (business.bannerImageKey)
      business.bannerImage = getSignedUrlByKey(business.bannerImageKey);

    if (business.businessImagesKey?.length > 0)
      business.businessImages = business.businessImagesKey.map((key) =>
        getSignedUrlByKey(key)
      );

    if (business.kycDocumentsKey?.length > 0)
      business.kycDocuments = business.kycDocumentsKey.map((key) =>
        getSignedUrlByKey(key)
      );

    return business;
  });
};


export const viewAllClientBusinessList = async () => {
  const businessList = await businessListModel.find().lean();
  if (!businessList || businessList.length === 0) throw new Error("No business found");

  return businessList.map(business => {
    if (business.bannerImageKey) business.bannerImage = getSignedUrlByKey(business.bannerImageKey);
    if (business.businessImagesKey?.length > 0) {
      business.businessImages = business.businessImagesKey.map(key => getSignedUrlByKey(key));
    }
    if (business.kycDocumentsKey?.length > 0)
      business.kycDocuments = business.kycDocumentsKey.map((key) => getSignedUrlByKey(key));
    return business;
  });
};

function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const isTrichyAlias = (value = "") => {
  const normalized = String(value).toLowerCase().trim();
  return ["trichy", "tiruchirappalli", "trichy / tiruchirappalli"].includes(normalized);
};

const getLocationQuery = (location = "") => {
  if (isTrichyAlias(location)) {
    return {
      $in: [
        new RegExp(`^${escapeRegex("trichy")}$`, "i"),
        new RegExp(`^${escapeRegex("tiruchirappalli")}$`, "i"),
      ],
    };
  }

  return { $regex: `^${escapeRegex(location)}$`, $options: "i" };
};

export const viewAllBusinessList = async ({
  role,
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
}) => {

  let query = {};


  if (role === "SuperAdmin") {
    query = {};
  }
  else if (role === "SalesManager") {
    const manager = await userModel.findById(userId).lean();
    const salesOfficerIds = manager?.salesBy || [];

    const allowedCreators = [
      new mongoose.Types.ObjectId(userId),
      ...salesOfficerIds.map((id) => new mongoose.Types.ObjectId(id))
    ];

    query = { createdBy: { $in: allowedCreators } };
  }
  else if (role === "SalesOfficer") {
    query = { createdBy: new mongoose.Types.ObjectId(userId) };
  }
  else if (["client", "PublicUser", "user"].includes(role)) {
    query = { isActive: true };
  }
  else {
    query = {};
  }


  if (status === "active") query.activeBusinesses = true;
  if (status === "inactive") query.activeBusinesses = false;
  if (liveStatus === "live") query.businessesLive = true;
  if (liveStatus === "pending") query.businessesLive = false;

  if (category) query.category = { $regex: `^${escapeRegex(category)}$`, $options: "i" };
  if (location) query.location = getLocationQuery(location);
  if (paymentStatus) {
    if (paymentStatus === "NO_STATUS") {
      query.$and = [
        ...(query.$and || []),
        {
          $or: [
            { payment: { $exists: false } },
            { payment: { $size: 0 } },
            { "payment.paymentStatus": { $exists: false } }
          ]
        }
      ];
    } else {
      query["payment.paymentStatus"] = {
        $regex: `^${escapeRegex(paymentStatus)}$`,
        $options: "i"
      };
    }
  }

  if (createdFrom || createdTo) {
    query.createdAt = {};
    if (createdFrom) query.createdAt.$gte = new Date(createdFrom);
    if (createdTo) query.createdAt.$lte = new Date(createdTo);
  }

  const searchableFields = [
    "clientId",
    "businessName",
    "plotNumber",
    "street",
    "pincode",
    "location",
    "category",
    "title",
    "description",
    "seoTitle",
    "seoDescription",
    "slug",
    "email",
    "contact",
    "contactList",
    "whatsappNumber",
    "gstin",
    "businessDetails",
    "globalAddress",
    "keywords"
  ];

  if (search) {
    const searchTokens = String(search)
      .trim()
      .split(/\s+/)
      .map((token) => escapeRegex(token))
      .filter(Boolean);

    if (searchTokens.length > 0) {
      query.$and = [
        ...(query.$and || []),
        ...searchTokens.map((token) => ({
          $or: searchableFields.map((field) => ({
            [field]: { $regex: token, $options: "i" }
          }))
        }))
      ];
    }
  }


  const allowedSortFields = [
    "createdAt",
    "businessName",
    "location",
    "category"
  ];

  const sort = {};

  if (allowedSortFields.includes(sortBy)) {
    sort[sortBy] = sortOrder === "asc" ? 1 : -1;
  } else {
    sort.createdAt = -1;
  }


  const total = await businessListModel.countDocuments(query);

  const businessList = await businessListModel
    .find(query)
    .sort(sort)
    .skip((pageNo - 1) * pageSize)
    .limit(pageSize)
    .lean();

  const businessListWithDetails = await Promise.all(
    businessList.map(async (business) => {

      if (business.bannerImageKey) {
        business.bannerImage = getSignedUrlByKey(business.bannerImageKey);
      }

      if (business.businessImagesKey?.length > 0) {
        business.businessImages = business.businessImagesKey.map((key) =>
          getSignedUrlByKey(key)
        );
      }

      if (business.kycDocumentsKey?.length > 0) {
        business.kycDocuments = business.kycDocumentsKey.map((key) =>
          getSignedUrlByKey(key)
        );
      }
      if (business.qrCode?.qrImageKey) {
        business.qrCode.qrImage = getSignedUrlByKey(
          business.qrCode.qrImageKey
        );
      }
      business.locationDetails = business.location || "";

      return business;
    })
  );

  return {
    list: businessListWithDetails,
    total,
  };
};

const getGroupLetter = (num) => {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

  const baseIndex = num % 26;
  const cycle = Math.floor(num / 26);

  if (cycle === 0) {
    return letters[baseIndex];
  } else {
    return `${letters[baseIndex]}${cycle}`;
  }
};

const normalizeMniLocation = (location = "") => {
  const normalizedLocation = String(location).toLowerCase().trim();

  if (["trichy", "tiruchirappalli"].includes(normalizedLocation)) {
    return "tiruchirappalli";
  }

  return normalizedLocation;
};

const getMniLocationQuery = (location = "") => {
  const normalizedLocation = normalizeMniLocation(location);

  if (normalizedLocation === "tiruchirappalli") {
    return {
      $in: [
        new RegExp(`^${escapeRegex("trichy")}$`, "i"),
        new RegExp(`^${escapeRegex("tiruchirappalli")}$`, "i"),
      ],
    };
  }

  return new RegExp(`^${escapeRegex(normalizedLocation)}$`, "i");
};

export const updateBusinessList = async (id, data) => {
  if (!ObjectId.isValid(id)) throw new Error("Invalid business ID");

  const business = await businessListModel.findById(id);
  if (!business) throw new Error("Business not found");

  if (!data.businessName && data.name) {
    data.businessName = data.name;
  }

  if (!data.name && data.businessName) {
    data.name = data.businessName;
  }

  if (data.reviewData) {
    const { reviewData } = data;

    if (!Array.isArray(business.reviews)) {
      business.reviews = [];
    }

    const uploadedPhotoKeys = [];

    if (Array.isArray(reviewData.ratingPhotos) && reviewData.ratingPhotos.length > 0) {
      const photoUploadPromises = reviewData.ratingPhotos.map(async (img, i) => {
        if (typeof img === "string" && img.startsWith("data:image")) {
          const uploadResult = await uploadImageToS3(
            img,
            `businessList/reviews/${business._id}/photo-${Date.now()}-${i}`
          );
          return uploadResult.key;
        }
        return null;
      });

      const uploaded = await Promise.all(photoUploadPromises);
      uploadedPhotoKeys.push(...uploaded.filter(Boolean));
    }

    const newReview = {
      ...reviewData,
      ratingPhotos: uploadedPhotoKeys,
      createdAt: new Date(),
    };

    business.reviews.push(newReview);

    // Recalculate average rating safely
    const totalRating = business.reviews.reduce(
      (sum, review) => sum + (Number(review.rating) || 0),
      0
    );

    business.averageRating =
      business.reviews.length > 0
        ? parseFloat((totalRating / business.reviews.length).toFixed(1))
        : 0;

    delete data.reviewData;
  }

  /* ===============================
     2️⃣ HANDLE BANNER IMAGE
  =============================== */
  if (typeof data.bannerImage === "string" && data.bannerImage.startsWith("data:image")) {
    const uploadResult = await uploadImageToS3(
      data.bannerImage,
      `businessList/banners/banner-${Date.now()}`
    );
    business.bannerImageKey = uploadResult.key;
  } else if (data.bannerImage === null || data.bannerImage === "") {
    business.bannerImageKey = "";
  }

  delete data.bannerImage;

  /* ===============================
     3️⃣ HANDLE GALLERY IMAGES
  =============================== */
  if (Array.isArray(data.businessImages)) {
    const oldKeys = Array.isArray(business.businessImagesKey)
      ? business.businessImagesKey
      : [];

    const newImages = data.businessImages.filter(
      img => typeof img === "string" && img.startsWith("data:image")
    );

    const newKeys = await Promise.all(
      newImages.map(async (img, i) => {
        const uploadResult = await uploadImageToS3(
          img,
          `businessList/gallery/image-${Date.now()}-${i}`
        );
        return uploadResult.key;
      })
    );

    business.businessImagesKey = [...new Set([...oldKeys, ...newKeys])];
  } else if (data.businessImages === null) {
    business.businessImagesKey = [];
  }

  delete data.businessImages;


  if (Array.isArray(data.kycDocuments)) {
    const oldKycKeys = Array.isArray(business.kycDocumentsKey)
      ? business.kycDocumentsKey
      : [];

    const newKycDocs = data.kycDocuments.filter(
      doc => typeof doc === "string" && doc.startsWith("data:")
    );

    const newKycKeys = await Promise.all(
      newKycDocs.map(async (doc, i) => {
        const uploadResult = await uploadImageToS3(
          doc,
          `businessList/kyc/document-${Date.now()}-${i}`
        );
        return uploadResult.key;
      })
    );

    business.kycDocumentsKey = [...new Set([...oldKycKeys, ...newKycKeys])];
  } else if (data.kycDocuments === null) {
    business.kycDocumentsKey = [];
  }

  delete data.kycDocuments;

  if (Array.isArray(data.payment) && data.payment.length > 0) {

    if (!business.amountPaid) {

      // 1️⃣ ADD PAYMENT
      business.payment = [
        ...(business.payment || []),
        ...data.payment.map((p) => ({
          ...p,
          userId: data.updatedBy || null,
          businessId: business._id,
          transactionId: `MANUAL-${Date.now()}`,
          paid: true,
          paymentStatus: "SUCCESS",
          paymentDate: new Date(),
        })),
      ];

      business.amountPaid = true;
      business.paidDate = new Date();

      const location = normalizeMniLocation(business.location);
      const paidCount = await businessListModel.countDocuments({
        category: business.category,
        amountPaid: true,
        location: getMniLocationQuery(location),
      });

      const groupLetter = getGroupLetter(paidCount);

      business.mniDetails = [
        {
          categoryGroup: groupLetter,
          categoryGroupLocation: location,
          leadsCount: null,
        }
      ];
    }
  }

  delete data.payment;

  /* ===============================
     5️⃣ UPDATE NORMAL FIELDS
  =============================== */
  Object.keys(data).forEach(key => {
    if (!["reviews", "averageRating", "clientId"].includes(key)) {
      business[key] = data[key];
    }
  });

  if (!business.name && business.businessName) {
    business.name = business.businessName;
  }

  if (!business.businessName && business.name) {
    business.businessName = business.name;
  }

  await business.save();

  // Auto-mark any matching GMaps lead as imported
  autoMarkGmapsLeadImported(business.contact);

  /* ===============================
     6️⃣ FORMAT RESPONSE
  =============================== */
  const result = business.toObject();

  if (business.bannerImageKey) {
    result.bannerImage = getSignedUrlByKey(business.bannerImageKey);
  }

  if (Array.isArray(business.businessImagesKey) && business.businessImagesKey.length > 0) {
    result.businessImages = business.businessImagesKey.map(key =>
      getSignedUrlByKey(key)
    );
  }

  if (Array.isArray(business.kycDocumentsKey) && business.kycDocumentsKey.length > 0) {
    result.kycDocuments = business.kycDocumentsKey.map(key =>
      getSignedUrlByKey(key)
    );
  }

  // SAFE reviews formatting
  if (Array.isArray(result.reviews) && result.reviews.length > 0) {
    result.reviews = result.reviews.map(review => ({
      ...review,
      ratingPhotos: Array.isArray(review.ratingPhotos)
        ? review.ratingPhotos.map(key => getSignedUrlByKey(key))
        : [],
    }));
  } else {
    result.reviews = [];
  }

  return result;
};

export const deleteBusinessList = async (id) => {
  if (!ObjectId.isValid(id)) throw new Error("Invalid business ID");

  const deletedBusiness = await businessListModel.findByIdAndUpdate(
    id,
    { isActive: false, updatedAt: new Date() },
    { new: true }
  );

  if (!deletedBusiness) {
    throw new Error("Business not found");
  }

  return deletedBusiness;
};
export const restoreBusinessList = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) throw new Error("Invalid business ID");

  const restoredBusiness = await businessListModel.findByIdAndUpdate(
    id,
    { isActive: true, updatedAt: new Date() },
    { new: true }
  );

  if (!restoredBusiness) throw new Error("Business not found");

  return restoredBusiness;
};

export const activeBusinessList = async (id, newStatus) => {
  if (!mongoose.Types.ObjectId.isValid(id)) throw new Error("Invalid business ID");

  const business = await businessListModel.findByIdAndUpdate(
    id,
    { activeBusinesses: newStatus },
    { new: true }
  );

  if (!business) throw new Error("Business not found");

  return business;
};


export const getTrendingSearches = async (limit = 4) => {
  const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);

  const pipeline = [
    { $match: { createdAt: { $gte: twoDaysAgo } } },
    { $group: { _id: "$categoryName", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: limit },
    { $project: { _id: 0, name: "$_id", path: { $concat: ["/trending/", { $toLower: "$_id" }] } } },
  ];

  return await SearchLogModel.aggregate(pipeline);
};

export const findBusinessByMobile = async (mobile) => {
  try {
    if (!mobile) throw new Error("Mobile number is required");

    const business = await businessListModel.findOne({
      contactList: mobile
    }).lean();

    if (!business) return null;

    if (business.bannerImageKey) {
      business.bannerImage = getSignedUrlByKey(business.bannerImageKey);
    }

    if (business.businessImagesKey?.length > 0) {
      business.businessImages = business.businessImagesKey.map((key) =>
        getSignedUrlByKey(key)
      );
    }

    if (business.kycDocumentsKey?.length > 0) {
      business.kycDocuments = business.kycDocumentsKey.map((key) =>
        getSignedUrlByKey(key)
      );
    }

    return business;
  } catch (err) {
    console.error("Error in findBusinessByMobile:", err);
    throw err;
  }
};

export const getDashboardSummaryHelper = async ({ role, userId }) => {

  let query = {};

  // -------------------------
  // ROLE BASED QUERY
  // -------------------------
  if (role === "SuperAdmin") {
    query = {};
  }
  else if (role === "SalesManager") {
    const manager = await userModel.findById(userId).lean();
    const salesOfficerIds = manager?.salesBy || [];

    const allowedCreators = [
      new mongoose.Types.ObjectId(userId),
      ...salesOfficerIds.map(id => new mongoose.Types.ObjectId(id))
    ];

    query = { createdBy: { $in: allowedCreators } };
  }
  else if (role === "SalesOfficer") {
    query = { createdBy: new mongoose.Types.ObjectId(userId) };
  }
  else if (["client", "PublicUser", "user"].includes(role)) {
    query = { isActive: true };
  }
  else {
    query = {};
  }

  // -------------------------
  // DATE CALCULATION
  // -------------------------
  const today = new Date();
  const startOfToday = new Date(today.setHours(0, 0, 0, 0));

  // -------------------------
  // COUNTS (ROLE AWARE)
  // -------------------------
  const todayCount = await businessListModel.countDocuments({
    ...query,
    createdAt: { $gte: startOfToday }
  });

  const totalCount = await businessListModel.countDocuments(query);

  const activeCount = await businessListModel.countDocuments({
    ...query,
    activeBusinesses: true
  });

  const inactiveCount = totalCount - activeCount;

  // -------------------------
  // HOT CATEGORY (ROLE AWARE)
  // -------------------------
  const hotCategoryAgg = await businessListModel.aggregate([
    {
      $match: {
        ...query,
        activeBusinesses: true
      }
    },
    {
      $group: {
        _id: "$category",
        count: { $sum: 1 }
      }
    },
    { $sort: { count: -1 } },
    { $limit: 1 }
  ]);

  const hotCategory =
    hotCategoryAgg.length > 0 ? hotCategoryAgg[0]._id : "No Category";

  return {
    todayCount,
    totalCount,
    activeCount,
    inactiveCount,
    hotCategory
  };
};


export const getDashboardChartsHelper = async ({ role, userId }) => {

  let query = {};


  if (role === "SuperAdmin") {
    query = {};
  }
  else if (role === "SalesManager") {
    const manager = await userModel.findById(userId).lean();
    const salesOfficerIds = manager?.salesBy || [];

    const allowedCreators = [
      new mongoose.Types.ObjectId(userId),
      ...salesOfficerIds.map(id => new mongoose.Types.ObjectId(id))
    ];

    query = { createdBy: { $in: allowedCreators } };
  }
  else if (role === "SalesOfficer") {
    query = { createdBy: new mongoose.Types.ObjectId(userId) };
  }
  else if (["client", "PublicUser", "user"].includes(role)) {
    query = { isActive: true };
  }
  else {
    query = {};
  }

  const year = new Date().getFullYear();
  const startOfYear = new Date(`${year}-01-01`);
  const endOfYear = new Date(`${year}-12-31`);


  const monthly = await businessListModel.aggregate([
    {
      $match: {
        ...query,
        createdAt: {
          $gte: startOfYear,
          $lte: endOfYear
        }
      }
    },
    {
      $group: {
        _id: { month: { $month: "$createdAt" } },
        count: { $sum: 1 }
      }
    },
    { $sort: { "_id.month": 1 } }
  ]);


  const categories = await businessListModel.aggregate([
    { $match: query },
    {
      $group: {
        _id: "$category",
        count: { $sum: 1 }
      }
    },
    { $sort: { count: -1 } }
  ]);

  return { monthly, categories };
};

const buildDashboardQuery = async ({ role, userId }) => {
  if (role === "SuperAdmin") return {};

  if (role === "SalesManager") {
    const manager = await userModel.findById(userId).lean();
    const salesOfficerIds = manager?.salesBy || [];

    return {
      createdBy: {
        $in: [
          new mongoose.Types.ObjectId(userId),
          ...salesOfficerIds.map((id) => new mongoose.Types.ObjectId(id)),
        ],
      },
    };
  }

  if (role === "SalesOfficer") {
    return { createdBy: new mongoose.Types.ObjectId(userId) };
  }

  if (["client", "PublicUser", "user"].includes(role)) {
    return { isActive: true };
  }

  return {};
};

const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const buildMonthSeries = (rows = [], monthsBack = 12) => {
  const now = new Date();
  const buckets = [];

  for (let index = monthsBack - 1; index >= 0; index -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - index, 1);
    buckets.push({
      key: `${date.getFullYear()}-${date.getMonth() + 1}`,
      month: monthLabels[date.getMonth()],
      year: date.getFullYear(),
      businesses: 0,
    });
  }

  rows.forEach((row) => {
    const key = `${row._id.year}-${row._id.month}`;
    const bucket = buckets.find((item) => item.key === key);
    if (bucket) bucket.businesses = row.count;
  });

  return buckets;
};

const dashboardLocationNameExpression = {
  $switch: {
    branches: [
      {
        case: {
          $in: [
            { $toLower: { $trim: { input: { $ifNull: ["$location", ""] } } } },
            ["trichy", "tiruchirappalli"],
          ],
        },
        then: "Trichy / Tiruchirappalli",
      },
    ],
    default: { $ifNull: ["$location", "Unknown"] },
  },
};

export const getAdminAnalyticsReportHelper = async ({ role, userId }) => {
  const businessQuery = await buildDashboardQuery({ role, userId });
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const startOfSevenDays = new Date(now);
  startOfSevenDays.setDate(startOfSevenDays.getDate() - 7);
  const startOfThirtyDays = new Date(now);
  startOfThirtyDays.setDate(startOfThirtyDays.getDate() - 30);
  const startOfYear = new Date(now.getFullYear(), 0, 1);

  const [
    totalBusinesses,
    activeBusinesses,
    liveBusinesses,
    todayBusinesses,
    thirtyDayBusinesses,
    userCounts,
    categoryCounts,
    locationCounts,
    enquiryCounts,
    searchCounts,
    gmapsStats,
    paymentStats,
    monthlyRows,
    topCategories,
    topLocations,
    recentBusinesses,
  ] = await Promise.all([
    businessListModel.countDocuments(businessQuery),
    businessListModel.countDocuments({ ...businessQuery, activeBusinesses: true }),
    businessListModel.countDocuments({ ...businessQuery, businessesLive: true }),
    businessListModel.countDocuments({ ...businessQuery, createdAt: { $gte: startOfToday } }),
    businessListModel.countDocuments({ ...businessQuery, createdAt: { $gte: startOfThirtyDays } }),
    userModel.aggregate([
      { $group: { _id: "$isActive", count: { $sum: 1 } } },
    ]),
    categoryModel.aggregate([
      { $group: { _id: "$isActive", count: { $sum: 1 } } },
    ]),
    locationModel.aggregate([
      { $group: { _id: "$isActive", count: { $sum: 1 } } },
    ]),
    enquiryModel.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          last30Days: {
            $sum: { $cond: [{ $gte: ["$submittedAt", startOfThirtyDays] }, 1, 0] },
          },
        },
      },
    ]),
    SearchLogModel.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          unread: { $sum: { $cond: [{ $eq: ["$isRead", false] }, 1, 0] } },
          last7Days: {
            $sum: { $cond: [{ $gte: ["$createdAt", startOfSevenDays] }, 1, 0] },
          },
        },
      },
    ]),
    gmapsLeadsModel.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          imported: { $sum: { $cond: [{ $eq: ["$imported_to_main", true] }, 1, 0] } },
          withPhone: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $ne: ["$phone", null] },
                    { $ne: ["$phone", ""] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          detailsFetched: { $sum: { $cond: [{ $eq: ["$details_fetched", true] }, 1, 0] } },
        },
      },
    ]),
    businessListModel.aggregate([
      { $match: businessQuery },
      { $unwind: { path: "$payment", preserveNullAndEmptyArrays: false } },
      {
        $group: {
          _id: "$payment.paymentStatus",
          count: { $sum: 1 },
          amount: {
            $sum: {
              $ifNull: ["$payment.totalAmount", { $ifNull: ["$payment.amount", 0] }],
            },
          },
        },
      },
    ]),
    businessListModel.aggregate([
      {
        $match: {
          ...businessQuery,
          createdAt: { $gte: new Date(now.getFullYear(), now.getMonth() - 11, 1) },
        },
      },
      {
        $group: {
          _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]),
    businessListModel.aggregate([
      { $match: businessQuery },
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 8 },
    ]),
    businessListModel.aggregate([
      { $match: businessQuery },
      { $group: { _id: dashboardLocationNameExpression, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 8 },
    ]),
    businessListModel.find(
      businessQuery,
      { businessName: 1, category: 1, location: 1, createdAt: 1, activeBusinesses: 1, businessesLive: 1 }
    )
      .sort({ createdAt: -1 })
      .limit(6)
      .lean(),
  ]);

  const activeUsers = userCounts.find((row) => row._id === true)?.count || 0;
  const totalUsers = userCounts.reduce((sum, row) => sum + row.count, 0);
  const activeCategories = categoryCounts.find((row) => row._id === true)?.count || 0;
  const totalCategories = categoryCounts.reduce((sum, row) => sum + row.count, 0);
  const activeLocations = locationCounts.find((row) => row._id === true)?.count || 0;
  const totalLocations = locationCounts.reduce((sum, row) => sum + row.count, 0);
  const enquirySummary = enquiryCounts[0] || { total: 0, last30Days: 0 };
  const searchSummary = searchCounts[0] || { total: 0, unread: 0, last7Days: 0 };
  const gmapsSummary = gmapsStats[0] || { total: 0, imported: 0, withPhone: 0, detailsFetched: 0 };
  const successfulPayments = paymentStats
    .filter((row) => ["SUCCESS", "PAID", "paid", "success"].includes(row._id))
    .reduce((sum, row) => sum + row.count, 0);
  const paymentRevenue = paymentStats
    .filter((row) => ["SUCCESS", "PAID", "paid", "success"].includes(row._id))
    .reduce((sum, row) => sum + row.amount, 0);

  return {
    generatedAt: new Date().toISOString(),
    scope: role || "unknown",
    totals: {
      businesses: totalBusinesses,
      activeBusinesses,
      inactiveBusinesses: Math.max(totalBusinesses - activeBusinesses, 0),
      liveBusinesses,
      pendingBusinesses: Math.max(totalBusinesses - liveBusinesses, 0),
      todayBusinesses,
      thirtyDayBusinesses,
      users: totalUsers,
      activeUsers,
      categories: totalCategories,
      activeCategories,
      locations: totalLocations,
      activeLocations,
      enquiries: enquirySummary.total,
      enquiriesLast30Days: enquirySummary.last30Days,
      searches: searchSummary.total,
      unreadSearches: searchSummary.unread,
      searchesLast7Days: searchSummary.last7Days,
      gmapsLeads: gmapsSummary.total,
      gmapsImported: gmapsSummary.imported,
      gmapsWithPhone: gmapsSummary.withPhone,
      gmapsDetailsFetched: gmapsSummary.detailsFetched,
      successfulPayments,
      paymentRevenue,
    },
    monthlyTrend: buildMonthSeries(monthlyRows),
    topCategories: topCategories.map((row) => ({ name: row._id || "Uncategorised", count: row.count })),
    topLocations: topLocations.map((row) => ({ name: row._id || "Unknown", count: row.count })),
    paymentBreakdown: paymentStats.map((row) => ({
      status: row._id || "NO_STATUS",
      count: row.count,
      amount: row.amount,
    })),
    recentBusinesses,
    yearToDate: {
      businesses: await businessListModel.countDocuments({
        ...businessQuery,
        createdAt: { $gte: startOfYear },
      }),
    },
  };
};


export const getPendingBusinessList = async () => {
  return await businessListModel.find(
    { businessesLive: false },
    {
      businessName: 1,
      clientId: 1,
      category: 1,
      location: 1,
      contact: 1,
      createdAt: 1,
      createdBy: 1,
      businessesLive: 1,
    }
  ).lean();
};
