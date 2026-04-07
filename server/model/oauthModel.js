import mongoose from "mongoose";
import { OAUTHUSERS } from "../collectionName.js";

import oauthSchema from "../schema/oauthSchema.js";

const oauthModel = mongoose.model(OAUTHUSERS, oauthSchema);

export default oauthModel; 
