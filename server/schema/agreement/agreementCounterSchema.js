import mongoose from "mongoose";

const agreementCounterSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    sequence: { type: Number, default: 0, min: 0, max: 999999 },
  },
  { timestamps: true, versionKey: false },
);

export default agreementCounterSchema;
