import mongoose from "mongoose";
import { RewardWallet, RewardTransaction, RewardRule, RewardRedemption, RewardClaim } from "../../model/rewards/rewardModels.js";
import categoryModel from "../../model/category/categoryModel.js";
import businessListModel from "../../model/businessList/businessListModel.js";
import otpUserModel from "../../model/msg91Model/usersModels.js";

export const REWARD_CATALOG = Object.freeze([
  { code: "MC100", name: "₹100 MassClick coupon", points: 200, valueInr: 100 },
  { code: "MC250", name: "₹250 MassClick coupon", points: 500, valueInr: 250 },
  { code: "CB500", name: "₹500 cashback", points: 1000, valueInr: 500 },
  { code: "CB1200", name: "₹1,200 cashback", points: 2000, valueInr: 1200 },
  { code: "CB3500", name: "₹3,500 cashback", points: 5000, valueInr: 3500 },
]);
const cleanKey = (value) => String(value || "").trim().toLowerCase();
const monthStart = () => { const date = new Date(); return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1)); };
export const tierFor = (points) => [{ name: "Diamond", min: 5000 }, { name: "Platinum", min: 1500 }, { name: "Gold", min: 700 }, { name: "Silver", min: 300 }, { name: "Bronze", min: 100 }].find((tier) => points >= tier.min)?.name || "Starter";
export const WELCOME_BONUS_POINTS = 500;
const syncUserRewardPoints = async (customerKey, wallet) => {
  const key = cleanKey(customerKey);
  if (!key) return;
  const snapshot = wallet?.toObject ? wallet.toObject() : (wallet || {});
  const now = new Date();
  await otpUserModel.updateOne(
    { mobileNumber1: key },
    { $set: {
      rewardPoints: {
        availablePoints: Number(snapshot.availablePoints || 0),
        lifetimeEarned: Number(snapshot.lifetimeEarned || 0),
        lifetimeRedeemed: Number(snapshot.lifetimeRedeemed || 0),
        tier: tierFor(Number(snapshot.lifetimeEarned || 0)),
        lastSyncedAt: now,
      },
      updatedAt: now,
    } }
  );
};

export const awardWelcomeBonus = async (customerKey) => {
  const key = cleanKey(customerKey);
  if (!key) throw new Error("Customer identity is required for the welcome bonus");
  const idempotencyKey = `welcome-bonus:${key}`;
  const existing = await RewardTransaction.findOne({ idempotencyKey }).lean();
  if (existing) {
    const wallet = await RewardWallet.findOne({ customerKey: key }).lean();
    await syncUserRewardPoints(key, wallet);
    return { transaction: existing, wallet, duplicate: true };
  }

  let transaction;
  try {
    transaction = await RewardTransaction.create({
      customerKey: key,
      categoryKey: "welcome",
      milestone: "welcome_bonus",
      points: WELCOME_BONUS_POINTS,
      status: "credited",
      idempotencyKey,
      description: "Welcome to MassClick — first login bonus",
      metadata: { campaign: "otp_registration_welcome", version: 1 },
      createdBy: "otp-registration",
    });
  } catch (error) {
    if (error?.code === 11000) {
      return {
        transaction: await RewardTransaction.findOne({ idempotencyKey }).lean(),
        wallet: await RewardWallet.findOne({ customerKey: key }).lean(),
        duplicate: true,
      };
    }
    throw error;
  }

  try {
    const wallet = await RewardWallet.findOneAndUpdate(
      { customerKey: key },
      { $inc: { lifetimeEarned: WELCOME_BONUS_POINTS, availablePoints: WELCOME_BONUS_POINTS } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    await syncUserRewardPoints(key, wallet);
    return { transaction, wallet, duplicate: false };
  } catch (error) {
    await RewardTransaction.deleteOne({ _id: transaction._id });
    throw error;
  }
};

export const getWallet = async (customerKey) => {
  const key = cleanKey(customerKey);
  if (!key) throw new Error("Customer identity is required");
  const [wallet, transactions, redemptions] = await Promise.all([
    RewardWallet.findOne({ customerKey: key }).lean(),
    RewardTransaction.find({ customerKey: key }).sort({ createdAt: -1 }).limit(50).lean(),
    RewardRedemption.find({ customerKey: key }).sort({ createdAt: -1 }).limit(20).lean(),
  ]);
  const summary = wallet || { customerKey: key, lifetimeEarned: 0, lifetimeRedeemed: 0, availablePoints: 0 };
  await syncUserRewardPoints(key, summary);
  return { ...summary, tier: tierFor(summary.lifetimeEarned), transactions, redemptions, catalog: REWARD_CATALOG };
};

export const listRules = () => RewardRule.find().sort({ categoryName: 1 }).lean();
export const deleteRule = async (ruleId) => {
  if (!mongoose.Types.ObjectId.isValid(ruleId)) throw new Error("Invalid reward policy ID");
  const rule = await RewardRule.findByIdAndDelete(ruleId).lean();
  if (!rule) throw new Error("Reward policy not found");
  return { deleted: true, id: rule._id, categoryName: rule.categoryName };
};
export const listRewardCategoryOptions = async () => categoryModel
  .find({ isActive: { $ne: false } })
  .select({ category: 1, subcategory: 1, categoryType: 1, slug: 1 })
  .sort({ categoryType: 1, category: 1, subcategory: 1 })
  .lean();
export const listRewardBusinessLocations = async (category = "") => {
  const value = String(category || "").trim();
  if (!value) return [];
  const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const locations = await businessListModel.distinct("location", {
    businessesLive: true,
    isActive: { $ne: false },
    category: { $regex: `^${escaped}$`, $options: "i" },
    location: { $nin: [null, ""] },
  });
  return locations.map((location) => String(location).trim()).filter(Boolean).sort((a, b) => a.localeCompare(b));
};
export const listRewardBusinesses = async ({ category = "", location = "" } = {}) => {
  const categoryValue = String(category).trim(); const locationValue = String(location).trim();
  if (!categoryValue || !locationValue) return [];
  const escape = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return businessListModel.find({ businessesLive: true, isActive: { $ne: false }, category: { $regex: `^${escape(categoryValue)}$`, $options: "i" }, location: { $regex: `^${escape(locationValue)}$`, $options: "i" } }).select({ businessName: 1, name: 1, category: 1, location: 1, street: 1, verification: 1 }).sort({ businessName: 1 }).limit(200).lean();
};
export const saveRule = (data, updatedBy) => {
  const categoryKey = cleanKey(data.categoryKey || data.categoryName);
  if (!categoryKey || !String(data.categoryName || "").trim()) throw new Error("Category key and name are required");
  const numeric = ["basePoints", "acceptedBonus", "completedBonus", "customerConfirmedBonus", "maxPointsPerEnquiry", "monthlyCustomerCap", "pointsExpireAfterDays"];
  const update = { ...data, categoryKey, categoryName: String(data.categoryName).trim(), updatedBy };
  numeric.forEach((field) => { if (update[field] !== undefined) update[field] = Math.max(0, Number(update[field]) || 0); });
  return RewardRule.findOneAndUpdate({ categoryKey }, { $set: update }, { upsert: true, new: true, runValidators: true });
};

const milestoneField = { created: "basePoints", accepted: "acceptedBonus", completed: "completedBonus", customer_confirmed: "customerConfirmedBonus" };
export const awardMilestone = async ({ customerKey, enquiryId, categoryKey, milestone, idempotencyKey, pointsOverride, createdBy = "system" }) => {
  const key = cleanKey(customerKey); const category = cleanKey(categoryKey);
  if (!key || !category || !milestoneField[milestone]) throw new Error("Valid customer, category and milestone are required");
  if (enquiryId && !mongoose.Types.ObjectId.isValid(enquiryId)) throw new Error("Invalid enquiry ID");
  const uniqueKey = String(idempotencyKey || `${enquiryId || key}:${milestone}`).trim();
  const existing = await RewardTransaction.findOne({ idempotencyKey: uniqueKey }).lean();
  if (existing) return { transaction: existing, duplicate: true };
  const rule = await RewardRule.findOne({ categoryKey: category, enabled: true }).lean();
  if (!rule) throw new Error("Rewards are not enabled for this category");
  const [earned, enquiryEarned] = await Promise.all([
    RewardTransaction.aggregate([{ $match: { customerKey: key, status: "credited", createdAt: { $gte: monthStart() } } }, { $group: { _id: null, total: { $sum: "$points" } } }]),
    enquiryId ? RewardTransaction.aggregate([{ $match: { enquiryId: new mongoose.Types.ObjectId(enquiryId), customerKey: key, status: "credited" } }, { $group: { _id: null, total: { $sum: "$points" } } }]) : [],
  ]);
  const remainingEnquiry = Math.max(0, rule.maxPointsPerEnquiry - (enquiryEarned[0]?.total || 0));
  const requestedPoints = pointsOverride === undefined ? rule[milestoneField[milestone]] : Math.max(0, Number(pointsOverride) || 0);
  const points = Math.min(requestedPoints, remainingEnquiry, Math.max(0, rule.monthlyCustomerCap - (earned[0]?.total || 0)));
  if (points <= 0) throw new Error("Monthly reward limit reached");
  let transaction;
  try {
    transaction = await RewardTransaction.create({ customerKey: key, enquiryId: enquiryId || undefined, categoryKey: category, milestone, points, status: "credited", idempotencyKey: uniqueKey, description: `${rule.categoryName}: ${milestone.replaceAll("_", " ")}`, createdBy });
  } catch (error) {
    if (error?.code === 11000) return { transaction: await RewardTransaction.findOne({ idempotencyKey: uniqueKey }).lean(), duplicate: true };
    throw error;
  }
  const wallet = await RewardWallet.findOneAndUpdate({ customerKey: key }, { $inc: { lifetimeEarned: points, availablePoints: points } }, { upsert: true, new: true, setDefaultsOnInsert: true });
  await syncUserRewardPoints(key, wallet);
  return { transaction, wallet, duplicate: false };
};

const claimNumber = () => `MCR-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
const claimPoints = (rule) => Math.min(rule.maxPointsPerEnquiry, rule.basePoints + rule.acceptedBonus + rule.completedBonus + rule.customerConfirmedBonus);

export const createRewardClaim = async (customerKey, data) => {
  const key = cleanKey(customerKey);
  if (!key) throw new Error("Please sign in before claiming points");
  if (!mongoose.Types.ObjectId.isValid(data.categoryId)) throw new Error("Select a valid MassClick category");
  if (!data.consentConfirmed) throw new Error("Confirmation is required");
  if (!mongoose.Types.ObjectId.isValid(data.businessId)) throw new Error("Select a valid MassClick business");
  if (!String(data.locationName || "").trim()) throw new Error("Select a valid location");
  const transactionAt = new Date(data.transactionAt);
  if (Number.isNaN(transactionAt.getTime()) || transactionAt > new Date()) throw new Error("Enter a valid transaction date and time");
  const rule = await RewardRule.findOne({ categoryId: data.categoryId, enabled: true }).lean();
  if (!rule) throw new Error("Rewards are not currently enabled for this category");
  const duplicateWindowStart = new Date(transactionAt.getTime() - 60 * 60 * 1000);
  const duplicateWindowEnd = new Date(transactionAt.getTime() + 60 * 60 * 1000);
  const duplicate = await RewardClaim.findOne({ customerKey: key, categoryId: data.categoryId, businessName: String(data.businessName || "").trim(), transactionAmount: Number(data.transactionAmount), transactionAt: { $gte: duplicateWindowStart, $lte: duplicateWindowEnd }, status: { $ne: "rejected" } }).lean();
  if (duplicate) throw new Error(`A similar claim already exists (${duplicate.claimNumber})`);
  return RewardClaim.create({
    claimNumber: claimNumber(), customerKey: key, customerName: data.customerName,
    categoryId: data.categoryId, categoryKey: rule.categoryKey, categoryName: rule.categoryName,
    locationId: mongoose.Types.ObjectId.isValid(data.locationId) ? data.locationId : null,
    locationName: data.locationName, locationSlug: data.locationSlug,
    businessId: data.businessId,
    businessName: data.businessName, transactionAmount: Number(data.transactionAmount),
    transactionAt, invoiceNumber: data.invoiceNumber, paymentMethod: data.paymentMethod,
    notes: data.notes, consentConfirmed: true, projectedPoints: claimPoints(rule), status: "pending",
  });
};

export const listCustomerClaims = (customerKey) => RewardClaim.find({ customerKey: cleanKey(customerKey) }).sort({ createdAt: -1 }).limit(50).lean();
export const listAllClaims = ({ status = "", page = 1, limit = 25, search = "", sortBy = "createdAt", sortOrder = "desc" } = {}) => {
  const query = status ? { status } : {};
  const safeSearch = String(search || "").trim().slice(0, 100).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (safeSearch) {
    const pattern = new RegExp(safeSearch, "i");
    query.$or = [
      { claimNumber: pattern }, { customerKey: pattern }, { customerName: pattern },
      { businessName: pattern }, { categoryName: pattern }, { locationName: pattern },
      { invoiceNumber: pattern },
    ];
  }
  const sortableFields = new Set(["claimNumber", "customerName", "businessName", "transactionAmount", "projectedPoints", "status", "createdAt", "transactionAt", "reviewedAt"]);
  const field = sortableFields.has(sortBy) ? sortBy : "createdAt";
  const direction = sortOrder === "asc" ? 1 : -1;
  return Promise.all([
    RewardClaim.find(query).sort({ [field]: direction, _id: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    RewardClaim.countDocuments(query),
  ]).then(([data, total]) => ({ data, total, page, limit }));
};
export const reviewRewardClaim = async (claimId, { status, rejectionReason = "" }, reviewer) => {
  if (!mongoose.Types.ObjectId.isValid(claimId)) throw new Error("Invalid claim ID");
  if (!["approved", "rejected", "needs_information"].includes(status)) throw new Error("Invalid review status");
  const claim = await RewardClaim.findById(claimId);
  if (!claim) throw new Error("Claim not found");
  if (claim.status === "approved") return claim;
  if (status === "approved") {
    const result = await awardMilestone({ customerKey: claim.customerKey, enquiryId: claim._id, categoryKey: claim.categoryKey, milestone: "customer_confirmed", pointsOverride: claim.projectedPoints, idempotencyKey: `claim:${claim._id}:approved`, createdBy: reviewer });
    claim.awardedPoints = result.transaction.points;
  }
  claim.status = status; claim.rejectionReason = rejectionReason; claim.reviewedBy = reviewer; claim.reviewedAt = new Date();
  return claim.save();
};

export const redeemReward = async ({ customerKey, rewardCode }) => {
  const key = cleanKey(customerKey); const reward = REWARD_CATALOG.find((item) => item.code === String(rewardCode || "").toUpperCase());
  if (!key || !reward) throw new Error("Valid customer and reward are required");
  const wallet = await RewardWallet.findOneAndUpdate({ customerKey: key, availablePoints: { $gte: reward.points } }, { $inc: { availablePoints: -reward.points, lifetimeRedeemed: reward.points } }, { new: true });
  if (!wallet) throw new Error("Insufficient points");
  try {
    const redemption = await RewardRedemption.create({ customerKey: key, rewardCode: reward.code, rewardName: reward.name, pointsCost: reward.points, valueInr: reward.valueInr });
    await RewardTransaction.create({ customerKey: key, milestone: "redemption", points: -reward.points, status: "debited", idempotencyKey: `redemption:${redemption._id}`, description: reward.name });
    await syncUserRewardPoints(key, wallet);
    return { redemption, wallet };
  } catch (error) {
    const restoredWallet = await RewardWallet.findOneAndUpdate({ customerKey: key }, { $inc: { availablePoints: reward.points, lifetimeRedeemed: -reward.points } }, { new: true });
    await syncUserRewardPoints(key, restoredWallet);
    throw error;
  }
};
