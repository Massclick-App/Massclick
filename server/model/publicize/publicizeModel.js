import mongoose from "mongoose";
import { PUBLICIZE } from "../../collectionName.js";

import publicizeSchema from "../../schema/publicize/publicizeSchema.js"

const publicizeModel = mongoose.model(PUBLICIZE, publicizeSchema, PUBLICIZE);

export default publicizeModel; 