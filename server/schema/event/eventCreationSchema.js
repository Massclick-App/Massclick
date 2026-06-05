import mongoose from "mongoose";

const eventCreationSchema = new mongoose.Schema(
  {
    eventName: {
      type: String,
      required: true,
      trim: true,
    },
    eventCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "eventcategory",
      required: true,
    },
    eventLocation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "eventlocation",
      required: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    eventImage: {
      type: String,
      default: "",
    },
    eventImageKey: {
      type: String,
      default: "",
    },
    bannerImage: {
      type: String,
      default: "",
    },
    bannerImageKey: {
      type: String,
      default: "",
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    startTime: {
      type: String,
      trim: true,
      default: "",
    },
    endTime: {
      type: String,
      trim: true,
      default: "",
    },
    eventType: {
      type: String,
      enum: ["virtual", "physical", "hybrid"],
      default: "physical",
    },
    organizer: {
      type: String,
      trim: true,
      default: "",
    },
    organizerEmail: {
      type: String,
      trim: true,
      default: "",
    },
    organizerPhone: {
      type: String,
      trim: true,
      default: "",
    },
    capacity: {
      type: Number,
      default: 0,
    },
    registeredParticipants: {
      type: Number,
      default: 0,
    },
    ticketPrice: {
      type: Number,
      default: 0,
    },
    registrationUrl: {
      type: String,
      trim: true,
      default: "",
    },
    keywords: {
      type: [String],
      default: [],
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
    },
    seoTitle: {
      type: String,
      default: "",
    },
    seoDescription: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["upcoming", "ongoing", "completed", "cancelled"],
      default: "upcoming",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isPublished: {
      type: Boolean,
      default: false,
    },
    views: {
      type: Number,
      default: 0,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      default: null,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      default: null,
    },
  },
  { timestamps: true }
);

eventCreationSchema.pre("save", function (next) {
  if (this.isModified("eventName")) {
    this.slug = this.eventName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");
  }
  next();
});

export default eventCreationSchema;
