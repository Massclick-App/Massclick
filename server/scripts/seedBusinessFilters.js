import { MongoClient } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

const FORCE = process.argv.includes("--force");
const MONGO_URI = process.env.MONGO_URL;

// -----------------------------------------------------------------------
// filterConfig definitions for top 20 categories
// -----------------------------------------------------------------------
const CATEGORY_FILTER_CONFIGS = {
  "restaurants": [
    { key: "mealType", label: "Meal Type", type: "radio", options: ["Veg", "Non-Veg", "Both"], isRequired: false },
    { key: "cuisineType", label: "Cuisine Type", type: "multiselect", options: ["South Indian", "North Indian", "Chinese", "Continental", "Biryani", "Fast Food", "Mughlai", "Tandoori"], isRequired: false },
    { key: "diningOptions", label: "Dining Options", type: "multiselect", options: ["Dine-in", "Takeaway", "Home Delivery"], isRequired: false },
    { key: "seatingType", label: "Seating Type", type: "multiselect", options: ["AC", "Non-AC", "Rooftop", "Open Air"], isRequired: false },
    { key: "priceRange", label: "Price Range (₹ per person)", type: "range", min: 100, max: 2000, unit: "₹", isRequired: false },
  ],
  "hotels": [
    { key: "roomTypes", label: "Room Types", type: "multiselect", options: ["Standard", "Deluxe", "Suite", "Family Room"], isRequired: false },
    { key: "amenities", label: "Amenities", type: "multiselect", options: ["AC", "WiFi", "Pool", "Gym", "Parking", "Restaurant", "Room Service"], isRequired: false },
    { key: "mealPlan", label: "Meal Plan", type: "radio", options: ["CP", "MAP", "AP", "EP"], isRequired: false },
    { key: "starCategory", label: "Star Category", type: "radio", options: ["1 Star", "2 Star", "3 Star", "4 Star", "5 Star"], isRequired: false },
    { key: "priceRange", label: "Price Range (₹ per night)", type: "range", min: 500, max: 10000, unit: "₹", isRequired: false },
  ],
  "dentist": [
    { key: "specialization", label: "Specialization", type: "multiselect", options: ["General Dentistry", "Orthodontics", "Implants", "Cosmetic Dentistry", "Pediatric Dentistry", "Root Canal"], isRequired: false },
    { key: "appointmentMode", label: "Appointment Mode", type: "radio", options: ["Walk-in", "Appointment Only"], isRequired: false },
    { key: "facilityType", label: "Facility", type: "radio", options: ["AC", "Non-AC"], isRequired: false },
    { key: "insuranceAccepted", label: "Insurance Accepted", type: "toggle", isRequired: false },
  ],
  "beauty parlour": [
    { key: "services", label: "Services", type: "multiselect", options: ["Haircut", "Facial", "Waxing", "Threading", "Bridal Makeup", "Nail Art", "Hair Coloring", "Manicure", "Pedicure"], isRequired: false },
    { key: "gender", label: "For", type: "radio", options: ["Ladies", "Gents", "Unisex"], isRequired: false },
    { key: "facilityType", label: "Facility", type: "radio", options: ["AC", "Non-AC"], isRequired: false },
    { key: "homeServiceAvailable", label: "Home Service Available", type: "toggle", isRequired: false },
  ],
  "gym": [
    { key: "genderType", label: "Gender", type: "radio", options: ["Unisex", "Ladies Only", "Gents Only"], isRequired: false },
    { key: "facilityType", label: "Facility", type: "radio", options: ["AC", "Non-AC"], isRequired: false },
    { key: "amenities", label: "Amenities", type: "multiselect", options: ["Cardio Equipment", "Free Weights", "Swimming Pool", "Steam Room", "Sauna", "Yoga Room", "Crossfit Area"], isRequired: false },
    { key: "personalTrainerAvailable", label: "Personal Trainer Available", type: "toggle", isRequired: false },
    { key: "membershipType", label: "Membership Plans", type: "multiselect", options: ["Monthly", "Quarterly", "Half-Yearly", "Annual"], isRequired: false },
  ],
  "hospitals": [
    { key: "speciality", label: "Speciality", type: "multiselect", options: ["General", "Cardiology", "Orthopedics", "Neurology", "Pediatrics", "Gynecology", "Oncology", "ENT", "Urology"], isRequired: false },
    { key: "facilityType", label: "Facilities", type: "multiselect", options: ["ICU", "Emergency", "Blood Bank", "Pharmacy", "Ambulance", "Lab"], isRequired: false },
    { key: "insuranceAccepted", label: "Insurance Accepted", type: "toggle", isRequired: false },
    { key: "opdAvailable", label: "OPD Available", type: "toggle", isRequired: false },
  ],
  "rent and hire": [
    { key: "rentalType", label: "Rental Type", type: "multiselect", options: ["Vehicles", "Equipment", "Furniture", "Event Items", "Electronics", "Tools"], isRequired: false },
    { key: "deliveryAvailable", label: "Delivery Available", type: "toggle", isRequired: false },
    { key: "minimumRentalPeriod", label: "Minimum Rental Period", type: "radio", options: ["Hourly", "Daily", "Weekly", "Monthly"], isRequired: false },
  ],
  "furnitures": [
    { key: "furnitureType", label: "Furniture Type", type: "multiselect", options: ["Bedroom", "Living Room", "Office", "Kitchen", "Outdoor", "Kids"], isRequired: false },
    { key: "material", label: "Material", type: "multiselect", options: ["Wood", "Metal", "Plastic", "Fabric", "Leather", "Glass"], isRequired: false },
    { key: "customOrderAvailable", label: "Custom Orders Available", type: "toggle", isRequired: false },
    { key: "deliveryAvailable", label: "Home Delivery Available", type: "toggle", isRequired: false },
  ],
  "photographer": [
    { key: "photographyType", label: "Photography Type", type: "multiselect", options: ["Wedding", "Portrait", "Commercial", "Event", "Product", "Fashion", "Newborn", "Real Estate"], isRequired: false },
    { key: "videoAvailable", label: "Videography Available", type: "toggle", isRequired: false },
    { key: "droneAvailable", label: "Drone Shots Available", type: "toggle", isRequired: false },
    { key: "studioAvailable", label: "Studio Available", type: "toggle", isRequired: false },
  ],
  "electrician services": [
    { key: "serviceType", label: "Service Type", type: "multiselect", options: ["Installation", "Repair", "Maintenance", "Wiring", "Inverter & Battery", "Solar Panel", "CCTV Wiring"], isRequired: false },
    { key: "commercialServiceAvailable", label: "Commercial Service Available", type: "toggle", isRequired: false },
    { key: "emergencyService", label: "24/7 Emergency Service", type: "toggle", isRequired: false },
  ],
  "textile": [
    { key: "clothingType", label: "Clothing Type", type: "multiselect", options: ["Sarees", "Salwar Kameez", "Western Wear", "Kids Wear", "Men's Wear", "Fabrics", "Uniforms", "Bridal Wear"], isRequired: false },
    { key: "material", label: "Material", type: "multiselect", options: ["Cotton", "Silk", "Polyester", "Linen", "Wool", "Chiffon"], isRequired: false },
    { key: "customTailoringAvailable", label: "Custom Tailoring Available", type: "toggle", isRequired: false },
  ],
  "car service": [
    { key: "serviceType", label: "Service Type", type: "multiselect", options: ["General Service", "AC Repair", "Denting & Painting", "Battery Replacement", "Tyre Change", "Insurance Claim", "Engine Repair"], isRequired: false },
    { key: "vehicleType", label: "Vehicle Type", type: "multiselect", options: ["Car", "SUV", "Bike", "Truck", "Van"], isRequired: false },
    { key: "pickupDropAvailable", label: "Pickup & Drop Available", type: "toggle", isRequired: false },
  ],
  "physiotherapy": [
    { key: "specialization", label: "Specialization", type: "multiselect", options: ["Sports Injury", "Orthopedic", "Neurological", "Pediatric", "Geriatric", "Post-Surgery", "Spine"], isRequired: false },
    { key: "homeVisitAvailable", label: "Home Visit Available", type: "toggle", isRequired: false },
    { key: "appointmentMode", label: "Appointment Mode", type: "radio", options: ["Walk-in", "Appointment Only"], isRequired: false },
  ],
  "computer training institutes": [
    { key: "courses", label: "Courses Offered", type: "multiselect", options: ["Hardware", "Networking", "Programming", "MS Office", "Tally", "Graphic Design", "Web Development", "Data Science"], isRequired: false },
    { key: "certificationProvided", label: "Certification Provided", type: "toggle", isRequired: false },
    { key: "onlineCourseAvailable", label: "Online Course Available", type: "toggle", isRequired: false },
    { key: "batchType", label: "Batch Timing", type: "radio", options: ["Morning", "Evening", "Weekend", "Flexible"], isRequired: false },
  ],
  "dermatologist": [
    { key: "treatmentType", label: "Treatment Type", type: "multiselect", options: ["Acne Treatment", "Hair Loss", "Skin Whitening", "Laser Treatment", "Anti-Aging", "Psoriasis", "Eczema"], isRequired: false },
    { key: "appointmentMode", label: "Appointment Mode", type: "radio", options: ["Walk-in", "Online Booking"], isRequired: false },
    { key: "insuranceAccepted", label: "Insurance Accepted", type: "toggle", isRequired: false },
  ],
  "security system": [
    { key: "systemType", label: "System Type", type: "multiselect", options: ["CCTV", "Burglar Alarm", "Access Control", "Biometric", "Fire Safety", "Video Doorbell"], isRequired: false },
    { key: "installationService", label: "Installation Service", type: "toggle", isRequired: false },
    { key: "maintenanceContract", label: "Annual Maintenance Contract", type: "toggle", isRequired: false },
    { key: "brandType", label: "Brands Available", type: "multiselect", options: ["CP Plus", "Hikvision", "Bosch", "Samsung", "Dahua", "Godrej"], isRequired: false },
  ],
  "printing and publishing service": [
    { key: "serviceType", label: "Service Type", type: "multiselect", options: ["Offset Printing", "Digital Printing", "Flex Printing", "Book Publishing", "Brochures", "Visiting Cards", "Banners", "Stickers"], isRequired: false },
    { key: "bulkOrderAvailable", label: "Bulk Order Available", type: "toggle", isRequired: false },
    { key: "deliveryAvailable", label: "Delivery Available", type: "toggle", isRequired: false },
  ],
  "event organisers": [
    { key: "eventType", label: "Event Type", type: "multiselect", options: ["Wedding", "Corporate", "Birthday", "Conference", "Product Launch", "Exhibition", "Puberty Ceremony", "Baby Shower"], isRequired: false },
    { key: "cateringIncluded", label: "Catering Available", type: "toggle", isRequired: false },
    { key: "decorationIncluded", label: "Decoration Available", type: "toggle", isRequired: false },
    { key: "photographyIncluded", label: "Photography Package Available", type: "toggle", isRequired: false },
    { key: "venueArrangement", label: "Venue Arrangement", type: "toggle", isRequired: false },
  ],
  "opticals": [
    { key: "services", label: "Services", type: "multiselect", options: ["Eye Testing", "Spectacles", "Contact Lenses", "Sunglasses", "Lens Replacement", "Frame Repair"], isRequired: false },
    { key: "homeDeliveryAvailable", label: "Home Delivery Available", type: "toggle", isRequired: false },
    { key: "brandType", label: "Brands Available", type: "multiselect", options: ["Ray-Ban", "Titan", "Fastrack", "Lenskart", "Oakley", "Local Brands"], isRequired: false },
  ],
  "jewellery showroom": [
    { key: "jewelleryType", label: "Jewellery Type", type: "multiselect", options: ["Gold", "Silver", "Diamond", "Platinum", "Artificial", "Bridal", "Temple Jewellery"], isRequired: false },
    { key: "metal", label: "Metal", type: "multiselect", options: ["Gold", "Silver", "Platinum", "Rose Gold", "White Gold"], isRequired: false },
    { key: "customDesignAvailable", label: "Custom Design Available", type: "toggle", isRequired: false },
    { key: "exchangeAvailable", label: "Old Jewellery Exchange", type: "toggle", isRequired: false },
    { key: "hallmarkCertified", label: "Hallmark Certified", type: "toggle", isRequired: false },
  ],
};

// -----------------------------------------------------------------------
// Curated seed value generators — realistic weighted picks
// -----------------------------------------------------------------------
const weightedPick = (weights) => {
  const r = Math.random();
  let cumulative = 0;
  for (const { value, weight } of weights) {
    cumulative += weight;
    if (r < cumulative) return value;
  }
  return weights[weights.length - 1].value;
};

const pickRandom = (arr, count = 1) => {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, arr.length));
};

// Weighted radio distributions per category.key
const RADIO_WEIGHTS = {
  "restaurants.mealType": [
    { value: "Veg", weight: 0.30 },
    { value: "Non-Veg", weight: 0.40 },
    { value: "Both", weight: 0.30 },
  ],
  "hotels.mealPlan": [
    { value: "CP", weight: 0.40 },
    { value: "MAP", weight: 0.25 },
    { value: "AP", weight: 0.15 },
    { value: "EP", weight: 0.20 },
  ],
  "hotels.starCategory": [
    { value: "1 Star", weight: 0.10 },
    { value: "2 Star", weight: 0.25 },
    { value: "3 Star", weight: 0.35 },
    { value: "4 Star", weight: 0.20 },
    { value: "5 Star", weight: 0.10 },
  ],
  "dentist.appointmentMode": [
    { value: "Walk-in", weight: 0.55 },
    { value: "Appointment Only", weight: 0.45 },
  ],
  "dentist.facilityType": [
    { value: "AC", weight: 0.65 },
    { value: "Non-AC", weight: 0.35 },
  ],
  "beauty parlour.gender": [
    { value: "Ladies", weight: 0.55 },
    { value: "Gents", weight: 0.15 },
    { value: "Unisex", weight: 0.30 },
  ],
  "beauty parlour.facilityType": [
    { value: "AC", weight: 0.60 },
    { value: "Non-AC", weight: 0.40 },
  ],
  "gym.genderType": [
    { value: "Unisex", weight: 0.50 },
    { value: "Ladies Only", weight: 0.25 },
    { value: "Gents Only", weight: 0.25 },
  ],
  "gym.facilityType": [
    { value: "AC", weight: 0.55 },
    { value: "Non-AC", weight: 0.45 },
  ],
  "physiotherapy.appointmentMode": [
    { value: "Walk-in", weight: 0.40 },
    { value: "Appointment Only", weight: 0.60 },
  ],
  "computer training institutes.batchType": [
    { value: "Morning", weight: 0.25 },
    { value: "Evening", weight: 0.35 },
    { value: "Weekend", weight: 0.20 },
    { value: "Flexible", weight: 0.20 },
  ],
  "dermatologist.appointmentMode": [
    { value: "Walk-in", weight: 0.35 },
    { value: "Online Booking", weight: 0.65 },
  ],
  "rent and hire.minimumRentalPeriod": [
    { value: "Hourly", weight: 0.15 },
    { value: "Daily", weight: 0.45 },
    { value: "Weekly", weight: 0.25 },
    { value: "Monthly", weight: 0.15 },
  ],
};

// Weighted range generators
const RANGE_WEIGHTS = {
  "restaurants.priceRange": () => weightedPick([
    { value: Math.floor(Math.random() * 200) + 100, weight: 0.35 },  // 100-300
    { value: Math.floor(Math.random() * 300) + 300, weight: 0.40 },  // 300-600
    { value: Math.floor(Math.random() * 400) + 600, weight: 0.20 },  // 600-1000
    { value: Math.floor(Math.random() * 1000) + 1000, weight: 0.05 }, // 1000-2000
  ]),
  "hotels.priceRange": () => weightedPick([
    { value: Math.floor(Math.random() * 500) + 500, weight: 0.30 },   // 500-1000
    { value: Math.floor(Math.random() * 1500) + 1000, weight: 0.40 }, // 1000-2500
    { value: Math.floor(Math.random() * 2500) + 2500, weight: 0.20 }, // 2500-5000
    { value: Math.floor(Math.random() * 5000) + 5000, weight: 0.10 }, // 5000-10000
  ]),
};

const generateFilters = (categoryName, filterConfig, business) => {
  const filters = {};

  for (const fc of filterConfig) {
    const ckey = `${categoryName}.${fc.key}`;

    if (fc.type === "toggle") {
      filters[fc.key] = Math.random() < 0.60;

    } else if (fc.type === "radio") {
      if (RADIO_WEIGHTS[ckey]) {
        filters[fc.key] = weightedPick(RADIO_WEIGHTS[ckey]);
      } else if (fc.options?.length) {
        filters[fc.key] = fc.options[Math.floor(Math.random() * fc.options.length)];
      }
      // For restaurants: honour existing restaurantOptions field
      if (categoryName === "restaurants" && fc.key === "mealType" && business.restaurantOptions) {
        const opt = business.restaurantOptions.toLowerCase();
        if (opt.includes("veg") && !opt.includes("non")) filters[fc.key] = "Veg";
        else if (opt.includes("non")) filters[fc.key] = "Non-Veg";
      }

    } else if (fc.type === "multiselect") {
      if (fc.options?.length) {
        const count = Math.ceil(Math.random() * Math.min(3, fc.options.length));
        filters[fc.key] = pickRandom(fc.options, count);
      }

    } else if (fc.type === "range") {
      if (RANGE_WEIGHTS[ckey]) {
        filters[fc.key] = RANGE_WEIGHTS[ckey]();
      } else {
        const lo = typeof fc.min === "number" ? fc.min : 0;
        const hi = typeof fc.max === "number" ? fc.max : 100;
        filters[fc.key] = Math.floor(Math.random() * (hi - lo + 1)) + lo;
      }
    }
  }

  return filters;
};

// -----------------------------------------------------------------------
// Main
// -----------------------------------------------------------------------
const run = async () => {
  try {
    if (!MONGO_URI) throw new Error("MONGO_URL not set in .env");

    const client = new MongoClient(MONGO_URI);
    await client.connect();
    // Use the database from the URI; fall back to massClick_dev
    const dbName = MONGO_URI.split("/").pop()?.split("?")[0] || "massClick_dev";
    const db = client.db(dbName);
    const categories = db.collection("categories");
    const businesslists = db.collection("businesslists");

    console.log("✅ MongoDB Connected");
    console.log(`Mode: ${FORCE ? "--force (overwrite all)" : "default (skip if filters already set)"}\n`);

    let totalCatsUpdated = 0;
    let totalBizUpdated = 0;
    let totalBizSkipped = 0;

    for (const [catName, filterConfig] of Object.entries(CATEGORY_FILTER_CONFIGS)) {
      const escReg = catName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

      // 1. Upsert filterConfig on the category document
      const catResult = await categories.updateOne(
        { category: { $regex: `^${escReg}$`, $options: "i" } },
        { $set: { filterConfig } }
      );

      if (catResult.matchedCount > 0) {
        totalCatsUpdated++;
        console.log(`📂 Category "${catName}" → filterConfig updated (${filterConfig.length} filters)`);
      } else {
        console.log(`⚠️  Category "${catName}" → NOT FOUND in DB, skipping`);
        continue;
      }

      // 2. Seed filters on all businesses in this category
      const businesses = await businesslists.find(
        { category: { $regex: `^${escReg}$`, $options: "i" } }
      ).toArray();

      console.log(`   Found ${businesses.length} businesses`);

      let updated = 0;
      let skipped = 0;

      for (const biz of businesses) {
        if (!FORCE && biz.filters && Object.keys(biz.filters).length > 0) {
          skipped++;
          totalBizSkipped++;
          continue;
        }

        const filters = generateFilters(catName, filterConfig, biz);

        await businesslists.updateOne(
          { _id: biz._id },
          { $set: { filters } }
        );
        updated++;
        totalBizUpdated++;
      }

      console.log(`   ✅ Updated: ${updated} | Skipped: ${skipped}`);
    }

    console.log("\n══════════════════════════════════");
    console.log(`Categories updated : ${totalCatsUpdated}`);
    console.log(`Businesses updated : ${totalBizUpdated}`);
    console.log(`Businesses skipped : ${totalBizSkipped}`);
    console.log("══════════════════════════════════\n");

    await client.close();
    process.exit(0);
  } catch (err) {
    console.error("❌ SCRIPT ERROR:", err.message);
    process.exit(1);
  }
};

run();
