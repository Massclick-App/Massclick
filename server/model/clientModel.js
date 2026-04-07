import mongoose from "mongoose";
import { CLIENT } from "../collectionName.js";
import clientSchema from "../schema/clientSchema.js";

const clientModel = mongoose.model(CLIENT, clientSchema);

export default clientModel; 