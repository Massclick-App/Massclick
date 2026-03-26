import mongoose from "mongoose";
import { SEOPAGECONTENTBLOG } from "../../collectionName.js";
import seoPageContentBlogSchema from "../../schema/seoSchema/seoPageContentBlogSchema.js";

const seoPageContentBlogModel = mongoose.model(SEOPAGECONTENTBLOG, seoPageContentBlogSchema);

export default seoPageContentBlogModel;
