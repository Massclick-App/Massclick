/**
 * Ad showcase configuration.
 *
 * Powers the public `/api/ads/*` endpoints used by the standalone interactive
 * ad creatives (massclick-ad-creatives/interactive/*). Data only — no logic —
 * so marketing can re-order beats or reword copy without touching the
 * controller.
 *
 * WHY THIS EXISTS INSTEAD OF READING trending-searches:
 * `/api/businesslist/trending-searches/viewall` is raw search-log data and is
 * not safe to put in front of an ad audience. A live sample of it returned
 * raw ObjectIds ("699e88c89c701217d34a370c"), the same category up to 8 times
 * ("panchayat office"), location-suffixed fragments ("chess coaching in 12c
 * 14 2"), and a category *description* stored as a search term. An ad has one
 * shot at credibility, so the categories it shows are curated here and then
 * re-verified against live inventory at request time by the controller.
 *
 * Counts in the comments were measured on prod 2026-09-02 and are indicative
 * only — the controller drops any beat that has since fallen below
 * MIN_LISTINGS_FOR_BEAT rather than trusting these numbers.
 */

/** A beat is dropped from the reel if its category has fewer live listings. */
export const MIN_LISTINGS_FOR_BEAT = 6;

/** Cards returned per category. Kept small — inventory is deep, but rated and
 *  photographed listings concentrate at the top of the sort. */
export const AD_SHOWCASE_LIMIT = 6;

export const AD_CACHE_SECONDS = 3600;

/**
 * The consumer creative ("We Have That Too") — an escalation.
 *
 * The order matters and is the whole idea: open somewhere deliberately
 * unimpressive so the viewer's "it's just another directory" reflex fires,
 * then walk them past the point where any general search engine can follow.
 * Do not sort this list by count.
 */
export const AD_REEL_BEATS = [
  {
    key: "restaurants",
    act: "expected",
    category: "restaurants",
    prompt: "Looking for a restaurant?",
    aside: "So can everyone else.",
  },
  {
    key: "interior-designer",
    act: "expected",
    category: "interior designer",
    prompt: "An interior designer?",
    aside: "Still easy.",
  },
  {
    key: "borewell",
    act: "specific",
    category: "borewell drilling",
    prompt: "A borewell driller?",
    aside: "Now it gets specific.",
  },
  {
    key: "flour-mills",
    act: "specific",
    category: "flour mills",
    prompt: "The nearest flour mill?",
    aside: "Try typing that anywhere else.",
  },
  {
    key: "mattress-cleaning",
    act: "specific",
    category: "mattress cleaning",
    prompt: "Someone to clean a mattress?",
    aside: "Real trade. Real listings.",
  },
  {
    key: "panchayat-office",
    act: "government",
    category: "panchayat office",
    prompt: "Your panchayat office?",
    aside: "No search engine indexes this.",
  },
  {
    key: "birth-certificate",
    act: "government",
    category: "birth certificate services",
    prompt: "Help with a birth certificate?",
    aside: "The errand nobody enjoys.",
  },
  {
    key: "e-sevai",
    act: "government",
    category: "e sevai center",
    prompt: "An e-sevai center?",
    aside: "We index the counter, not just the shop.",
  },
  {
    /**
     * The closer. This is grief logistics, not a punchline — the copy stays
     * plain and the treatment stays quiet. It earns its place because it is
     * the clearest proof of the whole argument: a family needing this at 2am
     * is exactly who a local directory is for, and exactly who a general
     * search engine fails. Swap to `aadhaar card` if a campaign needs a
     * softer landing.
     */
    key: "freezer-box",
    act: "closer",
    category: "dead body freezer box on rent",
    prompt: "A freezer box. Tonight.",
    aside: "When a family needs this at 2am, nobody should be searching blind.",
  },
];

/**
 * Categories offered as chips in the consumer ad's "try it yourself" finale
 * and as the typeahead pool for the business creative. Every entry was
 * verified to hold real inventory; the controller still re-checks before
 * serving them so a category going thin degrades quietly instead of
 * producing an empty result in front of an audience.
 */
export const AD_CATEGORY_POOL = [
  "home decoration",
  "modular kitchen",
  "interior designer",
  "private hospitals",
  "construction contractors",
  "tuition centers",
  "restaurants",
  "drone photography",
  "fitness and gym classes",
  "dermatologist",
  "event organisers",
  "photography",
  "automobiles",
  "wedding hall",
  "printing and publishing services",
  "architect",
  "bike service",
  "ac service",
  "clinical labs",
  "footwear shop",
  "neet coaching",
  "criminal lawyers",
  "computer and laptop repair",
  "astrology",
  "driving school",
  "yoga classes",
  "car hire",
  "tv service",
  "courier services",
  "catering services",
  "placement services",
  "packers and movers",
  "steel dealers",
  "business registration",
  "property consultants",
  "pest control",
  "housekeeping service",
  "fencing",
  "mosquito net",
  "banks",
  "cbse schools",
  "dance classes",
  "fabrication contractors",
  "marriage halls",
  "fast food centers",
  "grocery shops",
  "pharmacies",
  "borewell drilling",
  "real estate agents",
  "music classes",
  "computer shops",
  "legal consultancy",
  "property registration",
  "travel agencies",
  "flex printing",
  "cctv",
  "digital marketing",
  "furniture repair",
  "driving license services",
  "cooks on rent",
  "rooms on rent",
  "meal subscription services",
  "sound systems on rent",
  "app developers",
  "generators on rent",
  "flour mills",
  "gst consultants",
  "dead body freezer box on rent",
  "auditors",
  "chartered accountants",
  "mri scan centers",
  "martial arts",
  "homemade food services",
  "graphic designers",
  "food delivery",
  "mattress cleaning",
  "eb office",
  "aadhaar card",
  "juice shops",
  "birth certificate services",
  "scan centers",
  "pizza shops",
  "mess services",
  "organic food stores",
  "passport consultants",
  "revenue office",
  "e sevai center",
  "advocates",
  "panchayat office",
  "biryani centers",
  "pet shops",
  "seo companies",
  "branding agencies",
  "microwave oven repair",
  "bike rental",
  "home automation",
  "notary",
  "sweet stalls",
  "marriage certificate services",
  "community certificate",
  "tea shops",
  "shawarma shops",
  "siddha doctors",
  "tyre shops",
  "refrigerator repair",
  "municipality office",
  "tourist places",
  "blood banks",
  "post office",
  "pan card services",
  "m sand",
  "coconut traders",
  "puncture shops",
  "hollow blocks",
  "cold storage",
  "corporation office",
  "civil engineers",
  "rice mills",
  "taluk office",
  "police station",
  "tiffin centers",
  "sofa cleaning",
  "sand suppliers",
];
