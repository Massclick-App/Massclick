import mongoose from "mongoose";
import { ACCOUNTDELETIONREQUESTS } from "../../collectionName.js";
import accountDeletionRequestSchema from "../../schema/accountDeletion/accountDeletionRequestSchema.js";

const accountDeletionRequestModel =
  mongoose.models[ACCOUNTDELETIONREQUESTS] ||
  mongoose.model(ACCOUNTDELETIONREQUESTS, accountDeletionRequestSchema);

export default accountDeletionRequestModel;
