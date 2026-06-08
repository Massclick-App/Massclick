import mongoose from "mongoose";

const gmapsLeadsSchema = new mongoose.Schema(
  {
    place_id: { type: String, default: "" },
    name: { type: String, default: "" },
    formatted_address: { type: String, default: "" },
    geoLocation: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], default: [0, 0] },
    },
    google_types: { type: [String], default: [] },
    search_query: { type: String, default: "" },
    search_sector: { type: String, default: "" },
    massclick_location: { type: String, default: "" },
    massclick_category: { type: String, default: "" },
    rating: { type: Number, default: null },
    total_ratings: { type: Number, default: 0 },
    price_level: { type: String, default: null },
    business_status: { type: String, default: "OPERATIONAL" },
    phone: { type: String, default: null },
    website: { type: String, default: null },
    details_fetched: { type: Boolean, default: false },
    imported_to_main: { type: Boolean, default: false },
    skip_import: { type: Boolean, default: false },
    scraped_at: { type: Date, default: null },
    source: { type: String, default: "gmaps_scraper" },
  },
  {
    collection: "gmaps_leads",
    timestamps: false,
    strict: false,
  }
);

export default gmapsLeadsSchema;
