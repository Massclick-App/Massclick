import mongoose from "mongoose";
import { REWARDWALLETS, REWARDTRANSACTIONS, REWARDRULES, REWARDREDEMPTIONS, REWARDCLAIMS } from "../../collectionName.js";
import { rewardWalletSchema, rewardTransactionSchema, rewardRuleSchema, rewardRedemptionSchema, rewardClaimSchema } from "../../schema/rewards/rewardSchemas.js";
export const RewardWallet = mongoose.model(REWARDWALLETS, rewardWalletSchema);
export const RewardTransaction = mongoose.model(REWARDTRANSACTIONS, rewardTransactionSchema);
export const RewardRule = mongoose.model(REWARDRULES, rewardRuleSchema);
export const RewardRedemption = mongoose.model(REWARDREDEMPTIONS, rewardRedemptionSchema);
export const RewardClaim = mongoose.model(REWARDCLAIMS, rewardClaimSchema);
