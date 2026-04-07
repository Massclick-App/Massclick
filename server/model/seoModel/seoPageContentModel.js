import mongoose from "mongoose";
import { SEOPAGECONTENT } from "../../collectionName.js";
import seoPageContentSchema from "../../schema/seoSchema/seoPageContentSchema.js";

const seoPageContentModel = mongoose.model(SEOPAGECONTENT, seoPageContentSchema);

export default seoPageContentModel;
