import { ObjectId } from "mongodb";
import businessListModel from "../../model/businessList/businessListModel.js";
import SearchLogModel from "../../model/businessList/searchLogModel.js";
import mongoose from "mongoose";
import { uploadImageToS3, getSignedUrlByKey } from "../../s3Uploder.js";
import locationModel from "../../model/locationModel/locationModel.js";
import userModel from "../../model/userModel.js";
import QRCode from "qrcode";

export const createBusinessList = async (reqBody = {}) => {
  try {

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
        totalReviews: { $size: "$reviews" }
      }
    },

    {
      $project: {
        reviews: 0
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

export const viewAllBusinessList = async ({
  role,
  userId,
  pageNo,
  pageSize,
  search,
  status,
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
    throw new Error("Unauthorized role");
  }


  if (status === "active") query.activeBusinesses = true;
  if (status === "inactive") query.activeBusinesses = false;


  const searchableFields = [
    "businessName",
    "location",
    "category",
    "description",
    "email",
    "contact",
    "contactList",
    "whatsappNumber",
    "businessDetails",
    "globalAddress",
    "keywords"
  ];

  if (search) {
    const safeSearch = escapeRegex(search);

    const regexSearch = searchableFields.map((field) => ({
      [field]: { $regex: safeSearch, $options: "i" }
    }));

    query.$or = regexSearch;
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
export const updateBusinessList = async (id, data) => {
  if (!ObjectId.isValid(id)) throw new Error("Invalid business ID");

  const business = await businessListModel.findById(id);
  if (!business) throw new Error("Business not found");

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

      const location = (business.location || "").toLowerCase().trim();

      const paidCount = await businessListModel.countDocuments({
        category: business.category,
        amountPaid: true,
        location: new RegExp(`^${location}$`, "i"),
      });

      const getGroupLetter = (num) => {
        const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        const baseIndex = num % 26;
        const cycle = Math.floor(num / 26);

        if (cycle === 0) return letters[baseIndex];
        return `${letters[baseIndex]}${cycle}`;
      };

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

  await business.save();

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
    throw new Error("Unauthorized role");
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
    throw new Error("Unauthorized role");
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
