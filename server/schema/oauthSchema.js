import mongoose from "mongoose";


const oauthSchema = new mongoose.Schema({
    accessToken: { type: String, required: true },
    accessTokenExpiresAt: { type: Date, required: true },

    // ✅ OPTIONAL for client_credentials
    refreshToken: { type: String, required: false },
    refreshTokenExpiresAt: { type: Date, required: false },

    client: { type: Object, required: true },
    user: { type: Object, required: true },

    isRevoked: { type: Boolean, default: false },
    lastUsedAt: { type: Date, default: Date.now },
    createdAt: { type: Date, default: Date.now },
});

export default oauthSchema;
