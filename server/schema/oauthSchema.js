// In oauthSchema.js — add deviceId field and compound index

const oauthSchema = new mongoose.Schema({
  accessToken:            { type: String, required: true },
  accessTokenExpiresAt:   { type: Date,   required: true },
  refreshToken:           { type: String, required: false },
  refreshTokenExpiresAt:  { type: Date,   required: false },
  client:                 { type: Object, required: true },
  user:                   { type: Object, required: true },
  // NEW: embedded in user sub-doc for upsert filter
  // (also replicated at top level for indexing)
  deviceId:               { type: String, required: false, default: 'unknown' },
  isRevoked:              { type: Boolean, default: false },
  lastUsedAt:             { type: Date,   default: Date.now },
  createdAt:              { type: Date,   default: Date.now },
});

// Compound unique index: one live client token per (clientId, device).
// This makes the findOneAndUpdate upsert atomic and collision-free.
oauthSchema.index(
  { 'client.clientId': 1, deviceId: 1 },
  { unique: true, sparse: true, partialFilterExpression: { refreshToken: { $exists: false } } }
);

// Keep existing fast-lookup indexes.
oauthSchema.index({ accessToken: 1 });
oauthSchema.index({ refreshToken: 1 }, { sparse: true });

export default oauthSchema;