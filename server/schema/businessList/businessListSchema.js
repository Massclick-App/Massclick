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
  paymentDate: {
    type: Date,
    default: null,
  },
  responseData: {
    type: Object,
    default: {},
  },
});

const businessListSchema = new mongoose.Schema({
  clientId: { type: String, default: '', },
  businessName: { type: String, default: '', },
  plotNumber: { type: String, default: '', },
  street: { type: String, default: '', },
  pincode: { type: String, default: '', },
  email: { type: String, default: '', },
  contact: { type: String, default: '', },
  contactList: { type: String, default: '', },
  gstin: { type: String, default: '', },
  whatsappNumber: { type: String, default: '', required: true },
  experience: { type: String, default: '', required: true },
  businessesLive: { type: Boolean, default: false },
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
  location: { type: String, default: '', required: true },
  category: { type: String, default: '', required: true },
  keywords: [{ type: String, default: '' }],
  slug: { type: String, default: '' },
  seoTitle: { type: String, default: '' },
  seoDescription: { type: String, default: '' },
  title: { type: String, default: '' },
  description: { type: String, default: '' },
  bannerImageKey: { type: String, default: '' },
  businessImagesKey: [{ type: String, default: '' }],
  qrCode: {
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
    priorityScore: { type: Number, default: 0 },
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
    lastViewedAt: { type: Date, default: null },
  },
  payment: {
    type: [paymentSchema],
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
  isActive: { type: Boolean, default: true },
});

export default businessListSchema;