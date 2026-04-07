import mongoose from "mongoose"

const categorySchema = new mongoose.Schema(
  {
    categoryImageKey: { type: String, default: "" },
    category: { type: String, trim: true },
    subcategory: { type: String, default: '' },
    categoryType: {
      type: String,
      enum: ["Primary Category", "Sub Category"],
    },
    subCategoryType: { type: String, default: "" },
    title: { type: String, trim: true },
    keywords: {
      type: [String],
      default: [],
      validate: {
        validator: (arr) =>
          arr.every((kw) => typeof kw === "string" && kw.trim().length > 0),
        message: "Each keyword must be a non-empty string.",
      },
    },
    description: { type: String, trim: true },
    slug: { type: String, unique: true, lowercase: true, trim: true },
    seoTitle: { type: String, default: "" },
    seoDescription: { type: String, default: "" },
    regionTags: { type: [String], default: [] },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

categorySchema.pre("save", function (next) {
  if (this.isModified("category")) {
    this.slug = this.category
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");
  }
  next();
});

categorySchema.index({ category: 1 });
categorySchema.index({ slug: 1 });
categorySchema.index({ keywords: 1 });
categorySchema.index({ regionTags: 1 });

export default categorySchema;