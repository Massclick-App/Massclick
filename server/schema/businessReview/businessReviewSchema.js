import mongoose from "mongoose"
const { Schema } = mongoose;

const businessReviewSchema = new Schema({
  businessId: {
    type: Schema.Types.ObjectId,
    ref: "BusinessList",
    index: true,
    required: true
  },

 userId: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "User",
  required: true
},

  userName: {
    type: String,
    trim: true,
    default: "Anonymous"
  },

  rating: {
    type: Number,
    required: true,
    min: 0.5,
    max: 5
  },

  ratingExperience: {
    type: String,
    trim: true,
    minlength: 5,
    maxlength: 2000,
    required: true
  },

  ratingLove: {
    type: [String],
    default: []
  },

  userProfileImage: {
    type: String,
    default: ""
  },

  isVerifiedUser: {
    type: Boolean,
    default: false
  },

  ratingPhotos: {
    type: [String],
    default: []
  },

  helpfulCount: {
    type: Number,
    default: 0
  },

 helpfulBy: [{
  type: mongoose.Schema.Types.ObjectId,
  ref: "User"
}],

 replies: [{
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  userName: String,
  role: String,
  message: String,
  createdAt: { type: Date, default: Date.now }
}],

  status: {
    type: String,
    enum: ["ACTIVE", "HIDDEN", "REPORTED"],
    default: "ACTIVE"
  },

  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default businessReviewSchema;