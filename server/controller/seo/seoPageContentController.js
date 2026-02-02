import {
  createPageContentSeo,
  getSeoPageContent,
  getSeoPageContentMetaService,
  viewAllSeoPageContent,
  updateSeoPageContent,
  deleteSeoPageContent,
} from "../../helper/seo/seoPageContentHelper.js";
import { BAD_REQUEST } from "../../errorCodes.js";

export const addSeoPageContentAction = async (req, res) => {
  try {
    const result = await createPageContentSeo(req.body);
    res.send(result);
  } catch (error) {
    return res.status(BAD_REQUEST.code).send({ message: error.message });
  }
};

export const getSeoPageContentAction = async (req, res) => {
  try {
    const seo = await getSeoPageContent(req.query);
    res.send(seo);
  } catch (error) {
    return res.status(BAD_REQUEST.code).send({ message: error.message });
  }
};

const normalizeSeoText = (v = "") =>
  v
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[-_\s]+/g, " ");


export const getSeoPageContentMetaAction = async (req, res) => {
  try {
    const { pageType, category, location } = req.query;

    if (!pageType) {
      return res.status(400).send({ message: "pageType is required" });
    }

    const seoContent = await getSeoPageContentMetaService({
      pageType: normalizeSeoText(pageType),
      category: category ? normalizeSeoText(category) : undefined,
      location: location ? normalizeSeoText(location) : undefined,
    });

    res.send(seoContent);
  } catch (error) {
    console.error("SEO PAGE CONTENT META ERROR:", error);
    res.status(400).send({ message: error.message });
  }
};



export const viewAllSeoPageContentAction = async (req, res) => {
  try {
    const pageNo = parseInt(req.query.pageNo) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;

    const search = req.query.search || "";
    const status = req.query.status || "active"; 
    const sortBy = req.query.sortBy || "updatedAt";
    const sortOrder = req.query.sortOrder === "asc" ? 1 : -1;

    const { list, total } = await viewAllSeoPageContent({
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
    console.error("viewAllSeoPageContentAction error:", error);
    return res
      .status(BAD_REQUEST.code)
      .send({ message: error.message });
  }
};


export const updateSeoPageContentAction = async (req, res) => {
  try {
    const seo = await updateSeoPageContent(req.params.id, req.body);
    res.send(seo);
  } catch (error) {
    return res.status(400).send({ message: error.message });
  }
};

export const deleteSeoPageContentAction = async (req, res) => {
  try {
    const seo = await deleteSeoPageContent(req.params.id);
    res.send({ message: "SEO deleted", seo });
  } catch (error) {
    return res.status(400).send({ message: error.message });
  }
};
