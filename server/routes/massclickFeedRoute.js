import express from "express";
import { requireAdminAuth, requireAuthPolicy } from "../auth/authMiddleware.js";
import {
  addMassclickFeedCommentAction,
  createMassclickFeedPostAction,
  deleteMassclickFeedPostAction,
  listMassclickFeedPostsAction,
  recordMassclickFeedShareAction,
  toggleMassclickFeedLikeAction,
  updateMassclickFeedStatusAction,
} from "../controller/massclickFeed/massclickFeedController.js";

const router = express.Router();

router.get("/api/massclick-feed/posts", requireAuthPolicy("massclick-feed.list"), listMassclickFeedPostsAction);
router.post("/api/massclick-feed/posts", requireAuthPolicy("massclick-feed.create"), createMassclickFeedPostAction);
router.post("/api/massclick-feed/posts/:id/like", requireAuthPolicy("massclick-feed.interact"), toggleMassclickFeedLikeAction);
router.post("/api/massclick-feed/posts/:id/comment", requireAuthPolicy("massclick-feed.interact"), addMassclickFeedCommentAction);
router.post("/api/massclick-feed/posts/:id/share", requireAuthPolicy("massclick-feed.interact"), recordMassclickFeedShareAction);
router.patch("/api/massclick-feed/posts/:id/status", requireAdminAuth(), updateMassclickFeedStatusAction);
router.delete("/api/massclick-feed/posts/:id", requireAdminAuth(), deleteMassclickFeedPostAction);

export default router;
