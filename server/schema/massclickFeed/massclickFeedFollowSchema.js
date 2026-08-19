import mongoose from "mongoose";

const { Schema } = mongoose;

const massclickFeedFollowSchema = new Schema({
  followerUserId: { type: Schema.Types.ObjectId, required: true, index: true },
  businessId: { type: Schema.Types.ObjectId, ref: "BusinessList", required: true, index: true },
  createdAt: { type: Date, default: Date.now },
});

massclickFeedFollowSchema.index({ followerUserId: 1, businessId: 1 }, { unique: true });

export default massclickFeedFollowSchema;
