import whatsappMessageAuditModel from "../../model/msg91Model/whatsappMessageAuditModel.js";
import whatsappRecipientHealthModel from "../../model/msg91Model/whatsappRecipientHealthModel.js";
import { updateWhatsAppDeliveryStatus } from "../../helper/msg91/whatsappReliabilityHelper.js";

const STATUS_VALUES = ["queued", "sent", "delivered", "read", "failed", "hold", "skipped"];
const SUCCESS_STATUSES = ["sent", "delivered", "read"];

const parseDate = (value, fallback) => {
  if (!value) return fallback;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : date;
};

const getDateRange = (query = {}) => {
  const to = parseDate(query.to, new Date());
  const from = parseDate(query.from, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
  to.setHours(23, 59, 59, 999);
  from.setHours(0, 0, 0, 0);
  return { from, to };
};

const buildAuditQuery = (query = {}) => {
  const { from, to } = getDateRange(query);
  const filter = { createdAt: { $gte: from, $lte: to } };

  if (query.template) filter.templateName = query.template;
  if (query.status) filter.status = query.status;
  if (query.sourceType) filter.sourceType = query.sourceType;
  if (query.category) filter.category = { $regex: query.category, $options: "i" };
  if (query.location) filter.location = { $regex: query.location, $options: "i" };
  if (query.recipientMobile) filter.recipientMobile = { $regex: query.recipientMobile.replace(/\D/g, ""), $options: "i" };
  if (query.customerMobile) filter.customerMobile = { $regex: query.customerMobile.replace(/\D/g, ""), $options: "i" };
  if (query.failureReason) filter.failureReason = { $regex: query.failureReason, $options: "i" };

  return filter;
};

const countByStatus = (statusCounts = []) => {
  const counts = STATUS_VALUES.reduce((acc, status) => ({ ...acc, [status]: 0 }), {});
  statusCounts.forEach((item) => {
    counts[item._id || "unknown"] = item.count;
  });
  return counts;
};

export const getMsg91AnalyticsSummaryAction = async (req, res) => {
  try {
    const filter = buildAuditQuery(req.query);

    const [statusAgg, templateAgg, sourceAgg, costAgg, topCategories, topLocations, topRecipients, topFailedRecipients, topSuppressedRecipients] = await Promise.all([
      whatsappMessageAuditModel.aggregate([
        { $match: filter },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
      whatsappMessageAuditModel.aggregate([
        { $match: filter },
        { $group: { _id: "$templateName", total: { $sum: 1 }, failed: { $sum: { $cond: [{ $eq: ["$status", "failed"] }, 1, 0] } }, success: { $sum: { $cond: [{ $in: ["$status", SUCCESS_STATUSES] }, 1, 0] } }, cost: { $sum: "$price" } } },
        { $sort: { total: -1 } },
      ]),
      whatsappMessageAuditModel.aggregate([
        { $match: filter },
        { $group: { _id: "$sourceType", total: { $sum: 1 } } },
        { $sort: { total: -1 } },
      ]),
      whatsappMessageAuditModel.aggregate([
        { $match: filter },
        { $group: { _id: null, totalCost: { $sum: "$price" }, chargedRows: { $sum: { $cond: [{ $gt: ["$price", 0] }, 1, 0] } } } },
      ]),
      whatsappMessageAuditModel.aggregate([
        { $match: { ...filter, category: { $ne: "" } } },
        { $group: { _id: "$category", total: { $sum: 1 } } },
        { $sort: { total: -1 } },
        { $limit: 10 },
      ]),
      whatsappMessageAuditModel.aggregate([
        { $match: { ...filter, location: { $ne: "" } } },
        { $group: { _id: "$location", total: { $sum: 1 } } },
        { $sort: { total: -1 } },
        { $limit: 10 },
      ]),
      whatsappMessageAuditModel.aggregate([
        { $match: { ...filter, recipientMobile: { $ne: "" } } },
        {
          $group: {
            _id: "$recipientMobile",
            totalAttempts: { $sum: 1 },
            failedCount: { $sum: { $cond: [{ $eq: ["$status", "failed"] }, 1, 0] } },
            skippedCount: { $sum: { $cond: [{ $eq: ["$status", "skipped"] }, 1, 0] } },
            deliveredCount: { $sum: { $cond: [{ $eq: ["$status", "delivered"] }, 1, 0] } },
            readCount: { $sum: { $cond: [{ $eq: ["$status", "read"] }, 1, 0] } },
          },
        },
        { $sort: { totalAttempts: -1, _id: 1 } },
        { $limit: 10 },
        {
          $project: {
            _id: 0,
            mobile: "$_id",
            totalAttempts: 1,
            failedCount: 1,
            skippedCount: 1,
            deliveredCount: 1,
            readCount: 1,
          },
        },
      ]),
      whatsappMessageAuditModel.aggregate([
        { $match: { ...filter, status: "failed", recipientMobile: { $ne: "" } } },
        { $sort: { createdAt: 1 } },
        {
          $group: {
            _id: "$recipientMobile",
            failedCount: { $sum: 1 },
            undeliverableCount: {
              $sum: {
                $cond: [{ $eq: ["$failureCode", "131026"] }, 1, 0],
              },
            },
            ecosystemFailureCount: {
              $sum: {
                $cond: [{ $eq: ["$failureCode", "131049"] }, 1, 0],
              },
            },
            lastFailureReason: { $last: "$failureReason" },
          },
        },
        { $sort: { failedCount: -1, _id: 1 } },
        { $limit: 10 },
        {
          $project: {
            _id: 0,
            mobile: "$_id",
            failedCount: 1,
            undeliverableCount: 1,
            ecosystemFailureCount: 1,
            lastFailureReason: 1,
          },
        },
      ]),
      whatsappRecipientHealthModel.aggregate([
        {
          $match: {
            $or: [
              { suppressedUntil: { $gt: new Date() } },
              { whatsappInvalid: true },
            ],
          },
        },
        { $sort: { suppressedUntil: -1, updatedAt: -1 } },
        { $limit: 10 },
        {
          $project: {
            _id: 0,
            mobile: 1,
            suppressedUntil: 1,
            suppressReason: 1,
            whatsappInvalid: 1,
          },
        },
      ]),
    ]);

    const statusCounts = countByStatus(statusAgg);
    const total = Object.values(statusCounts).reduce((sum, count) => sum + count, 0);
    const success = SUCCESS_STATUSES.reduce((sum, status) => sum + (statusCounts[status] || 0), 0);

    return res.json({
      success: true,
      data: {
        total,
        success,
        successRate: total ? Number(((success / total) * 100).toFixed(1)) : 0,
        failureRate: total ? Number((((statusCounts.failed || 0) / total) * 100).toFixed(1)) : 0,
        statusCounts,
        templates: templateAgg,
        sourceTypes: sourceAgg,
        cost: costAgg[0] || { totalCost: 0, chargedRows: 0 },
        topCategories,
        topLocations,
        topRecipients,
        topFailedRecipients,
        topSuppressedRecipients,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getMsg91AnalyticsTimeseriesAction = async (req, res) => {
  try {
    const filter = buildAuditQuery(req.query);
    const rows = await whatsappMessageAuditModel.aggregate([
      { $match: filter },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            status: "$status",
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.date": 1 } },
    ]);

    const byDate = {};
    rows.forEach(({ _id, count }) => {
      byDate[_id.date] ||= { date: _id.date, total: 0, success: 0, failed: 0, skipped: 0, hold: 0 };
      byDate[_id.date].total += count;
      byDate[_id.date][_id.status] = count;
      if (SUCCESS_STATUSES.includes(_id.status)) byDate[_id.date].success += count;
      if (_id.status === "failed") byDate[_id.date].failed += count;
      if (_id.status === "skipped") byDate[_id.date].skipped += count;
      if (_id.status === "hold") byDate[_id.date].hold += count;
    });

    return res.json({ success: true, data: Object.values(byDate) });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getMsg91AnalyticsFailuresAction = async (req, res) => {
  try {
    const filter = { ...buildAuditQuery(req.query), status: "failed" };
    const data = await whatsappMessageAuditModel.aggregate([
      { $match: filter },
      {
        $group: {
          _id: {
            code: "$failureCode",
            reason: "$failureReason",
            template: "$templateName",
          },
          total: { $sum: 1 },
        },
      },
      { $sort: { total: -1 } },
      { $limit: 50 },
    ]);

    return res.json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getMsg91AnalyticsAuditAction = async (req, res) => {
  try {
    const filter = buildAuditQuery(req.query);
    const pageNo = Math.max(Number(req.query.pageNo) || 1, 1);
    const pageSize = Math.min(Math.max(Number(req.query.pageSize) || 25, 1), 100);

    const [list, total] = await Promise.all([
      whatsappMessageAuditModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((pageNo - 1) * pageSize)
        .limit(pageSize)
        .lean(),
      whatsappMessageAuditModel.countDocuments(filter),
    ]);

    return res.json({ success: true, data: list, total, pageNo, pageSize });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getMsg91AnalyticsRecipientsAction = async (req, res) => {
  try {
    const pageNo = Math.max(Number(req.query.pageNo) || 1, 1);
    const pageSize = Math.min(Math.max(Number(req.query.pageSize) || 25, 1), 100);
    const filter = {};

    if (req.query.mobile) filter.mobile = { $regex: req.query.mobile.replace(/\D/g, ""), $options: "i" };
    if (req.query.suppressed === "true") filter.suppressedUntil = { $gt: new Date() };
    if (req.query.invalid === "true") filter.whatsappInvalid = true;

    const [list, total] = await Promise.all([
      whatsappRecipientHealthModel
        .find(filter)
        .sort({ failedCount: -1, updatedAt: -1 })
        .skip((pageNo - 1) * pageSize)
        .limit(pageSize)
        .lean(),
      whatsappRecipientHealthModel.countDocuments(filter),
    ]);

    return res.json({ success: true, data: list, total, pageNo, pageSize });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const reviewMsg91RecipientAction = async (req, res) => {
  try {
    const mobile = req.params.mobile;
    const doc = await whatsappRecipientHealthModel.findOneAndUpdate(
      { mobile },
      { $set: { reviewed: true, reviewedAt: new Date(), reviewedBy: req.authUser?.emailId || req.authUser?.email || "admin" } },
      { new: true }
    ).lean();

    if (!doc) return res.status(404).json({ success: false, message: "Recipient not found" });
    return res.json({ success: true, data: doc });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const unsuppressMsg91RecipientAction = async (req, res) => {
  try {
    const mobile = req.params.mobile;
    const doc = await whatsappRecipientHealthModel.findOneAndUpdate(
      { mobile },
      {
        $set: {
          suppressedUntil: null,
          suppressReason: "",
          whatsappInvalid: false,
          reviewed: true,
          reviewedAt: new Date(),
          reviewedBy: req.authUser?.emailId || req.authUser?.email || "admin",
        },
      },
      { new: true }
    ).lean();

    if (!doc) return res.status(404).json({ success: false, message: "Recipient not found" });
    return res.json({ success: true, data: doc });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const msg91StatusWebhookAction = async (req, res) => {
  try {
    const updated = await updateWhatsAppDeliveryStatus(req.body || {});
    return res.json({ success: true, updated: !!updated });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
