/**
 * Mongo mirror of a s3KeyMigration.js run — bookkeeping only.
 *
 * `_migrations/s3-key-restructure/<runId>/state.json` on disk is the SOURCE OF TRUTH
 * for resumability; this collection exists purely for the lease/mutual-exclusion
 * guarantee (two people on two machines cannot start the same run) and for the
 * SystemSettings monitoring card. Losing this document never loses migration state —
 * `doctor` can rebuild it from the files on disk.
 *
 * Modelled on s3CacheHeaderMigrationJobModel.js, but with its own JOB_TYPE, its own
 * collection, and its own `activeSlot` index — deliberately NOT sharing a job type
 * with the WebP/cache-header jobs, so they never contend over the same documents.
 */
import mongoose from "mongoose";
import { S3KEYMIGRATIONJOB } from "../../collectionName.js";

const migrationFailureSchema = new mongoose.Schema(
  {
    rowId: { type: String, default: "" },
    oldKey: { type: String, default: "" },
    step: { type: String, default: "" },
    error: { type: String, default: "" },
  },
  { _id: false },
);

const migrationCountsSchema = new mongoose.Schema(
  {
    total: { type: Number, default: 0 },
    done: { type: Number, default: 0 },
    skipped: { type: Number, default: 0 },
    failed: { type: Number, default: 0 },
  },
  { _id: false },
);

/** state.json's shape, mirrored — see the plan's "Where run state lives". */
const migrationCheckpointSchema = new mongoose.Schema(
  {
    version: { type: Number, default: 1 },
    cursor: { type: String, default: "" },
  },
  { _id: false },
);

const s3KeyMigrationJobSchema = new mongoose.Schema(
  {
    jobType: {
      type: String,
      default: "s3-key-restructure",
      index: true,
    },
    activeSlot: { type: String, default: undefined },
    runId: { type: String, required: true, index: true },
    // The single most important field on the monitoring card: which database a
    // rewrite/reverse is actually pointed at. Never inferred — always set explicitly
    // by the CLI from --uri= so the card cannot show the wrong one.
    targetDb: { type: String, default: "" }, // "massClick" | "massClick_dev" | ""
    scopeKey: { type: String, default: "all" },
    phase: {
      type: String,
      enum: ["plan", "copy", "verify-s3", "rewrite", "verify", "sweep", "reverse"],
      default: "plan",
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
    checkpoint: { type: migrationCheckpointSchema, default: () => ({}) },
    counts: { type: migrationCountsSchema, default: () => ({}) },
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
  },
  { timestamps: true },
);

s3KeyMigrationJobSchema.index({ jobType: 1, createdAt: -1 });
s3KeyMigrationJobSchema.index({ jobType: 1, runId: 1 }, { unique: true });
s3KeyMigrationJobSchema.index(
  { jobType: 1, activeSlot: 1 },
  {
    unique: true,
    partialFilterExpression: { activeSlot: "active" },
    name: "one_active_s3_key_migration",
  },
);

// Exported so the CLI (which opens its own per-invocation connection via
// mongoose.createConnection(), not the app's shared default connection the Express
// server uses) can bind the SAME schema to that connection via `connection.model(...)`
// instead of duplicating the schema — see utils/s3MigrationJobTracking.js.
export { s3KeyMigrationJobSchema };

const s3KeyMigrationJobModel =
  mongoose.models[S3KEYMIGRATIONJOB] ||
  mongoose.model(S3KEYMIGRATIONJOB, s3KeyMigrationJobSchema);

export default s3KeyMigrationJobModel;
