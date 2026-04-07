import seoPageContentBlogModel from "../../model/seoModel/seoPageContentBlogModel.js";
import { uploadImageToS3, getSignedUrlByKey } from "../../s3Uploder.js";

/* ================= CREATE ================= */
export const createPageContentBlogSeo = async (reqBody = {}) => {
  try {
    let imageKeys = [];
    let profileKey = "";

    /* ===== MULTIPLE IMAGES ===== */
    if (Array.isArray(reqBody.pageImages)) {
      for (const base64 of reqBody.pageImages) {
        if (typeof base64 === "string" && base64.startsWith("data:image")) {
          const uploadResult = await uploadImageToS3(
            base64,
            `seo/page-content-${Date.now()}`
          );
          imageKeys.push(uploadResult.key);
        }
      }
    }

    /* ===== PROFILE IMAGE ===== */
    if (
      reqBody.profileImage &&
      typeof reqBody.profileImage === "string" &&
      reqBody.profileImage.startsWith("data:image")
    ) {
      const uploadResult = await uploadImageToS3(
        reqBody.profileImage,
        `seo/profile-${Date.now()}`
      );
      profileKey = uploadResult.key;
    }

    reqBody.pageImageKey = imageKeys;
    reqBody.profileImageKey = profileKey;

    delete reqBody.pageImages;
    delete reqBody.profileImage;

    /* ===== BUSINESS DETAILS HANDLING ===== */
    if (reqBody.selectedBusiness) {
      const b = reqBody.selectedBusiness;

      if (Array.isArray(reqBody.popularBusiness)) {
        reqBody.businessDetails = reqBody.popularBusiness.map((b) => ({
          businessName: b.businessName,
          plotNumber: b.plotNumber,
          street: b.street,
          pincode: b.pincode,
          email: b.email,
          contact: b.contact,
          contactList: b.contactList,
          experience: b.experience,
          bannerImage: b.bannerImageKey,
          category: b.category,
          location: b.location,
        }));
      }

      delete reqBody.popularBusiness;

      delete reqBody.selectedBusiness;
    }

    const seoDoc = new seoPageContentBlogModel(reqBody);
    const result = await seoDoc.save();

    /* ===== RETURN SIGNED URL ===== */
    result.pageImages = imageKeys.map((key) => getSignedUrlByKey(key));
    result.profileImage = profileKey
      ? getSignedUrlByKey(profileKey)
      : "";

    return result;
  } catch (error) {
    console.error("SEO create error:", error);
    throw error;
  }
};

/* ================= GET SINGLE ================= */
export const getSeoPageContentBlog = async ({
  pageType,
  category,
  location,
}) => {
  try {
    const query = { pageType, isActive: true };

    if (category) query.category = category;
    if (location) query.location = location;

    const seo = await seoPageContentBlogModel.findOne(query).lean();

    if (!seo) return null;

    /* ===== FIX OLD + NEW DATA ===== */
    if (seo.pageImageKey) {
      if (Array.isArray(seo.pageImageKey)) {
        seo.pageImages = seo.pageImageKey.map((key) =>
          getSignedUrlByKey(key)
        );
      } else {
        seo.pageImages = [getSignedUrlByKey(seo.pageImageKey)];
      }
    } else {
      seo.pageImages = [];
    }

    if (seo.profileImageKey) {
      seo.profileImage = getSignedUrlByKey(seo.profileImageKey);
    }

    return seo;
  } catch (error) {
    console.error("SEOPageContent fetch error:", error);
    throw error;
  }
};

/* ================= NORMALIZE ================= */
export const normalizeSeoText = (v = "") =>
  v.toString().toLowerCase().trim().replace(/[-_\s]+/g, " ");

/* ================= META ================= */
export const getSeoPageContentBlogMetaService = async ({
  pageType,
  category,
  location,
}) => {
  try {
    const safePageType = pageType?.toLowerCase();
    const safeCategory = category?.toLowerCase();
    const safeLocation = location?.toLowerCase();

    const query = {
      pageType: safePageType,
      isActive: true,
    };

    if (safeCategory) {
      query.category = { $regex: safeCategory, $options: "i" };
    }

    if (safeLocation) {
      query.location = { $regex: safeLocation, $options: "i" };
    }

    const seoList = await seoPageContentBlogModel.find(query).lean();

    const updatedList = seoList.map((seo) => {
      if (seo.pageImageKey) {
        seo.pageImages = Array.isArray(seo.pageImageKey)
          ? seo.pageImageKey.map((key) => getSignedUrlByKey(key))
          : [getSignedUrlByKey(seo.pageImageKey)];
      }

      if (seo.profileImageKey) {
        seo.profileImage = getSignedUrlByKey(seo.profileImageKey);
      }

      return seo;
    });

    return updatedList;
  } catch (error) {
    console.error("SEO META ERROR:", error);
    return [];
  }
};

/* ================= VIEW ALL ================= */
export const viewAllSeoPageContentBlog = async ({
  pageNo,
  pageSize,
  search,
  status,
  sortBy,
  sortOrder,
}) => {
  try {
    let query = {};

    if (status === "active") query.isActive = true;
    else if (status === "inactive") query.isActive = false;

    if (search) {
      const safeSearch = normalizeSeoText(search);

      query.$or = [
        { pageType: { $regex: safeSearch, $options: "i" } },
        { category: { $regex: safeSearch, $options: "i" } },
        { location: { $regex: safeSearch, $options: "i" } },
      ];
    }

    const total = await seoPageContentBlogModel.countDocuments(query);

    const list = await seoPageContentBlogModel
      .find(query)
      .sort({ [sortBy]: sortOrder })
      .skip((pageNo - 1) * pageSize)
      .limit(pageSize)
      .lean();

    const updatedList = list.map((item) => {
      /* ===== MULTIPLE IMAGES FIX ===== */
      if (item.pageImageKey) {
        item.pageImages = Array.isArray(item.pageImageKey)
          ? item.pageImageKey.map((key) => getSignedUrlByKey(key))
          : [getSignedUrlByKey(item.pageImageKey)];
      } else {
        item.pageImages = [];
      }

      /* ===== PROFILE IMAGE ===== */
      if (item.profileImageKey) {
        item.profileImage = getSignedUrlByKey(item.profileImageKey);
      }

      return item;
    });

    return { list: updatedList, total };
  } catch (error) {
    console.error("viewAll error:", error);
    throw error;
  }
};

export const updateSeoPageContentBlog = async (id, data) => {
  try {
    let imageKeys = [];

    /* ===== IMAGE UPLOAD ===== */
    if (Array.isArray(data.pageImages)) {
      for (const base64 of data.pageImages) {
        if (typeof base64 === "string" && base64.startsWith("data:image")) {
          const uploadResult = await uploadImageToS3(
            base64,
            `seo/page-content-${Date.now()}`
          );
          imageKeys.push(uploadResult.key);
        }
      }

      // ✅ FIX: only update if new images exist
      if (imageKeys.length > 0) {
        data.pageImageKey = imageKeys;
      } else {
        delete data.pageImageKey; // keep old images
      }
    }

    /* ===== PROFILE IMAGE ===== */
    if (
      data.profileImage &&
      typeof data.profileImage === "string" &&
      data.profileImage.startsWith("data:image")
    ) {
      const uploadResult = await uploadImageToS3(
        data.profileImage,
        `seo/profile-${Date.now()}`
      );

      data.profileImageKey = uploadResult.key;
    }

    delete data.pageImages;
    delete data.profileImage;

    /* ===== BUSINESS DETAILS (MULTI SELECT FIX) ===== */
    if (Array.isArray(data.popularBusiness)) {
      data.businessDetails = data.popularBusiness.map((b) => ({
        businessName: b.businessName,
        plotNumber: b.plotNumber,
        street: b.street,
        pincode: b.pincode,
        email: b.email,
        contact: b.contact,
        contactList: b.contactList,
        experience: b.experience,
        bannerImage: b.bannerImageKey,
        category: b.category,
        location: b.location,
      }));
    }

    // optional cleanup
    delete data.popularBusiness;

    const seo = await seoPageContentBlogModel.findByIdAndUpdate(id, data, {
      new: true,
    });

    if (!seo) throw new Error("SEOPageContentBlog not found");

    /* ===== RETURN IMAGES ===== */
    seo.pageImages = seo.pageImageKey
      ? seo.pageImageKey.map((key) => getSignedUrlByKey(key))
      : [];

    if (seo.profileImageKey) {
      seo.profileImage = getSignedUrlByKey(seo.profileImageKey);
    }

    return seo;
  } catch (error) {
    console.error("SEO update error:", error);
    throw error;
  }
};

export const deleteSeoPageContentBlog = async (id) => {
  const seo = await seoPageContentBlogModel.findByIdAndUpdate(
    id,
    { isActive: false },
    { new: true }
  );

  if (!seo) throw new Error("SEOPageContentBlog not found");

  return seo;
};

export const getSeoBlogBySlugService = async (slug) => {
  try {
    if (!slug) throw new Error("slug is required");

    const formattedSlug = slug
      .toLowerCase()
      .replace(/-/g, " ")
      .trim();

    const blog = await seoPageContentBlogModel.findOne({
      heading: { $regex: formattedSlug, $options: "i" },
      isActive: true,
    }).lean();

    if (!blog) return null;

    if (blog.pageImageKey) {
      blog.pageImages = Array.isArray(blog.pageImageKey)
        ? blog.pageImageKey.map((key) => getSignedUrlByKey(key))
        : [getSignedUrlByKey(blog.pageImageKey)];
    } else {
      blog.pageImages = [];
    }

    if (blog.profileImageKey) {
      blog.profileImage = getSignedUrlByKey(blog.profileImageKey);
    }

    return blog;

  } catch (error) {
    console.error("SEO SLUG SERVICE ERROR:", error);
    throw error;
  }
};