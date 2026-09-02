import businessListModel from "../../model/businessList/businessListModel.js";
import { getSignedUrlByKey } from "../../s3Uploder.js";
import { getCache, setCache } from "../../utils/redisClient.js";
import {
  AD_REEL_BEATS,
  AD_CATEGORY_POOL,
  AD_SHOWCASE_LIMIT,
  MIN_LISTINGS_FOR_BEAT,
  AD_CACHE_SECONDS,
} from "../../config/adsShowcase.js";

/**
 * Public endpoints for the standalone interactive ad creatives.
 *
 * These are deliberately NOT built on mainSearchController. Two reasons:
 *
 * 1. Payload safety. The public search response hands back the full business
 *    document — including `email`, `contact`, `whatsappNumber`, `gstin`,
 *    `payment`, `subscription`, `clientId` and resolved `kycDocuments` URLs.
 *    That is far more than a marketing page needs, and an ad creative is the
 *    single most-embedded, least-controlled surface we publish. Everything
 *    here goes through AD_SAFE_FIELDS, which is an allowlist.
 *
 * 2. Predictability. Search runs category-intent resolution, keyword
 *    expansion, geo scoring and nearby-pincode widening — all valuable for a
 *    user, all a liability for an ad, where an unexpected resolution shows the
 *    wrong thing to an audience. These endpoints do exact category matching
 *    and nothing else.
 */

/**
 * Allowlist. Add a field here only after checking it is safe to show an
 * anonymous audience — never spread the raw document.
 */
const AD_SAFE_FIELDS = [
  "businessName",
  "category",
  "location",
  "publicId",
  "bannerImageKey",
  "averageRating",
  "verification.isVerified",
  "badges.isTrust",
  "badges.isFeatured",
  "badges.priorityScore",
  "amountPaid",
].join(" ");

const escapeRegex = (text = "") => String(text).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const exactCategory = (name) => new RegExp(`^${escapeRegex(String(name).trim())}$`, "i");

const normalizeCategory = (name = "") => String(name).trim().toLowerCase();

const toAdCard = (doc) => ({
  id: doc.publicId || "",
  name: doc.businessName || "",
  category: doc.category || "",
  location: doc.location || "",
  image: doc.bannerImageKey ? getSignedUrlByKey(doc.bannerImageKey) : "",
  rating:
    Number.isFinite(doc.averageRating) && doc.averageRating > 0
      ? Math.round(doc.averageRating * 10) / 10
      : null,
  verified: Boolean(doc.verification?.isVerified),
  trusted: Boolean(doc.badges?.isTrust),
});

/**
 * One grouped pass over live listings, giving both per-category counts and
 * the distinct-category total. Cached, because every ads endpoint wants some
 * slice of it and none of them should trigger a collection scan per request.
 */
const getCategoryCounts = async () => {
  const cacheKey = "ads:category-counts:v1";
  const cached = await getCache(cacheKey);
  if (cached) return new Map(cached);

  const rows = await businessListModel.aggregate([
    { $match: { businessesLive: true } },
    {
      $group: {
        _id: { $toLower: { $trim: { input: { $ifNull: ["$category", ""] } } } },
        total: { $sum: 1 },
      },
    },
    { $match: { _id: { $ne: "" } } },
  ]);

  const pairs = rows.map((row) => [row._id, row.total]);
  await setCache(cacheKey, pairs, AD_CACHE_SECONDS);
  return new Map(pairs);
};

/**
 * Cards for one category. `total` is the honest live count for the category;
 * `listings` is drawn only from listings that actually carry a banner image,
 * because a card with no photo reads as a broken ad rather than a sparse one.
 */
const fetchCategorySlice = async (category, limit = AD_SHOWCASE_LIMIT) => {
  const match = { businessesLive: true, category: exactCategory(category) };

  const [total, docs] = await Promise.all([
    businessListModel.countDocuments(match),
    businessListModel
      .find({ ...match, bannerImageKey: { $exists: true, $nin: ["", null] } })
      .select(AD_SAFE_FIELDS)
      .sort({
        averageRating: -1,
        "badges.priorityScore": -1,
        amountPaid: -1,
        createdAt: -1,
      })
      .limit(Math.min(24, Math.max(1, limit)))
      .lean(),
  ]);

  return { total, listings: docs.map(toAdCard) };
};

/**
 * GET /api/ads/reel
 *
 * The whole consumer creative in one round trip — the ad renders its first
 * frame without a waterfall of per-beat requests. Beats whose category has
 * fallen below MIN_LISTINGS_FOR_BEAT are dropped rather than shown thin, so
 * inventory drift degrades the reel quietly instead of publicly.
 */
export const adsReelAction = async (req, res) => {
  const cacheKey = "ads:reel:v1";

  try {
    const cached = await getCache(cacheKey);
    if (cached) return res.send(cached);

    const [counts, slices] = await Promise.all([
      getCategoryCounts(),
      Promise.all(
        AD_REEL_BEATS.map(async (beat) => ({
          beat,
          ...(await fetchCategorySlice(beat.category)),
        })),
      ),
    ]);

    const beats = slices
      .filter(({ total, listings }) => total >= MIN_LISTINGS_FOR_BEAT && listings.length > 0)
      .map(({ beat, total, listings }) => ({
        key: beat.key,
        act: beat.act,
        category: beat.category,
        prompt: beat.prompt,
        aside: beat.aside,
        total,
        listings,
      }));

    let categoryCount = 0;
    let listingCount = 0;
    counts.forEach((total) => {
      listingCount += total;
      if (total >= MIN_LISTINGS_FOR_BEAT) categoryCount += 1;
    });

    const payload = {
      beats,
      // Both are claims the creative puts on screen, so they are computed
      // rather than written into copy — the ad can never outrun the data.
      categoryCount,
      listingCount,
      generatedAt: new Date().toISOString(),
    };

    await setCache(cacheKey, payload, AD_CACHE_SECONDS);
    return res.send(payload);
  } catch (error) {
    console.error("[Ads] reel failed:", error.message);
    return res.status(500).send({ message: "Unable to build ad reel" });
  }
};

/**
 * GET /api/ads/categories?q=&limit=
 *
 * Verified category suggestions — chips in the consumer creative, typeahead in
 * the business one. Sourced from the curated pool and re-checked against live
 * counts, so a category that has gone thin stops being offered.
 */
export const adsCategoriesAction = async (req, res) => {
  try {
    const q = normalizeCategory(req.query.q || "");
    const limit = Math.min(60, Math.max(1, parseInt(req.query.limit, 10) || 24));

    const counts = await getCategoryCounts();

    const items = AD_CATEGORY_POOL.map((category) => ({
      category,
      total: counts.get(normalizeCategory(category)) || 0,
    }))
      .filter((item) => item.total >= MIN_LISTINGS_FOR_BEAT)
      .filter((item) => (q ? item.category.includes(q) : true))
      .sort((a, b) => b.total - a.total)
      .slice(0, limit);

    return res.send({ items, total: items.length, query: q });
  } catch (error) {
    console.error("[Ads] categories failed:", error.message);
    return res.status(500).send({ message: "Unable to load ad categories" });
  }
};

/**
 * GET /api/ads/showcase?category=&limit=
 *
 * Cards for a single category. Not restricted to the curated pool — the
 * business creative lets an owner pick their own trade — but a category with
 * too little inventory is refused rather than rendered thin, which is the
 * whole failure mode these endpoints exist to prevent.
 */
export const adsShowcaseAction = async (req, res) => {
  try {
    const category = normalizeCategory(req.query.category || "");
    if (!category) {
      return res.status(400).send({ message: "category is required" });
    }

    const limit = parseInt(req.query.limit, 10) || AD_SHOWCASE_LIMIT;
    const cacheKey = `ads:showcase:v1:${category}:${limit}`;

    const cached = await getCache(cacheKey);
    if (cached) return res.send(cached);

    const counts = await getCategoryCounts();
    const knownTotal = counts.get(category) || 0;

    if (knownTotal < MIN_LISTINGS_FOR_BEAT) {
      return res.status(404).send({
        message: "Not enough listings in this category to showcase",
        category,
        total: knownTotal,
      });
    }

    const { total, listings } = await fetchCategorySlice(category, limit);
    const payload = { category, total, listings };

    await setCache(cacheKey, payload, AD_CACHE_SECONDS);
    return res.send(payload);
  } catch (error) {
    console.error("[Ads] showcase failed:", error.message);
    return res.status(500).send({ message: "Unable to load showcase" });
  }
};
