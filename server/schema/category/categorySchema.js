import mongoose from "mongoose"

const categorySchema = new mongoose.Schema(
  {
    // New multi-variant images
    categoryImages: {
      webHero: { type: String, default: "" },        // 1200x400 horizontal banner
      webCard: { type: String, default: "" },        // 400x400 square for grid
      webThumbnail: { type: String, default: "" },   // 200x200 small thumbnail
      mobileVertical: { type: String, default: "" }, // 400x600 portrait
      mobileCard: { type: String, default: "" },     // 300x300 square for mobile
      mobileThumbnail: { type: String, default: "" } // 150x150 small thumbnail
    },
    // Legacy image fields (for backward compatibility with old documents)
    categoryImageKey: { type: String, default: "" },
    liveImageKey: { type: String, default: "" },
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
    filterConfig: {
      type: [new mongoose.Schema(
        {
          key:        { type: String, trim: true },
          label:      { type: String, trim: true },
          type:       { type: String, enum: ["multiselect", "radio", "toggle", "range"] },
          options:    { type: [String], default: [] },
          min:        { type: Number, default: null },
          max:        { type: Number, default: null },
          unit:       { type: String, default: "" },
          isRequired: { type: Boolean, default: false },
          enabled:    { type: Boolean, default: true },
        },
        { _id: false }
      )],
      default: []
    },
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