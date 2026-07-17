import mongoose from "mongoose";
import { SEOTEMPLATE } from "../../collectionName.js";
import seoTemplateSchema from "../../schema/seoSchema/seoTemplateSchema.js";

const seoTemplateModel = mongoose.model(SEOTEMPLATE, seoTemplateSchema);

export default seoTemplateModel;
