import mongoose from "mongoose";
import businessListModel from "../model/businessList/businessListModel.js";
import masterLocationModel from "../model/locationModel/masterLocationModel.js";
import {
  resolveDistrictBySlug,
  resolveLocationForSearch,
} from "../helper/location/locationResolver.js";
import {
  getDistrictUrlSlug,
  getPublicLocationSlug,
} from "../helper/location/locationSlug.js";
import {
  buildLocationCategoryPath,
  buildLocationPath,
} from "../helper/location/locationUrl.js";
import { classifyMiddleSegment } from "../helper/location/urlSegmentClassifier.js";
import {
  getBusinessUrlSlug,
  buildBusinessPath,
  parseBusinessUrlSegment,
  PUBLIC_ID_RE,
} from "../helper/businessList/businessUrl.js";
import { slugify } from "../slugify.js";

const REDIRECT_STATUS = 301;
const SAFE_METHODS = new Set(["GET", "HEAD"]);
const PUBLIC_FILE_RE = /\.[a-z0-9]{2,8}$/i;
const SKIP_PREFIXES = new Set([
  "api",
  "socket.io",
  "assets",
  "static",
  "uploads",
  "metrics",
  "health",
  "robots.txt",
  "sitemap",
  "llms.txt",
  "llms-full.txt",
  "favicon.ico",
]);

// No `slug` — see helper/businessList/businessUrl.js for why that field is not
// the business's URL slug and must not be read when building one.
const businessProjection = {
  _id: 1,
  businessName: 1,
  name: 1,
  publicId: 1,
  location: 1,
  masterLocation: 1,
};

const normalizePath = (path = "") => {
  const parsedPath = String(path || "").split("?")[0] || "/";
  return parsedPath.startsWith("/") ? parsedPath : `/${parsedPath}`;
};

const pathParts = (path = "") =>
  normalizePath(path)
    .split("/")
    .filter(Boolean)
    .map((part) => decodeURIComponent(part));

const samePath = (a = "", b = "") =>
  normalizePath(a).replace(/\/+$/, "") === normalizePath(b).replace(/\/+$/, "");

const shouldInspect = (req) => {
  if (!SAFE_METHODS.has(req.method)) return false;

  const pathname = normalizePath(req.path || req.url || "");
  const parts = pathParts(pathname);
  const first = parts[0] || "";
  if (!first) return false;
  if (SKIP_PREFIXES.has(first) || first.startsWith(".")) return false;
  if (PUBLIC_FILE_RE.test(first) || PUBLIC_FILE_RE.test(pathname)) return false;
  return true;
};

const findDistrictDocByName = async (district = "") => {
  if (!district) return null;
  return masterLocationModel
    .findOne({ level: "district", isActive: true, district })
    .lean();
};

const getRouteLocationSlug = (locationDoc = null, fallback = "") => {
  if (!locationDoc || locationDoc.level === "district") {
    return slugify(fallback || locationDoc?.district || "business");
  }
  return (
    locationDoc.publicLocationSlug ||
    getPublicLocationSlug(locationDoc) ||
    slugify(fallback || "business")
  );
};

// The current shape is /business/:district/:slug-:publicId — three segments,
// with the trailing segment carrying a well-formed publicId. Anything else
// under /business is a superseded shape to be redirected.
const isNewStyleBusinessPath = (parts = []) =>
  parts[0] === "business" &&
  parts.length === 3 &&
  parseBusinessUrlSegment(parts[2]) !== null;

const isNewStyleCategoryPath = async (parts = []) => {
  if (parts.length < 2 || parts.length > 4) return false;
  const districtDoc = await resolveDistrictBySlug(parts[0]).catch(() => null);
  return Boolean(districtDoc);
};

const resolvesAsNewStyle = async (parts = []) => {
  if (parts[0] === "business") return isNewStyleBusinessPath(parts);
  return isNewStyleCategoryPath(parts);
};

// Business URLs are matched by shape alone (isNewStyleBusinessPath), so a
// "business" first segment must never be handed to the category classifier —
// it would try to resolve "business" as a district.

const buildLegacyCategoryRedirect = async (parts = []) => {
  if (parts.length < 2 || parts.length > 3) return null;

  const [legacyLocation, category, subcategory] = parts;
  const locationDoc = await resolveLocationForSearch(legacyLocation).catch(() => null);
  if (!locationDoc?.district) return null;

  const districtDoc = await findDistrictDocByName(locationDoc.district);
  if (!districtDoc) return null;

  const districtSlug = getDistrictUrlSlug(districtDoc);
  const finalCategorySlug = subcategory || category;

  if (locationDoc.level === "district") {
    return buildLocationCategoryPath({ districtDoc, districtSlug, categorySlug: finalCategorySlug });
  }

  return buildLocationCategoryPath({
    districtDoc,
    districtSlug,
    locationDoc,
    categorySlug: finalCategorySlug,
  });
};

const findBusinessForLegacyPath = async (id = "") => {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  return businessListModel.findById(id, businessProjection).lean();
};

const findBusinessByPublicId = async (publicId = "") => {
  if (!PUBLIC_ID_RE.test(publicId)) return null;
  return businessListModel.findOne({ publicId }, businessProjection).lean();
};

const findLocationDocForBusiness = async (business = {}, legacyLocation = "") => {
  const locationId = business.masterLocation?.locationId;
  if (locationId && mongoose.Types.ObjectId.isValid(locationId)) {
    const linked = await masterLocationModel
      .findOne({ _id: locationId, isActive: true })
      .lean();
    if (linked) return linked;
  }

  return resolveLocationForSearch(legacyLocation).catch(() => null);
};

const findDistrictDocForBusiness = async (business = {}, legacyLocation = "") => {
  const directDistrictDoc = await findDistrictDocByName(
    business.masterLocation?.district,
  );
  if (directDistrictDoc) return directDistrictDoc;

  const locationDoc = await findLocationDocForBusiness(business, legacyLocation);
  if (locationDoc?.level === "district") return locationDoc;
  return findDistrictDocByName(locationDoc?.district);
};

/**
 * The one URL this business should be reachable at, or null when it cannot be
 * built — no publicId (pre-backfill) or no resolvable district. Callers must
 * fall back to the superseded shape in that case rather than redirecting to
 * something unresolvable.
 *
 * The district segment comes from getDistrictUrlSlug, so it honours `urlAlias`
 * ("Tiruchirappalli" -> "trichy"). Emitters without a district doc on hand
 * (QR codes, certificates, emails) slugify the raw district name instead and
 * therefore mint "tiruchirappalli"; those URLs land here and get 301'd to the
 * aliased form on first request rather than persisting as duplicates.
 */
const buildCanonicalBusinessPath = async (business = {}, legacyLocation = "") => {
  const districtDoc = await findDistrictDocForBusiness(business, legacyLocation);
  if (!districtDoc) return null;

  return buildBusinessPath({
    districtSlug: getDistrictUrlSlug(districtDoc),
    business,
  });
};

/**
 * Superseded target, used only while a business still has no publicId. This is
 * the shape Phase A produced; it remains resolvable because the client route
 * for it is kept alongside the new one.
 */
const buildSupersededBusinessPath = async (business = {}, legacyLocation = "") => {
  const locationDoc = await findLocationDocForBusiness(business, legacyLocation);
  const districtName = locationDoc?.district || business.masterLocation?.district;
  const districtDoc = await findDistrictDocByName(districtName);
  if (!districtDoc) return null;

  const districtSlug = getDistrictUrlSlug(districtDoc);
  const locationSlug = getRouteLocationSlug(locationDoc, business.location || legacyLocation);
  return `/business/${districtSlug}/${locationSlug}/${getBusinessUrlSlug(business)}/${business._id}`;
};

const buildBusinessTarget = async (business = {}, legacyLocation = "") =>
  (await buildCanonicalBusinessPath(business, legacyLocation)) ||
  (await buildSupersededBusinessPath(business, legacyLocation));

const isLegacyBusinessIdPath = (parts = []) =>
  parts[0] === "business" && parts.length === 2;

// /business/:id — the pre-district-migration shape, still live in printed QR
// codes. Phase A had to 404 these because the id alone was ambiguous once the
// router treated "business" as a district; now it resolves and redirects.
const buildLegacyBusinessIdRedirect = async (parts = []) => {
  if (!isLegacyBusinessIdPath(parts)) return null;

  const business = await findBusinessForLegacyPath(parts[1]);
  if (!business) return null;

  return buildBusinessTarget(business, business.location || "");
};

// /business/:location/:slug/:id (pre-district migration) and
// /business/:district/:location/:slug/:id (Phase A). Both carry the ObjectId
// last, which is what resolves them.
const buildLegacyBusinessRedirect = async (parts = []) => {
  if (parts[0] !== "business") return null;
  if (parts.length !== 4 && parts.length !== 5) return null;

  const businessId = parts[parts.length - 1];
  const legacyLocation = parts.length === 5 ? parts[2] : parts[1];

  const business = await findBusinessForLegacyPath(businessId);
  if (!business) return null;

  return buildBusinessTarget(business, legacyLocation);
};

// A district-prefixed 3-segment URL (/:district/:p2/:p3) whose middle
// segment classifies as "unresolvedLocation" — p2 didn't resolve as a real
// location or category, but p3 IS a real category (e.g. "/salem/salem/hotels":
// Salem district's own name typed into the location field, not a locality
// registered within itself). The app already renders this correctly as a
// district-wide category page (see urlSegmentClassifier.js), but left as-is
// the address bar keeps showing a URL shaped like a locality-specific page.
// Distinct from resolveLegacyRedirectTargetForPath's other cases: this is a
// NEW-style URL (resolvesAsNewStyle is true for it), not a pre-migration one.

// A current-shape /business/:district/:slug-:publicId that isn't in canonical
// form — a stale name slug after a rename, or a district segment that skipped
// the urlAlias (QR, certificate and email links mint "tiruchirappalli" rather
// than "trichy"; see buildCanonicalBusinessPath).
//
// The page resolves by publicId alone, so every variant serves a 200 and
// nothing declares which one is real. Now that the location segment is gone
// the WHOLE path can be canonicalized safely — in Phase A it could not,
// because that segment legitimately differed between emitters and validating
// it would have redirected the app's own links.
//
// No loop is possible: the target is buildCanonicalBusinessPath's output,
// a pure function of the business document, so re-feeding it produces the same
// string and exits at the equality check below.
const resolveNewStyleBusinessCanonicalRedirect = async (parts = [], path = "") => {
  const parsed = parseBusinessUrlSegment(parts[2]);
  if (!parsed) return null;

  const business = await findBusinessByPublicId(parsed.publicId);
  if (!business) return null;

  const target = await buildCanonicalBusinessPath(business);
  if (!target || samePath(path, target)) return null;
  return target;
};

const resolveNewStyleCanonicalRedirectTarget = async (parts = [], path = "") => {
  if (parts[0] === "business") {
    return resolveNewStyleBusinessCanonicalRedirect(parts, path);
  }
  if (parts.length < 2 || parts.length > 4) return null;

  const districtDoc = await resolveDistrictBySlug(parts[0]).catch(() => null);
  if (!districtDoc) return null;

  const classification = await classifyMiddleSegment({
    districtDoc,
    p2: parts[1],
    p3: parts[2],
    p4: parts[3],
  }).catch(() => null);

  const districtSlug = getDistrictUrlSlug(districtDoc);
  let target = null;

  if (classification?.type === "location") {
    target = buildLocationCategoryPath({
      districtDoc,
      districtSlug,
      locationDoc: classification.locationDoc,
      categorySlug: classification.categorySlug,
    });
  } else if (classification?.type === "locationLanding") {
    target = buildLocationPath({
      districtDoc,
      districtSlug,
      locationDoc: classification.locationDoc,
    });
  } else if (classification?.type === "districtCategory") {
    target = buildLocationCategoryPath({
      districtDoc,
      districtSlug,
      categorySlug: classification.subcategorySlug || classification.categorySlug,
    });
  } else if (classification?.type === "unresolvedLocation") {
    target = buildLocationCategoryPath({
      districtDoc,
      districtSlug,
      categorySlug: classification.categorySlug,
    });
  }

  if (!target) return null;
  if (samePath(path, target)) return null;
  return target;
};

export const resolveLegacyRedirectTargetForPath = async (path = "") => {
  const parts = pathParts(path);
  if (parts.length === 0) return null;

  // Permanent infrastructure for printed QR codes and old indexed URLs:
  // first prove the request is NOT already district-prefixed/new-style, then
  // reinterpret it as a legacy URL. Reversing these two steps would redirect
  // valid new URLs and can create loops.
  if (await resolvesAsNewStyle(parts)) {
    return resolveNewStyleCanonicalRedirectTarget(parts, path);
  }

  const target = parts[0] === "business"
    ? (isLegacyBusinessIdPath(parts)
        ? await buildLegacyBusinessIdRedirect(parts)
        : await buildLegacyBusinessRedirect(parts))
    : await buildLegacyCategoryRedirect(parts);

  if (!target || samePath(path, target)) return null;
  return target;
};

const appendOriginalQuery = (req, targetPath) => {
  const original = String(req.originalUrl || req.url || "");
  const query = original.includes("?") ? original.slice(original.indexOf("?")) : "";
  return `${targetPath}${query}`;
};

export const legacyUrlRedirectMiddleware = async (req, res, next) => {
  try {
    if (!shouldInspect(req)) return next();

    const target = await resolveLegacyRedirectTargetForPath(req.path || req.url);
    if (target) {
      return res.redirect(REDIRECT_STATUS, appendOriginalQuery(req, target));
    }

    // A bare /business/<id> that got here did NOT resolve to a business above,
    // so the id is stale or junk. Left to fall through it would reach the
    // district/category router, which reads "business" as a district and the
    // id as a category and renders an indexable "Best <id> in business" page
    // for any random hex string. 404 outright instead. (A bare id that DOES
    // resolve is redirected above and never reaches this line.)
    const parts = pathParts(req.path || req.url);
    if (isLegacyBusinessIdPath(parts)) {
      res.setHeader("X-Robots-Tag", "noindex, nofollow");
      return res.status(404).end();
    }

    return next();
  } catch (error) {
    console.error("LEGACY_URL_REDIRECT_ERROR:", error);
    return next();
  }
};

export default legacyUrlRedirectMiddleware;
