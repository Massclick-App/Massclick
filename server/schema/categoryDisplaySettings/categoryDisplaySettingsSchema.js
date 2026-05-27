import mongoose from "mongoose";

const categoryDisplaySettingsSchema = new mongoose.Schema(
  {
    homeFeaturedDesktop: { type: [String], default: [] },
    homeFeaturedMobile:  { type: [String], default: [] },
    popularCategories:   { type: [String], default: [] },
    serviceCardSections: [
      {
        section:      { type: String },
        desktopItems: { type: [String], default: [] },
        mobileItems:  { type: [String], default: [] },
      },
    ],
    subCategoryMapping: [
      {
        parentSlug:       { type: String },
        subCategoryNames: { type: [String], default: [] },
      },
    ],
    updatedBy: { type: String, default: "admin" },
  },
  { timestamps: true }
);

export default categoryDisplaySettingsSchema;
