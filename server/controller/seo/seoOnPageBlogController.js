import {
  createPageContentBlogSeo,
  getSeoPageContentBlog,
  getSeoPageContentBlogMetaService,
  viewAllSeoPageContentBlog,
  updateSeoPageContentBlog,
  deleteSeoPageContentBlog,
  getSeoBlogBySlugService
} from "../../helper/seo/seoOnpageBlogHelper.js";
import { BAD_REQUEST } from "../../errorCodes.js";
import businessListModel from "../../model/businessList/businessListModel.js";


export const addSeoPageContentBlogAction = async (req, res) => {
  try {
    const result = await createPageContentBlogSeo(req.body);
    res.send(result);
  } catch (error) {
    return res.status(BAD_REQUEST.code).send({ message: error.message });
  }
};

export const getSeoPageContentBlogAction = async (req, res) => {
  try {
    const seo = await getSeoPageContentBlog(req.query);
    res.send(seo);
  } catch (error) {
    return res.status(BAD_REQUEST.code).send({ message: error.message });
  }
};

const normalizeSeoText = (v = "") =>
  v.toString().toLowerCase().trim().replace(/[-_\s]+/g, " ");

export const getSeoPageContentBlogMetaAction = async (req, res) => {
  try {
    const { pageType, category, location } = req.query;

    if (!pageType) {
      return res.status(400).send({ message: "pageType is required" });
    }

    const seoContent = await getSeoPageContentBlogMetaService({
      pageType,
      category,
      location,
    });

    res.send(seoContent);
  } catch (error) {
    console.error("SEO PAGE CONTENT META ERROR:", error);
    res.status(400).send({ message: error.message });
  }
};

export const viewAllSeoPageContentBlogAction = async (req, res) => {
  try {
    const pageNo = parseInt(req.query.pageNo) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;

    const search = req.query.search || "";
    const status = req.query.status || "active";
    const sortBy = req.query.sortBy || "updatedAt";
    const sortOrder = req.query.sortOrder === "asc" ? 1 : -1;

    const { list, total } = await viewAllSeoPageContentBlog({
      pageNo,
      pageSize,
      search,
      status,
      sortBy,
      sortOrder,
    });

    res.send({
      data: list,
      total,
      pageNo,
      pageSize,
    });
  } catch (error) {
    console.error("viewAllSeoPageContentBlogAction error:", error);
    return res.status(BAD_REQUEST.code).send({ message: error.message });
  }
};

export const updateSeoPageContentBlogAction = async (req, res) => {
  try {
    const seo = await updateSeoPageContentBlog(req.params.id, req.body);
    res.send(seo);
  } catch (error) {
    return res.status(400).send({ message: error.message });
  }
};

export const deleteSeoPageContentBlogAction = async (req, res) => {
  try {
    const seo = await deleteSeoPageContentBlog(req.params.id);
    res.send({ message: "SEO deleted", seo });
  } catch (error) {
    return res.status(400).send({ message: error.message });
  }
};

export const getSeoBlogBySlugAction = async (req, res) => {
  try {
    const { slug } = req.params;

    if (!slug) {
      return res.status(400).send({ message: "slug is required" });
    }

    const blog = await getSeoBlogBySlugService(slug);

    if (!blog) {
      return res.status(404).send({ message: "Blog not found" });
    }

    res.send(blog);

  } catch (error) {
    console.error("BLOG SLUG ERROR:", error);
    res.status(400).send({ message: error.message });
  }
};

export const getBusinessSuggestionAction = async (req, res) => {
  try {
    const search = req.query.search || "";

    const businesses = await businessListModel.find({
      businessName: { $regex: search, $options: "i" },
      isActive: true,
    })
      .select("businessName plotNumber street pincode email contact contactList experience category location bannerImageKey")
      .limit(10)
      .lean();

    res.send(businesses);
  } catch (error) {
    res.status(400).send({ message: error.message });
  }
};