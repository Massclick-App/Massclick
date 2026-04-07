import {
  createAdvertisement,
  viewAdvertisement,
  viewAllAdvertisement,
  updateAdvertisement,
  deleteAdvertisement,
  getActiveCategoryAdvertisements,
  findAdvertisementByCategory
} from "../../helper/advertistment/advertismentHelper.js";

import { BAD_REQUEST } from "../../errorCodes.js";


export const addAdvertisementAction = async (req, res) => {
  try {
    const result = await createAdvertisement(req.body);
    res.send(result);
  } catch (error) {
    console.error(error);
    return res
      .status(BAD_REQUEST.code)
      .send({ message: error.message });
  }
};


export const viewAdvertisementAction = async (req, res) => {
  try {
    const adId = req.params.id;
    const ad = await viewAdvertisement(adId);
    res.send(ad);
  } catch (error) {
    console.error(error);
    return res
      .status(BAD_REQUEST.code)
      .send({ message: error.message });
  }
};

export const viewAllAdvertisementAction = async (req, res) => {
  try {
    const pageNo = parseInt(req.query.pageNo) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;

    const search = req.query.search || "";
    const status = req.query.status || "all";
    const category = req.query.category || "";
    const sortBy = req.query.sortBy || "createdAt";
    const sortOrder = req.query.sortOrder === "desc" ? -1 : 1;

    const { list, total } = await viewAllAdvertisement({
      pageNo,
      pageSize,
      search,
      status,
      category,
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
    console.error("viewAllAdvertisementAction error:", error);
    return res
      .status(BAD_REQUEST.code)
      .send({ message: error.message });
  }
};

export const viewAdvertisementByCategory = async (req, res) => {
  try {
    const { category } = req.query;

    if (!category) {
      return res.status(400).send({ message: "Category is required" });
    }

    const advertisements = await findAdvertisementByCategory(category);

    res.status(200).send(advertisements);
  } catch (error) {
    console.error("Error in viewAdvertisementByCategory:", error);
    res.status(BAD_REQUEST.code).send({ message: error.message });
  }
};


export const updateAdvertisementAction = async (req, res) => {
  try {
    const adId = req.params.id;
    const result = await updateAdvertisement(adId, req.body);
    res.send(result);
  } catch (error) {
    console.error(error);
    return res
      .status(BAD_REQUEST.code)
      .send({ message: error.message });
  }
};


export const deleteAdvertisementAction = async (req, res) => {
  try {
    const adId = req.params.id;
    const result = await deleteAdvertisement(adId);
    res.send({ message: "Advertisement deleted successfully", result });
  } catch (error) {
    console.error(error);
    return res
      .status(BAD_REQUEST.code)
      .send({ message: error.message });
  }
};


export const getActiveCategoryAdvertisementsAction = async (req, res) => {
  try {
    const { category, position } = req.query;
    const ads = await getActiveCategoryAdvertisements(category, position);
    res.send(ads);
  } catch (error) {
    console.error(error);
    return res
      .status(BAD_REQUEST.code)
      .send({ message: error.message });
  }
};
