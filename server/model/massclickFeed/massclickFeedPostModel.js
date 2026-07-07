import mongoose from "mongoose";
import { MASSCLICKFEEDPOSTS } from "../../collectionName.js";
import massclickFeedPostSchema from "../../schema/massclickFeed/massclickFeedPostSchema.js";

const massclickFeedPostModel = mongoose.model(
  MASSCLICKFEEDPOSTS,
  massclickFeedPostSchema
);

export default massclickFeedPostModel;
