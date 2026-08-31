import businessListModel from "../../model/businessList/businessListModel.js";

/**
 * Duplicate detection for the business directory.
 *
 * The directory stores one document PER CATEGORY for a single real business —
 * "Relax Holidays" legitimately exists 9 times at one address, once for
 * adventure tourism, trekking organizers, tourist guides and so on. That makes
 * the obvious signals (same name, same address, same phone) useless on their
 * own: a name+address sweep flags ~650 groups of which almost none are real.
 *
 * So every rule here declares the confidence it actually carries, and the UI
 * groups them by that. A rule is never "the answer" — it is a reason to look.
 */

const NOISE_WORDS = new Set([
  "the", "and", "for", "ltd", "limited", "pvt", "private", "co", "company",
  "inc", "llp", "shop", "store",
]);

export const normalizeText = (value) =>
  (value ?? "").toString().toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

export const normalizePhone = (value) => {
  let digits = (value ?? "").toString().replace(/\D/g, "");
  if (digits.length > 10) digits = digits.slice(-10);
  return digits.length === 10 ? digits : "";
};

const normalizePincode = (doc) => (doc.pincode ?? "").toString().replace(/\D/g, "");

const nameOf = (doc) => normalizeText(doc.businessName || doc.name);

const addressText = (doc) => normalizeText([doc.plotNumber, doc.street].join(" "));

const addressTokens = (doc) =>
  new Set(addressText(doc).split(" ").filter((word) => word.length > 2 && !NOISE_WORDS.has(word)));

const jaccard = (a, b) => {
  if (!a.size || !b.size) return 0;
  let shared = 0;
  for (const token of a) if (b.has(token)) shared += 1;
  return shared / new Set([...a, ...b]).size;
};

const coordsOf = (doc) => {
  const coords = doc?.geoLocation?.coordinates;
  if (!Array.isArray(coords) || coords.length !== 2) return null;
  const [lng, lat] = coords.map(Number);
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;
  if (lng === 0 && lat === 0) return null;
  return { lng, lat };
};

/** Metres between two lat/lng points (haversine). */
const distanceMetres = (a, b) => {
  const R = 6371000;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

/**
 * Two documents describe the same physical place.
 *
 * Addresses are re-typed rather than copied, and the same shop routinely
 * appears as "…Thillai Nagar, Tiruchirappalli, 620018" in one row and
 * "…Thillai Nagar, 620018" in another, so exact string equality misses most
 * real duplicates. Geo coordinates win when both rows have them; otherwise
 * fall back to pincode plus street-token overlap.
 */
const samePlace = (a, b) => {
  const geoA = coordsOf(a);
  const geoB = coordsOf(b);
  // Geo agreement CONFIRMS a match but never vetoes one. Coordinates here are
  // often geocoded from a partial address, so two rows for one shop can sit
  // hundreds of metres apart; letting distance rule out a strong name+address
  // match hid more than half the real duplicates in testing.
  if (geoA && geoB) {
    const metres = distanceMetres(geoA, geoB);
    if (metres <= 60) return { same: true, why: `pinned ${Math.round(metres)}m apart` };
  }

  const pinA = normalizePincode(a);
  const pinB = normalizePincode(b);
  const overlap = jaccard(addressTokens(a), addressTokens(b));

  if (pinA && pinA === pinB && overlap >= 0.3) {
    return { same: true, why: `same pincode ${pinA}, ${Math.round(overlap * 100)}% address overlap` };
  }
  if (overlap >= 0.75) {
    return { same: true, why: `${Math.round(overlap * 100)}% address overlap` };
  }
  return { same: false, why: `only ${Math.round(overlap * 100)}% address overlap` };
};

/** Split a coarse bucket into clusters that are actually at the same place. */
const clusterByPlace = (docs) => {
  const clusters = [];
  const used = new Array(docs.length).fill(false);

  for (let i = 0; i < docs.length; i += 1) {
    if (used[i]) continue;
    used[i] = true;
    const cluster = { docs: [docs[i]], reasons: [] };

    for (let j = i + 1; j < docs.length; j += 1) {
      if (used[j]) continue;
      const verdict = samePlace(docs[i], docs[j]);
      if (verdict.same) {
        used[j] = true;
        cluster.docs.push(docs[j]);
        cluster.reasons.push(verdict.why);
      }
    }
    if (cluster.docs.length > 1) clusters.push(cluster);
  }
  return clusters;
};

const bucket = (docs, keyFn) => {
  const map = new Map();
  for (const doc of docs) {
    const key = keyFn(doc);
    if (!key) continue;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(doc);
  }
  return [...map.entries()].filter(([, group]) => group.length > 1);
};

/**
 * The rule catalogue.
 *
 * confidence:
 *   certain  — safe to act on after a glance
 *   likely   — almost always a duplicate, read the addresses first
 *   review   — a genuine question; chain branches live here
 *   audit    — expected to be non-duplicate, surfaced to prove the data is sane
 *   quality  — not a duplicate at all, a data-entry defect worth fixing
 */
export const DUPLICATE_RULES = [
  {
    id: "name_category_place",
    label: "Same name, category & place",
    confidence: "certain",
    blurb:
      "Identical business name in the identical category at what resolves to the same physical address. This is the definition of a redundant listing.",
    run: (docs) => {
      const out = [];
      const keyed = bucket(docs, (d) =>
        nameOf(d) && normalizeText(d.category) ? `${nameOf(d)}|${normalizeText(d.category)}` : null
      );
      for (const [key, group] of keyed) {
        for (const cluster of clusterByPlace(group)) {
          out.push({
            key: `${key}|${cluster.docs.map((d) => d._id).join("-")}`,
            docs: cluster.docs,
            reason: `Same name "${cluster.docs[0].businessName}" and same category "${cluster.docs[0].category}", and the addresses resolve to one place (${cluster.reasons[0]}).`,
          });
        }
      }
      return out;
    },
  },
  {
    id: "place_id",
    label: "Same Google place_id",
    confidence: "certain",
    blurb:
      "Two rows carry the identical Google Maps place_id, so Google considers them one establishment. Only ~16% of the directory has a place_id, so this rule is precise but narrow.",
    run: (docs) =>
      bucket(docs, (d) => (d.place_id ? `pid:${String(d.place_id).trim()}` : null)).map(([key, group]) => ({
        key,
        docs: group,
        reason: `All ${group.length} rows share Google place_id ${String(group[0].place_id).trim()}, which identifies exactly one establishment.`,
      })),
  },
  {
    id: "public_id",
    label: "Duplicate publicId",
    confidence: "certain",
    blurb:
      "publicId is meant to be unique and permanent — it is baked into printed QR codes and indexed URLs. A collision here is a bug, not a listing decision.",
    run: (docs) =>
      bucket(docs, (d) => (d.publicId ? `puid:${String(d.publicId).trim()}` : null)).map(([key, group]) => ({
        key,
        docs: group,
        reason: `publicId "${group[0].publicId}" is used by ${group.length} documents. publicId must be unique — printed QR codes and public URLs resolve through it.`,
      })),
  },
  {
    id: "name_category_phone",
    label: "Same name, category & phone",
    confidence: "likely",
    blurb:
      "Same name and category on the same phone number. Where the addresses differ this is usually a chain branch on a shared helpline, so check the addresses before merging.",
    run: (docs) =>
      bucket(docs, (d) => {
        const phone = normalizePhone(d.contact);
        return nameOf(d) && phone && normalizeText(d.category)
          ? `${nameOf(d)}|${normalizeText(d.category)}|${phone}`
          : null;
      }).map(([key, group]) => {
        const pincodes = new Set(group.map(normalizePincode).filter(Boolean));
        return {
          key,
          docs: group,
          reason:
            pincodes.size > 1
              ? `Same name, category and phone ${normalizePhone(group[0].contact)}, but ${pincodes.size} different pincodes — likely separate branches sharing one helpline.`
              : `Same name, category and phone ${normalizePhone(group[0].contact)} within one pincode.`,
        };
      }),
  },
  {
    id: "name_category_location",
    label: "Same name & category in one location",
    confidence: "likely",
    blurb:
      "Same name in the same category and the same location field, with the street address written differently. Catches duplicates that address matching alone misses.",
    run: (docs) =>
      bucket(docs, (d) =>
        nameOf(d) && normalizeText(d.category) && normalizeText(d.location)
          ? `${nameOf(d)}|${normalizeText(d.category)}|${normalizeText(d.location)}`
          : null
      ).map(([key, group]) => ({
        key,
        docs: group,
        reason: `"${group[0].businessName}" appears ${group.length} times in category "${group[0].category}" within ${group[0].location}.`,
      })),
  },
  {
    id: "name_pincode",
    label: "Same name in one pincode",
    confidence: "likely",
    blurb:
      "Same business name inside a single pincode, ignoring category, where at least two rows share a category. Catches a business re-entered under a slightly different category spelling.",
    run: (docs) =>
      bucket(docs, (d) => {
        const pin = normalizePincode(d);
        return nameOf(d) && pin ? `${nameOf(d)}|${pin}` : null;
      })
        .filter(([, group]) => new Set(group.map((d) => normalizeText(d.category))).size < group.length)
        .map(([key, group]) => ({
          key,
          docs: group,
          reason: `"${group[0].businessName}" appears ${group.length} times in pincode ${normalizePincode(group[0])}, and at least two of those share a category.`,
        })),
  },
  {
    id: "same_email",
    label: "Same email address",
    confidence: "review",
    blurb:
      "Different businesses sharing one mailbox. Sometimes a genuine group of companies, sometimes the same listing entered twice.",
    run: (docs) =>
      bucket(docs, (d) => {
        const email = normalizeText(d.email).replace(/\s/g, "");
        return email.length > 5 ? `email:${email}` : null;
      }).map(([key, group]) => ({
        key,
        docs: group,
        reason: `${group.length} listings share the email ${group[0].email}.`,
      })),
  },
  {
    id: "same_website",
    label: "Same website",
    confidence: "review",
    blurb:
      "One website across several listings. Expected for a chain, suspicious for a single-location business.",
    run: (docs) =>
      bucket(docs, (d) => {
        const site = normalizeText(d.website)
          .replace(/^https? /, "")
          .replace(/^www /, "")
          .replace(/\s/g, "");
        return site.length > 5 ? `site:${site}` : null;
      }).map(([key, group]) => ({
        key,
        docs: group,
        reason: `${group.length} listings point at the same website (${group[0].website}).`,
      })),
  },
  {
    id: "same_googlemap",
    label: "Same Google Maps link",
    confidence: "review",
    blurb: "The identical maps link pasted onto more than one listing, so they resolve to a single pin.",
    run: (docs) =>
      bucket(docs, (d) => {
        const link = (d.googleMap ?? "").toString().trim();
        return link.length > 10 ? `gmap:${link}` : null;
      }).map(([key, group]) => ({
        key,
        docs: group,
        reason: `${group.length} listings share one Google Maps link, so they point at a single pin.`,
      })),
  },
  {
    id: "name_address_any_category",
    label: "Same name & address, any category",
    confidence: "audit",
    blurb:
      "Expected to be mostly legitimate: one business is stored once per category, so a business in 9 categories appears 9 times here. Shown so that pattern stays visible and verifiable, not so it can be bulk-merged.",
    run: (docs) => {
      const out = [];
      const keyed = bucket(docs, (d) =>
        nameOf(d) ? `${nameOf(d)}|${addressText(d)}|${normalizePincode(d)}` : null
      );
      for (const [key, group] of keyed) {
        const categories = new Set(group.map((d) => normalizeText(d.category)));
        out.push({
          key,
          docs: group,
          reason:
            categories.size === group.length
              ? `${group.length} rows, each in a different category — this is the intended multi-category listing pattern, not a duplicate.`
              : `${group.length} rows across ${categories.size} categories, so at least one category is repeated.`,
          benign: categories.size === group.length,
        });
      }
      return out;
    },
  },
  {
    id: "shared_phone_bulk",
    label: "Phone reused across many businesses",
    confidence: "quality",
    blurb:
      "One phone number attached to unrelated businesses. Not a duplicate — usually an operator's own number pasted into the contact field, which routes every enquiry for those listings to the wrong person.",
    run: (docs) =>
      bucket(docs, (d) => {
        const phone = normalizePhone(d.contact);
        return phone ? `bulkphone:${phone}` : null;
      })
        .filter(([, group]) => new Set(group.map(nameOf)).size >= 4)
        .map(([key, group]) => ({
          key,
          docs: group,
          reason: `Phone ${normalizePhone(group[0].contact)} is on ${group.length} listings covering ${new Set(group.map(nameOf)).size} different business names. Enquiries for all of them route to one number.`,
        })),
  },
];

export const getRuleCatalogue = () =>
  DUPLICATE_RULES.map(({ id, label, confidence, blurb }) => ({ id, label, confidence, blurb }));

const PROJECTION = {
  businessName: 1, name: 1, plotNumber: 1, street: 1, pincode: 1, category: 1,
  location: 1, publicId: 1, contact: 1, whatsappNumber: 1, email: 1, website: 1,
  googleMap: 1, place_id: 1, geoLocation: 1, businessesLive: 1, isActive: 1,
  activeBusinesses: 1, averageRating: 1, analytics: 1, createdAt: 1, updatedAt: 1,
  clientId: 1, duplicateReview: 1, bannerImageKey: 1, verification: 1,
};

const slimDoc = (doc) => ({
  _id: doc._id,
  publicId: doc.publicId || "",
  businessName: doc.businessName || doc.name || "",
  category: doc.category || "",
  location: doc.location || "",
  address: [doc.plotNumber, doc.street, doc.pincode].filter(Boolean).join(", "),
  pincode: doc.pincode || "",
  contact: doc.contact || "",
  email: doc.email || "",
  website: doc.website || "",
  googleMap: doc.googleMap || "",
  placeId: doc.place_id || "",
  hasBanner: Boolean(doc.bannerImageKey),
  isVerified: Boolean(doc.verification?.isVerified),
  averageRating: doc.averageRating || 0,
  views: doc.analytics?.views || 0,
  leads: doc.analytics?.leads || 0,
  businessesLive: doc.businessesLive !== false,
  isActive: doc.isActive !== false,
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt,
  reviewStatus: doc.duplicateReview?.status || "pending",
});

/**
 * Score how good a candidate is to KEEP. The richest, most-engaged record wins
 * by default, with age as the tie-break — the admin can always override.
 */
const keepScore = (doc) => {
  let score = 0;
  if (doc.hasBanner) score += 15;
  if (doc.isVerified) score += 25;
  if (doc.placeId) score += 12;
  if (doc.googleMap) score += 6;
  if (doc.email) score += 4;
  if (doc.website) score += 4;
  if (doc.contact) score += 6;
  score += Math.min(doc.address.length / 10, 8);
  score += Math.min(doc.views / 20, 15);
  score += Math.min(doc.leads / 5, 15);
  score += doc.averageRating * 2;
  if (doc.businessesLive) score += 5;
  return Math.round(score);
};

/** Human-readable list of what makes the suggested keeper the better record. */
const keepEvidence = (doc) => {
  const bits = [];
  if (doc.isVerified) bits.push("admin-verified");
  if (doc.hasBanner) bits.push("has banner image");
  if (doc.placeId) bits.push("linked to Google place");
  if (doc.views) bits.push(`${doc.views} views`);
  if (doc.leads) bits.push(`${doc.leads} leads`);
  if (doc.averageRating) bits.push(`${doc.averageRating.toFixed(1)}★`);
  if (doc.email) bits.push("has email");
  if (doc.website) bits.push("has website");
  return bits;
};

export const scanDuplicates = async ({
  ruleIds = [],
  location = "",
  category = "",
  includeResolved = false,
} = {}) => {
  const query = {};
  if (location) query.location = location;
  if (category) query.category = category;

  const docs = await businessListModel.find(query, PROJECTION).lean();

  const active = DUPLICATE_RULES.filter(
    (rule) => ruleIds.length === 0 || ruleIds.includes(rule.id)
  );

  const groups = [];
  for (const rule of active) {
    for (const raw of rule.run(docs)) {
      const members = raw.docs.map(slimDoc);
      if (!includeResolved && members.every((m) => m.reviewStatus !== "pending")) continue;

      const scored = members
        .map((member) => ({
          ...member,
          keepScore: keepScore(member),
          evidence: keepEvidence(member),
        }))
        .sort((a, b) => b.keepScore - a.keepScore || new Date(a.createdAt) - new Date(b.createdAt));

      groups.push({
        groupKey: `${rule.id}::${raw.key}`,
        ruleId: rule.id,
        ruleLabel: rule.label,
        confidence: raw.benign ? "audit" : rule.confidence,
        reason: raw.reason,
        benign: Boolean(raw.benign),
        size: scored.length,
        suggestedKeepId: String(scored[0]._id),
        members: scored,
      });
    }
  }

  const order = { certain: 0, likely: 1, review: 2, quality: 3, audit: 4 };
  groups.sort(
    (a, b) => (order[a.confidence] ?? 9) - (order[b.confidence] ?? 9) || b.size - a.size
  );

  const summary = active.map((rule) => {
    const ruleGroups = groups.filter((g) => g.ruleId === rule.id);
    return {
      id: rule.id,
      label: rule.label,
      confidence: rule.confidence,
      blurb: rule.blurb,
      groups: ruleGroups.length,
      redundant: ruleGroups.reduce((sum, g) => sum + (g.benign ? 0 : g.size - 1), 0),
    };
  });

  return { scannedAt: new Date().toISOString(), totalScanned: docs.length, summary, groups };
};

/**
 * Resolve one group. The kept document is annotated; the others are taken off
 * the site by flipping the live flags. Nothing is removed from the database —
 * reviews, analytics, leads and QR codes on the losing rows all survive, so a
 * bad merge is undone by flipping the flags back.
 */
export const resolveDuplicateGroup = async ({
  keepId,
  removeIds = [],
  groupKey = "",
  ruleId = "",
  reason = "",
  note = "",
  reviewedBy = null,
}) => {
  const now = new Date();

  if (keepId) {
    await businessListModel.updateOne(
      { _id: keepId },
      {
        $set: {
          duplicateReview: {
            status: "kept",
            ruleId, reason, groupKey, note,
            mergedInto: null,
            reviewedAt: now,
            reviewedBy,
          },
          updatedAt: now,
        },
      }
    );
  }

  let removed = 0;
  if (removeIds.length) {
    const result = await businessListModel.updateMany(
      { _id: { $in: removeIds } },
      {
        $set: {
          businessesLive: false,
          activeBusinesses: false,
          isActive: false,
          duplicateReview: {
            status: "merged",
            ruleId, reason, groupKey, note,
            mergedInto: keepId || null,
            reviewedAt: now,
            reviewedBy,
          },
          updatedAt: now,
        },
      }
    );
    removed = result.modifiedCount ?? 0;
  }

  return { keptId: keepId || null, removed };
};

/** Mark a whole group as "not a duplicate" so it stops coming back. */
export const ignoreDuplicateGroup = async ({
  memberIds = [], groupKey = "", ruleId = "", reason = "", note = "", reviewedBy = null,
}) => {
  const now = new Date();
  const result = await businessListModel.updateMany(
    { _id: { $in: memberIds } },
    {
      $set: {
        duplicateReview: {
          status: "ignored",
          ruleId, reason, groupKey, note,
          mergedInto: null,
          reviewedAt: now,
          reviewedBy,
        },
        updatedAt: now,
      },
    }
  );
  return { ignored: result.modifiedCount ?? 0 };
};

/** Undo a merge — puts the listing back on the site. */
export const restoreDuplicateGroup = async ({ memberIds = [], reviewedBy = null }) => {
  const now = new Date();
  const result = await businessListModel.updateMany(
    { _id: { $in: memberIds } },
    {
      $set: {
        businessesLive: true,
        activeBusinesses: true,
        isActive: true,
        "duplicateReview.status": "pending",
        "duplicateReview.mergedInto": null,
        "duplicateReview.reviewedAt": now,
        "duplicateReview.reviewedBy": reviewedBy,
        updatedAt: now,
      },
    }
  );
  return { restored: result.modifiedCount ?? 0 };
};
