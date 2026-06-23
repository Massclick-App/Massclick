import mongoose from "mongoose";
import { BUSINESSWEBPMIGRATIONJOB } from "../../collectionName.js";

const migrationFailureSchema = new mongoose.Schema(
  {
    businessId: { type: String, default: "" },
    businessName: { type: String, default: "" },
    fieldPath: { type: String, default: "" },
    sourceKey: { type: String, default: "" },
    error: { type: String, default: "" },
  },
  { _id: false }
);

const migrationProgressSchema = new mongoose.Schema(
  {
    businessesScanned: { type: Number, default: 0 },
    businessesUpdated: { type: Number, default: 0 },
    imagesScanned: { type: Number, default: 0 },
    imagesConverted: { type: Number, default: 0 },
    imagesSkipped: { type: Number, default: 0 },
    imagesFailed: { type: Number, default: 0 },
    originalsDeleted: { type: Number, default: 0 },
  },
  { _id: false }
);

const migrationTotalsSchema = new mongoose.Schema(
  {
    candidateBusinesses: { type: Number, default: 0 },
    candidateImages: { type: Number, default: 0 },
  },
  { _id: false }
);

const businessWebpMigrationJobSchema = new mongoose.Schema(
  {
    jobType: { type: String, default: "business-webp-migration", index: true },
    status: {
      type: String,
      enum: ["queued", "running", "paused", "cancelled", "completed", "completed_with_errors", "failed"],
      default: "queued",
      index: true,
    },
    options: {
      deleteOriginals: { type: Boolean, default: true },
      batchSize: { type: Number, default: 100 },
      retryCount: { type: Number, default: 3 },
    },
    progress: { type: migrationProgressSchema, default: () => ({}) },
    totals: { type: migrationTotalsSchema, default: () => ({}) },
    failures: { type: [migrationFailureSchema], default: [] },
    createdBy: {
      userId: { type: String, default: "" },
      userName: { type: String, default: "" },
      email: { type: String, default: "" },
    },
    startedAt: { type: Date, default: null },
    pausedAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
    finishedAt: { type: Date, default: null },
    lastHeartbeatAt: { type: Date, default: null },
    lastError: { type: String, default: "" },
    lastProcessedBusinessId: { type: String, default: "" },
    summary: {
      totalDocumentsTouched: { type: Number, default: 0 },
      totalDocumentsWithChanges: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

businessWebpMigrationJobSchema.index({ jobType: 1, createdAt: -1 });

const businessWebpMigrationJobModel =
  mongoose.models[BUSINESSWEBPMIGRATIONJOB] ||
  mongoose.model(BUSINESSWEBPMIGRATIONJOB, businessWebpMigrationJobSchema);

export default businessWebpMigrationJobModel;
