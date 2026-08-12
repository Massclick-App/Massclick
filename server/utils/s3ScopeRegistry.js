/**
 * S3 scope registry — the single declaration of every field in every collection
 * that holds an S3 object reference.
 *
 * Shape is deliberately the same as SUPPORTED_SCOPES in
 * helper/mediaCleanup/s3WebpMigrationHelper.js (44-202) so the WebP migration can
 * eventually be repointed at this file instead of carrying its own six-scope copy.
 * Two differences:
 *
 *   1. A fourth field `kind`: **arrayOfObjects** (with `itemPath`). The existing
 *      single|array|object taxonomy cannot express an array of subdocuments —
 *      mediaItems[].mediaKey, businessDetails[].bannerImageKey, evidenceFiles[].key,
 *      popularSearchCards[].imageKey, topTouristPlaces[].imageKey,
 *      history[].screenshotKey — which is most of the long tail.
 *   2. Every entry names its `collection` explicitly rather than trusting mongoose
 *      pluralisation. `assertRegistryCollections()` checks each one against both
 *      `model.collection.name` and the live database, and throws on any mismatch.
 *      This is not paranoia: the plan's own backup command listed `advertistments`,
 *      `jobapplications`, `rewardclaims`, `massclickfeedposts`, `massclickdocuments`
 *      and `homesections`, and *none* of those six collections exist.
 *
 * Fields are declared from the SCHEMA, not from the data. Several are empty in both
 * databases today (fcmcampaigns, job_applications, reward_claims, trackedkeywords are
 * all zero-document collections) — they are declared anyway so a row that appears
 * between now and the run is not silently skipped.
 *
 * Per-field metadata beyond what the WebP helper carries:
 *   valueShape  "key" | "url" | "mixed"  — what is actually stored. Drives the
 *               fcmCampaign.imageUrl and businessDetails[].bannerImage special cases
 *               through the generic machinery instead of bespoke code.
 *   purpose     the {purpose} segment of the target scheme.
 *   stability   "stable"    — deterministic key, regeneration overwrites
 *               "versioned" — ULID key, every upload is a new object
 */

import businessListModel from "../model/businessList/businessListModel.js";
import categoryModel from "../model/category/categoryModel.js";
import categoryDisplaySettingsModel from "../model/categoryDisplaySettings/categoryDisplaySettingsModel.js";
import advertismentModel from "../model/advertistment/advertismentModel.js";
import eventAdvertisementModel from "../model/event/eventAdvertisementModel.js";
import eventCategoryModel from "../model/event/eventCategoryModel.js";
import eventCreationModel from "../model/event/eventCreationModel.js";
import eventLocationModel from "../model/event/eventLocationModel.js";
import seoPageContentBlogModel from "../model/seoModel/seoPageContentBlogModel.js";
import authorMasterModel from "../model/seoModel/authorMasterModel.js";
import trackedKeywordModel from "../model/seoModel/trackedKeywordModel.js";
import userModel from "../model/userModel.js";
import msg91UserModel from "../model/msg91Model/usersModels.js";
import businessReviewModel from "../model/businessReview/businessReviewModel.js";
import jobApplicationModel from "../model/hiring/jobApplicationModel.js";
import { RewardClaim } from "../model/rewards/rewardModels.js";
import massclickEventModel from "../model/massclickEvent/massclickEventModel.js";
import massclickFeedPostModel from "../model/massclickFeed/massclickFeedPostModel.js";
import massclickDocumentsModel from "../model/massclickDocuments/massclickDocumentsModel.js";
import fcmCampaignModel from "../model/fcmCampaignModel/fcmCampaignModel.js";

import {
  invalidateAdvertisementCache,
  invalidateCategoryCache,
  invalidateCategoryDisplaySettingsCache,
  invalidateDashboardCache,
  invalidateSearchCache,
  invalidateSeoCache,
} from "./cacheInvalidation.js";

export const FIELD_KINDS = Object.freeze(["single", "array", "object", "arrayOfObjects"]);

/** Variants of category.categoryImages — a `kind: "object"` field's own keys. */
export const CATEGORY_IMAGE_VARIANTS = Object.freeze([
  "webHero",
  "webCard",
  "webThumbnail",
  "mobileVertical",
  "mobileCard",
  "mobileThumbnail",
]);

const stringy = { $type: "string", $ne: "" };
const elemStringy = { $elemMatch: { $type: "string", $ne: "" } };

export const SCOPES = {
  businessList: {
    scopeKey: "businessList",
    scopeLabel: "Business List",
    scopeDescription: "Banners, gallery, logo, KYC, both QR codes, and certificates.",
    folderPrefix: "businessList",
    entity: "businesses",
    collection: "businesslists",
    model: businessListModel,
    progressKey: "businesses",
    projection: {
      bannerImageKey: 1,
      businessImagesKey: 1,
      logoImageKey: 1,
      kycDocumentsKey: 1,
      "qrCode.qrImageKey": 1,
      "businessProfileQrCode.qrImageKey": 1,
      "certificates.verifiedCertificateKey": 1,
      "certificates.trustCertificateKey": 1,
      businessName: 1,
    },
    buildQuery: () => ({
      $or: [
        { bannerImageKey: stringy },
        { businessImagesKey: elemStringy },
        { logoImageKey: stringy },
        { kycDocumentsKey: elemStringy },
        { "qrCode.qrImageKey": stringy },
        { "businessProfileQrCode.qrImageKey": stringy },
        { "certificates.verifiedCertificateKey": stringy },
        { "certificates.trustCertificateKey": stringy },
      ],
    }),
    fields: [
      { path: "bannerImageKey", kind: "single", valueShape: "key", purpose: "banner", stability: "versioned" },
      { path: "businessImagesKey", kind: "array", valueShape: "key", purpose: "gallery", stability: "versioned" },
      { path: "logoImageKey", kind: "single", valueShape: "key", purpose: "logo", stability: "stable" },
      { path: "kycDocumentsKey", kind: "array", valueShape: "key", purpose: "kyc", stability: "versioned" },
      { path: "qrCode.qrImageKey", kind: "single", valueShape: "key", purpose: "qr-review", stability: "stable" },
      { path: "businessProfileQrCode.qrImageKey", kind: "single", valueShape: "key", purpose: "qr-profile", stability: "stable" },
      { path: "certificates.verifiedCertificateKey", kind: "single", valueShape: "key", purpose: "certificate-verified", stability: "stable" },
      { path: "certificates.trustCertificateKey", kind: "single", valueShape: "key", purpose: "certificate-trust", stability: "stable" },
      // Not in businessListSchema.js (undeclared/Mixed field) — a SEPARATE embedded-review
      // mechanism from the `businessreviews` collection below, added during step 1.4. Read
      // at businessListHelper.js:1352 (rendered through getSignedUrlByKey), written by
      // updateBusinessList's reviewData handling. Scoped by the owning BUSINESS, not by a
      // review sub-id — reviews[] has no declared _id and photos aren't addressed
      // per-review in the URL scheme, matching the pre-1.4 folder layout.
      { path: "reviews", kind: "arrayOfObjects", itemPath: "ratingPhotos", valueShape: "key", purpose: "review-photo", stability: "versioned" },
    ],
    invalidate: [invalidateSearchCache, invalidateDashboardCache, invalidateCategoryCache],
  },

  category: {
    scopeKey: "category",
    scopeLabel: "Category Images",
    scopeDescription: "Legacy hero/live keys plus the six responsive variants.",
    folderPrefix: "category",
    entity: "categories",
    collection: "categories",
    model: categoryModel,
    progressKey: "documents",
    projection: { categoryImageKey: 1, liveImageKey: 1, categoryImages: 1, category: 1 },
    buildQuery: () => ({
      $or: [
        { categoryImageKey: stringy },
        { liveImageKey: stringy },
        ...CATEGORY_IMAGE_VARIANTS.map((v) => ({ [`categoryImages.${v}`]: stringy })),
      ],
    }),
    fields: [
      { path: "categoryImageKey", kind: "single", valueShape: "key", purpose: "legacy-image", stability: "stable" },
      { path: "liveImageKey", kind: "single", valueShape: "key", purpose: "legacy-live", stability: "stable" },
      // kind "object": iterate the field's own keys; each own key is one variant.
      { path: "categoryImages", kind: "object", keys: CATEGORY_IMAGE_VARIANTS, valueShape: "key", purpose: "variant", stability: "stable" },
    ],
    invalidate: [invalidateCategoryCache, invalidateCategoryDisplaySettingsCache, invalidateSearchCache],
  },

  categoryDisplaySettings: {
    scopeKey: "categoryDisplaySettings",
    scopeLabel: "Home Section Cards",
    scopeDescription: "Popular-search and tourist-place cards on the homepage.",
    // Note: these live under the `home-sections/` S3 prefix, not `category/`.
    // There is no `homesections` collection — the plan's backup list was wrong.
    folderPrefix: "home-sections",
    entity: "home-sections",
    collection: "categorydisplaysettings",
    model: categoryDisplaySettingsModel,
    progressKey: "documents",
    projection: { popularSearchCards: 1, topTouristPlaces: 1 },
    buildQuery: () => ({
      $or: [
        { "popularSearchCards.imageKey": stringy },
        { "topTouristPlaces.imageKey": stringy },
      ],
    }),
    fields: [
      { path: "popularSearchCards", kind: "arrayOfObjects", itemPath: "imageKey", valueShape: "key", purpose: "popular-search", stability: "versioned" },
      { path: "topTouristPlaces", kind: "arrayOfObjects", itemPath: "imageKey", valueShape: "key", purpose: "top-tourist", stability: "versioned" },
    ],
    invalidate: [invalidateCategoryDisplaySettingsCache],
  },

  advertisements: {
    scopeKey: "advertisements",
    scopeLabel: "Advertisements",
    scopeDescription: "Homepage top-banner advertisement images.",
    folderPrefix: "advertisements",
    entity: "advertisements",
    collection: "advertisments", // sic — one 't'. Model file is advertistmentModel.
    model: advertismentModel,
    progressKey: "documents",
    projection: { bannerImageKey: 1, mobileBannerImageKey: 1, appBannerImageKey: 1, title: 1 },
    buildQuery: () => ({
      $or: [
        { bannerImageKey: stringy },
        { mobileBannerImageKey: stringy },
        { appBannerImageKey: stringy },
      ],
    }),
    fields: [
      { path: "bannerImageKey", kind: "single", valueShape: "key", purpose: "banner-web", stability: "versioned" },
      { path: "mobileBannerImageKey", kind: "single", valueShape: "key", purpose: "banner-mobile", stability: "versioned" },
      // Declared in the schema, zero rows in either DB today.
      { path: "appBannerImageKey", kind: "single", valueShape: "key", purpose: "banner-app", stability: "versioned" },
    ],
    invalidate: [invalidateAdvertisementCache],
  },

  eventAdvertisements: {
    scopeKey: "eventAdvertisements",
    scopeLabel: "Event Advertisements",
    scopeDescription: "Event advertisement banner and inline images.",
    folderPrefix: "event/advertisements",
    entity: "event-advertisements",
    collection: "eventadvertisements",
    model: eventAdvertisementModel,
    progressKey: "documents",
    projection: { bannerImageKey: 1, mobileBannerImageKey: 1, advertisementImageKey: 1, title: 1 },
    buildQuery: () => ({
      $or: [
        { bannerImageKey: stringy },
        { mobileBannerImageKey: stringy },
        { advertisementImageKey: stringy },
      ],
    }),
    fields: [
      { path: "bannerImageKey", kind: "single", valueShape: "key", purpose: "banner-web", stability: "versioned" },
      { path: "mobileBannerImageKey", kind: "single", valueShape: "key", purpose: "banner-mobile", stability: "versioned" },
      { path: "advertisementImageKey", kind: "single", valueShape: "key", purpose: "image", stability: "versioned" },
    ],
    invalidate: [invalidateAdvertisementCache],
  },

  eventCategories: {
    scopeKey: "eventCategories",
    scopeLabel: "Event Categories",
    scopeDescription: "Event category tile images.",
    folderPrefix: "event/categories",
    entity: "event-categories",
    collection: "eventcategories",
    model: eventCategoryModel,
    progressKey: "documents",
    projection: { categoryImageKey: 1, categoryName: 1 },
    buildQuery: () => ({ categoryImageKey: stringy }),
    fields: [
      { path: "categoryImageKey", kind: "single", valueShape: "key", purpose: "image", stability: "versioned" },
    ],
    invalidate: [],
  },

  eventCreations: {
    scopeKey: "eventCreations",
    scopeLabel: "Events",
    scopeDescription: "Event hero and banner images.",
    folderPrefix: "event/creations",
    entity: "events",
    collection: "eventcreations",
    model: eventCreationModel,
    progressKey: "documents",
    projection: { eventImageKey: 1, bannerImageKey: 1, eventName: 1 },
    buildQuery: () => ({
      $or: [{ eventImageKey: stringy }, { bannerImageKey: stringy }],
    }),
    fields: [
      { path: "eventImageKey", kind: "single", valueShape: "key", purpose: "image", stability: "versioned" },
      { path: "bannerImageKey", kind: "single", valueShape: "key", purpose: "banner", stability: "versioned" },
    ],
    invalidate: [],
  },

  eventLocations: {
    scopeKey: "eventLocations",
    scopeLabel: "Event Locations",
    scopeDescription: "Event location images.",
    folderPrefix: "event/locations",
    entity: "event-locations",
    collection: "eventlocations",
    model: eventLocationModel,
    progressKey: "documents",
    projection: { locationImageKey: 1, locationName: 1 },
    buildQuery: () => ({ locationImageKey: stringy }),
    fields: [
      { path: "locationImageKey", kind: "single", valueShape: "key", purpose: "image", stability: "versioned" },
    ],
    invalidate: [],
  },

  seoBlog: {
    scopeKey: "seoBlog",
    scopeLabel: "SEO Blog",
    scopeDescription: "Blog profile/page/OG images plus embedded business banners.",
    folderPrefix: "seo",
    entity: "seo-blogs",
    collection: "seopagecontentblogs",
    model: seoPageContentBlogModel,
    progressKey: "documents",
    projection: {
      profileImageKey: 1,
      pageImageKey: 1,
      ogImageKey: 1,
      businessDetails: 1,
      heading: 1,
      category: 1,
      location: 1,
    },
    buildQuery: () => ({
      $or: [
        { profileImageKey: stringy },
        { pageImageKey: elemStringy },
        { ogImageKey: stringy },
        { "businessDetails.bannerImageKey": stringy },
        { "businessDetails.bannerImage": stringy },
      ],
    }),
    fields: [
      { path: "profileImageKey", kind: "single", valueShape: "key", purpose: "profile", stability: "versioned" },
      { path: "pageImageKey", kind: "array", valueShape: "key", purpose: "page", stability: "versioned" },
      { path: "ogImageKey", kind: "single", valueShape: "key", purpose: "og", stability: "versioned" },
      { path: "businessDetails", kind: "arrayOfObjects", itemPath: "bannerImageKey", valueShape: "key", purpose: "business-banner", stability: "versioned" },
      // Mixed on purpose: bare keys AND absolute URLs live in this one field.
      // Anything resolving outside our bucket goes to external.jsonl and is never touched.
      { path: "businessDetails", kind: "arrayOfObjects", itemPath: "bannerImage", valueShape: "mixed", purpose: "business-banner", stability: "versioned" },
    ],
    invalidate: [invalidateSeoCache],
  },

  authors: {
    scopeKey: "authors",
    scopeLabel: "SEO Authors",
    scopeDescription: "Author master profile images.",
    folderPrefix: "seo",
    entity: "authors",
    collection: "authormasters",
    model: authorMasterModel,
    progressKey: "documents",
    projection: { profileImage: 1, name: 1 },
    buildQuery: () => ({ profileImage: stringy }),
    fields: [
      { path: "profileImage", kind: "single", valueShape: "mixed", purpose: "avatar", stability: "stable" },
    ],
    invalidate: [invalidateSeoCache],
  },

  trackedKeywords: {
    scopeKey: "trackedKeywords",
    scopeLabel: "Tracked Keywords",
    scopeDescription: "Rank-check screenshots inside the history subdocument array.",
    folderPrefix: "seo",
    entity: "tracked-keywords",
    collection: "trackedkeywords",
    model: trackedKeywordModel,
    progressKey: "documents",
    projection: { history: 1, keyword: 1 },
    buildQuery: () => ({ "history.screenshotKey": stringy }),
    fields: [
      { path: "history", kind: "arrayOfObjects", itemPath: "screenshotKey", valueShape: "key", purpose: "screenshot", stability: "versioned" },
    ],
    invalidate: [],
  },

  admin: {
    scopeKey: "admin",
    scopeLabel: "Admin Profiles",
    scopeDescription: "Admin user profile images.",
    folderPrefix: "admin",
    entity: "admins",
    collection: "users",
    model: userModel,
    progressKey: "documents",
    projection: { userProfileKey: 1, userName: 1, emailId: 1 },
    buildQuery: () => ({ userProfileKey: stringy }),
    fields: [
      { path: "userProfileKey", kind: "single", valueShape: "key", purpose: "avatar", stability: "stable" },
    ],
    invalidate: [],
  },

  customer: {
    scopeKey: "customer",
    scopeLabel: "Customer Profiles",
    scopeDescription: "msg91 customer profile images.",
    folderPrefix: "user",
    entity: "customers",
    collection: "msgusers",
    model: msg91UserModel,
    progressKey: "documents",
    projection: { profileImageKey: 1, userName: 1, mobileNumber1: 1 },
    buildQuery: () => ({ profileImageKey: stringy }),
    fields: [
      { path: "profileImageKey", kind: "single", valueShape: "key", purpose: "avatar", stability: "stable" },
    ],
    invalidate: [],
  },

  businessReviews: {
    scopeKey: "businessReviews",
    scopeLabel: "Business Reviews",
    scopeDescription: "Reviewer avatars and attached rating photos.",
    folderPrefix: "businessList",
    entity: "reviews",
    collection: "businessreviews",
    model: businessReviewModel,
    progressKey: "documents",
    projection: { ratingPhotos: 1, userProfileImage: 1, businessId: 1 },
    buildQuery: () => ({
      $or: [{ ratingPhotos: elemStringy }, { userProfileImage: stringy }],
    }),
    fields: [
      // Unvalidated write path today — see plan 0.6. Scan reports it; it is not
      // safe to build a manifest over this field until 0.6 has landed.
      { path: "ratingPhotos", kind: "array", valueShape: "mixed", purpose: "photo", stability: "versioned" },
      { path: "userProfileImage", kind: "single", valueShape: "mixed", purpose: "avatar", stability: "stable" },
    ],
    invalidate: [],
  },

  jobApplications: {
    scopeKey: "jobApplications",
    scopeLabel: "Job Applications",
    scopeDescription: "Uploaded résumés. Signed-URL only — never public.",
    folderPrefix: "hiring",
    entity: "job-applications",
    collection: "job_applications",
    model: jobApplicationModel,
    progressKey: "documents",
    projection: { resumeKey: 1, resumeFileName: 1 },
    buildQuery: () => ({ resumeKey: stringy }),
    fields: [
      { path: "resumeKey", kind: "single", valueShape: "key", purpose: "resume", stability: "versioned" },
    ],
    invalidate: [],
  },

  rewardClaims: {
    scopeKey: "rewardClaims",
    scopeLabel: "Reward Claims",
    scopeDescription: "Purchase-evidence uploads. Signed-URL only — never public.",
    folderPrefix: "rewards",
    entity: "reward-claims",
    collection: "reward_claims",
    model: RewardClaim,
    progressKey: "documents",
    projection: { evidenceFiles: 1, customerKey: 1 },
    buildQuery: () => ({ "evidenceFiles.key": stringy }),
    fields: [
      { path: "evidenceFiles", kind: "arrayOfObjects", itemPath: "key", valueShape: "key", purpose: "evidence", stability: "versioned" },
    ],
    invalidate: [],
  },

  massclickEvents: {
    scopeKey: "massclickEvents",
    scopeLabel: "Massclick Events",
    scopeDescription: "Event media — a required single subdocument plus an array of them.",
    folderPrefix: "massclick-events",
    entity: "massclick-events",
    collection: "massclickevents",
    model: massclickEventModel,
    progressKey: "documents",
    projection: { media: 1, mediaItems: 1, title: 1 },
    buildQuery: () => ({
      $or: [
        { "media.mediaKey": stringy },
        { "media.thumbnailKey": stringy },
        { "mediaItems.mediaKey": stringy },
        { "mediaItems.thumbnailKey": stringy },
      ],
    }),
    fields: [
      { path: "media.mediaKey", kind: "single", valueShape: "key", purpose: "media", stability: "versioned" },
      { path: "media.thumbnailKey", kind: "single", valueShape: "key", purpose: "thumbnail", stability: "versioned" },
      { path: "mediaItems", kind: "arrayOfObjects", itemPath: "mediaKey", valueShape: "key", purpose: "media", stability: "versioned" },
      { path: "mediaItems", kind: "arrayOfObjects", itemPath: "thumbnailKey", valueShape: "key", purpose: "thumbnail", stability: "versioned" },
    ],
    invalidate: [],
  },

  massclickFeed: {
    scopeKey: "massclickFeed",
    scopeLabel: "Massclick Feed",
    scopeDescription: "Feed post media.",
    folderPrefix: "massclick-feed",
    entity: "feed-posts",
    collection: "massclick_feed_posts",
    model: massclickFeedPostModel,
    progressKey: "documents",
    projection: { mediaItems: 1, businessId: 1 },
    buildQuery: () => ({
      $or: [{ "mediaItems.mediaKey": stringy }, { "mediaItems.thumbnailKey": stringy }],
    }),
    fields: [
      { path: "mediaItems", kind: "arrayOfObjects", itemPath: "mediaKey", valueShape: "key", purpose: "media", stability: "versioned" },
      { path: "mediaItems", kind: "arrayOfObjects", itemPath: "thumbnailKey", valueShape: "key", purpose: "thumbnail", stability: "versioned" },
    ],
    invalidate: [],
  },

  massclickDocuments: {
    scopeKey: "massclickDocuments",
    scopeLabel: "Massclick Documents",
    scopeDescription: "Overview PDFs, media items, and loose video/image link arrays.",
    folderPrefix: "massclick-documents",
    entity: "massclick-documents",
    collection: "massclick_documents",
    model: massclickDocumentsModel,
    progressKey: "documents",
    projection: { documentKey: 1, mediaItems: 1, videoLinks: 1, imageLinks: 1, title: 1 },
    buildQuery: () => ({
      $or: [
        { documentKey: stringy },
        { "mediaItems.mediaKey": stringy },
        { videoLinks: elemStringy },
        { imageLinks: elemStringy },
      ],
    }),
    fields: [
      { path: "documentKey", kind: "single", valueShape: "key", purpose: "document", stability: "versioned" },
      { path: "mediaItems", kind: "arrayOfObjects", itemPath: "mediaKey", valueShape: "key", purpose: "media", stability: "versioned" },
      // Free-text link arrays: usually external (YouTube etc). Anything outside our
      // bucket goes to external.jsonl and is never touched.
      { path: "videoLinks", kind: "array", valueShape: "mixed", purpose: "video-link", stability: "versioned" },
      { path: "imageLinks", kind: "array", valueShape: "mixed", purpose: "image-link", stability: "versioned" },
    ],
    invalidate: [],
  },

  fcmCampaigns: {
    scopeKey: "fcmCampaigns",
    scopeLabel: "FCM Campaigns",
    scopeDescription: "Push-notification images. Stored as an absolute URL by design.",
    folderPrefix: "fcm-campaigns",
    entity: "fcm-campaigns",
    collection: "fcmcampaigns",
    model: fcmCampaignModel,
    progressKey: "documents",
    projection: { imageUrl: 1, title: 1 },
    buildQuery: () => ({ imageUrl: stringy }),
    fields: [
      // firebase-admin requires an absolute URL — a bare key breaks push delivery.
      { path: "imageUrl", kind: "single", valueShape: "url", purpose: "image", stability: "versioned" },
    ],
    invalidate: [],
  },
};

export const SCOPE_KEYS = Object.freeze(Object.keys(SCOPES));

export const getScope = (scopeKey) => SCOPES[scopeKey] || null;

/** Every collection this registry touches, deduplicated — for `--collections` on backups. */
export const registryCollections = () =>
  [...new Set(Object.values(SCOPES).map((s) => s.collection))].sort();

/**
 * Flatten to one row per (scope, field). `arrayOfObjects` entries that share a
 * `path` but differ in `itemPath` stay distinct rows.
 */
export const registryFields = () =>
  Object.values(SCOPES).flatMap((scope) =>
    scope.fields.map((field) => ({
      scopeKey: scope.scopeKey,
      collection: scope.collection,
      entity: scope.entity,
      folderPrefix: scope.folderPrefix,
      ...field,
    })),
  );

/**
 * Fail loudly on drift. Checks the registry against itself, against mongoose's own
 * pluralisation, and — when `db` is supplied — against the collections that actually
 * exist. Returns the list of problems; callers decide whether to throw.
 */
export const validateRegistry = async (db = null) => {
  const problems = [];
  const live = db ? new Set((await db.listCollections().toArray()).map((c) => c.name)) : null;

  for (const scope of Object.values(SCOPES)) {
    const where = `scope "${scope.scopeKey}"`;

    if (!scope.model) {
      problems.push(`${where}: no model imported`);
    } else if (scope.model.collection?.name !== scope.collection) {
      problems.push(
        `${where}: declared collection "${scope.collection}" != model collection "${scope.model.collection?.name}"`,
      );
    }

    if (live && !live.has(scope.collection)) {
      problems.push(`${where}: collection "${scope.collection}" does not exist in this database`);
    }

    const seen = new Set();
    for (const field of scope.fields) {
      const id = `${field.path}${field.itemPath ? `.${field.itemPath}` : ""}`;
      if (seen.has(id)) problems.push(`${where}: duplicate field "${id}"`);
      seen.add(id);

      if (!FIELD_KINDS.includes(field.kind)) {
        problems.push(`${where}, field "${id}": unknown kind "${field.kind}"`);
      }
      if (field.kind === "arrayOfObjects" && !field.itemPath) {
        problems.push(`${where}, field "${id}": kind arrayOfObjects requires itemPath`);
      }
      if (field.kind !== "arrayOfObjects" && field.itemPath) {
        problems.push(`${where}, field "${id}": itemPath is only valid for arrayOfObjects`);
      }
      if (field.kind === "object" && !Array.isArray(field.keys)) {
        problems.push(`${where}, field "${id}": kind object requires a keys[] list`);
      }
      if (!["key", "url", "mixed"].includes(field.valueShape)) {
        problems.push(`${where}, field "${id}": unknown valueShape "${field.valueShape}"`);
      }
      if (!["stable", "versioned"].includes(field.stability)) {
        problems.push(`${where}, field "${id}": unknown stability "${field.stability}"`);
      }
    }
  }

  return problems;
};

export default SCOPES;
