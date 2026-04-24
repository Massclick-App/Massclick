import mongoose from "mongoose";

import { TERMSANDCONDITIONS } from "../../collectionName.js";

import termsAndConditionsSchema from "../../schema/footer/termsAndConditions.js"

const termsAndConditionsModel = mongoose.model(TERMSANDCONDITIONS, termsAndConditionsSchema);

export default termsAndConditionsModel; 
