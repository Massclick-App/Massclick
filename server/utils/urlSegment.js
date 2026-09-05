// Shape validation for incoming URL path segments.
//
// Every URL segment this app generates comes out of slugify() (server/slugify.js),
// which can only ever emit lowercase [a-z0-9] runs joined by single hyphens. A
// segment outside that shape is therefore one we could never have linked to, and
// no page can exist at it.
//
// This exists because Googlebot was crawling an unbounded, self-generated URL
// space: req.path is NOT percent-decoded by Express, so a literal "%20" in a path
// survived into the SSR route context, got re-slugified into "-20" when the page
// emitted its own breadcrumb/canonical, and came back one segment longer on the
// next crawl. Every such request cost a full businesslists collection scan
// (~11.7k docs). Observed URLs reached 949 characters of repeated "20", and the
// soft 200 we returned told Google the whole space was real.
//
// Rejecting on shape is what breaks the growth loop: these URLs can only grow by
// appending, so a length/token/digit-run cap makes unbounded growth impossible.
//
// Kept dependency-free so it stays unit-testable — ssrMiddleware.js cannot be
// imported in isolation (it pulls in S3/Mongo config at module load).

// Limits are deliberately generous — the point is only that they are FINITE, so
// an append-per-crawl loop cannot run forever. The longest real segment shape is
// a "<category>-in-<location>" composite from buildLocationCategorySegment
// (~60 chars, ~8 tokens), so these leave real URLs large headroom.
export const MAX_URL_SEGMENT_LENGTH = 120;
export const MAX_URL_SEGMENT_TOKENS = 16;
// Pincodes (6 digits) are the longest digit run any real slug carries.
export const MAX_URL_SEGMENT_DIGIT_RUN = 6;

// Underscores are allowed: the SPA has real top-level routes shaped like
// "user_feed" and "user_massclick-documents" that must not be 404'd.
const CANONICAL_SEGMENT_PATTERN = /^[a-z0-9_]+(?:-[a-z0-9_]+)*$/;
const EXCESSIVE_DIGIT_RUN_PATTERN = new RegExp(`[0-9]{${MAX_URL_SEGMENT_DIGIT_RUN + 1},}`);

export const isServableUrlSegment = (segment = "") => {
  const value = String(segment || "").toLowerCase();
  if (!value || value.length > MAX_URL_SEGMENT_LENGTH) return false;
  if (!CANONICAL_SEGMENT_PATTERN.test(value)) return false;
  if (value.split("-").length > MAX_URL_SEGMENT_TOKENS) return false;
  if (EXCESSIVE_DIGIT_RUN_PATTERN.test(value)) return false;
  return true;
};
