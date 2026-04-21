import {
  createPageContentBlogSeo,
  getSeoPageContentBlog,
  getSeoPageContentBlogMetaService,
  viewAllSeoPageContentBlog,
  updateSeoPageContentBlog,
  deleteSeoPageContentBlog,
  getSeoBlogBySlugService,
} from "../../helper/seo/seoOnpageBlogHelper.js";

import { BAD_REQUEST } from "../../errorCodes.js";
import businessListModel from "../../model/businessList/businessListModel.js";

/* =====================================
   COMMON ERROR
===================================== */
const sendError = (res, error, code = 400) => {
  return res.status(code).send({
    success: false,
    message: error?.message || "Something went wrong",
  });
};

/* =====================================
   CREATE BLOG
===================================== */
export const addSeoPageContentBlogAction = async (req, res) => {
  try {
    const result = await createPageContentBlogSeo(req.body);

    return res.send({
      success: true,
      message: "Blog created successfully",
      data: result,
    });
  } catch (error) {
    return sendError(res, error, BAD_REQUEST.code);
  }
};

/* =====================================
   GET SINGLE BLOG
===================================== */
export const getSeoPageContentBlogAction = async (req, res) => {
  try {
    const result = await getSeoPageContentBlog(req.query);

    return res.send({
      success: true,
      data: result,
    });
  } catch (error) {
    return sendError(res, error, BAD_REQUEST.code);
  }
};

/* =====================================
   GET RELATED BLOGS / META LIST
===================================== */
export const getSeoPageContentBlogMetaAction = async (req, res) => {
  try {
    const { pageType, category, location } = req.query;

    if (!pageType) {
      throw new Error("pageType is required");
    }

    const result = await getSeoPageContentBlogMetaService({
      pageType,
      category,
      location,
    });

    return res.send({
      success: true,
      data: result,
    });
  } catch (error) {
    return sendError(res, error, 400);
  }
};

/* =====================================
   ADMIN TABLE LIST
===================================== */
export const viewAllSeoPageContentBlogAction = async (req, res) => {
  try {
    const result = await viewAllSeoPageContentBlog({
      pageNo: Number(req.query.pageNo) || 1,
      pageSize: Number(req.query.pageSize) || 10,
      search: req.query.search || "",
      status: req.query.status || "active",
      sortBy: req.query.sortBy || "updatedAt",
      sortOrder: req.query.sortOrder === "asc" ? "asc" : "desc",
    });

    return res.send({
      success: true,
      ...result,
    });
  } catch (error) {
    return sendError(res, error, BAD_REQUEST.code);
  }
};

/* =====================================
   UPDATE BLOG
===================================== */
export const updateSeoPageContentBlogAction = async (req, res) => {
  try {
    const result = await updateSeoPageContentBlog(
      req.params.id,
      req.body
    );

    return res.send({
      success: true,
      message: "Blog updated successfully",
      data: result,
    });
  } catch (error) {
    return sendError(res, error, 400);
  }
};

/* =====================================
   DELETE BLOG
===================================== */
export const deleteSeoPageContentBlogAction = async (req, res) => {
  try {
    const result = await deleteSeoPageContentBlog(req.params.id);

    return res.send({
      success: true,
      message: "Blog deleted successfully",
      data: result,
    });
  } catch (error) {
    return sendError(res, error, 400);
  }
};

/* =====================================
   GET BLOG BY SLUG
===================================== */
export const getSeoBlogBySlugAction = async (req, res) => {
  try {
    const { slug } = req.params;

    if (!slug) {
      throw new Error("slug is required");
    }

    const result = await getSeoBlogBySlugService(slug);

    if (!result) {
      return sendError(res, new Error("Blog not found"), 404);
    }

    return res.send({
      success: true,
      data: result,
    });
  } catch (error) {
    return sendError(res, error, 400);
  }
};

/* =====================================
   BUSINESS SUGGESTIONS
===================================== */
export const getBusinessSuggestionAction = async (req, res) => {
  try {
    const search = (req.query.search || "").trim();

    const query = { isActive: true };

    if (search) {
      query.businessName = {
        $regex: search,
        $options: "i",
      };
    }

    const result = await businessListModel
      .find(query)
      .select(
        "businessName plotNumber street pincode email contact contactList experience category location bannerImageKey"
      )
      .limit(10)
      .lean();

    return res.send({
      success: true,
      data: result,
    });
  } catch (error) {
    return sendError(res, error, 400);
  }
};