import delayedLeadDispatchModel from "../model/businessList/delayedLeadDispatchModel.js";
import businessListModel from "../model/businessList/businessListModel.js";
import { getSettings } from "../helper/systemSettings/settingsService.js";
import { dispatchLeadToBusinesses } from "../controller/businessList/logSearchController.js";

const POLL_INTERVAL_MS = 60_000;
const STALE_PROCESSING_MS = 10 * 60 * 1000;
const BATCH_LIMIT = 20;

const BUSINESS_PROJECTION = {
  businessName: 1,
  category: 1,
  keywords: 1,
  contactList: 1,
  whatsappNumber: 1,
  location: 1,
  street: 1,
  plotNumber: 1,
  averageRating: 1,
  premiumBusiness: 1,
};

const schedulerLog = (traceId, message, data = {}) => {
  console.log(`[DelayedLeadDispatch:${traceId || "no-trace"}] ${message}`, data);
};

async function processDelayedLeadDispatches() {
  try {
    const now = new Date();
    const staleBefore = new Date(Date.now() - STALE_PROCESSING_MS);
    const dueJobs = await delayedLeadDispatchModel
      .find({
        dueAt: { $lte: now },
        $or: [
          { status: "scheduled" },
          { status: "processing", updatedAt: { $lte: staleBefore } },
        ],
      })
      .sort({ dueAt: 1 })
      .limit(BATCH_LIMIT)
      .lean();

    if (dueJobs.length > 0) {
      console.log(`[DelayedLeadDispatch] due jobs found: ${dueJobs.length}`);
    }

    for (const job of dueJobs) {
      const claimed = await delayedLeadDispatchModel.findOneAndUpdate(
        {
          _id: job._id,
          dueAt: { $lte: now },
          $or: [
            { status: "scheduled" },
            { status: "processing", updatedAt: { $lte: staleBefore } },
          ],
        },
        {
          $set: { status: "processing", lastError: "" },
          $inc: { attempts: 1 },
        },
        { new: true },
      );
      if (!claimed) continue;
      schedulerLog(claimed.traceId, "job:claimed", {
        jobId: claimed._id?.toString?.() || "",
        searchLogId: claimed.searchLogId?.toString?.() || "",
        attempts: claimed.attempts,
        businessIdsCount: claimed.businessIds?.length || 0,
      });

      try {
        const orderedIds = (claimed.businessIds || [])
          .map((id) => id?.toString?.())
          .filter(Boolean);
        const customerListIds = (claimed.customerListBusinessIds?.length
          ? claimed.customerListBusinessIds
          : claimed.businessIds || [])
          .map((id) => id?.toString?.())
          .filter(Boolean);
        const idsToFetch = [...new Set([...orderedIds, ...customerListIds])];
        const fetchedBusinesses = await businessListModel
          .find({ _id: { $in: idsToFetch } }, BUSINESS_PROJECTION)
          .lean();
        const businessById = new Map(
          fetchedBusinesses.map((business) => [business._id.toString(), business]),
        );
        const businesses = orderedIds
          .map((id) => businessById.get(id))
          .filter(Boolean);
        const customerListBusinesses = customerListIds
          .map((id) => businessById.get(id))
          .filter(Boolean);

        schedulerLog(claimed.traceId, "job:businesses-loaded", {
          jobId: claimed._id?.toString?.() || "",
          requested: orderedIds.length,
          found: businesses.length,
          customerListRequested: customerListIds.length,
          customerListFound: customerListBusinesses.length,
        });

        const settings = await getSettings();
        await dispatchLeadToBusinesses({
          businesses,
          userDetails: claimed.userDetails || {},
          leadData: claimed.leadData || {},
          savedLog: { _id: claimed.searchLogId },
          finalCategoryName: claimed.leadData?.searchText || "",
          normalizedLocation: claimed.leadData?.location || "global",
          waSettings: settings,
          sendCustomerBusinessList: true,
          customerListBusinesses,
          phase: "delayed",
          traceId: claimed.traceId || claimed._id?.toString?.() || "",
        });

        await delayedLeadDispatchModel.findByIdAndUpdate(claimed._id, {
          status: "sent",
          processedAt: new Date(),
          lastError: "",
        });

        console.log(
          `[DelayedLeadDispatch] sent job ${claimed._id} to ${businesses.length} business(es)`,
        );
        schedulerLog(claimed.traceId, "job:sent", {
          jobId: claimed._id?.toString?.() || "",
          businessesCount: businesses.length,
        });
      } catch (err) {
        console.error(
          `[DelayedLeadDispatch] failed job ${claimed._id}:`,
          err.message,
        );
        schedulerLog(claimed.traceId, "job:failed", {
          jobId: claimed._id?.toString?.() || "",
          error: err.message,
        });
        await delayedLeadDispatchModel.findByIdAndUpdate(claimed._id, {
          status: "failed",
          lastError: err.message || "Delayed lead dispatch failed",
        });
      }
    }
  } catch (err) {
    console.error("[DelayedLeadDispatch] poll error:", err.message);
  }
}

export function startDelayedLeadDispatchScheduler() {
  processDelayedLeadDispatches();
  setInterval(processDelayedLeadDispatches, POLL_INTERVAL_MS);
  console.log("[DelayedLeadDispatch] Started - polling every 60s");
}
