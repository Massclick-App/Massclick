import mongoose from "mongoose";

const slugify = (value = "") =>
  value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const cleanStringArray = (value) => {
  if (!Array.isArray(value)) return [];

  return [
    ...new Set(
      value
        .map((item) => (typeof item === "string" ? item.trim().toLowerCase() : ""))
        .filter(Boolean)
    ),
  ];
};

const eventCategorySchema = new mongoose.Schema(
  {
    categoryName: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      minlength: 2,
      maxlength: 120,
    },
    description: {
      type: String,
      trim: true,
      default: "",
      maxlength: 1000,
    },
    categoryImage: {
      type: String,
      trim: true,
      default: "",
    },
    slug: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    keywords: {
      type: [String],
      default: [],
      set: cleanStringArray,
      validate: {
        validator: (arr) =>
          Array.isArray(arr) &&
          arr.every((kw) => typeof kw === "string" && kw.trim().length > 0),
        message: "Each keyword must be a non-empty string.",
      },
    },
    seoTitle: {
      type: String,
      trim: true,
      default: "",
      maxlength: 180,
    },
    seoDescription: {
      type: String,
      trim: true,
      default: "",
      maxlength: 320,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    sortOrder: {
      type: Number,
      default: 0,
      min: 0,
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

eventCategorySchema.index({ categoryName: 1 }, { unique: true });
eventCategorySchema.index({ slug: 1 }, { unique: true });
eventCategorySchema.index({ isActive: 1, sortOrder: 1, createdAt: -1 });

eventCategorySchema.pre("validate", function (next) {
  if (this.isModified("categoryName") || !this.slug) {
    this.slug = slugify(this.categoryName);
  }

  if (this.isModified("keywords")) {
    this.keywords = cleanStringArray(this.keywords);
  }

  next();
});

eventCategorySchema.pre("findOneAndUpdate", function (next) {
  const update = this.getUpdate() || {};
  const updateData = update.$set || update;

  if (updateData.categoryName) {
    updateData.categoryName = updateData.categoryName.trim().toLowerCase();
    updateData.slug = slugify(updateData.categoryName);
  }

  if (updateData.keywords) {
    updateData.keywords = cleanStringArray(updateData.keywords);
  }

  if (update.$set) {
    update.$set = updateData;
    this.setUpdate(update);
  } else {
    this.setUpdate(updateData);
  }

  next();
});

export default eventCategorySchema;
