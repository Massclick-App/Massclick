// controller/footer/termsAndConditionsController.js

import {
  createTermsAndConditions,
  viewTermsAndConditions,
  viewAllTermsAndConditions,
  updateTermsAndConditions,
  deleteTermsAndConditions,
} from "../../helper/footer/termsAndConditionsHelper.js";

import { BAD_REQUEST } from "../../errorCodes.js";

export const addTermsAndConditionsAction = async (req, res) => {
  try {
    const reqBody = req.body;
    const result = await createTermsAndConditions(reqBody);
    res.send(result);
  } catch (error) {
    console.error(error);
    return res
      .status(BAD_REQUEST.code)
      .send({ message: error.message });
  }
};

export const viewTermsAndConditionsAction = async (req, res) => {
  try {
    const id = req.params.id;
    const result = await viewTermsAndConditions(id);
    res.send(result);
  } catch (error) {
    console.error(error);
    return res
      .status(BAD_REQUEST.code)
      .send({ message: error.message });
  }
};

export const viewAllTermsAndConditionsAction = async (req, res) => {
  try {
    const pageNo = parseInt(req.query.pageNo) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;

    const search = req.query.search || "";
    const sortBy = req.query.sortBy || null;
    const sortOrder =
      req.query.sortOrder === "desc" ? -1 : 1;

    const { list, total } =
      await viewAllTermsAndConditions({
        pageNo,
        pageSize,
        search,
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
    console.error(error);
    return res
      .status(BAD_REQUEST.code)
      .send({ message: error.message });
  }
};

export const updateTermsAndConditionsAction = async (req, res) => {
  try {
    const id = req.params.id;
    const reqBody = req.body;

    const result = await updateTermsAndConditions(
      id,
      reqBody
    );

    res.send(result);
  } catch (error) {
    console.error(error);
    return res
      .status(BAD_REQUEST.code)
      .send({ message: error.message });
  }
};

export const deleteTermsAndConditionsAction = async (req, res) => {
  try {
    const id = req.params.id;
    const result = await deleteTermsAndConditions(id);

    res.send({
      message:
        "Terms & Conditions deleted successfully",
      data: result,
    });
  } catch (error) {
    console.error(error);
    return res
      .status(BAD_REQUEST.code)
      .send({ message: error.message });
  }
};