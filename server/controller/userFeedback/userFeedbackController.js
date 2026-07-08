import mongoose from "mongoose";
import { BAD_REQUEST, NOT_FOUND } from "../../errorCodes.js";
import userFeedbackModel from "../../model/userFeedback/userFeedbackModel.js";

const getActor = (req) => req.authActor || req.authUser || req.user || {};

const clampPageSize = (value) => Math.min(Math.max(parseInt(value) || 20, 1), 100);

const buildFeedbackPayload = (body = {}, actor = {}, req = {}) => ({
  userId: mongoose.Types.ObjectId.isValid(actor.subjectId || actor.userId)
    ? actor.subjectId || actor.userId
    : null,
  userName: body.name || actor.name || actor.userName || "",
  userEmail: body.email || actor.email || actor.userEmail || "",
  rating: Number(body.rating),
  feedbackType: body.type || body.feedbackType || "",
  improvementArea: body.area || body.improvementArea || "",
  journey: body.journey || "",
  message: body.message || "",
  allowContact: body.allowContact !== false,
  source: body.source || "user_feedback_page",
  pageUrl: body.pageUrl || "",
  userAgent: req.headers?.["user-agent"] || "",
  ipAddress: req.ip || req.socket?.remoteAddress || req.connection?.remoteAddress || "",
});

const validateFeedbackPayload = (payload) => {
  if (!Number.isInteger(payload.rating) || payload.rating < 1 || payload.rating > 5) {
    throw new Error("Rating must be between 1 and 5.");
  }
  if (!payload.feedbackType.trim()) {
    throw new Error("Feedback category is required.");
  }
  if (!payload.message.trim()) {
    throw new Error("Feedback message is required.");
  }
};

export const createUserFeedbackAction = async (req, res) => {
  try {
    const payload = buildFeedbackPayload(req.body, getActor(req), req);
    validateFeedbackPayload(payload);

    const feedback = await userFeedbackModel.create(payload);
    res.status(201).send({ success: true, feedback });
  } catch (error) {
    console.error("createUserFeedbackAction error:", error);
    res.status(BAD_REQUEST.code).send({ success: false, message: error.message });
  }
};

export const listUserFeedbackAction = async (req, res) => {
  try {
    const pageNo = Math.max(parseInt(req.query.pageNo) || 1, 1);
    const pageSize = clampPageSize(req.query.pageSize);
    const search = String(req.query.search || "").trim();
    const status = String(req.query.status || "").trim();
    const query = {};

    if (status) query.status = status;
    if (search) {
      query.$or = [
        { userName: { $regex: search, $options: "i" } },
        { userEmail: { $regex: search, $options: "i" } },
        { feedbackType: { $regex: search, $options: "i" } },
        { improvementArea: { $regex: search, $options: "i" } },
        { journey: { $regex: search, $options: "i" } },
        { message: { $regex: search, $options: "i" } },
      ];
    }

    const [data, total] = await Promise.all([
      userFeedbackModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip((pageNo - 1) * pageSize)
        .limit(pageSize)
        .lean(),
      userFeedbackModel.countDocuments(query),
    ]);

    res.send({ success: true, data, total, pageNo, pageSize });
  } catch (error) {
    console.error("listUserFeedbackAction error:", error);
    res.status(BAD_REQUEST.code).send({ success: false, message: error.message });
  }
};

export const updateUserFeedbackStatusAction = async (req, res) => {
  try {
    const allowedStatuses = ["new", "reviewing", "resolved", "archived"];
    const allowedPriorities = ["normal", "high"];
    const updates = { updatedAt: new Date() };

    if (req.body.status) {
      if (!allowedStatuses.includes(req.body.status)) {
        throw new Error("Invalid feedback status.");
      }
      updates.status = req.body.status;
      updates.reviewedAt = new Date();
      updates.reviewedBy = getActor(req).subjectId || getActor(req).userId || null;
    }

    if (req.body.priority) {
      if (!allowedPriorities.includes(req.body.priority)) {
        throw new Error("Invalid feedback priority.");
      }
      updates.priority = req.body.priority;
    }

    if (typeof req.body.adminNote === "string") {
      updates.adminNote = req.body.adminNote;
    }

    const feedback = await userFeedbackModel.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true }
    );

    if (!feedback) {
      return res.status(NOT_FOUND.code).send({ success: false, message: "Feedback not found." });
    }

    res.send({ success: true, feedback });
  } catch (error) {
    console.error("updateUserFeedbackStatusAction error:", error);
    res.status(BAD_REQUEST.code).send({ success: false, message: error.message });
  }
};
