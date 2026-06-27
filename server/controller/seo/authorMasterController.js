import authorMasterModel from "../../model/seoModel/authorMasterModel.js";
import { BAD_REQUEST } from "../../errorCodes.js";

const sendError = (res, error, code = 400) => {
  return res.status(code).send({
    success: false,
    message: error?.message || "Something went wrong",
  });
};

const generateSlug = (displayName) => {
  return displayName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

const normalizeAuthorName = (value = "") => {
  return String(value).toLowerCase().trim();
};

const normalizeStringField = (value) => {
  if (value === undefined || value === null) return "";
  return String(value).trim();
};

const normalizeStringArray = (value) => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => String(item || "").trim())
    .filter(Boolean);
};

const escapeRegex = (value = "") => {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

const buildAuthorVisibilityQuery = (query = {}) => {
  const { includeInactive, isActive } = query;

  if (includeInactive === "true" || isActive === "all" || isActive === "false") {
    return {};
  }

  if (includeInactive === "only" || isActive === "inactive") {
    return { isActive: false };
  }

  return { isActive: true };
};

/* =====================================
   CREATE AUTHOR
===================================== */

export const createAuthorAction = async (req, res) => {
  try {
    const {
      name,
      displayName,
      title,
      shortBio,
      bio,
      experience,
      expertCategory,
      expertiseAreas,
      specializations,
      email,
      phone,
      website,
      linkedin,
      twitter,
      profileImage,
      isActive,
    } = req.body;

    const normalizedDisplayName = normalizeStringField(displayName);
    const normalizedName = normalizeAuthorName(name || normalizedDisplayName);

    if (!normalizedDisplayName) {
      throw new Error("Display name is required");
    }

    const existingAuthor = await authorMasterModel.findOne({
      name: normalizedName,
    });

    if (existingAuthor) {
      throw new Error("Author already exists");
    }

    const newAuthor = new authorMasterModel({
      name: normalizedName,
      displayName: normalizedDisplayName,
      slug: generateSlug(normalizedDisplayName),
      title: normalizeStringField(title),
      shortBio: normalizeStringField(shortBio),
      bio: normalizeStringField(bio),
      experience: normalizeStringField(experience),
      expertCategory: normalizeStringField(expertCategory),
      expertiseAreas: normalizeStringArray(expertiseAreas),
      specializations: normalizeStringArray(specializations),
      email: normalizeStringField(email),
      phone: normalizeStringField(phone),
      website: normalizeStringField(website),
      linkedin: normalizeStringField(linkedin),
      twitter: normalizeStringField(twitter),
      profileImage: normalizeStringField(profileImage),
      isActive: isActive !== undefined ? Boolean(isActive) : true,
    });

    await newAuthor.save();

    return res.send({
      success: true,
      message: "Author created successfully",
      data: newAuthor,
    });
  } catch (error) {
    return sendError(res, error, BAD_REQUEST.code);
  }
};

/* =====================================
   GET ALL AUTHORS
===================================== */
export const getAllAuthorsAction = async (req, res) => {
  try {
    const query = buildAuthorVisibilityQuery(req.query);

    const authors = await authorMasterModel.find(query).sort({ displayName: 1 });

    return res.send({
      success: true,
      data: authors,
      total: authors.length,
    });
  } catch (error) {
    return sendError(res, error, BAD_REQUEST.code);
  }
};

/* =====================================
   GET SINGLE AUTHOR
===================================== */
export const getAuthorAction = async (req, res) => {
  try {
    const { id } = req.params;

    const author = await authorMasterModel.findById(id);

    if (!author) {
      throw new Error("Author not found");
    }

    return res.send({
      success: true,
      data: author,
    });
  } catch (error) {
    return sendError(res, error, BAD_REQUEST.code);
  }
};

/* =====================================
   UPDATE AUTHOR
===================================== */
export const updateAuthorAction = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      displayName,
      title,
      shortBio,
      bio,
      experience,
      expertCategory,
      expertiseAreas,
      specializations,
      email,
      phone,
      website,
      linkedin,
      twitter,
      profileImage,
      isActive,
    } = req.body;

    const author = await authorMasterModel.findById(id);

    if (!author) {
      throw new Error("Author not found");
    }

    if (displayName !== undefined) {
      const normalizedDisplayName = normalizeStringField(displayName);

      if (!normalizedDisplayName) {
        throw new Error("Display name is required");
      }

      const normalizedName = normalizeAuthorName(name || normalizedDisplayName);
      const existingAuthor = await authorMasterModel.findOne({
        _id: { $ne: id },
        name: normalizedName,
      });

      if (existingAuthor) {
        throw new Error("Author already exists");
      }

      author.name = normalizedName;
      author.displayName = normalizedDisplayName;
      author.slug = generateSlug(normalizedDisplayName);
    }
    if (title !== undefined) author.title = normalizeStringField(title);
    if (shortBio !== undefined) author.shortBio = normalizeStringField(shortBio);
    if (bio !== undefined) author.bio = normalizeStringField(bio);
    if (experience !== undefined) author.experience = normalizeStringField(experience);
    if (expertCategory !== undefined) author.expertCategory = normalizeStringField(expertCategory);
    if (expertiseAreas !== undefined) author.expertiseAreas = normalizeStringArray(expertiseAreas);
    if (specializations !== undefined) author.specializations = normalizeStringArray(specializations);
    if (email !== undefined) author.email = normalizeStringField(email);
    if (phone !== undefined) author.phone = normalizeStringField(phone);
    if (website !== undefined) author.website = normalizeStringField(website);
    if (linkedin !== undefined) author.linkedin = normalizeStringField(linkedin);
    if (twitter !== undefined) author.twitter = normalizeStringField(twitter);
    if (profileImage !== undefined) author.profileImage = normalizeStringField(profileImage);
    if (isActive !== undefined) author.isActive = isActive;

    await author.save();

    return res.send({
      success: true,
      message: "Author updated successfully",
      data: author,
    });
  } catch (error) {
    return sendError(res, error, BAD_REQUEST.code);
  }
};

/* =====================================
   DELETE AUTHOR
===================================== */
export const deleteAuthorAction = async (req, res) => {
  try {
    const { id } = req.params;

    const author = await authorMasterModel.findByIdAndDelete(id);

    if (!author) {
      throw new Error("Author not found");
    }

    return res.send({
      success: true,
      message: "Author deleted successfully",
    });
  } catch (error) {
    return sendError(res, error, BAD_REQUEST.code);
  }
};

/* =====================================
   SEARCH AUTHORS
===================================== */
export const searchAuthorsAction = async (req, res) => {
  try {
    const { query } = req.query;

    if (!query) {
      throw new Error("Search query is required");
    }

    const escapedQuery = escapeRegex(query.trim());
    const visibilityQuery = buildAuthorVisibilityQuery(req.query);

    const authors = await authorMasterModel
      .find({
        $or: [
          { displayName: { $regex: escapedQuery, $options: "i" } },
          { name: { $regex: escapedQuery, $options: "i" } },
          { email: { $regex: escapedQuery, $options: "i" } },
          { title: { $regex: escapedQuery, $options: "i" } },
          { expertCategory: { $regex: escapedQuery, $options: "i" } },
        ],
        ...visibilityQuery,
      })
      .sort({ displayName: 1 })
      .limit(20);

    return res.send({
      success: true,
      data: authors,
    });
  } catch (error) {
    return sendError(res, error, BAD_REQUEST.code);
  }
};

/* =====================================
   GET AUTHOR BY SLUG (PUBLIC)
===================================== */
export const getAuthorBySlugAction = async (req, res) => {
  try {
    const { slug } = req.params;

    if (!slug) {
      throw new Error("Author slug is required");
    }

    const author = await authorMasterModel
      .findOne({ slug: slug.toLowerCase(), isActive: true })
      .lean();

    if (!author) {
      return res.status(404).send({
        success: false,
        message: "Author not found",
      });
    }

    return res.send({
      success: true,
      data: author,
    });
  } catch (error) {
    return sendError(res, error, BAD_REQUEST.code);
  }
};
