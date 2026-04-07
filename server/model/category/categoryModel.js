import mongoose from "mongoose";
import { CATEGORY } from "../../collectionName.js";

import categorySchema from "../../schema/category/categorySchema.js"

const categoryModel = mongoose.model(CATEGORY, categorySchema);

export default categoryModel; 
