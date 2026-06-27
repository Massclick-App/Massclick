import authorMasterModel from "../../model/seoModel/authorMasterModel.js";
import { BAD_REQUEST } from "../../errorCodes.js";

const sendError = (res, error, code = 400) => {
  return res.status(code).send({
    success: false,
    message: error?.message || "Something went wrong",
  });
};

/* =====================================
   CREATE AUTHOR
===================================== */
const generateSlug = (displayName) => {
  return displayName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

export const createAuthorAction = async (req, res) => {
  try {
    const { name, displayName, email, website, linkedin, bio, experience, expertCategory } = req.body;

    if (!name || !displayName) {
      throw new Error("Name and display name are required");
    }

    const existingAuthor = await authorMasterModel.findOne({
      name: name.toLowerCase().trim(),
    });

    if (existingAuthor) {
      throw new Error("Author already exists");
    }

    const newAuthor = new authorMasterModel({
      name: name.toLowerCase().trim(),
      displayName: displayName.trim(),
      slug: generateSlug(displayName),
      email: email || "",
      website: website || "",
      linkedin: linkedin || "",
      bio: bio || "",
      experience: experience || "",
      expertCategory: expertCategory || "",
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
    const { isActive = true } = req.query;

    const query = isActive !== "false" ? { isActive: true } : {};

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
    const { displayName, email, website, linkedin, bio, experience, expertCategory, isActive } = req.body;

    const author = await authorMasterModel.findById(id);

    if (!author) {
      throw new Error("Author not found");
    }

    if (displayName) {
      author.displayName = displayName.trim();
      author.slug = generateSlug(displayName);
    }
    if (email !== undefined) author.email = email;
    if (website !== undefined) author.website = website;
    if (linkedin !== undefined) author.linkedin = linkedin;
    if (bio !== undefined) author.bio = bio;
    if (experience !== undefined) author.experience = experience;
    if (expertCategory !== undefined) author.expertCategory = expertCategory;
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

    const authors = await authorMasterModel
      .find({
        $or: [
          { displayName: { $regex: query, $options: "i" } },
          { name: { $regex: query, $options: "i" } },
          { email: { $regex: query, $options: "i" } },
        ],
        isActive: true,
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
