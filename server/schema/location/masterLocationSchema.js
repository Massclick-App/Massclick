import mongoose from "mongoose"

// Schema for the `masterlocations` collection — the full Trichy location
// hierarchy (district > zone > ward > locality). Every level is its own
// document; parent slug is a prefix of every child slug, so broader search
// is an anchored regex on `slug`.
const masterLocationSchema = new mongoose.Schema({
    // Hierarchy - denormalized for fast queries and search
    state: {
        type: String,
        required: true,
        index: true,
    },
    district: {
        type: String,
        required: true,
        index: true,
    },
    zone: {
        type: String,
        default: null,
        index: true,
    },
    ward: {
        type: String,
        default: null,
        index: true,
    },
    locality: {
        type: String,
        default: null,
        index: true,
    },

    // Unique hierarchical slug, e.g.
    // tamil-nadu-tiruchirappalli-srirangam-renga-nagar-amma-mandapam
    slug: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        index: true,
    },

    // Breadcrumb for UI display
    hierarchyPath: {
        type: String,
        required: true,
    },

    // Search optimization (locality + ward + zone + alternate spellings, lowercased)
    keywords: {
        type: [String],
        default: [],
        index: true,
    },
    alternateNames: {
        type: [String],
        default: [],
    },

    // Depth of this document in the hierarchy
    level: {
        type: String,
        enum: ["state", "district", "zone", "ward", "locality"],
        required: true,
        index: true,
    },

    // Pincode of a locality/ward; null on parents spanning multiple codes
    pincode: {
        type: String,
        default: null,
    },
    // Rolled-up pincodes of all children (present on district/zone/ward docs)
    pincodes: {
        type: [String],
        default: undefined,
    },
    // Number of direct children (wards for a zone, localities for a ward)
    childCount: Number,

    coordinates: {
        type: {
            type: String,
            enum: ["Point"],
            default: "Point",
        },
        coordinates: {
            type: [Number],
            default: [0, 0],
        },
    },

    isActive: {
        type: Boolean,
        default: true,
        index: true,
    },

    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
});

// Geo index for proximity search
masterLocationSchema.index({ coordinates: "2dsphere" });

// Compound indexes matching the collection's existing indexes
masterLocationSchema.index({ level: 1, isActive: 1 });
masterLocationSchema.index({ district: 1, zone: 1, ward: 1, locality: 1 });

export default masterLocationSchema;
