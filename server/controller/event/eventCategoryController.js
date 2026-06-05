import {
  createEventCategory,
  viewEventCategory,
  viewAllEventCategory,
  updateEventCategory,
  deleteEventCategory,
  hardDeleteEventCategory
} from "../../helper/event/eventCategoryHelper.js";
import { BAD_REQUEST } from "../../errorCodes.js";

export const addEventCategoryAction = async (req, res) => {
  try {
    const reqBody = req.body;
    reqBody.createdBy = req.user?._id || req.userId;
    const result = await createEventCategory(reqBody);
    res.send(result);
  } catch (error) {
    console.error("addEventCategoryAction error:", error);
    return res.status(BAD_REQUEST.code).send({ message: error.message });
  }
};

export const viewEventCategoryAction = async (req, res) => {
  try {
    const categoryId = req.params.id;
    const result = await viewEventCategory(categoryId);
    res.send(result);
  } catch (error) {
    console.error("viewEventCategoryAction error:", error);
    return res.status(BAD_REQUEST.code).send({ message: error.message });
  }
};

export const viewAllEventCategoryAction = async (req, res) => {
  try {
    const pageNo = parseInt(req.query.pageNo) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const search = req.query.search || "";
    const status = req.query.status || "all";
    const sortBy = req.query.sortBy || "createdAt";
    const sortOrder = req.query.sortOrder === "asc" ? 1 : -1;

    const { list, total } = await viewAllEventCategory({
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
    console.error("viewAllEventCategoryAction error:", error);
    return res.status(BAD_REQUEST.code).send({ message: error.message });
  }
};

export const updateEventCategoryAction = async (req, res) => {
  try {
    const categoryId = req.params.id;
    const categoryData = req.body;
    categoryData.updatedBy = req.user?._id || req.userId;
    const result = await updateEventCategory(categoryId, categoryData);
    res.send(result);
  } catch (error) {
    console.error("updateEventCategoryAction error:", error);
    return res.status(BAD_REQUEST.code).send({ message: error.message });
  }
};

export const deleteEventCategoryAction = async (req, res) => {
  try {
    const categoryId = req.params.id;
    const result = await deleteEventCategory(categoryId);
    res.send(result);
  } catch (error) {
    console.error("deleteEventCategoryAction error:", error);
    return res.status(BAD_REQUEST.code).send({ message: error.message });
  }
};

export const hardDeleteEventCategoryAction = async (req, res) => {
  try {
    const categoryId = req.params.id;
    const result = await hardDeleteEventCategory(categoryId);
    res.send(result);
  } catch (error) {
    console.error("hardDeleteEventCategoryAction error:", error);
    return res.status(BAD_REQUEST.code).send({ message: error.message });
  }
};
