import mongoose from "mongoose";

// Raw first-party visitor events. Auto-purged after 90 days by the TTL
// index on `ts`; long-term trends belong in a future rollup collection.
export const RAW_EVENT_TTL_SECONDS = 7776000; // 90 days

export const EVENT_TYPES = [
    "page_view",
    "business_view",
    "business_click",
    "search",
    "search_result_click",
];

export const BUSINESS_ACTIONS = ["call", "whatsapp", "direction", "enquiry", "show_number"];
export const BUSINESS_SOURCES = ["card", "detail"];
export const DEVICE_TYPES = ["mobile", "tablet", "desktop", "other"];

const webEventSchema = new mongoose.Schema(
    {
        type: { type: String, required: true, enum: EVENT_TYPES },
        ts: { type: Date, default: Date.now, expires: RAW_EVENT_TTL_SECONDS },
        sessionId: { type: String, required: true },
        deviceId: { type: String, required: true },
        userId: { type: mongoose.Schema.Types.ObjectId, default: null },
        isNewSession: { type: Boolean, default: false },
        path: { type: String, default: "" },
        // External referrer origin, only stored on a session's first page_view.
        referrer: { type: String, default: "" },
        // Landing UTM params, only stored on a session's first page_view — this
        // is how QR codes and offline banners (which have no referrer at all)
        // get attributed to a campaign.
        utm: {
            source: { type: String, default: "" },
            medium: { type: String, default: "" },
            campaign: { type: String, default: "" },
            term: { type: String, default: "" },
            content: { type: String, default: "" },
        },
        device: { type: String, enum: DEVICE_TYPES, default: "other" },
        browser: { type: String, default: "Other" },
        // Short hash of IP+UA for abuse analysis. Raw IP is never stored.
        fp: { type: String, default: "" },
        biz: {
            businessId: { type: mongoose.Schema.Types.ObjectId },
            name: { type: String },
            action: { type: String, enum: BUSINESS_ACTIONS },
            source: { type: String, enum: BUSINESS_SOURCES },
        },
        search: {
            query: { type: String },
            location: { type: String },
            results: { type: Number },
            known: { type: Boolean },
            position: { type: Number },
        },
    },
    { versionKey: false }
);

webEventSchema.index({ type: 1, ts: -1 });
webEventSchema.index({ sessionId: 1, ts: -1 });
webEventSchema.index(
    { "biz.businessId": 1, ts: -1 },
    { partialFilterExpression: { "biz.businessId": { $exists: true } } }
);

export default webEventSchema;
