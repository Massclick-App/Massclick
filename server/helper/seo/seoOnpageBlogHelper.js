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

  // og image
  doc.ogImage = doc.ogImageKey
    ? getSignedUrlByKey(doc.ogImageKey)
    : "";

  // business images
  if (Array.isArray(doc.businessDetails)) {
    doc.businessDetails = doc.businessDetails.map((item) => ({
      ...item,
      bannerImage: item.bannerImageKey
        ? getSignedUrlByKey(item.bannerImageKey)
        : item.bannerImage || "",
    }));
  }

  // content blocks
  if (Array.isArray(doc.contentBlocks)) {
    doc.contentBlocks = unmapContentBlocks(doc.contentBlocks);
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
      // Upload new base64 images
      const result = await uploadImageToS3(
        item,
        `seo/page-${Date.now()}`
      );

      keys.push(result.key);
    } else if (
      typeof item === "string" &&
      (item.startsWith("seo/") || item.includes("s3"))
    ) {
      // Preserve existing S3 keys or URLs
      // Extract key from URL if it's a full URL
      const key = item.includes("s3")
        ? item.split(".amazonaws.com/")[1]
        : item;
      
      if (key) {
        keys.push(key);
      }
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

    bannerImageKey: b.bannerImageKey || "",
    bannerImage: b.bannerImage || "",
    category: b.category || "",
    location: b.location || "",
  }));
};

const mapContentBlocks = (blocks = []) => {
  if (!Array.isArray(blocks)) return [];

  return blocks.map((block) => {
    const { id, type, ...data } = block;
    return {
      type,
      data: {
        id,
        ...data,
      },
    };
  });
};

const unmapContentBlocks = (blocks = []) => {
  if (!Array.isArray(blocks)) return [];

  return blocks.map((block) => {
    if (!block.type) return block;
    const { type, data = {} } = block;
    return {
      type,
      ...data,
    };
  });
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

  if (
    data.ogImage &&
    data.ogImage.startsWith("data:image")
  ) {
    const result = await uploadImageToS3(
      data.ogImage,
      `seo/og-image-${Date.now()}`
    );

    data.ogImageKey = result.key;
  }

  data.businessDetails = mapBusinessDetails(
    data.popularBusiness
  );

  data.contentBlocks = mapContentBlocks(
    data.contentBlocks
  );

  delete data.pageImages;
  delete data.profileImage;
  delete data.ogImage;
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

    if (Array.isArray(data.pageImages) && data.pageImages.length > 0) {
      data.pageImageKey =
        await uploadBase64Images(
          data.pageImages
        );
    } else if (!data.pageImages) {
      // If pageImages is not provided, don't update pageImageKey
      // This preserves existing images
    } else if (Array.isArray(data.pageImages) && data.pageImages.length === 0) {
      // If pageImages is empty array, clear the keys
      data.pageImageKey = [];
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

    if (
      data.ogImage &&
      data.ogImage.startsWith("data:image")
    ) {
      const result = await uploadImageToS3(
        data.ogImage,
        `seo/og-image-${Date.now()}`
      );

      data.ogImageKey = result.key;
    }

    data.businessDetails =
      mapBusinessDetails(
        data.popularBusiness
      );

    data.contentBlocks = mapContentBlocks(
      data.contentBlocks
    );

    delete data.pageImages;
    delete data.profileImage;
    delete data.ogImage;
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
  const fields = "metaTitle metaDescription metaKeywords heading slug category location author createdAt updatedAt pageContent faq";

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
