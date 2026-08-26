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

    // Public URL segment for this node: usually the bare leaf name
    // ("srirangam"), unlike `slug` above which is the full hierarchical path.
    // When another node at the same level in the same district shares that
    // bare name (e.g. 9 different "Anna Nagar" localities within
    // Tiruchirappalli), it is qualified with the parent's name instead —
    // "anna-nagar-ariyamangalam" — so every node still resolves to a unique
    // URL. Denormalized so /trichy/srirangam/hotels resolves with one
    // indexed lookup instead of a scan. Always written via
    // computePublicLocationSlugs() in helper/location/locationSlug.js — that
    // function is the single definition, it must be run over ALL active
    // sibling docs at once (never derived for one doc in isolation, it
    // cannot know about collisions that way), and this field must never be
    // set by hand.
    publicLocationSlug: {
        type: String,
        default: "",
        lowercase: true,
        trim: true,
        index: true,
    },

    // District-level docs only. Publishes a district under a shorter commonly
    // used name (Tiruchirappalli -> "trichy") without renaming the record.
    // Empty on every other level; resolution falls back to slugify(district).
    urlAlias: {
        type: String,
        default: "",
        lowercase: true,
        trim: true,
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

    // Optional grouping for neighborhoods that span sibling hierarchy nodes.
    // Example: Thillai Nagar East/Main and their cross streets share one
    // search group even though East and Main are separate wards.
    searchGroupSlug: {
        type: String,
        default: null,
        lowercase: true,
        trim: true,
        index: true,
    },
    searchGroupNames: {
        type: [String],
        default: undefined,
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
    coordinatesMeta: {
        source: {
            type: String,
            enum: ["", "google-geocode", "derived-from-children", "manual"],
            default: "",
        },
        confidence: {
            type: String,
            enum: ["", "high", "medium", "low"],
            default: "",
        },
        query: {
            type: String,
            default: "",
        },
        formattedAddress: {
            type: String,
            default: "",
        },
        placeId: {
            type: String,
            default: "",
        },
        derivedFromCount: {
            type: Number,
            default: 0,
        },
        updatedAt: {
            type: Date,
            default: null,
        },
    },

    // The public gate. Every public read path filters on isActive: true, so
    // this doubles as the enable/disable switch: a disabled location stays in
    // the collection but disappears from search, URLs and sitemaps.
    isActive: {
        type: Boolean,
        default: true,
        index: true,
    },

    // Why a document is in its current isActive state. isActive alone cannot
    // say that, because deleteMasterLocation() also sets isActive: false —
    // without this field a bulk-imported location awaiting review would be
    // indistinguishable from one an admin deliberately removed.
    //   approved — reviewed (or pre-existing) and live
    //   pending  — bulk-imported, not yet checked by a human, disabled
    //   rejected — reviewed and turned down; kept so it is not re-imported
    // Defaults to "approved" so every document that predates this field
    // keeps its existing meaning.
    reviewStatus: {
        type: String,
        enum: ["approved", "pending", "rejected"],
        default: "approved",
        index: true,
    },

    // Where a bulk-imported document came from (e.g. "census", "osm",
    // "gmaps"). Empty for hand-created entries. Kept so a whole import batch
    // can be reviewed, filtered or rolled back by provenance.
    importSource: {
        type: String,
        default: "",
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

// Resolves /:district/:location/... in one lookup. Deliberately NOT unique:
// a name can legitimately repeat at different levels within one district
// (a ward and a locality inside it sharing a name), and the resolver breaks
// that tie by depth. Uniqueness is asserted by the Phase 1 verification query,
// not by the index.
masterLocationSchema.index({ district: 1, publicLocationSlug: 1 });

export default masterLocationSchema;
