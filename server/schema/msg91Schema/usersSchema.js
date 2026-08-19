import mongoose from "mongoose";

const message91UsersSchema = new mongoose.Schema({
  title: { type: String, enum: ["Mr", "Ms"], default: "Mr" },
  userName: { type: String },
  businessPeople: { type: Boolean, default: false },
  businessName: { type: String, default: "" },
  businessLocation: { type: String, default: "" },
  firstTimeUser: { type: Boolean, default: false },
  profileImageKey: { type: String, default: "" },
  email: { type: String },
  emailVerified: { type: String },
  mobileNumber1: { type: String, unique: true, required: true },
  businessCategory: {
    category: { type: String, default: "" },
    keywords: [String],
    slug: { type: String, default: "" },
    seoTitle: { type: String, default: "" },
    seoDescription: { type: String, default: "" },
    title: { type: String, default: "" },
    description: { type: String, default: "" }
  },
  currentOtp: { type: String, default: null },
  otpGeneratedAt: { type: Date, default: null },
  otpExpiresAt: { type: Date, default: null },
  mobileNumber1Verified: { type: Boolean, default: true },
  mobileNumber2: { type: String, default: "" },
  mobileNumber2Verified: { type: Boolean, default: false },
  permanentAddress: {
    plotNo: { type: String },
    street: { type: String },
    pincode: { type: String },
    homeLandline: { type: String, default: "" },
    officeLandline: { type: String, default: "" },
  },
  officeAddress: {
    plotNo: { type: String, default: "" },
    street: { type: String, default: "" },
    pincode: { type: String, default: "" },
    officeLandline: { type: String, default: "" },
  },
  familyAndFriends: [
    {
      name: { type: String },
      relation: { type: String, default: "" },
      contactNumber: { type: String, default: "" },
      email: { type: String, default: "" },
    },
  ],
  favorites: {
    colors: [String],
    food: [String],
    hobbies: [String],
  },
  leadsData: [
    {
      email: { type: String },
      mobileNumber1: { type: String, default: "" },
      mobileNumber2: { type: String, default: "" },
      searchedUserText: { type: String, default: "" },
      time: { type: String, default: "" },
      userName: { type: String, default: "" },
      isWhatsappSend: { type: Boolean, default: false },
      isReaded: { type: Boolean, default: false },
      // Real timestamps powering the owner dashboard's time-based lead metrics
      // (today / this-week counts, own-lead trend, response time). Accrue from
      // deploy forward; leads created earlier simply have these unset.
      createdAt: { type: Date, default: Date.now },
      readAt: { type: Date, default: null },
    },
  ],
  searchHistory: [
    {
      query: { type: String, required: true },
      location: { type: String, default: "Global" },
      category: { type: String, default: "General" },
      searchedAt: { type: Date, default: Date.now },
    },
  ],
  fcmTokens: [
    {
      token: { type: String, required: true },
      deviceName: { type: String, default: '' },
      platform: { type: String, enum: ['android', 'ios', 'web'], default: 'android' },
      isActive: { type: Boolean, default: true },
      registeredAt: { type: Date, default: Date.now },
      lastRefreshedAt: { type: Date, default: Date.now },
      expiresAt: { type: Date, default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) } // 30 days
    }
  ],
  profileCompleted: { type: Boolean, default: false },
  registeredFrom: { type: String, enum: ["mobile", "web", "unknown"], default: "unknown" },
  lastLoginAt: { type: Date, default: null },
  loginCount: { type: Number, default: 0 },
  welcomeBonusEligible: { type: Boolean, default: false },
  welcomeBonusGrantedAt: { type: Date, default: null },
  // The WhatsApp welcome can only go out once the account has a real name.
  // Web has one at verify time; mobile only gets one after profile setup,
  // so there are two possible send points and this stamp stops them from
  // doubling up.
  loginWelcomeSentAt: { type: Date, default: null },
  // Set only when an account is created before its owner has typed a name,
  // so the profile save that follows knows a greeting is still owed.
  // Accounts predating this flag stay false and are never retro-greeted.
  loginWelcomePending: { type: Boolean, default: false },
  rewardPoints: {
    availablePoints: { type: Number, min: 0, default: 0 },
    lifetimeEarned: { type: Number, min: 0, default: 0 },
    lifetimeRedeemed: { type: Number, min: 0, default: 0 },
    tier: { type: String, default: "Starter" },
    lastSyncedAt: { type: Date, default: null },
  },
  // Force-logout counter. Incrementing this invalidates every JWT already issued
  // to the user, logging them out on all devices (customer tokens are stateless,
  // so there is no session row to delete). Checked in buildCustomerActor.
  tokenVersion: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export default message91UsersSchema;
