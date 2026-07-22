import mongoose from "mongoose";
import { SEARCHREQUESTS } from "../../collectionName.js";
import searchRequestSchema from "../../schema/searchRequest/searchRequestSchema.js";

const searchRequestModel =
  mongoose.models[SEARCHREQUESTS] || mongoose.model(SEARCHREQUESTS, searchRequestSchema);

export default searchRequestModel;
