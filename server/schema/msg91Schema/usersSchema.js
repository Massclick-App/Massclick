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
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export default message91UsersSchema;
