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
import { classifyMiddleSegment } from "../helper/location/urlSegmentClassifier.js";
import { getBusinessUrlSlug } from "../helper/businessList/businessUrl.js";
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

const isNewStyleBusinessPath = async (parts = []) => {
  if (parts[0] !== "business" || parts.length < 5) return false;
  const districtDoc = await resolveDistrictBySlug(parts[1]).catch(() => null);
  if (!districtDoc) return false;

  // Business detail pages are id-backed on the client, and older/newer
  // generated links may carry either a publicLocationSlug or a free-text
  // location slug as the location segment. District validity is the critical
  // new-style discriminator; do not reinterpret it as legacy after this.
  return true;
};

const isNewStyleCategoryPath = async (parts = []) => {
  if (parts.length < 2 || parts.length > 4) return false;
  const districtDoc = await resolveDistrictBySlug(parts[0]).catch(() => null);
  return Boolean(districtDoc);
};

const resolvesAsNewStyle = async (parts = []) => {
  if (parts[0] === "business") return isNewStyleBusinessPath(parts);
  return isNewStyleCategoryPath(parts);
};

const buildLegacyCategoryRedirect = async (parts = []) => {
  if (parts.length < 2 || parts.length > 3) return null;

  const [legacyLocation, category, subcategory] = parts;
  const locationDoc = await resolveLocationForSearch(legacyLocation).catch(() => null);
  if (!locationDoc?.district) return null;

  const districtDoc = await findDistrictDocByName(locationDoc.district);
  if (!districtDoc) return null;

  const districtSlug = getDistrictUrlSlug(districtDoc);
  const locationSlug =
    locationDoc.level === "district"
      ? ""
      : getRouteLocationSlug(locationDoc, legacyLocation);
  const targetParts = [districtSlug, locationSlug, category, subcategory].filter(Boolean);

  return `/${targetParts.join("/")}`;
};

const findBusinessForLegacyPath = async (id = "") => {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  return businessListModel.findById(id, businessProjection).lean();
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

const isLegacyBusinessIdPath = (parts = []) =>
  parts[0] === "business" && parts.length === 2;

const buildLegacyBusinessIdRedirect = async (parts = []) => {
  if (!isLegacyBusinessIdPath(parts)) return null;

  const [, businessId] = parts;
  const business = await findBusinessForLegacyPath(businessId);
  if (!business) return null;

  const locationDoc = await findLocationDocForBusiness(business, business.location || "");
  const districtName = locationDoc?.district || business.masterLocation?.district;
  const districtDoc = await findDistrictDocByName(districtName);
  if (!districtDoc) return null;

  const districtSlug = getDistrictUrlSlug(districtDoc);
  const locationSlug = getRouteLocationSlug(locationDoc, business.location || "");
  const businessSlug = getBusinessUrlSlug(business);

  return `/business/${districtSlug}/${locationSlug}/${businessSlug}/${business._id}`;
};

const buildLegacyBusinessRedirect = async (parts = []) => {
  if (parts[0] !== "business" || parts.length !== 4) return null;

  const [, legacyLocation, , businessId] = parts;
  const business = await findBusinessForLegacyPath(businessId);
  if (!business) return null;

  const locationDoc = await findLocationDocForBusiness(business, legacyLocation);
  const districtName = locationDoc?.district || business.masterLocation?.district;
  const districtDoc = await findDistrictDocByName(districtName);
  if (!districtDoc) return null;

  const districtSlug = getDistrictUrlSlug(districtDoc);
  const locationSlug = getRouteLocationSlug(
    locationDoc,
    business.location || legacyLocation,
  );
  const businessSlug = getBusinessUrlSlug(business);

  return `/business/${districtSlug}/${locationSlug}/${businessSlug}/${business._id}`;
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
// A new-style /business/:district/:location/:businessSlug/:id whose slug
// segment is not the canonical one. Routing resolves the page by :id alone, so
// ANY string in that segment serves a 200 — which is how one business was
// simultaneously reachable at .../hotels/<id> (emitters reading
// businesslists.slug) and .../hexahub-homestay.../<id> (emitters reading
// businessName), with nothing declaring which was real. 301 to the canonical
// slug so already-indexed URLs, printed QR codes, and shared links self-heal
// instead of accumulating as duplicates.
//
// Only the slug segment is canonicalized. The location segment still varies by
// emitter (a resolved publicLocationSlug vs a slugified free-text `location`,
// which for a district-linked business are legitimately different strings), so
// validating it here would 301 links this app itself generates. Dropping that
// segment is a separate change.
//
// No loop is possible: the target differs from its input in exactly one
// segment, whose value equals getBusinessUrlSlug(business) by construction —
// so feeding the target back through this function returns null at the
// equality check below.
const resolveNewStyleBusinessCanonicalRedirect = async (parts = [], path = "") => {
  if (parts.length !== 5) return null;

  const [, districtSlug, locationSlug, businessSlug, businessId] = parts;
  const business = await findBusinessForLegacyPath(businessId);
  if (!business) return null;

  const canonicalSlug = getBusinessUrlSlug(business);
  if (businessSlug === canonicalSlug) return null;

  const target = `/business/${districtSlug}/${locationSlug}/${canonicalSlug}/${business._id}`;
  if (samePath(path, target)) return null;
  return target;
};

const resolveNewStyleCanonicalRedirectTarget = async (parts = [], path = "") => {
  if (parts[0] === "business") {
    return resolveNewStyleBusinessCanonicalRedirect(parts, path);
  }
  if (parts.length !== 3) return null;

  const districtDoc = await resolveDistrictBySlug(parts[0]).catch(() => null);
  if (!districtDoc) return null;

  const classification = await classifyMiddleSegment({
    districtDoc,
    p2: parts[1],
    p3: parts[2],
  }).catch(() => null);
  if (classification?.type !== "unresolvedLocation") return null;

  const districtSlug = getDistrictUrlSlug(districtDoc);
  const target = `/${districtSlug}/${classification.categorySlug}`;
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

    // Bare /business/<id> is the pre-migration business-detail URL shape
    // (see git history); it no longer matches any route. Rather than let it
    // fall through to the district/category router — which treats "business"
    // as a district and the id as a category, producing an indexable
    // "Best <id> in business" page for any random hex string — return 404
    // outright so unmatched legacy/QR-code links stop getting (re)indexed.
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
