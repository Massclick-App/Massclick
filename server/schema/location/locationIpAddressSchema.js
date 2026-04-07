import mongoose from "mongoose"

const ipLocationSchema  = new mongoose.Schema({

    ip: {
        type: String,
    },
    city: {
        type: String,
    },
    region: {
        type: String,
    },
    country_name: {
        type: String,
    },
    latitude: {
        type: String,
    },
    longitude: {
        type: String,
    },
    fetchedAt: {
        type: String,
    },
    isActive: {
        type: Boolean,
        default: true,
    },
});

export default ipLocationSchema ;