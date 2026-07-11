import mongoose from "mongoose"
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

businessListSchema.pre("validate", function syncBusinessName(next) {
  if (!this.businessName && this.name) {
    this.businessName = this.name;
  }

  if (!this.name && this.businessName) {
    this.name = this.businessName;
  }

  next();
});

export default businessListSchema;
