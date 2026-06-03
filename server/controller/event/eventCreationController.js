import {
  createEventCreation,
  viewEventCreation,
  viewAllEventCreation,
  updateEventCreation,
  deleteEventCreation,
  hardDeleteEventCreation,
  publishEventCreation,
  unpublishEventCreation
} from "../../helper/event/eventCreationHelper.js";
import { BAD_REQUEST } from "../../errorCodes.js";

export const addEventCreationAction = async (req, res) => {
  try {
    const reqBody = req.body;
    reqBody.createdBy = req.user?._id || req.userId;
    const result = await createEventCreation(reqBody);
    res.send({ success: true, message: "Event created successfully", data: result });
  } catch (error) {
    console.error("addEventCreationAction error:", error);
    return res.status(BAD_REQUEST.code).send({ success: false, message: error.message });
  }
};

export const viewEventCreationAction = async (req, res) => {
  try {
    const eventId = req.params.id;
    const event = await viewEventCreation(eventId);
    res.send({ success: true, data: event });
  } catch (error) {
    console.error("viewEventCreationAction error:", error);
    return res.status(BAD_REQUEST.code).send({ success: false, message: error.message });
  }
};

export const viewAllEventCreationAction = async (req, res) => {
  try {
    const pageNo = parseInt(req.query.pageNo) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const search = req.query.search || "";
    const status = req.query.status || "all";
    const sortBy = req.query.sortBy || "createdAt";
    const sortOrder = req.query.sortOrder === "asc" ? 1 : -1;

    const { list, total } = await viewAllEventCreation({
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
    console.error("viewAllEventCreationAction error:", error);
    return res.status(BAD_REQUEST.code).send({ success: false, message: error.message });
  }
};

export const updateEventCreationAction = async (req, res) => {
  try {
    const eventId = req.params.id;
    const eventData = req.body;
    eventData.updatedBy = req.user?._id || req.userId;
    const event = await updateEventCreation(eventId, eventData);
    res.send({ success: true, message: "Event updated successfully", data: event });
  } catch (error) {
    console.error("updateEventCreationAction error:", error);
    return res.status(BAD_REQUEST.code).send({ success: false, message: error.message });
  }
};

export const deleteEventCreationAction = async (req, res) => {
  try {
    const eventId = req.params.id;
    const event = await deleteEventCreation(eventId);
    res.send({ success: true, message: "Event deleted successfully", data: event });
  } catch (error) {
    console.error("deleteEventCreationAction error:", error);
    return res.status(BAD_REQUEST.code).send({ success: false, message: error.message });
  }
};

export const hardDeleteEventCreationAction = async (req, res) => {
  try {
    const eventId = req.params.id;
    const event = await hardDeleteEventCreation(eventId);
    res.send({ success: true, message: "Event permanently deleted", data: event });
  } catch (error) {
    console.error("hardDeleteEventCreationAction error:", error);
    return res.status(BAD_REQUEST.code).send({ success: false, message: error.message });
  }
};

export const publishEventCreationAction = async (req, res) => {
  try {
    const eventId = req.params.id;
    const event = await publishEventCreation(eventId);
    res.send({ success: true, message: "Event published successfully", data: event });
  } catch (error) {
    console.error("publishEventCreationAction error:", error);
    return res.status(BAD_REQUEST.code).send({ success: false, message: error.message });
  }
};

export const unpublishEventCreationAction = async (req, res) => {
  try {
    const eventId = req.params.id;
    const event = await unpublishEventCreation(eventId);
    res.send({ success: true, message: "Event unpublished successfully", data: event });
  } catch (error) {
    console.error("unpublishEventCreationAction error:", error);
    return res.status(BAD_REQUEST.code).send({ success: false, message: error.message });
  }
};
