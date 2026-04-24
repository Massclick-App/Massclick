import mongoose from "mongoose";
import { FAVORITES } from "../../collectionName.js";
import favoriteSchema from "../../schema/favorite/favoriteSchema.js";

const favoriteModel = mongoose.model(FAVORITES, favoriteSchema);

export default favoriteModel;