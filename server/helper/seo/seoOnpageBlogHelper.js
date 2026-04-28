import seoPageContentBlogModel from "../../model/seoModel/seoPageContentBlogModel.js";
import {
  uploadImageToS3,
  getSignedUrlByKey,
} from "../../s3Uploder.js";

/* =====================================
   NORMALIZE
===================================== */
const normalizeText = (value = "") =>
  value.toString().toLowerCase().trim();

const normalizeLocation = (value = "") => {
  const v = normalizeText(value);

  const map = {
    tiruchirappalli: "trichy",
    tiruchy: "trichy",
    trichi: "trichy",
  };

  return map[v] || v;
};

const normalizeCategory = (value = "") => {
  const v = normalizeText(value);

  const map = {
    hospital: "hospitals",
    hostel: "hostels",
    gym: "gyms",
    salon: "salons",
    school: "schools",
  };

  return map[v] || v;
};

const makeSlug = (text = "") =>
  text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

/* =====================================
   IMAGE MAP
===================================== */
const mapSignedUrls = (doc = {}) => {
  if (!doc) return doc;

  // page images
  doc.pageImages = Array.isArray(doc.pageImageKey)
    ? doc.pageImageKey.map((key) => getSignedUrlByKey(key))
    : [];

  // profile image
  doc.profileImage = doc.profileImageKey
    ? getSignedUrlByKey(doc.profileImageKey)
    : "";

  // business images
  if (Array.isArray(doc.businessDetails)) {
    doc.businessDetails = doc.businessDetails.map((item) => ({
      ...item,
      bannerImage:
        item.bannerImageKey || item.bannerImage
          ? getSignedUrlByKey(
              item.bannerImageKey || item.bannerImage
            )
          : "",
    }));
  }

  return doc;
};

const uploadBase64Images = async (images = []) => {
  const keys = [];

  for (const item of images) {
    if (
      typeof item === "string" &&
      item.startsWith("data:image")
    ) {
      const result = await uploadImageToS3(
        item,
        `seo/page-${Date.now()}`
      );

      keys.push(result.key);
    }
  }

  return keys;
};

const mapBusinessDetails = (list = []) => {
  if (!Array.isArray(list)) return [];

  return list.map((b) => ({
    businessName: b.businessName || "",
    plotNumber: b.plotNumber || "",
    street: b.street || "",
    pincode: b.pincode || "",
    email: b.email || "",
    contact: b.contact || "",
    contactList: b.contactList || "",
    experience: b.experience || "",

    bannerImageKey: b.bannerImageKey || b.bannerImage || "",

    bannerImage:
      b.bannerImageKey || b.bannerImage
        ? getSignedUrlByKey(b.bannerImageKey || b.bannerImage)
        : "",

    category: b.category || "",
    location: b.location || "",
  }));
};

export const createPageContentBlogSeo = async (
  data = {}
) => {
  data.pageType = normalizeText(data.pageType);
  data.category = normalizeCategory(data.category);
  data.location = normalizeLocation(data.location);

  data.slug = data.slug
    ? makeSlug(data.slug)
    : makeSlug(data.heading);

  const exists = await seoPageContentBlogModel.findOne({
    pageType: data.pageType,
    category: data.category,
    location: data.location,
    isActive: true,
  });

  if (exists) {
    throw new Error(
      "Page already exists for category/location"
    );
  }

  data.pageImageKey = await uploadBase64Images(
    data.pageImages || []
  );

  if (
    data.profileImage &&
    data.profileImage.startsWith("data:image")
  ) {
    const result = await uploadImageToS3(
      data.profileImage,
      `seo/profile-${Date.now()}`
    );

    data.profileImageKey = result.key;
  }

  data.businessDetails = mapBusinessDetails(
    data.popularBusiness
  );

  delete data.pageImages;
  delete data.profileImage;
  delete data.popularBusiness;
  delete data.selectedBusiness;

  const created =
    await seoPageContentBlogModel.create(data);

  return mapSignedUrls(created.toObject());
};

/* =====================================
   GET SINGLE
===================================== */
export const getSeoPageContentBlog = async ({
  pageType,
  category,
  location,
}) => {
  const query = { isActive: true };

  if (pageType)
    query.pageType = normalizeText(pageType);

  if (category)
    query.category = normalizeCategory(category);

  if (location)
    query.location = normalizeLocation(location);

  const result =
    await seoPageContentBlogModel.findOne(query).lean();

  return result ? mapSignedUrls(result) : null;
};

/* =====================================
   META LIST
===================================== */
export const getSeoPageContentBlogMetaService =
  async ({ pageType, category, location }) => {
    const query = {
      isActive: true,
      pageType: normalizeText(pageType),
    };

    if (category)
      query.category =
        normalizeCategory(category);

    if (location)
      query.location =
        normalizeLocation(location);

    const result =
      await seoPageContentBlogModel
        .find(query)
        .sort({ updatedAt: -1 })
        .select(
          "metaTitle metaDescription metaKeywords slug heading category location profileImageKey pageImageKey updatedAt"
        )
        .lean();

    return result.map(mapSignedUrls);
  };

export const viewAllSeoPageContentBlog =
  async ({
    pageNo = 1,
    pageSize = 10,
    search = "",
    status = "active",
    sortBy = "updatedAt",
    sortOrder = "desc",
  }) => {
    const query = {};

    if (status === "active")
      query.isActive = true;

    if (status === "inactive")
      query.isActive = false;

    if (search) {
      query.$or = [
        {
          heading: {
            $regex: search,
            $options: "i",
          },
        },
        {
          category: {
            $regex: search,
            $options: "i",
          },
        },
        {
          location: {
            $regex: search,
            $options: "i",
          },
        },
      ];
    }

    const total =
      await seoPageContentBlogModel.countDocuments(
        query
      );

    const result =
      await seoPageContentBlogModel
        .find(query)
        .sort({
          [sortBy]:
            sortOrder === "asc" ? 1 : -1,
        })
        .skip((pageNo - 1) * pageSize)
        .limit(pageSize)
        .lean();

    return {
      data: result.map(mapSignedUrls),
      total,
      pageNo,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  };


export const updateSeoPageContentBlog =
  async (id, data = {}) => {
    if (data.pageType)
      data.pageType = normalizeText(
        data.pageType
      );

    if (data.category)
      data.category = normalizeCategory(
        data.category
      );

    if (data.location)
      data.location = normalizeLocation(
        data.location
      );

    if (data.heading && !data.slug) {
      data.slug = makeSlug(data.heading);
    }

    const duplicate =
      await seoPageContentBlogModel.findOne({
        _id: { $ne: id },
        pageType: data.pageType,
        category: data.category,
        location: data.location,
        isActive: true,
      });

    if (duplicate) {
      throw new Error(
        "Another page already exists"
      );
    }

    if (Array.isArray(data.pageImages)) {
      data.pageImageKey =
        await uploadBase64Images(
          data.pageImages
        );
    }

    if (
      data.profileImage &&
      data.profileImage.startsWith(
        "data:image"
      )
    ) {
      const result = await uploadImageToS3(
        data.profileImage,
        `seo/profile-${Date.now()}`
      );

      data.profileImageKey = result.key;
    }

    data.businessDetails =
      mapBusinessDetails(
        data.popularBusiness
      );

    delete data.pageImages;
    delete data.profileImage;
    delete data.popularBusiness;
    delete data.selectedBusiness;

    const updated =
      await seoPageContentBlogModel.findByIdAndUpdate(
        id,
        data,
        {
          new: true,
          runValidators: true,
        }
      );

    if (!updated) {
      throw new Error("Blog not found");
    }

    return mapSignedUrls(updated.toObject());
  };

/* =====================================
   DELETE
===================================== */
export const deleteSeoPageContentBlog =
  async (id) => {
    const deleted =
      await seoPageContentBlogModel.findByIdAndUpdate(
        id,
        { isActive: false },
        { new: true }
      );

    if (!deleted) {
      throw new Error("Blog not found");
    }

    return deleted;
  };

export const getSeoBlogBySlugService = async (slug) => {
  const cleanSlug = makeSlug(slug);

  let result = await seoPageContentBlogModel
    .findOneAndUpdate(
      {
        slug: cleanSlug,
        isActive: true,
      },
      {
        $inc: { views: 1 },
      },
      { new: true }
    )
    .lean();

  if (!result) {
    const allBlogs = await seoPageContentBlogModel
      .find({ isActive: true })
      .lean();

    const matched = allBlogs.find(
      (item) => makeSlug(item.heading) === cleanSlug
    );

    if (matched) {
      result = await seoPageContentBlogModel
        .findByIdAndUpdate(
          matched._id,
          { $inc: { views: 1 } },
          { new: true }
        )
        .lean();
    }
  }

  return result ? mapSignedUrls(result) : null;
};

/* =====================================
   SSR META LOOKUP (read-only, no view increment)
===================================== */
export const getSeoBlogMetaBySlug = async (slug) => {
  const cleanSlug = makeSlug(slug);
  const fields = "metaTitle metaDescription metaKeywords heading slug category location author createdAt updatedAt";

  let result = await seoPageContentBlogModel
    .findOne({ slug: cleanSlug, isActive: true })
    .select(fields)
    .lean();

  if (!result) {
    const allBlogs = await seoPageContentBlogModel
      .find({ isActive: true })
      .select(fields)
      .lean();

    result = allBlogs.find(b => makeSlug(b.heading) === cleanSlug) || null;
  }

  return result || null;
};
