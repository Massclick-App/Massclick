import {
  createSeo,
  getSeo,
  viewAllSeo,
  updateSeo,
  deleteSeo,
  getSeoMeta,
  categorySuggestion
} from "../../helper/seo/seoHelper.js";
import { BAD_REQUEST } from "../../errorCodes.js";

export const addSeoAction = async (req, res) => {
  try {
    const result = await createSeo(req.body);
    res.send(result);
  } catch (error) {
    return res.status(BAD_REQUEST.code).send({ message: error.message });
  }
};

export const getSeoAction = async (req, res) => {
  try {
    const seo = await getSeo(req.query);
    res.send(seo);
  } catch (error) {
    return res.status(BAD_REQUEST.code).send({ message: error.message });
  }
};

const normalizeSeoText = (text = "") =>
  text.toLowerCase().trim().replace(/[-_\s]+/g, " ");

export const getSeoMetaAction = async (req, res) => {
  try {
    let { pageType, category, location } = req.query;

    if (!pageType) {
      return res.status(400).send({ message: "pageType is required" });
    }

    const seoData = await getSeoMeta({
      pageType: normalizeSeoText(pageType),
      category: category ? normalizeSeoText(category) : undefined,
      location: location ? normalizeSeoText(location) : undefined,
    });

    res.send(seoData);
  } catch (error) {
    console.error("SEO META ERROR:", error);
    res.status(400).send({ message: error.message });
  }
};


export const viewAllSeoAction = async (req, res) => {
  try {
    const pageNo = parseInt(req.query.pageNo) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;

    const search = req.query.search || "";
    const status = req.query.status || "all";
    const sortBy = req.query.sortBy || null;
    const sortOrder = req.query.sortOrder === "desc" ? -1 : 1;

    const { list, total } = await viewAllSeo({
      pageNo,
      pageSize,
      search,
      status,
      sortBy,
      sortOrder
    });

    res.send({
      data: list,
      total,
      pageNo,
      pageSize
    });

  } catch (error) {
    console.error("viewAllSeoAction error:", error);
    return res.status(BAD_REQUEST.code).send({ message: error.message });
  }
};


export const updateSeoAction = async (req, res) => {
  try {
    const seo = await updateSeo(req.params.id, req.body);
    res.send(seo);
  } catch (error) {
    return res.status(400).send({ message: error.message });
  }
};

export const deleteSeoAction = async (req, res) => {
  try {
    const seo = await deleteSeo(req.params.id);
    res.send({ message: "SEO deleted", seo });
  } catch (error) {
    return res.status(400).send({ message: error.message });
  }
};

export const categorySuggestionAction = async (req, res) => {
  try {
    const search = (req.query.q || "").trim();
    const limit = parseInt(req.query.limit) || 10;

    if (!search || search.length < 1) {
      return res.send([]);
    }

    const categories = await categorySuggestion(search, limit);
    res.send(categories);

  } catch (error) {
    console.error("categorySuggestionAction error:", error);
    return res
      .status(BAD_REQUEST.code)
      .send({ message: error.message });
  }
};
