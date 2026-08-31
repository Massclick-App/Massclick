import mongoose from "mongoose"
import { generateUniquePublicId } from "../../helper/businessList/businessUrl.js";
const { Schema } = mongoose;

const paymentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  businessId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "BusinessList",
    required: false,
  },
  transactionId: {
    type: String,
  },
  orderId: {
    type: String,
    default: null,
  },
  amount: {
    type: Number,
  },
  gstAmount: {
    type: Number,
    default: 0,
  },
  totalAmount: {
    type: Number,
    default: 0,
  },
  paymentGateway: {
    type: String,
    default: "phonepe",
  },
  paymentStatus: {
    type: String,
    enum: ["PENDING", "SUCCESS", "FAILED"],
    default: "PENDING",
  },
  paid: {
    type: Boolean,
    default: false,
  },
  paymentDate: {
    type: Date,
    default: null,
  },
  invoiceEmailSent: {
    type: Boolean,
    default: false,
  },
  invoiceEmailSentAt: {
    type: Date,
    default: null,
  },
  responseData: {
    type: Object,
    default: {},
  },
});

const mniSchema = new mongoose.Schema({
  categoryGroup: {
    type: String,
  },
  categoryGroupLocation: {
    type: String,
  },
  leadsCount: {
    type: Number,
    default: 0,
  },
  leadsCategory: [
    {
      type: String
    }
  ],
  lastLeadsUpdate: {
    type: Date,
    default: null,
  },
  sentLeads: [
    {
      to: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "BusinessList"
      },
      businessName: String,
      location: String,
      category: String,
      date: {
        type: Date,
        default: Date.now
      }
    }
  ]
});

// Link to the canonical masterlocations hierarchy. The free-text `location`
// field stays untouched; this block is filled by the pincode backfill, admin
// edits, or owner selection. `slug` is the deepest resolved node's slug —
// since parent slugs prefix child slugs, a subtree query at any level is an
// anchored regex on it. Name fields below `resolvedLevel` stay null.
const businessMasterLocationSchema = new mongoose.Schema({
  locationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "masterlocation",
    default: null,
  },
  slug: { type: String, default: null },
  state: { type: String, default: null },
  district: { type: String, default: null },
  zone: { type: String, default: null },
  ward: { type: String, default: null },
  locality: { type: String, default: null },
  resolvedLevel: {
    type: String,
    enum: ["district", "zone", "ward", "locality"],
    default: null,
  },
  confidence: {
    type: String,
    enum: ["high", "medium", "low"],
    default: null,
  },
  source: {
    type: String,
    enum: ["pincode", "pincode+text", "text-match", "manual", "owner-selected"],
    default: null,
  },
  linkedAt: { type: Date, default: null },
}, { _id: false });

const businessListSchema = new mongoose.Schema({
  clientId: { type: String, default: '', },
  name: { type: String, default: '', },
  businessName: { type: String, default: '', },
  // Short, stable, public-facing identifier — the trailing chunk of a business
  // detail URL (/business/trichy/hexahub-homestay-a1b2c3). Exists so the URL
  // can carry the business name without the name having to be unique, and so
  // renaming a business is a cosmetic slug change rather than a new identity.
  //
  // Deliberately NOT derived from _id: slicing an ObjectId gives no uniqueness
  // guarantee (6 hex chars over ~10k businesses is roughly a 0.3% collision
  // chance), and the full ObjectId leaks the document's creation timestamp.
  // Generated randomly and retried against the unique index below instead —
  // see generatePublicId in helper/businessList/businessUrl.js.
  //
  // The uniqueness index is declared below via schema.index() rather than
  // here: it has to be a PARTIAL index, which the field-level shorthand can't
  // express. `sparse` would be wrong — it only skips documents missing the
  // field, not ones holding an explicit null, and this field defaults to null.
  // With sparse, the second business written without a generated publicId
  // would fail with a duplicate-key error on null.
  publicId: {
    type: String,
    default: null,
  },
  sourcePublicizeId: {
    type: Schema.Types.ObjectId,
    ref: 'publicize',
    default: null,
  },
  plotNumber: { type: String, default: '', },
  street: { type: String, default: '', },
  pincode: { type: String, default: '', },
  email: { type: String, default: '', },
  contact: { type: String, default: '', },
  contactList: { type: String, default: '', },
  gstin: { type: String, default: '', },
  whatsappNumber: { type: String, default: '' },
  experience: { type: String, default: '' },
  businessesLive: { type: Boolean, default: false },
  amountPaid: { type: Boolean, default: false },
  premiumBusiness: { type: Boolean, default: false },
  paidDate: { type: Date, default: null },

  openingHours: [
    {
      day: { type: String, required: true },
      open: { type: String, default: "09:00" },
      close: { type: String, default: "18:00" },
      isClosed: { type: Boolean, default: false },
      is24Hours: { type: Boolean, default: false }
    }
  ],
  restaurantOptions: { type: String, default: '', },
  location: { type: String, default: '' },
  masterLocation: {
    type: businessMasterLocationSchema,
    default: null,
  },
  category: { type: String, default: '', required: true },
  subcategory: { type: String, default: '' },
  keywords: [{ type: String, default: '' }],
  slug: { type: String, default: '' },
  seoTitle: { type: String, default: '' },
  seoDescription: { type: String, default: '' },
  title: { type: String, default: '' },
  description: { type: String, default: '' },
  bannerImageKey: { type: String, default: '' },
  businessImagesKey: [{ type: String, default: '' }],
  logoImageKey: { type: String, default: null },
  logoUploadedAt: { type: Date, default: null },
  qrCode: {
    qrText: { type: String, default: "" },
    qrImageKey: { type: String, default: "" },
    createdAt: { type: Date, default: null }
  },
  businessProfileQrCode: {
    qrText: { type: String, default: "" },
    qrImageKey: { type: String, default: "" },
    createdAt: { type: Date, default: null }
  },
  googleMap: { type: String, default: '', },
  website: { type: String, default: '', },
  facebook: { type: String, default: '', },
  instagram: { type: String, default: '', },
  youtube: { type: String, default: '', },
  pinterest: { type: String, default: '', },
  twitter: { type: String, default: '', },
  linkedin: { type: String, default: '', },
  businessDetails: { type: String, default: '', },
  globalAddress: { type: String, default: '', },
  subscription: {
    plan: {
      type: String,
      enum: ["FREE", "PREMIUM", "DIAMOND", "PLATINUM"],
      default: "FREE",
    },
    isActive: { type: Boolean, default: false },
    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null },
    autoRenew: { type: Boolean, default: false },
  },
  paymentConcept: {
    baseAmount: { type: Number, default: 0, min: 0 },
    gstRate: { type: Number, default: 18, min: 0 },
    gstAmount: { type: Number, default: 0, min: 0 },
    totalAmount: { type: Number, default: 0, min: 0 },
    advancePaid: { type: Number, default: 0, min: 0 },
    pendingAmount: { type: Number, default: 0, min: 0 },
    paymentStatus: {
      type: String,
      enum: ["unpaid", "part_paid", "paid"],
      default: "unpaid",
    },
    paymentMethod: {
      type: String,
      enum: ["not_selected", "cash", "upi", "bank_transfer", "card", "cheque", "phonepe", "other"],
      default: "not_selected",
    },
    paymentReference: { type: String, default: "" },
    paymentDueDate: { type: Date, default: null },
    notes: { type: String, default: "" },
    updatedAt: { type: Date, default: null },
  },
  verification: {
    isVerified: { type: Boolean, default: false },
    verifiedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    verifiedAt: { type: Date, default: null },
    verificationType: {
      type: String,
      enum: ["ADMIN", "DOCUMENT", "AUTO"],
      default: "ADMIN",
    },
  },
  badges: {
    isFeatured: { type: Boolean, default: false },
    isSponsored: { type: Boolean, default: false },
    isTrending: { type: Boolean, default: false },
    isTrust: { type: Boolean, default: false },
    priorityScore: { type: Number, default: 0 },
  },
  certificates: {
    verifiedCertificateKey: { type: String, default: '' },
    trustCertificateKey: { type: String, default: '' },
    generatedAt: { type: Date, default: null },
    templateVersion: { type: Number, default: 0 },
  },
  geoLocation: {
    // Both subfields default to undefined deliberately, mirroring the same
    // fix on masterLocationSchema. [0, 0] is a real, indexable point in the
    // Gulf of Guinea: it satisfied every "does this business have a location"
    // check while being nowhere near India, so an unset coordinate was
    // indistinguishable from a valid one and still entered the 2dsphere index
    // below.
    //
    // `type` must default to undefined too, not just `coordinates`. A document
    // carrying { type: "Point" } with no coordinates is invalid GeoJSON, and
    // the 2dsphere index rejects the whole insert rather than skipping the
    // field. Absent means absent - both keys or neither.
    type: {
      type: String,
      enum: ["Point"],
      default: undefined,
    },
    coordinates: {
      type: [Number],
      default: undefined,
    },
  },
  // How much the business geoLocation should be trusted for search ranking.
  // Many legacy rows carry locality or district centroids as if they were
  // exact storefront pins. Search should prefer the linked masterlocation
  // point for those broad/bad cases instead of ranking them as precise.
  geoLocationPrecision: {
    type: String,
    enum: ["unknown", "address", "locality", "district", "outside-district", "invalid"],
    default: "unknown",
    index: true,
  },
  geoLocationPrecisionMeta: {
    reason: { type: String, default: "" },
    sharedCount: { type: Number, default: 0 },
    outsideDistrictKm: { type: Number, default: null },
    updatedAt: { type: Date, default: null },
  },
  analytics: {
    views: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
    leads: { type: Number, default: 0 },
    favoritesCount: { type: Number, default: 0 },
    lastViewedAt: { type: Date, default: null },
  },
  payment: {
    type: [paymentSchema],
    default: []
  },
  mniDetails: {
    type: [mniSchema],
    default: []
  },
  kycDocumentsKey: [{ type: String, default: '' }],
  averageRating: {
    type: Number,
    default: 0,
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  activeBusinesses: { type: Boolean, default: true },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  filters: { type: mongoose.Schema.Types.Mixed, default: {} },
  isActive: { type: Boolean, default: true },
});

businessListSchema.index({ geoLocation: "2dsphere" });

// Structured location search: slug prefix covers subtree queries at any
// hierarchy level; district exact-match covers the most common search scope.
businessListSchema.index({ "masterLocation.slug": 1 });
businessListSchema.index({ "masterLocation.district": 1, isActive: 1 });

// Public URL identity. Partial rather than sparse so that documents holding a
// null publicId (the field default, e.g. a pre-backfill doc or a bulk insert
// that bypassed the assignPublicId hook) are excluded from the index entirely
// instead of colliding with each other on null.
businessListSchema.index(
  { publicId: 1 },
  { unique: true, partialFilterExpression: { publicId: { $type: "string" } } },
);

businessListSchema.pre("validate", function syncBusinessName(next) {
  if (!this.businessName && this.name) {
    this.businessName = this.name;
  }

  if (!this.name && this.businessName) {
    this.name = this.businessName;
  }

  next();
});

// Mint a publicId for new documents so a business is URL-addressable the
// moment it exists. Never overwrites one — a publicId is permanent public
// identity; changing it would break every indexed URL and printed QR code for
// that business.
businessListSchema.pre("validate", async function assignPublicId(next) {
  if (this.publicId) return next();

  try {
    this.publicId = await generateUniquePublicId(this.constructor);
    return next();
  } catch (error) {
    return next(error);
  }
});

export default businessListSchema;
