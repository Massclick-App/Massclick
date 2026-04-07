import {
  createCategory,
  viewCategory,
  viewAllCategory,
  updateCategory,
  deleteCategory,
  businessSearchCategory
} from "../../helper/category/categoryHelper.js";
import { BAD_REQUEST } from "../../errorCodes.js";

/**
 * ADD CATEGORY
 */
export const addCategoryAction = async (req, res) => {
  try {
    const reqBody = req.body;
    const result = await createCategory(reqBody);
    res.send(result);
  } catch (error) {
    console.error(error);
    return res.status(BAD_REQUEST.code).send({ message: error.message });
  }
};

/**
 * VIEW SINGLE CATEGORY
 */
export const viewCategoryAction = async (req, res) => {
  try {
    const categoryId = req.params.id;
    const category = await viewCategory(categoryId);
    res.send(category);
  } catch (error) {
    console.error(error);
    return res.status(BAD_REQUEST.code).send({ message: error.message });
  }
};

/**
 * VIEW ALL CATEGORIES
 */
export const viewAllCategoryAction = async (req, res) => {
  try {
    const pageNo = parseInt(req.query.pageNo) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;

    const search = req.query.search || "";
    const status = req.query.status || "all";
    const sortBy = req.query.sortBy || null;
    const sortOrder = req.query.sortOrder === "desc" ? -1 : 1;

    const { list, total } = await viewAllCategory({
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
    console.error("viewAllCategoryAction error:", error);
    return res.status(BAD_REQUEST.code).send({ message: error.message });
  }
};

/**
 * UPDATE CATEGORY
 */
export const updateCategoryAction = async (req, res) => {
  try {
    const categoryId = req.params.id;
    const categoryData = req.body;
    const category = await updateCategory(categoryId, categoryData);
    res.send(category);
  } catch (error) {
    console.error(error);
    return res.status(BAD_REQUEST.code).send({ message: error.message });
  }
};

export const deleteCategoryAction = async (req, res) => {
  try {
    const categoryId = req.params.id;
    const category = await deleteCategory(categoryId);
    res.send({ message: "Category deleted successfully", category });
  } catch (error) {
    console.error(error);
    return res.status(BAD_REQUEST.code).send({ message: error.message });
  }
};

export const businessSearchCategoryAction = async (req, res) => {
  try {
    const query = req.query.query || "";
    const limit = parseInt(req.query.limit) || 20; 

    if (!query || query.length < 2) {
      return res.send([]);  
    }

    const categories = await businessSearchCategory(query, limit);
    res.send(categories);

  } catch (error) {
    console.error(error);
    return res.status(BAD_REQUEST.code).send({ message: error.message });
  }
};
