import {
  createEventLocation,
  viewEventLocation,
  viewAllEventLocation,
  updateEventLocation,
  deleteEventLocation,
  hardDeleteEventLocation
} from "../../helper/event/eventLocationHelper.js";
import { BAD_REQUEST } from "../../errorCodes.js";

export const addEventLocationAction = async (req, res) => {
  try {
    const reqBody = req.body;
    reqBody.createdBy = req.user?._id || req.userId;
    const result = await createEventLocation(reqBody);
    res.send(result);
  } catch (error) {
    console.error("addEventLocationAction error:", error);
    return res.status(BAD_REQUEST.code).send({ message: error.message });
  }
};

export const viewEventLocationAction = async (req, res) => {
  try {
    const locationId = req.params.id;
    const result = await viewEventLocation(locationId);
    res.send(result);
  } catch (error) {
    console.error("viewEventLocationAction error:", error);
    return res.status(BAD_REQUEST.code).send({ message: error.message });
  }
};

export const viewAllEventLocationAction = async (req, res) => {
  try {
    const pageNo = parseInt(req.query.pageNo) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const search = req.query.search || "";
    const status = req.query.status || "all";
    const sortBy = req.query.sortBy || "createdAt";
    const sortOrder = req.query.sortOrder === "asc" ? 1 : -1;

    const { list, total } = await viewAllEventLocation({
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
    console.error("viewAllEventLocationAction error:", error);
    return res.status(BAD_REQUEST.code).send({ message: error.message });
  }
};

export const updateEventLocationAction = async (req, res) => {
  try {
    const locationId = req.params.id;
    const locationData = req.body;
    locationData.updatedBy = req.user?._id || req.userId;
    const result = await updateEventLocation(locationId, locationData);
    res.send(result);
  } catch (error) {
    console.error("updateEventLocationAction error:", error);
    return res.status(BAD_REQUEST.code).send({ message: error.message });
  }
};

export const deleteEventLocationAction = async (req, res) => {
  try {
    const locationId = req.params.id;
    const result = await deleteEventLocation(locationId);
    res.send(result);
  } catch (error) {
    console.error("deleteEventLocationAction error:", error);
    return res.status(BAD_REQUEST.code).send({ message: error.message });
  }
};

export const hardDeleteEventLocationAction = async (req, res) => {
  try {
    const locationId = req.params.id;
    const result = await hardDeleteEventLocation(locationId);
    res.send(result);
  } catch (error) {
    console.error("hardDeleteEventLocationAction error:", error);
    return res.status(BAD_REQUEST.code).send({ message: error.message });
  }
};
