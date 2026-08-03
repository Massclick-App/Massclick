/**
 * Single server-side authority for the business-detail URL's own slug segment.
 *
 * `businesslists.slug` is NOT a business slug. It holds category or SEO title
 * text — "hotels", "Best CCTV Camera Installation and Dealers Near Me" — and
 * never the business's own name (verified against massClick_dev: of 9,525
 * populated `slug` values, 0 match their `businessName` and 2,978 are exactly
 * the `category` string). Every emitter used to read it first, so the business
 * name appeared in no business URL at all and 119 Trichy hotels produced URLs
 * that differed only by ObjectId.
 *
 * Build the slug from `businessName` here and nowhere else. `slug` stays
 * untouched in the DB — it's SEO title data and other code may still read it.
 *
 * The client has a deliberate parallel implementation in
 * client/ui-app/src/utils/searchResultNavigation.js (`createBusinessSlug`),
 * because that app cannot import server code. The two MUST produce
 * byte-identical output: the canonical redirect in
 * legacyUrlRedirectMiddleware.js compares a request's slug segment against
 * this function, so any divergence would 301 the links the app itself emits.
 * If you change the length cap, the fallback, or the truncation rule here,
 * change it there too.
 */
import { randomBytes } from "crypto";
import { slugify } from "../../slugify.js";

// Long enough for real business names, short enough to keep the URL readable.
// The longest name in the data is 116 chars ("AIMAN COLLEGE OF ARTS AND
// SCIENCE FOR WOMEN, Accredited with 'A' Grade by NAAC..."), which would
// otherwise become a 110-char path segment.
export const MAX_BUSINESS_SLUG_LENGTH = 80;

// Used when a name has no latin alphanumerics at all and slugifies to "" (7
// such businesses in dev). The page still resolves — routing is id-backed —
// so this only needs to be stable, not meaningful.
export const BUSINESS_SLUG_FALLBACK = "business";

const truncateAtWordBoundary = (slug = "") => {
  if (slug.length <= MAX_BUSINESS_SLUG_LENGTH) return slug;
  const cut = slug.slice(0, MAX_BUSINESS_SLUG_LENGTH);
  const lastBoundary = cut.lastIndexOf("-");
  return (lastBoundary > 0 ? cut.slice(0, lastBoundary) : cut).replace(/-+$/, "");
};

/**
 * The canonical business-slug segment for a business.
 *
 * @param {Object} business - a businesslists doc (or any object carrying
 *   `businessName`/`name`). The schema's pre("validate") hook keeps those two
 *   fields mirrored, so either is sufficient.
 * @returns {string} a non-empty slug, never "".
 */
export const getBusinessUrlSlug = (business = {}) =>
  truncateAtWordBoundary(slugify(business.businessName || business.name || "")) ||
  BUSINESS_SLUG_FALLBACK;

/* =========================================================
   publicId — the trailing chunk of a business detail URL
========================================================= */

export const PUBLIC_ID_LENGTH = 6;
const PUBLIC_ID_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";

// A publicId always contains at least one letter AND at least one digit. That
// is what makes it distinguishable from an ordinary word at the end of a slug:
// parseBusinessUrlSegment splits on the LAST hyphen, so without this rule a
// business whose name ended in a 6-letter word ("...-market") could be read as
// carrying a publicId and, in the worst case, resolve to a different business.
// Real names effectively never end in a mixed letter+digit 6-char token.
export const PUBLIC_ID_RE = /^(?=[a-z0-9]*[a-z])(?=[a-z0-9]*\d)[a-z0-9]{6}$/;

export const generatePublicId = () => {
  // Rejection-sample until the mixed letter+digit rule holds. At 6 chars the
  // rule is satisfied by 85.8% of random draws (36^6 minus the all-letter and
  // all-digit sets), so this averages 1.17 draws and effectively never loops
  // more than once or twice.
  for (;;) {
    let candidate = "";
    const bytes = randomBytes(PUBLIC_ID_LENGTH);
    for (let i = 0; i < PUBLIC_ID_LENGTH; i += 1) {
      candidate += PUBLIC_ID_ALPHABET[bytes[i] % PUBLIC_ID_ALPHABET.length];
    }
    if (PUBLIC_ID_RE.test(candidate)) return candidate;
  }
};

/**
 * A publicId not already taken in `model`'s collection.
 *
 * The unique index on `publicId` is the real guarantee — this check only keeps
 * the common path from ever reaching a duplicate-key error. Callers that write
 * concurrently should still be prepared for E11000 and retry.
 */
export const generateUniquePublicId = async (model, maxAttempts = 10) => {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const candidate = generatePublicId();
    // eslint-disable-next-line no-await-in-loop
    const taken = await model.exists({ publicId: candidate });
    if (!taken) return candidate;
  }
  throw new Error(
    `Could not generate a unique publicId after ${maxAttempts} attempts`,
  );
};

/* =========================================================
   URL segment
========================================================= */

/**
 * The single path segment identifying a business: `<name-slug>-<publicId>`,
 * e.g. "hexahub-homestay-and-hospitality-services-a1b2c3".
 *
 * Returns null when the business has no publicId yet. That is not an error —
 * it is the deploy window between shipping this code and finishing the
 * backfill, and during it every caller must keep using the old URL shape.
 * Emitting a new-shape URL without a publicId would produce a link that
 * cannot be resolved, and redirecting to one would loop.
 */
export const getBusinessUrlSegment = (business = {}) => {
  const publicId = String(business.publicId || "").trim().toLowerCase();
  if (!PUBLIC_ID_RE.test(publicId)) return null;
  return `${getBusinessUrlSlug(business)}-${publicId}`;
};

/**
 * Split a URL segment back into its parts. The publicId is the chunk after the
 * LAST hyphen; everything before it is the cosmetic slug.
 *
 * @returns {{slug: string, publicId: string}|null} null when the segment does
 *   not carry a well-formed publicId, which callers should treat as "this is
 *   not a new-shape business URL" rather than as a missing business.
 */
export const parseBusinessUrlSegment = (segment = "") => {
  const value = String(segment || "").trim().toLowerCase();
  const lastHyphen = value.lastIndexOf("-");
  if (lastHyphen <= 0) return null;

  const publicId = value.slice(lastHyphen + 1);
  if (!PUBLIC_ID_RE.test(publicId)) return null;

  return { slug: value.slice(0, lastHyphen), publicId };
};

/**
 * The canonical business detail path, or null when it cannot be built yet
 * (no publicId, or no district — both mean the caller must fall back to the
 * pre-Phase-B shape).
 */
export const buildBusinessPath = ({ districtSlug = "", business = {} } = {}) => {
  const segment = getBusinessUrlSegment(business);
  if (!districtSlug || !segment) return null;
  return `/business/${districtSlug}/${segment}`;
};

export default getBusinessUrlSlug;
