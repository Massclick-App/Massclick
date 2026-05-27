import mongoose from "mongoose";
import { CATEGORYDISPLAYSETTINGS } from "../../collectionName.js";
import categoryDisplaySettingsSchema from "../../schema/categoryDisplaySettings/categoryDisplaySettingsSchema.js";

const categoryDisplaySettingsModel = mongoose.model(
  CATEGORYDISPLAYSETTINGS,
  categoryDisplaySettingsSchema
);

export default categoryDisplaySettingsModel;
