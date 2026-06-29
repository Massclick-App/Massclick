import mongoose from "mongoose";
import { PUBLICUSERCOUNTERSETTINGS } from "../../collectionName.js";
import publicUserCounterSettingsSchema from "../../schema/publicUserCounter/publicUserCounterSettingsSchema.js";

const publicUserCounterSettingsModel = mongoose.model(
  PUBLICUSERCOUNTERSETTINGS,
  publicUserCounterSettingsSchema
);

export default publicUserCounterSettingsModel;
