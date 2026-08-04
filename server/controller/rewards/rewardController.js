import { awardMilestone, createRewardClaim, deleteRule, getRewardMemberProfile, getWallet, listAllClaims, listCustomerClaims, listRewardBusinesses, listRewardBusinessLocations, listRewardCategoryOptions, listRewardLeaderboard, listRules, redeemReward, reviewRewardClaim, REWARD_CATALOG, saveRule } from "../../helper/rewards/rewardHelper.js";
import { emitToRoom } from "../../websocket/roomManager.js";
import { buildRoom, WS_EVENTS } from "../../websocket/constants.js";
const respond = (res, work) => work.then((data) => res.send(data)).catch((error) => res.status(400).send({ message: error.message }));
const actorKey = (req) => req.authActor?.mobile || (req.authActor?.actorType === "customer" ? req.authActor?.subjectId : null) || req.params.customerKey || req.body.customerKey;
const reviewerIdentity = (actor = {}) => ({
  id: String(actor.subjectId || ""),
  label: actor.userName || actor.emailId || actor.email || "Administrator",
});
export const requireAdmin = (req, res, next) => req.authActor?.actorType === "admin" ? next() : res.status(403).send({ message: "Administrator access required" });
export const rewardCatalogAction = (req, res) => res.send(REWARD_CATALOG);
export const walletAction = (req, res) => respond(res, getWallet(actorKey(req)));
export const leaderboardAction = (req, res) => respond(res, listRewardLeaderboard({ page: req.query.page, limit: req.query.limit }));
export const rewardMemberAction = (req, res) => respond(res, getRewardMemberProfile(req.params.memberKey));
export const redeemAction = (req, res) => respond(res, redeemReward({ customerKey: actorKey(req), rewardCode: req.body.rewardCode }));
export const rulesAction = (req, res) => respond(res, listRules());
export const categoryOptionsAction = (req, res) => respond(res, listRewardCategoryOptions());
export const businessLocationsAction = (req, res) => respond(res, listRewardBusinessLocations(req.query.category));
export const claimBusinessesAction = (req, res) => respond(res, listRewardBusinesses({ category: req.query.category, location: req.query.location }));
export const saveRuleAction = (req, res) => respond(res, saveRule(req.body, req.authActor?.email || req.authActor?.subjectId || "admin"));
export const deleteRuleAction = (req, res) => respond(res, deleteRule(req.params.id));
export const awardAction = (req, res) => respond(res, awardMilestone({ ...req.body, createdBy: req.authActor?.subjectId || "admin" }));
export const createClaimAction = async (req, res) => {
  try {
    const claim = await createRewardClaim(actorKey(req), req.body);
    emitToRoom(buildRoom.admin(), WS_EVENTS.REWARD_CLAIM_CHANGED, {
      action: "created",
      claimId: claim._id,
      claimNumber: claim.claimNumber,
      createdAt: claim.createdAt,
    });
    res.send(claim);
  } catch (error) {
    res.status(400).send({ message: error.message });
  }
};
export const customerClaimsAction = (req, res) => respond(res, listCustomerClaims(actorKey(req)));
export const allClaimsAction = (req, res) => respond(res, listAllClaims({
  status: req.query.status,
  page: Math.max(1, Number(req.query.page) || 1),
  limit: Math.min(100, Math.max(1, Number(req.query.limit) || 25)),
  search: req.query.search,
  sortBy: req.query.sortBy,
  sortOrder: req.query.sortOrder,
}));
export const reviewClaimAction = async (req, res) => {
  try {
    const claim = await reviewRewardClaim(req.params.id, req.body, reviewerIdentity(req.authActor));
    emitToRoom(buildRoom.admin(), WS_EVENTS.REWARD_CLAIM_CHANGED, {
      action: "reviewed",
      claimId: claim._id,
      claimNumber: claim.claimNumber,
      status: claim.status,
      reviewedAt: claim.reviewedAt,
    });
    res.send(claim);
  } catch (error) {
    res.status(400).send({ message: error.message });
  }
};
