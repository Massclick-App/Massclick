import mongoose from "mongoose";


const oauthSchema = new mongoose.Schema({
    accessToken: { type: String, required: true },
    accessTokenExpiresAt: { type: Date, required: true },
    refreshToken: { type: String, required: true },
    refreshTokenExpiresAt: { type: Date, required: true },
    client: { type: Object, required: true },
    user: { type: Object, required: true },
    isRevoked: { type: Boolean, default: false },
    lastUsedAt: { type: Date, default: Date.now },
    createdAt: { type: Date, default: Date.now },

});

export default oauthSchema;
