import mongoose from "mongoose";
// In oauthSchema.js — add deviceId field and compound index

const oauthSchema = new mongoose.Schema({
  accessToken:            { type: String, required: true },
  accessTokenExpiresAt:   { type: Date,   required: true },
  refreshToken:           { type: String, required: false },
  refreshTokenExpiresAt:  { type: Date,   required: false },
  // Later of accessTokenExpiresAt/refreshTokenExpiresAt, set on every save.
  // TTL runs off this field because refreshTokenExpiresAt is absent on the
  // vast majority of documents (client_credentials grants have no refresh
  // token), which left the old refreshTokenExpiresAt TTL index unable to
  // reap anything.
  expiresAt:              { type: Date,   required: true },
  client:                 { type: Object, required: true },
  user:                   { type: Object, required: true },
  // NEW: embedded in user sub-doc for upsert filter
  // (also replicated at top level for indexing)
  deviceId:               { type: String, required: false, default: 'unknown' },
  // Set only on client_credentials saves. partialFilterExpression only
  // supports equality/`$exists: true` — it cannot express "refreshToken is
  // absent" ($exists: false compiles to $not, which Mongo rejects in partial
  // indexes) — so this explicit flag is what the partial index below filters on.
  isClientCredential:     { type: Boolean, default: false },
  isRevoked:              { type: Boolean, default: false },
  lastUsedAt:             { type: Date,   default: Date.now },
  createdAt:              { type: Date,   default: Date.now },
});

// Compound unique index: one live client token per (clientId, device).
// This makes the findOneAndUpdate upsert atomic and collision-free.
// Note: `sparse` and `partialFilterExpression` cannot be combined on the same
// MongoDB index (the server rejects the spec), and partialFilterExpression
// cannot express `refreshToken: { $exists: false }` (Mongo only allows
// `$exists: true` there) — hence the isClientCredential equality filter.
oauthSchema.index(
  { 'client.clientId': 1, deviceId: 1 },
  { unique: true, partialFilterExpression: { isClientCredential: true } }
);

// Keep existing fast-lookup indexes.
oauthSchema.index({ accessToken: 1 });
oauthSchema.index({ refreshToken: 1 }, { sparse: true });

// TTL cleanup: every document has expiresAt, so this actually reaps rows
// (replaces the old refreshTokenExpiresAt TTL index, which most documents
// could never satisfy). 24h grace after expiry so recently-expired sessions
// stay visible in the auth console for a day before being purged.
oauthSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 24 * 60 * 60 });

export default oauthSchema;