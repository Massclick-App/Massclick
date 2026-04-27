import mongoose from "mongoose";
import { FCMCAMPAIGNS } from "../../collectionName.js";
import fcmCampaignSchema from "../../schema/fcmCampaignSchema/fcmCampaignSchema.js";

const fcmCampaignModel = mongoose.model(FCMCAMPAIGNS, fcmCampaignSchema);

export default fcmCampaignModel;
