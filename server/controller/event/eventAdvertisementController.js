import {
  createEventAdvertisement,
  viewEventAdvertisement,
  viewAllEventAdvertisement,
  updateEventAdvertisement,
  deleteEventAdvertisement,
  hardDeleteEventAdvertisement,
  trackAdvertisementClick,
  trackAdvertisementImpression
} from "../../helper/event/eventAdvertisementHelper.js";
import { BAD_REQUEST } from "../../errorCodes.js";

export const addEventAdvertisementAction = async (req, res) => {
  try {
    const reqBody = req.body;
    reqBody.createdBy = req.user?._id || req.userId;
    const result = await createEventAdvertisement(reqBody);
    res.send({ success: true, message: "Event advertisement created successfully", data: result });
  } catch (error) {
    console.error("addEventAdvertisementAction error:", error);
    return res.status(BAD_REQUEST.code).send({ success: false, message: error.message });
  }
};

export const viewEventAdvertisementAction = async (req, res) => {
  try {
    const advertisementId = req.params.id;
    const advertisement = await viewEventAdvertisement(advertisementId);
    res.send({ success: true, data: advertisement });
  } catch (error) {
    console.error("viewEventAdvertisementAction error:", error);
    return res.status(BAD_REQUEST.code).send({ success: false, message: error.message });
  }
};

export const viewAllEventAdvertisementAction = async (req, res) => {
  try {
    const pageNo = parseInt(req.query.pageNo) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const search = req.query.search || "";
    const status = req.query.status || "all";
    const sortBy = req.query.sortBy || "createdAt";
    const sortOrder = req.query.sortOrder === "asc" ? 1 : -1;

    const { list, total } = await viewAllEventAdvertisement({
      pageNo,
      pageSize,
      search,
      status,
      sortBy,
      sortOrder
    });

    res.send({
      success: true,
      data: list,
      total,
      pageNo,
      pageSize
    });
  } catch (error) {
    console.error("viewAllEventAdvertisementAction error:", error);
    return res.status(BAD_REQUEST.code).send({ success: false, message: error.message });
  }
};

export const updateEventAdvertisementAction = async (req, res) => {
  try {
    const advertisementId = req.params.id;
    const advertisementData = req.body;
    advertisementData.updatedBy = req.user?._id || req.userId;
    const advertisement = await updateEventAdvertisement(advertisementId, advertisementData);
    res.send({ success: true, message: "Event advertisement updated successfully", data: advertisement });
  } catch (error) {
    console.error("updateEventAdvertisementAction error:", error);
    return res.status(BAD_REQUEST.code).send({ success: false, message: error.message });
  }
};

export const deleteEventAdvertisementAction = async (req, res) => {
  try {
    const advertisementId = req.params.id;
    const advertisement = await deleteEventAdvertisement(advertisementId);
    res.send({ success: true, message: "Event advertisement deleted successfully", data: advertisement });
  } catch (error) {
    console.error("deleteEventAdvertisementAction error:", error);
    return res.status(BAD_REQUEST.code).send({ success: false, message: error.message });
  }
};

export const hardDeleteEventAdvertisementAction = async (req, res) => {
  try {
    const advertisementId = req.params.id;
    const advertisement = await hardDeleteEventAdvertisement(advertisementId);
    res.send({ success: true, message: "Event advertisement permanently deleted", data: advertisement });
  } catch (error) {
    console.error("hardDeleteEventAdvertisementAction error:", error);
    return res.status(BAD_REQUEST.code).send({ success: false, message: error.message });
  }
};

export const trackAdvertisementClickAction = async (req, res) => {
  try {
    const advertisementId = req.params.id;
    const advertisement = await trackAdvertisementClick(advertisementId);
    res.send({ success: true, message: "Click tracked", data: advertisement });
  } catch (error) {
    console.error("trackAdvertisementClickAction error:", error);
    return res.status(BAD_REQUEST.code).send({ success: false, message: error.message });
  }
};

export const trackAdvertisementImpressionAction = async (req, res) => {
  try {
    const advertisementId = req.params.id;
    const advertisement = await trackAdvertisementImpression(advertisementId);
    res.send({ success: true, message: "Impression tracked", data: advertisement });
  } catch (error) {
    console.error("trackAdvertisementImpressionAction error:", error);
    return res.status(BAD_REQUEST.code).send({ success: false, message: error.message });
  }
};
