import {
  createSeoTemplate,
  getSeoTemplateByCategory,
  viewAllSeoTemplates,
  updateSeoTemplate,
  deleteSeoTemplate,
} from "../../helper/seo/seoTemplateHelper.js";
import { BAD_REQUEST } from "../../errorCodes.js";
import { invalidateSeoCache } from "../../utils/cacheInvalidation.js";

export const addSeoTemplateAction = async (req, res) => {
  try {
    const result = await createSeoTemplate(req.body);
    await invalidateSeoCache();
    res.send(result);
  } catch (error) {
    return res.status(BAD_REQUEST.code).send({ message: error.message });
  }
};

export const getSeoTemplateAction = async (req, res) => {
  try {
    const { category } = req.query;

    if (!category) {
      return res.status(BAD_REQUEST.code).send({ message: "category is required" });
    }

    const template = await getSeoTemplateByCategory({ category });
    res.send(template);
  } catch (error) {
    return res.status(BAD_REQUEST.code).send({ message: error.message });
  }
};

export const viewAllSeoTemplateAction = async (req, res) => {
  try {
    const pageNo = parseInt(req.query.pageNo) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;

    const search = req.query.search || "";
    const status = req.query.status || "active";
    const sortBy = req.query.sortBy || "updatedAt";
    const sortOrder = req.query.sortOrder === "asc" ? 1 : -1;

    const { list, total } = await viewAllSeoTemplates({
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
    console.error("viewAllSeoTemplateAction error:", error);
    return res.status(BAD_REQUEST.code).send({ message: error.message });
  }
};

export const updateSeoTemplateAction = async (req, res) => {
  try {
    const template = await updateSeoTemplate(req.params.id, req.body);
    await invalidateSeoCache();
    res.send(template);
  } catch (error) {
    return res.status(BAD_REQUEST.code).send({ message: error.message });
  }
};

export const deleteSeoTemplateAction = async (req, res) => {
  try {
    const template = await deleteSeoTemplate(req.params.id);
    await invalidateSeoCache();
    res.send({ message: "SEO template deleted", template });
  } catch (error) {
    return res.status(BAD_REQUEST.code).send({ message: error.message });
  }
};
