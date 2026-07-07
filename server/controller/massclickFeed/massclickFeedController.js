import { BAD_REQUEST } from "../../errorCodes.js";
import {
  addMassclickFeedComment,
  createMassclickFeedPost,
  deleteMassclickFeedPost,
  listMassclickFeedPosts,
  recordMassclickFeedShare,
  toggleMassclickFeedLike,
  updateMassclickFeedStatus,
} from "../../helper/massclickFeed/massclickFeedHelper.js";

const getActor = (req) => req.authActor || req.authUser || req.user || {};

export const createMassclickFeedPostAction = async (req, res) => {
  try {
    const post = await createMassclickFeedPost(req.body, getActor(req));
    res.send({ success: true, post });
  } catch (error) {
    console.error("createMassclickFeedPostAction error:", error);
    res.status(BAD_REQUEST.code).send({ message: error.message });
  }
};

export const listMassclickFeedPostsAction = async (req, res) => {
  try {
    const actor = getActor(req);
    const pageNo = parseInt(req.query.pageNo) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const includeInactive = actor.actorType === "admin" && req.query.includeInactive === "true";

    const result = await listMassclickFeedPosts({
      pageNo,
      pageSize,
      search: req.query.search || "",
      status: req.query.status || "active",
      includeInactive,
      actorId: actor.subjectId || actor.userId,
    });

    res.send(result);
  } catch (error) {
    console.error("listMassclickFeedPostsAction error:", error);
    res.status(BAD_REQUEST.code).send({ message: error.message });
  }
};

export const toggleMassclickFeedLikeAction = async (req, res) => {
  try {
    const post = await toggleMassclickFeedLike(req.params.id, getActor(req));
    res.send({ success: true, post });
  } catch (error) {
    console.error("toggleMassclickFeedLikeAction error:", error);
    res.status(BAD_REQUEST.code).send({ message: error.message });
  }
};

export const addMassclickFeedCommentAction = async (req, res) => {
  try {
    const post = await addMassclickFeedComment(req.params.id, req.body, getActor(req));
    res.send({ success: true, post });
  } catch (error) {
    console.error("addMassclickFeedCommentAction error:", error);
    res.status(BAD_REQUEST.code).send({ message: error.message });
  }
};

export const recordMassclickFeedShareAction = async (req, res) => {
  try {
    const post = await recordMassclickFeedShare(req.params.id, getActor(req));
    res.send({ success: true, post });
  } catch (error) {
    console.error("recordMassclickFeedShareAction error:", error);
    res.status(BAD_REQUEST.code).send({ message: error.message });
  }
};

export const updateMassclickFeedStatusAction = async (req, res) => {
  try {
    const post = await updateMassclickFeedStatus(req.params.id, req.body, getActor(req));
    res.send({ success: true, post });
  } catch (error) {
    console.error("updateMassclickFeedStatusAction error:", error);
    res.status(BAD_REQUEST.code).send({ message: error.message });
  }
};

export const deleteMassclickFeedPostAction = async (req, res) => {
  try {
    const post = await deleteMassclickFeedPost(req.params.id, getActor(req));
    res.send({ success: true, post });
  } catch (error) {
    console.error("deleteMassclickFeedPostAction error:", error);
    res.status(BAD_REQUEST.code).send({ message: error.message });
  }
};
