import mongoose from "mongoose";
import { MASSCLICKDOCUMENTS } from "../../collectionName.js";
import massclickDocumentsSchema from "../../schema/massclickDocuments/massclickDocumentsSchema.js";

const massclickDocumentsModel = mongoose.model(
  MASSCLICKDOCUMENTS,
  massclickDocumentsSchema
);

export default massclickDocumentsModel;
