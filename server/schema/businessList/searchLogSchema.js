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
    // Search-origin telemetry captured from the result API. `masterLocationSlug`
    // is the caller's selected slug when available; `resolvedSlug` is the
    // server node actually used to scope/rank the search.
    resolvedSlug: {
        type: String,
        index: true
    },
    resolvedLevel: {
        type: String,
        index: true
    },
    originSource: {
        type: String,
        index: true
    },
    originConfidence: {
        type: String,
        index: true
    },
    originLat: {
        type: Number,
        default: null
    },
    originLng: {
        type: Number,
        default: null
    },
    originRadiusKm: {
        type: Number,
        default: null
    },
    distanceSortUsed: {
        type: Boolean,
        default: false,
        index: true
    },
    distanceBandsKm: {
        type: [Number],
        default: []
    },
    resultCount: {
        type: Number,
        default: 0,
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
