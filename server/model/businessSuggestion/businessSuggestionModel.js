import mongoose from "mongoose";
import { BUSINESSSUGGESTIONS } from "../../collectionName.js";
import businessSuggestionSchema from "../../schema/businessSuggestion/businessSuggestionSchema.js";

const businessSuggestionModel =
  mongoose.models[BUSINESSSUGGESTIONS] ||
  mongoose.model(BUSINESSSUGGESTIONS, businessSuggestionSchema);

export default businessSuggestionModel;
