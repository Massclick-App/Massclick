import mongoose from "mongoose";

const authAuditSchema = new mongoose.Schema(
  {
    eventId: { type: String, required: true, unique: true },
    createdAt: { type: Date, default: Date.now, index: true },
    eventType: { type: String, required: true, index: true },
    source: { type: String, default: "http", index: true },
    statusCode: { type: Number, default: null },
    message: { type: String, default: "" },
    path: { type: String, default: null },
    method: { type: String, default: null },
    ip: { type: String, default: null },
    actor: {
      actorType: { type: String, default: null, index: true },
      sessionType: { type: String, default: null },
      subjectId: { type: String, default: null },
      role: { type: String, default: null },
      mobile: { type: String, default: null },
      deviceId: { type: String, default: null },
      clientId: { type: String, default: null },
      tokenId: { type: String, default: null },
    },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { minimize: false }
);

authAuditSchema.index({ createdAt: -1 });
authAuditSchema.index({ eventType: 1, createdAt: -1 });
authAuditSchema.index({ "actor.actorType": 1, createdAt: -1 });
authAuditSchema.index({ source: 1, createdAt: -1 });

export default authAuditSchema;
