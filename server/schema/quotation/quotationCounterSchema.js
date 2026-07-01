import mongoose from "mongoose";

const quotationCounterSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    year: { type: Number, required: true },
    sequence: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default quotationCounterSchema;
