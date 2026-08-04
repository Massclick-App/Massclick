import mongoose from "mongoose"

const searchLogSchema = new mongoose.Schema({
    categoryName: {
        type: String,
        index: true
    },
    searchedUserText: {
        type: String,
        index: true
    },
    location: {
        type: String,
        index: true
    },
    // District the search resolved to. Optional: callers that predate the
    // district-prefixed URL scheme still send `location` alone. When present it
    // is the reliable disambiguator — 390 locality names are shared across
    // multiple districts, so `location` by itself cannot identify a place.
    district: {
        type: String,
        index: true
    },
    // Canonical masterlocation slug when the caller resolved one (a verified
    // pick rather than free text), so demand can be aggregated per node.
    masterLocationSlug: {
        type: String,
        index: true
    },
    userDetails: [
        {
            userName: String,
            mobileNumber1: String,
            mobileNumber2: String,
            email: String
        }
    ],
    isRead: { type: Boolean, default: false },
    whatsapp: { type: Boolean, default: false },
    isAnonymous: { type: Boolean, default: false, index: true },
    // Short hash of IP+UA — only used to dedup anonymous logs. Raw IP is never stored.
    anonFingerprint: { type: String, default: '' },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 604800
    }
});

export default searchLogSchema;