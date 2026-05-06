import mongoose from "mongoose";
import { SYSTEMSETTINGS } from "../../collectionName.js";
import systemSettingsSchema from "../../schema/systemSettings/systemSettingsSchema.js";

const systemSettingsModel = mongoose.model(SYSTEMSETTINGS, systemSettingsSchema);

export default systemSettingsModel;
