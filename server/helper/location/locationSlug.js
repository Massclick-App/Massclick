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
 * @param {Array<{_id, district, zone, ward, locality, level}>} docs - active
 *   masterlocation docs (plain objects, e.g. from .lean()).
 * @returns {Map<string, string>} doc._id (stringified) -> final publicLocationSlug
 */
export const computePublicLocationSlugs = (docs = []) => {
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

  // Group by district + level + candidate base slug.
  const baseGroups = new Map();
  for (const doc of docs) {
    const base = getPublicLocationSlug(doc);
    if (!base) continue;
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
