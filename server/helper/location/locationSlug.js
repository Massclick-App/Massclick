import { slugify } from "../../slugify.js";

/**
 * The CANDIDATE public URL slug for a masterlocation node — the bare leaf
 * name only ("srirangam"), not the full hierarchical `slug` field
 * ("tamil-nadu-tiruchirappalli-srirangam-..."). Deliberately stops at
 * `district` and never falls through to `state`: a district-level doc's
 * public slug is its own district name, there is no state-level public URL.
 * This differs from `ownNameOf` in locationResolver.js, which does include
 * `state` because it serves free-text address matching, not URL building —
 * do not merge the two.
 *
 * "Candidate" because it is NOT guaranteed unique within a district — see
 * `computePublicLocationSlugs` below, which is what actually gets persisted.
 * Kept as a separate pure per-doc function because it is still the right
 * building block wherever only a display-ish name is needed and uniqueness
 * doesn't matter (e.g. as an input to the qualifier logic itself).
 *
 * NOTE: `slugify` from server/slugify.js is the authority here, NOT the local
 * slugify inside locationResolver.js. The two disagree on punctuation and
 * ampersands — "K.K. Nagar" is "k-k-nagar" under this one and "kk-nagar" under
 * the other, "Gandhi & Nehru Nagar" is "gandhi-and-nehru-nagar" vs
 * "gandhi-nehru-nagar". The sitemap has always used this one, so it wins.
 */
export const getPublicLocationSlug = (doc = {}) =>
  slugify(String(doc.locality || doc.ward || doc.zone || doc.district || "").trim());

const LOCATION_URL_FIELDS_BY_LEVEL = {
  zone: ["zone"],
  ward: ["zone", "ward"],
  locality: ["zone", "ward", "locality"],
};

const TARGET_FIELD_BY_LEVEL = {
  district: "district",
  zone: "zone",
  ward: "ward",
  locality: "locality",
};

const NUMERIC_SUFFIX_RE = /-(\d+)$/;

// Plain-English word appended to a colliding segment in the deprecated flat
// publicLocationSlug scheme (computePublicLocationSlugs, further down). The
// live hierarchy-path builder below does NOT use this — see
// collapseLocationUrlChain's header for why an appended word was rejected
// in favor of just omitting the redundant segment.
const LEVEL_QUALIFIER_WORD = { locality: "city", ward: "ward", zone: "zone" };

const getDuplicateNumericSuffix = (doc = {}, base = "") => {
  const persisted = slugify(doc.publicLocationSlug || "");
  if (!persisted || !base || persisted === base || !persisted.startsWith(`${base}-`)) {
    return "";
  }

  const match = persisted.match(NUMERIC_SUFFIX_RE);
  return match ? match[1] : "";
};

/**
 * Computes both the ancestor segments and the target segment for a
 * hierarchy-path URL, with an ancestor OMITTED (not qualified with a word)
 * ONLY when its own bare name is identical to the DISTRICT — e.g. a
 * district's headquarters zone/town is routinely named after the district
 * itself (verified: 18 of 439 active zones on massClick_dev, e.g. Salem
 * district's "Salem" zone), which bare would read "/salem/salem/...". An
 * earlier version of this fix appended a level word ("-zone"/"-city") to
 * disambiguate. Rejected per explicit product decision: real alternate-name
 * data in this DB for this case is itself bureaucratic ("Salem
 * Municipality", "Coimbatore Municipal Corporation" — 17 of 18 cases), so a
 * synthetic suffix would read the same way. The redundant ancestor is
 * simply left out of the path instead.
 *
 * Deliberately checks each ancestor against the district ONLY, never
 * against its immediately preceding ancestor in general (a naive "collapse
 * any adjacent duplicate" pass was tried and reverted — it also silently
 * collapsed a ward matching its own zone's name, e.g. a "Muthur" ward
 * inside a "Muthur" zone, which is a separate, NOT-yet-handled collision
 * type; that made a ward's own page collide with an unrelated locality's
 * page whenever both happened to reduce to the same short string).
 *
 * Deliberately does NOT also drop an ancestor for matching the TARGET (e.g.
 * a "K.K. Nagar" ward immediately before a "K.K. Nagar" locality target) —
 * tried that, reverted it. Verified on massClick_dev: 488 wards share a
 * name with a child locality, and 430 of those wards have OTHER sibling
 * localities carrying real, separate business data (e.g. the "K.K. Nagar"
 * ward has 630 live businesses total but only 551 sit in the same-named
 * "K.K. Nagar" locality specifically — the rest are in sibling localities
 * or assigned to the ward directly). Omitting the ward there would make the
 * ward's own page indistinguishable from the narrower locality's page and
 * silently lose those other businesses' proper page. Unlike the
 * district-collision case, this one is a real distinct-content collision,
 * not a redundant name repeat — left as a known open item (visually
 * repeats, e.g. ".../k-k-nagar/hotels-in-k-k-nagar", but each segment names
 * a genuinely different, correctly-resolving place).
 *
 * The sibling-collision case (two DIFFERENT localities sharing a name in
 * different wards) needs none of this: their ancestor path segments already
 * differ, so the scheme's own "ancestors are real path segments now" design
 * handles that for free.
 *
 * A node whose own name collides with the district AND has no surviving
 * ancestor left to distinguish it (e.g. a "Salem" zone sitting directly
 * under "Salem" district, with no ward/locality segment in play) has
 * nothing left to show at all — it folds into the district's own page
 * rather than repeating the district's name as its only segment. Confirmed
 * safe for the sitemap: `isValidSitemapLocationDoc` in sitemapRoutes.js
 * already rejects a doc whose location path is empty, so a folded zone
 * simply doesn't get its own sitemap entry (its businesses still surface on
 * the district-wide category page).
 */
const computeLocationUrlParts = (doc = {}) => {
  const fields = LOCATION_URL_FIELDS_BY_LEVEL[doc.level] || [];
  if (fields.length === 0) return { ancestors: [], target: "" };

  const districtSlug = slugify(String(doc.district || "").trim());
  const ancestorFields = fields.slice(0, -1);
  const targetField = TARGET_FIELD_BY_LEVEL[doc.level];
  const rawTarget = slugify(String(doc[targetField] || "").trim());
  const numericSuffix = rawTarget ? getDuplicateNumericSuffix(doc, rawTarget) : "";
  const target = rawTarget ? (numericSuffix ? `${rawTarget}-${numericSuffix}` : rawTarget) : "";

  const ancestors = ancestorFields
    .map((field) => slugify(String(doc[field] || "").trim()))
    .filter((name) => name && name !== districtSlug);

  const folded = ancestors.length === 0 && target === districtSlug;

  return { ancestors, target: folded ? "" : target };
};

/**
 * URL segment for a location node in the new hierarchy-path URL scheme —
 * the doc's own leaf name (`anna-nagar`), not the deprecated flat
 * `publicLocationSlug` (`anna-nagar-lalgudi`), since the new URL has real
 * ancestor path segments instead. See computeLocationUrlParts for the
 * redundant-name handling applied on top of the bare leaf.
 */
export const getLocationUrlSegment = (doc = {}) => {
  if (!doc || doc.level === "district") return "";
  return computeLocationUrlParts(doc).target;
};

export const getLocationUrlSegments = (doc = {}, { includeTarget = true } = {}) => {
  if (!doc || !LOCATION_URL_FIELDS_BY_LEVEL[doc.level]) return [];
  const { ancestors, target } = computeLocationUrlParts(doc);
  if (!includeTarget) return ancestors;
  return target ? [...ancestors, target] : ancestors;
};

export const getLocationUrlPath = (doc = {}, options = {}) =>
  getLocationUrlSegments(doc, options).join("/");

// Ancestor fields available to qualify a collision, nearest first, for each
// level. A locality can be qualified by its ward, then further by its zone if
// ward alone still isn't enough; a ward only has zone left; a zone has
// nothing left within its own district (district is already the partition
// key for the whole computation).
const ANCESTOR_CHAIN_BY_LEVEL = {
  locality: ["ward", "zone"],
  ward: ["zone"],
  zone: [],
};

/**
 * Computes the PERSISTED, collision-resolved `publicLocationSlug` for every
 * doc in `docs`, batched because — unlike `getPublicLocationSlug` — this
 * cannot be decided per-document. It has to see every sibling in the same
 * district at the same level to know whether a qualifier is even needed.
 *
 * Why this exists at all: verified against massClick_dev (8,206 active
 * nodes), 93 candidate slugs collide at the SAME level within the SAME
 * district — not the cross-district ambiguity this whole URL scheme was
 * built to fix, a second, independent one. Tiruchirappalli alone has 9
 * different localities named "Anna Nagar" in 9 different wards. The
 * resolver's "deepest level wins" tie-break (locality > ward > zone) only
 * disambiguates BETWEEN levels — it does nothing when two localities collide
 * with each other, so left as bare leaf names, most of those 9 would 404 or
 * silently resolve to the wrong one.
 *
 * Disambiguation strategy, in order:
 *   1. No collision at this district+level → the bare candidate slug.
 *   2. Collision → qualify with progressively more of the ancestor chain
 *      until the group splits: first the immediate parent
 *      ("anna-nagar" + ward "Ariyamangalam" → "anna-nagar-ariyamangalam"),
 *      then parent+grandparent if that alone still collides. This needs two
 *      rungs in practice, not one: generic names like "Bazaar Street" and
 *      "Sannathi Street" repeat at BOTH the ward and locality level across
 *      different zones, so two different "Sannathi Street" localities can
 *      easily sit inside two different wards that are ALSO both named
 *      "Bazaar Street" — ward-qualification alone still collides for roughly
 *      half of the affected nodes on real data.
 *      A parent-qualified slug is chosen over a numeric suffix
 *      ("anna-nagar-2") because a suffix is unstable — it depends on
 *      processing order and shifts if a sibling is added or removed later,
 *      silently breaking a previously-issued URL. A parent-qualified slug is
 *      deterministic from the data alone and reads as a real place rather
 *      than an arbitrary index.
 *   3. Still colliding after exhausting the full ancestor chain (e.g. two
 *      identically-named localities in two identically-named wards in two
 *      identically-named zones — a real duplicate-data case, not just a
 *      generic name) → append a short numeric suffix, ordered by `_id` so it
 *      is at least stable across re-runs, and log it. This is the genuine
 *      last resort: unlike step 2, it firing means the two places cannot be
 *      told apart from the hierarchy data at all.
 *
 * Cross-level collisions (a ward and an unrelated locality elsewhere in the
 * district happening to share a name) are deliberately NOT resolved here —
 * qualifying every locality defensively against every ward in the district
 * would make most URLs longer for a collision that, per the resolver's
 * documented and already-agreed depth tie-break, has a clear deterministic
 * winner already. Only true same-level collisions get qualified.
 *
 * A THIRD case, independent of both of the above: a node whose bare
 * candidate slug is textually identical to its OWN district's URL slug —
 * e.g. Salem district has both a "Salem" zone and a "Salem" locality (its
 * own headquarters city), so the unqualified URL would read
 * "/salem/salem/hotels", a doubled segment that looks broken even though
 * both "Salem"s are real, distinct places. Verified against massClick_dev:
 * 35 such nodes across 19 districts — common enough (district HQs are
 * routinely named after the district) that it needed the same systematic
 * treatment as the sibling-collision case above, not a one-off patch.
 * Resolved with the same progressive ancestor-qualification strategy
 * ("salem" locality + ward "Central Salem" -> "salem-central-salem"), with a
 * level-word fallback ("-zone"/"-ward"/"-city") for the levels whose
 * ancestor chain is empty (a zone has no parent within its own district to
 * qualify with — see ANCESTOR_CHAIN_BY_LEVEL) or that still land back on the
 * district's own slug even after exhausting it.
 *
 * @param {Array<{_id, district, zone, ward, locality, level}>} docs - active
 *   masterlocation docs (plain objects, e.g. from .lean()).
 * @param {Map<string,string>} [districtUrlSlugByDistrictName] - district
 *   name -> its public URL slug (urlAlias-preferred, matching
 *   getDistrictUrlSlug). Falls back to a plain slugify of the district name
 *   per-entry when a district isn't in the map, so callers that don't have
 *   district docs on hand (or districts with no alias) still get correct
 *   behavior.
 * @returns {Map<string, string>} doc._id (stringified) -> final publicLocationSlug
 */
export const computePublicLocationSlugs = (docs = [], districtUrlSlugByDistrictName = new Map()) => {
  const result = new Map();

  const buildSlugAtDepth = (doc, base, depth) => {
    const chain = ANCESTOR_CHAIN_BY_LEVEL[doc.level] || [];
    const parts = [base];
    for (const field of chain.slice(0, depth)) {
      const name = doc[field];
      if (!name) continue;
      const slug = slugify(String(name).trim());
      // Skip a qualifier that repeats the part immediately before it — real
      // data has localities named "Anna Nagar" inside a ward ALSO named
      // "Anna Nagar" (6 cases across Tiruchirappalli's zones alone). Without
      // this, disambiguating those against each other by zone produces
      // "anna-nagar-anna-nagar-lalgudi" instead of "anna-nagar-lalgudi" — the
      // repeat carries no information, it's just an artifact of the source
      // data reusing a name at two adjacent levels. Only checked against the
      // immediately preceding part, not the whole slug so far: a genuine
      // three-level repeat (locality = ward = zone, all "Attur") should still
      // show once, which this also happens to do correctly.
      if (slug && slug !== parts[parts.length - 1]) parts.push(slug);
    }
    return parts.join("-");
  };

  const districtUrlSlugFor = (districtName) =>
    districtUrlSlugByDistrictName.get(districtName) || slugify(String(districtName || "").trim());

  // Disambiguates a candidate slug that exactly matches its own district's
  // URL slug — see this function's header comment for why this is a real,
  // common case and not a one-off. Applied ONCE per doc, before grouping, so
  // everything downstream (the same-level sibling collision logic below)
  // operates on top of the already-disambiguated base exactly as it would
  // for any other candidate slug — including qualifying it further if it
  // happens to still collide with a real sibling after this adjustment.
  const disambiguateFromDistrict = (doc, base) => {
    // A district-level doc's own candidate slug IS its district's slug by
    // construction (getPublicLocationSlug falls through to doc.district when
    // locality/ward/zone are all absent) — that's not a collision to
    // resolve, it would corrupt every district's own publicLocationSlug into
    // "<slug>-district" if not excluded here.
    if (doc.level === "district") return base;
    const districtSlug = districtUrlSlugFor(doc.district);
    if (base !== districtSlug) return base;
    const chain = ANCESTOR_CHAIN_BY_LEVEL[doc.level] || [];
    for (let depth = 1; depth <= chain.length; depth++) {
      const qualified = buildSlugAtDepth(doc, base, depth);
      if (qualified !== districtSlug) return qualified;
    }
    return `${base}-${LEVEL_QUALIFIER_WORD[doc.level] || doc.level}`;
  };

  // Group by district + level + (district-disambiguated) candidate base slug.
  const baseGroups = new Map();
  for (const doc of docs) {
    const rawBase = getPublicLocationSlug(doc);
    if (!rawBase) continue;
    const base = disambiguateFromDistrict(doc, rawBase);
    const key = `${doc.district}||${doc.level}||${base}`;
    if (!baseGroups.has(key)) baseGroups.set(key, []);
    baseGroups.get(key).push({ doc, base });
  }

  // Each unresolved group is walked forward through increasing qualifier
  // depth until it splits into singletons (or the chain runs out).
  let pending = [...baseGroups.values()].filter((g) => g.length > 1);
  for (const g of baseGroups.values()) {
    if (g.length === 1) result.set(String(g[0].doc._id), g[0].base);
  }

  const maxDepth = Math.max(
    0,
    ...Object.values(ANCESTOR_CHAIN_BY_LEVEL).map((c) => c.length)
  );

  for (let depth = 1; depth <= maxDepth && pending.length > 0; depth++) {
    const next = [];
    for (const group of pending) {
      const regrouped = new Map();
      for (const { doc, base } of group) {
        const slug = buildSlugAtDepth(doc, base, depth);
        if (!regrouped.has(slug)) regrouped.set(slug, []);
        regrouped.get(slug).push({ doc, base, slug });
      }
      for (const [slug, members] of regrouped) {
        if (members.length === 1) {
          result.set(String(members[0].doc._id), slug);
        } else {
          next.push(members.map(({ doc, base }) => ({ doc, base })));
        }
      }
    }
    pending = next;
  }

  // Genuine last resort: the ancestor chain is exhausted and duplicates
  // remain — these places are indistinguishable from the hierarchy data
  // alone.
  for (const group of pending) {
    const fullyQualified = group.map(({ doc, base }) => ({
      doc,
      slug: buildSlugAtDepth(doc, base, maxDepth),
    }));
    const sorted = [...fullyQualified].sort((a, b) =>
      String(a.doc._id).localeCompare(String(b.doc._id))
    );
    sorted.forEach(({ doc, slug }, index) => {
      const finalSlug = index === 0 ? slug : `${slug}-${index + 1}`;
      result.set(String(doc._id), finalSlug);
      console.warn(
        `[locationSlug] "${slug}" still collided after exhausting the full ` +
          `ancestor chain in ${doc.district} — assigned "${finalSlug}" to ` +
          `_id=${doc._id}. These places are indistinguishable from the ` +
          "hierarchy data alone; worth a manual look."
      );
    });
  }

  return result;
};

/**
 * The district segment of a public URL.
 *
 * Prefers an explicit `urlAlias` on the district doc so a district can be
 * published under a shorter, commonly-used name (Tiruchirappalli -> "trichy")
 * without renaming the underlying record. Falls back to the slugified district
 * name when no alias is set, which is the case for most districts.
 *
 * Accepts either a district-level doc or any doc carrying a `district` field,
 * so a locality doc can produce its own district segment without a second read.
 */
export const getDistrictUrlSlug = (doc = {}) => {
  const alias = String(doc.urlAlias || "").trim();
  if (alias) return slugify(alias);
  return slugify(String(doc.district || "").trim());
};

/**
 * The district's DISPLAY name — for breadcrumb crumbs, API responses, and
 * anywhere else a human-readable district label is needed. Prefers
 * `urlAlias` title-cased ("Trichy") over the full official district name
 * ("Tiruchirappalli"): the URL itself is built from urlAlias
 * (getDistrictUrlSlug, above), and a label reading "Tiruchirappalli" while
 * the address bar says "/trichy" looks like a mismatch to a user even though
 * both are correct. Falls back to the official name for the ~37 districts
 * with no alias.
 *
 * Single source for this rule — used by helper/seo/breadcrumbBuilder.js and
 * the /v2/location/resolve endpoint. If you need this rule in a third place,
 * import it from here rather than reimplementing it.
 */
export const getDistrictDisplayName = (doc = {}) => {
  const alias = String(doc.urlAlias || "").trim();
  const result = alias
    ? alias.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    : doc.district || "";
  return result;
};

const LOCATION_LEVEL_DISAMBIGUATOR = { locality: "City", ward: "Ward", zone: "Zone" };

/**
 * A masterlocation doc's DISPLAY name — for breadcrumb crumbs, SSR titles,
 * and API responses (mirrors getDistrictDisplayName's role for districts).
 * Single source for this rule; the bare-name fallback
 * (`doc.locality || doc.ward || doc.zone || doc.district`) used to be
 * reimplemented independently in breadcrumbBuilder.js, ssrMiddleware.js, and
 * locationResolver.js's `ownNameOf` — consolidated here specifically because
 * of the case below, which all three needed and none had.
 *
 * A node whose own name is textually identical to its district's display
 * name (e.g. Salem district's "Salem" locality/zone — its own headquarters
 * city, not a data error; verified against massClick_dev: 35 such nodes
 * across 19 districts after the district-aware slug qualification in
 * computePublicLocationSlugs) reads as a doubled, broken-looking breadcrumb
 * ("Home > Salem > Salem > Hotels") even on a URL whose SLUG is already
 * correctly disambiguated — the slug fix alone doesn't touch this doc's own
 * name field. Disambiguated by:
 *   1. A distinct `alternateNames` entry, if the data already has one (e.g.
 *      "Salem City" — several of these 35 nodes already carry exactly this,
 *      suggesting whoever entered the data anticipated the need).
 *   2. Otherwise, append the level as a plain-English qualifier ("Salem
 *      Zone") — always available, unlike the slug qualifier's ancestor
 *      chain, since this only needs one word, not a real disambiguating
 *      fact from the hierarchy.
 *
 * @param {object} doc - masterlocation doc: { level, district, zone, ward,
 *   locality, alternateNames }.
 * @param {string} [districtDisplayName] - result of
 *   getDistrictDisplayName(districtDoc) for this doc's own district. Omit
 *   only when no district context is available; the function still returns
 *   the bare name, just without disambiguation.
 */
export const getLocationDisplayName = (doc = {}, districtDisplayName = "") => {
  const ownName = doc.locality || doc.ward || doc.zone || doc.district || "";
  if (
    !districtDisplayName ||
    ownName.trim().toLowerCase() !== districtDisplayName.trim().toLowerCase()
  ) {
    return ownName;
  }

  const alternates = Array.isArray(doc.alternateNames) ? doc.alternateNames : [];
  const distinctAlternate = alternates.find(
    (name) => name && name.trim().toLowerCase() !== districtDisplayName.trim().toLowerCase()
  );
  if (distinctAlternate) return distinctAlternate;

  const qualifier = LOCATION_LEVEL_DISAMBIGUATOR[doc.level];
  return qualifier ? `${ownName} ${qualifier}` : ownName;
};
