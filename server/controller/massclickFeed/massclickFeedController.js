import { BAD_REQUEST } from "../../errorCodes.js";
import {
  addMassclickFeedComment,
  createMassclickFeedPost,
  deleteMassclickFeedPost,
  listMassclickFeedPosts,
  recordMassclickFeedShare,
  toggleMassclickFeedLike,
  updateMassclickFeedStatus,
  setMassclickFeedFollow,
  listMassclickFeedFollows,
  listMassclickFeedBusinesses,
  toggleMassclickFeedSave,
  recordMassclickFeedView,
  recordMassclickFeedEnquiry,
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

const runPostInteraction = (handler, label) => async (req, res) => {
  try {
    const post = await handler(req.params.id, getActor(req));
    res.send({ success: true, post });
  } catch (error) {
    console.error(`${label} error:`, error);
    res.status(BAD_REQUEST.code).send({ message: error.message });
  }
};

export const toggleMassclickFeedSaveAction = runPostInteraction(toggleMassclickFeedSave, "toggleMassclickFeedSaveAction");
export const recordMassclickFeedViewAction = runPostInteraction(recordMassclickFeedView, "recordMassclickFeedViewAction");
export const recordMassclickFeedEnquiryAction = runPostInteraction(recordMassclickFeedEnquiry, "recordMassclickFeedEnquiryAction");

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

export const setMassclickFeedFollowAction = async (req, res) => {
  try {
    const result = await setMassclickFeedFollow(req.params.businessId, req.body.follow !== false, getActor(req));
    res.send({ success: true, ...result });
  } catch (error) {
    console.error("setMassclickFeedFollowAction error:", error);
    res.status(BAD_REQUEST.code).send({ message: error.message });
  }
};

export const listMassclickFeedFollowsAction = async (req, res) => {
  try {
    res.send(await listMassclickFeedFollows(getActor(req)));
  } catch (error) {
    console.error("listMassclickFeedFollowsAction error:", error);
    res.status(BAD_REQUEST.code).send({ message: error.message });
  }
};

export const listMassclickFeedBusinessesAction = async (req, res) => {
  try {
    const result = await listMassclickFeedBusinesses({ actor: getActor(req), page: req.query.page, limit: req.query.limit, search: req.query.search });
    res.send(result);
  } catch (error) {
    console.error("listMassclickFeedBusinessesAction error:", error);
    res.status(BAD_REQUEST.code).send({ message: error.message });
  }
};
