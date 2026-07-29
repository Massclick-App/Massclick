import mongoose from "mongoose";

import { LEGALDOCUMENTS } from "../../collectionName.js";

import legalDocumentSchema from "../../schema/legal/legalDocument.js";

const legalDocumentModel = mongoose.model(LEGALDOCUMENTS, legalDocumentSchema);

export default legalDocumentModel;
