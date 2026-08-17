import mongoose from "mongoose";
import { MASSCLICKFEEDFOLLOWS } from "../../collectionName.js";
import massclickFeedFollowSchema from "../../schema/massclickFeed/massclickFeedFollowSchema.js";

export default mongoose.model(MASSCLICKFEEDFOLLOWS, massclickFeedFollowSchema);
