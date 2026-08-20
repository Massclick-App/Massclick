import mongoose from "mongoose";
import { SUPPORTTICKET } from "../../collectionName.js";
import supportTicketSchema from "../../schema/support/supportTicketSchema.js";

export default mongoose.model(SUPPORTTICKET, supportTicketSchema);
