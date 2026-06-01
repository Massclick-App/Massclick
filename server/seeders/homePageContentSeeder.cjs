/**
 * Seed initial home page content into categoryDisplaySettings.
 * Run: node server/seeders/homePageContentSeeder.cjs
 */

const mongoose = require("mongoose");

const MONGO_URI = "mongodb://admin:Massclick123@127.0.0.1:27018/massClick_dev?authSource=admin";
const COLLECTION = "categorydisplaysettings";

const popularSearchCards = [
  { title: "CCTV",        imageKey: "", buttonText: "Enquire Now", accent: "#e67e22", alt: "CCTV camera installation" },
  { title: "Hotels",      imageKey: "", buttonText: "Enquire Now", accent: "#e67e22", alt: "Modern hotel room" },
  { title: "Photography", imageKey: "", buttonText: "Enquire Now", accent: "#e67e22", alt: "Photographer with camera" },
  { title: "Education",   imageKey: "", buttonText: "Enquire Now", accent: "#e67e22", alt: "Graduation scroll" },
  { title: "Logistics",   imageKey: "", buttonText: "Enquire Now", accent: "#5dade2", alt: "Logistics and delivery" },
  { title: "Consulting",  imageKey: "", buttonText: "Enquire Now", accent: "#2ecc71", alt: "Business consulting" },
];

const topTouristPlaces = [
  { name: "Ooty",      imageKey: "", alt: "Ooty Hills",     path: "/trending/ooty" },
  { name: "Bangalore", imageKey: "", alt: "Bangalore City", path: "/trending/bangalore" },
  { name: "Chennai",   imageKey: "", alt: "Chennai City",   path: "/trending/chennai" },
  { name: "Hyderabad", imageKey: "", alt: "Hyderabad City", path: "/trending/hyderabad" },
];

const popularCategoryTabs = [
  {
    category: "Accommodation",
    keywords: [
      "AC Lodging Services","Beach Resorts","Bungalows On Hire","Cottages On Hire","Dharamshalas","Farm House","Farm House On Hire","Government Hostels","Guest House","Hostels","Hostels For Men","Hostels For Women","Hostels For Working Men","Hostels For Working Women","Hotels","Hotels (Rs 500 & Below)","Lodging Services","Resorts","Dormitory Services","Home Stay","Hostel For Girl Students","3 Star Hotels","5 Star Hotels","2 Star Hotels","4 Star Hotels","Villas","Villas On Hire","Rooms On Hire","AC Dormitory Services","Pet Friendly Resorts","Hostel For Boy Students","Village Resorts","AC Guest House","Paying Guest Accommodations For Women","Water Park Resorts","Hostel For Students","Couple Friendly Hotels","Paying Guest Accommodations for Student","Government Hostels for Women","AC Paying Guest Accommodations","AC Paying Guest Accommodations For Men","Hostel For Students","AC Paying Guest Accommodations for Women","Paying Guest Accommodations For Men","Paying Guest Accommodations For Girl Student","Unisex Paying Guest Accommodations","Single Occupancy Paying Guest Accommodations","Mansions","Couple Paying Guest Accommodations",
    ],
  },
  {
    category: "Astrology",
    keywords: [
      "Astrologers","Astrologers On Phone","Chinese Astrologers","Computerised Horoscope","Gemmologists","Nameology","Numerologists","Palmists","Pandits","Pandits For Havan","Pandits For Marriage","Pandits For Puja","Vastu Shastra Consultants","Online Astrologers","Medical Astrologers","Spiritual Astrologers","KP Astrologers","Vastu Shastra Consultants For Residence","Spiritual Healing Services","Pandits For Pind Daan","Tantriks","Reiki Consultants","24 Hours Astrologers","Astrologers For Love Problem","Financial Astrologers","Tamil Pandits","Lal Kitab Experts","Paranormal Experts","Horary Astrologers","Pandits For Kaal Sarp","Pandits For Pitru Dosh Nivaran","Telugu Pandits","North Indian Pandits","Bengali Pandits","Face Reading Services","Vedic Astrologers","Nameologists","Nadi Astrologers","Islamic Astrologers","Black Magic Remedy Astrologers","Astrologers For Kundali Matching","Tarot Reading Services","Jyothishalayam","Priests","Parrot Astrologers","Online Palmistry","Celebrity Astrologers","Tamil Astrologers","Malayalam Astrologers",
    ],
  },
  {
    category: "Automobiles & Two Wheelers",
    keywords: [
      "24 Hours Towing Services","Automobile Consultants","Breakdown Services","Bus Body Builders","Car AC Repair & Services","Car Break Down Services","Car Coating Services","Car Dealers","Car Denting Services","Car Interior Decorators","Car Painting Services","Car Polishing Services","Car Scanning Services","Car Washing Services","Driving License Consultants","Garages","Motor Training Schools","Motorcycle Dealers","RTO Consultants","Scooter Dealers","Towing Services","Tyre Puncture Repair","Wheel Alignment Services","Valet Parking Services","Car Washing Services At Home","Car Cleaning Services","Flatbed Towing Services","Emission Testing Centres","Honda Car Repair Services","Motorcycle Repair & Services","Heavy Vehicle Towing Services","Car Towing Services","Car Repair & Services","Car Detailing Services","Hyundai Car Repair Services","CNG Cylinder Testing Services","Car Cleaning Services At Home","Automobile Detailing Services","PUC Centres","Automobile Towing Services",
    ],
  },
  {
    category: "Beauty, Fitness & Sports",
    keywords: [
      "Adventure Sports","Badminton Courts","Beauticians","Beauty Parlour Classes","Beauty Parlours","Beauty Parlours At Home","Beauty Parlours For Bridal","Beauty Salons","Body Massage Centres","Boxing Classes","Fitness Centres","Hair Stylists","Health Clubs","Karate Classes","Mehandi Classes","Salons","Sports Clubs","Sports Ground","Swimming Classes","Tattoo Artists","Yoga Classes","Zumba Classes","Meditation Centres","Football Clubs","Nail Art At Home","Mehendi Artists","Lawn Tennis Courts","Beauty Shops","Unisex Salons","Bridal Makeup Artists","Cricket Clubs","Makeup Artists","Beautician Services At Home","Nail Artists","Online Yoga Classes","Unisex Spas","Gyms","Unisex Gyms","Salon Services At Home","Volleyball Courts","Indoor Badminton Courts","Crossfit Gyms","Cricket Coach","Body Massage Services At Home","Hair Spas","Thai Spas","Jawed Habib","Women Gyms","Personal Gym Trainers","Tattoo For Lips","Online Zumba Classes",
    ],
  },
  {
    category: "Business & Legal",
    keywords: [
      "Accountants","ATM","Banks","CA","Car Loans","Finance Companies","Home Loans","Insurance Companies","Lawyers","Loans","Personal Loans","Second Hand Car Loans","Security Services","Stock Brokers","Tax Consultants","Online Translators","Mortgage Loans","Cooperative Banks","IIFL","Union Bank Of India","State Bank Of India","CitiBank","Central Bank Of India","Bank Of India","Bank Of Baroda","Yes Banks","Punjab National Banks","Indusind Banks","IDBI Banks","HDFC Banks","Canara Banks","Axis Banks","Union Bank Of India ATMS","ICICI Banks","Kotak Mahindra Banks","IDFC First Banks",
    ],
  },
  {
    category: "Education",
    keywords: [
      "Abacus Classes","Boarding Schools","CBSE Schools","Colleges","Convent Schools","Dance Classes","Diploma Courses","Drawing Classes","Educational Institutes","Engineering Colleges","English Medium Schools","Institutes","Kindergartens","Law Colleges","Libraries","MBA Colleges","Medical Colleges","Montessori Schools","Music Classes","Nursery Schools","Open Schools","Open University","Personality Development","Project Work","Schools","Tutorials","Universities","Video Editing Classes","Home Tutors","Junior Colleges","Nursing Colleges","Primary Schools","Arts Colleges","Commerce Colleges","Science Colleges","Polytechnic Colleges","Public Schools","Air Hostess Training Institutes","CS Tutorials","B Ed Colleges","Military Schools","Government Colleges","Veterinary Colleges","Agricultural Colleges","Senior Secondary Schools","Digital Marketing Courses","Online Training For Python","Public Libraries","Degree Colleges","Secondary Schools",
    ],
  },
  {
    category: "Events & Weddings",
    keywords: [
      "Artists","Auditoriums","Bands","Banquet Halls","Caterers","Conference Halls","Convention Halls","Decorators","Disc Jockey","Event Management Companies","Event Organisers","Florists","Kalyana Mandapams","Magicians","Mandap Decorators","Matrimonial Websites","Musicians","Photo Studios","Photographer","Playback Singers","Summer Camps","Tent House","Wedding Bands","Marriage Lawns","Wedding Mandap Decorators","Wildlife Photographers","Car Decorators","Balloon Decorators","Video Editing Services","Wedding Decorators","Pandal Decorators","Birthday Party Decorators","Wedding Photographers","Rock Bands","Event Organisers For Wedding","Comedians","Candid Photographers","Pipe Bonds","Jugglers","Saxophone Players","Aerial Photographers","Brass Bands","Voice Over Artists","Drone On Rent","Pre Wedding Photographers","Singers","Event Venues","Tent Decorators","Room Decorators",
    ],
  },
  {
    category: "Food & Restaurants",
    keywords: [
      "Arabic Restaurants","Bakeries","Barbeque Restaurants","Bengali Restaurants","Biryani Restaurants","Buffet Restaurants","Cake Shops","Chettinad Restaurants","Chinese Restaurants","Coffee Shops","Continental Restaurants","Dhaba Restaurants","Discotheques","Fast Food","Gujarati Restaurants","Ice Cream Parlours","Indian Restaurants","Juice Centres","Kathiyawadi Restaurants","Lounge Bars","Maharashtrian Restaurants","Mess","Mughlai Restaurants","Multicuisine Restaurants","Night Clubs","Non Veg Restaurants","North Indian Restaurants","Open Air Restaurants","Pubs","Punjabi Restaurants","Pure Veg Restaurants","Rajasthani Restaurants","Restaurants","Restaurants With Candle Light Dinner","Restaurants With Live Music","Sea Food Restaurants","Snacks Bar","South Indian Restaurants","Sweet Shops","Tandoori Restaurants","Thai Restaurants","Tiffin Services","Tiffin Services For Veg Food","Tea Stalls","Street Food","Food Delivery In Trains","Chaat Corners","Food Trucks","Tiffin Home Delivery Services","Breakfast Restaurants",
    ],
  },
];

const popularCategoryServices = [
  { title: "MNI",                icon: "handshake", route: "/user_mni",     searchName: "",                routeSlug: "",              description: "Experience the ultimate MNI portal by MassClick. Explore diverse categories, connect with vendors, and discover wholesale opportunities through a simple local discovery experience." },
  { title: "Packers and Movers", icon: "package",   route: "",             searchName: "Packers and Movers", routeSlug: "packers-and-movers", description: "Find reliable relocation partners, compare movers for your location, get quotes from providers, and check ratings before making your selection." },
  { title: "Order Food Online",  icon: "food",      route: "",             searchName: "Restaurants",     routeSlug: "restaurants",    description: "Find restaurants, explore cuisines, view reviews and ratings, discover offers, and get your favourite food delivered to your doorstep." },
  { title: "Movies",             icon: "movies",    route: "",             searchName: "Theaters",        routeSlug: "theaters",       description: "Access movie information, discover theatres, view show details, and make a better choice for the movie you would like to watch." },
  { title: "Spa & Salon",        icon: "spa",       route: "",             searchName: "Beauty Spa",      routeSlug: "beauty-spa",     description: "Find salons and spas near you, compare options, and book pampering, grooming, beauty, and wellness services with confidence." },
  { title: "Repair & Services",  icon: "repair",    route: "",             searchName: "Bike Service",    routeSlug: "bike-service",   description: "Find trusted help for appliance repair, car service, cleaning, water purifier service, utility maintenance, and daily home service needs." },
  { title: "Doctor Appointment", icon: "doctor",    route: "",             searchName: "Hospitals",       routeSlug: "hospitals",      description: "Find suitable medical specialists near you and connect with healthcare providers for everyday health and well-being needs." },
  { title: "Real Estate Agents", icon: "realEstate",route: "",             searchName: "Real Estate",     routeSlug: "real-estate",    description: "Discover agents and developers for PG, rentals, buying, selling, and local property updates across residential and commercial projects." },
];

const popularCategoryLinkSections = [
  {
    title: "Trending Searches",
    keywords: [
      "English Medium Schools","Packers And Movers (Within City)","Home Delivery Restaurants","Estate Agents For Land","Wedding Photographers","Income Tax Consultants","Newspaper Advertising Agencies","Hepatologist Doctors","Search Engine Optimization Services","Motorcycle Repair & Services-TVS","Tyre Dealers-JK","Tutorials For SSC Cgl","Bitcoin Services","Tour Packages For Goa","Transporters For Kolkata","Tour Packages For Manali","Transporters For Bihar","Pet Food Dealers","Event Organisers For Jagran","Tutorials For UGC Net Exam","Battery Operated Scooter Dealers-Ather Energy","Courier Services For USA","Transporters For Rajasthan","MCA Institutes","Tutorials For Ctet","Share Brokers-Angel One","Transporters For Punjab","LPG Conversion Kit Dealers","Event Organisers For Bhajan Sandhya","Bhojpuri Film Producers","Courier Services For Dubai","Khatu Shyam Bhajan Singers","Dairy Product Retailers-Amul","Bengali Sweet Retailers","Ayurvedic Doctors For Hair Fall Treatment","Overseas Education Consultants For Luxembourg","Tutorials For NIOS Class XII","Packers And Movers For Hyderabad","Dish Antenna Installation Services-Tata Sky","Event Organisers For DJ","Personal Loans-Axis Bank","Car Rental-Toyota","Marathi Books","Women Top Retailers","HD Makeup Artists","Cricket T Shirt Manufacturers","Ad Film Makers","ABC Fire Extinguisher Dealers","Solar Panel Dealers-Vikram Solar","Kick Scooter Dealers",
    ],
  },
];

async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log("Connected to MongoDB:", MONGO_URI);

  const db = mongoose.connection.db;
  const collection = db.collection(COLLECTION);

  const result = await collection.findOneAndUpdate(
    {},
    {
      $set: {
        popularSearchCards,
        topTouristPlaces,
        popularCategoryTabs,
        popularCategoryServices,
        popularCategoryLinkSections,
        updatedBy: "seeder",
        updatedAt: new Date(),
      },
    },
    { upsert: true, returnDocument: "after" }
  );

  console.log("✅ Seeded successfully.");
  console.log(`   popularSearchCards:         ${popularSearchCards.length} items`);
  console.log(`   topTouristPlaces:           ${topTouristPlaces.length} items`);
  console.log(`   popularCategoryTabs:        ${popularCategoryTabs.length} tabs`);
  console.log(`   popularCategoryServices:    ${popularCategoryServices.length} items`);
  console.log(`   popularCategoryLinkSections:${popularCategoryLinkSections.length} sections`);

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seeder failed:", err);
  process.exit(1);
});
