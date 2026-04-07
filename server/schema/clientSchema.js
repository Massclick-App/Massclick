import mongoose from "mongoose"

const clientSchema = new mongoose.Schema({
    id: String,
    clientId: String,
    clientSecret: String,
    grants: [String],
    redirectUris: [String],
});

export default clientSchema;