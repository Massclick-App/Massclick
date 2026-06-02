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
    popularSearchCards: [
      {
        title:      { type: String },
        imageKey:   { type: String, default: "" },
        buttonText: { type: String, default: "Enquire Now" },
        accent:     { type: String, default: "#e67e22" },
        alt:        { type: String, default: "" },
      },
    ],
    topTouristPlaces: [
      {
        name:     { type: String },
        imageKey: { type: String, default: "" },
        alt:      { type: String, default: "" },
        path:     { type: String, default: "" },
      },
    ],
    popularCategoryTabs: [
      {
        category: { type: String },
        keywords: { type: [String], default: [] },
      },
    ],
    popularCategoryServices: [
      {
        title:       { type: String },
        description: { type: String, default: "" },
        icon:        { type: String, default: "" },
        route:       { type: String, default: "" },
        searchName:  { type: String, default: "" },
        routeSlug:   { type: String, default: "" },
      },
    ],
    popularCategoryLinkSections: [
      {
        title:    { type: String },
        keywords: { type: [String], default: [] },
      },
    ],
    updatedBy: { type: String, default: "admin" },
  },
  { timestamps: true }
);

export default categoryDisplaySettingsSchema;
