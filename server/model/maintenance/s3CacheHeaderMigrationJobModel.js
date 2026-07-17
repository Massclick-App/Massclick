import mongoose from "mongoose";
import { S3CACHEHEADERMIGRATIONJOB } from "../../collectionName.js";

const migrationFailureSchema = new mongoose.Schema(
  {
    s3Key: { type: String, default: "" },
    folderPrefix: { type: String, default: "" },
    error: { type: String, default: "" },
  },
  { _id: false },
);

const migrationProgressSchema = new mongoose.Schema(
  {
    objectsScanned: { type: Number, default: 0 },
    objectsUpdated: { type: Number, default: 0 },
    objectsFailed: { type: Number, default: 0 },
    objectsSkipped: { type: Number, default: 0 },
  },
  { _id: false },
);

const migrationTotalsSchema = new mongoose.Schema(
  {
    candidateObjects: { type: Number, default: 0 },
  },
  { _id: false },
);

const migrationCheckpointSchema = new mongoose.Schema(
  {
    version: { type: Number, default: 2 },
    folderIndex: { type: Number, default: 0 },
    lastScannedKey: { type: String, default: "" },
    lastProcessedKey: { type: String, default: "" },
  },
  { _id: false },
);

const s3CacheHeaderMigrationJobSchema = new mongoose.Schema(
  {
    jobType: {
      type: String,
      default: "s3-cache-header-migration",
      index: true,
    },
    activeSlot: { type: String, default: undefined },
    scopeKey: { type: String, default: "all", index: true },
    scopeLabel: { type: String, default: "All Folders" },
    phase: {
      type: String,
      enum: ["scanning", "migrating"],
      default: "scanning",
    },
    status: {
      type: String,
      enum: [
        "queued",
        "running",
        "paused",
        "cancelled",
        "completed",
        "completed_with_errors",
        "failed",
      ],
      default: "queued",
      index: true,
    },
    options: {
      batchSize: { type: Number, default: 100 },
      retryCount: { type: Number, default: 3 },
    },
    progress: { type: migrationProgressSchema, default: () => ({}) },
    totals: { type: migrationTotalsSchema, default: () => ({}) },
    checkpoint: { type: migrationCheckpointSchema, default: () => ({}) },
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
    workerId: { type: String, default: "" },
    leaseExpiresAt: { type: Date, default: null },
    lastError: { type: String, default: "" },
    lastProcessedKey: { type: String, default: "" },
  },
  { timestamps: true },
);

s3CacheHeaderMigrationJobSchema.index({ jobType: 1, createdAt: -1 });
s3CacheHeaderMigrationJobSchema.index(
  { jobType: 1, activeSlot: 1 },
  {
    unique: true,
    partialFilterExpression: { activeSlot: "active" },
    name: "one_active_s3_cache_header_migration",
  },
);

const s3CacheHeaderMigrationJobModel =
  mongoose.models[S3CACHEHEADERMIGRATIONJOB] ||
  mongoose.model(S3CACHEHEADERMIGRATIONJOB, s3CacheHeaderMigrationJobSchema);

export default s3CacheHeaderMigrationJobModel;
