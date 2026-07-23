import express from "express";
import { requireAdminAuth } from "../auth/authMiddleware.js";
import {
  createMassclickEventAction,
  deleteMassclickEventAction,
  listMassclickEventsAction,
  listPublicMassclickEventsAction,
  updateMassclickEventAction,
  uploadMassclickEventMediaAction,
  viewMassclickEventAction,
} from "../controller/massclickEvent/massclickEventController.js";

const router = express.Router();
router.get("/api/massclick-events", listPublicMassclickEventsAction);
router.get("/api/massclick-events/view/:id", viewMassclickEventAction);
router.get("/api/massclick-events/admin", requireAdminAuth(), listMassclickEventsAction);
router.post("/api/massclick-events/media", requireAdminAuth(), uploadMassclickEventMediaAction);
router.post("/api/massclick-events", requireAdminAuth(), createMassclickEventAction);
router.put("/api/massclick-events/:id", requireAdminAuth(), updateMassclickEventAction);
router.delete("/api/massclick-events/:id", requireAdminAuth(), deleteMassclickEventAction);
export default router;
