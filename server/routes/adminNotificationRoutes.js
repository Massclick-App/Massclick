import express from "express";
import { requireAdminAuth } from "../auth/authMiddleware.js";
import NotificationState from "../model/adminNotificationState.js";

const router = express.Router();
router.use("/api/admin/notifications", requireAdminAuth());

router.get("/api/admin/notifications/deleted", async (req, res) => {
  try {
    const data = await NotificationState.find({
      adminId: req.authActor.subjectId, isDeleted: true,
    }).select("notificationId isDeleted -_id").lean();
    res.json({ data });
  } catch {
    res.status(500).json({ error: "Unable to load notification preferences" });
  }
});

router.delete("/api/admin/notifications/:id", async (req, res) => {
  const notificationId = req.params.id;
  if (!/^(business|chat|event|enquiry|search-request|reward-claim)-[a-f0-9]{24}$/i.test(notificationId)) {
    return res.status(400).json({ error: "Invalid notification ID" });
  }
  try {
    const data = await NotificationState.findOneAndUpdate(
      { adminId: req.authActor.subjectId, notificationId },
      { $set: { isDeleted: true } },
      { upsert: true, new: true, runValidators: true }
    );
    res.json({ data });
  } catch {
    res.status(500).json({ error: "Unable to delete notification" });
  }
});

export default router;
