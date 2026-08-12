/**
 * The single source of truth for S3 object keys.
 *
 * Step 1.1 of the S3 key restructure. See S3_KEY_RESTRUCTURE_PROGRESS.md.
 *
 * THE PROBLEM THIS REPLACES
 *
 * ~50 inline path literals across 23 files, which is exactly why three naming
 * conventions drifted apart and why 34,000+ objects carry no owning entity id. With
 * every key built here instead, drift becomes impossible rather than discouraged.
 *
 * THE SCHEME
 *
 *   versioned:  {entity}/{entityId}/{purpose}/{ulid}      every upload is a new object
 *   stable:     {entity}/{entityId}/{purpose}             regeneration OVERWRITES
 *   stable+seq: {entity}/{entityId}/{purpose}/{seq}       a fixed set of named variants
 *
 * Keys carry NO extension — `uploadImageToS3` appends it at s3Uploder.js:59, since only
 * it knows whether sharp converted the buffer to webp.
 *
 * Stable keys are the point of the whole exercise: a logo, avatar, QR code or
 * certificate regenerates onto the same key instead of orphaning the previous object.
 * That is only safe because 0.4 shipped `assetUrl(key, {version})` first — without a
 * cache-buster, overwriting a stable key strands browsers on the old image for up to a
 * year (s3Uploder.js:66 sets max-age=31536000).
 *
 * WHAT IS ALLOWED IS DERIVED, NOT DUPLICATED
 *
 * The catalogue of valid (entity, purpose, stability) triples is built from
 * utils/s3ScopeRegistry.js at import time. The registry already declares every field's
 * entity, purpose and stability, so there is no second list to fall out of step with it.
 * Adding a field to the registry makes its key buildable here automatically.
 */
import { SCOPES } from "./s3ScopeRegistry.js";
import { ulid, isUlid } from "./idGen.js";

/**
 * Brand for the token returned by `s3Path`. A Symbol cannot be produced by an
 * accidental template literal, so `uploadImageToS3` can tell a registry-built path from
 * a hand-rolled string with certainty rather than by pattern-matching.
 */
export const S3_PATH_TOKEN = Symbol("s3PathToken");

/**
 * `entity/purpose` -> { entity, purpose, stability, variants }
 *
 * `variants` is the fixed set of named sub-keys a STABLE purpose may carry, taken from
 * the registry's `kind: "object"` declaration (`categoryImages.keys`). It is null for
 * every other purpose, and that distinction is load-bearing: a stable singleton like
 * `logo` must reject a trailing segment entirely, or `businesses/<id>/logo/<ulid>` would
 * parse as canonical and quietly reintroduce the orphan-per-regeneration bug that
 * deterministic keys exist to kill.
 */
const CATALOGUE = new Map();
for (const scope of Object.values(SCOPES)) {
  for (const field of scope.fields) {
    const id = `${scope.entity}/${field.purpose}`;
    if (!CATALOGUE.has(id)) {
      CATALOGUE.set(id, {
        entity: scope.entity,
        purpose: field.purpose,
        stability: field.stability,
        variants: Array.isArray(field.keys) ? [...field.keys] : null,
      });
    }
  }
}

export const listCatalogue = () => [...CATALOGUE.values()];

/** Entity ids are Mongo ObjectIds, or a ULID where no document exists at upload time. */
const OBJECT_ID_RE = /^[0-9a-f]{24}$/i;
const ENTITY_RE = /^[a-z][a-z0-9-]{0,39}$/;
const PURPOSE_RE = /^[a-z][a-z0-9-]{0,39}$/;
const SEQ_RE = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;

const isEntityId = (value) =>
  typeof value === "string" && (OBJECT_ID_RE.test(value) || isUlid(value));

/**
 * Build a canonical key.
 *
 * Returns a BRANDED TOKEN, not a string — `String(token)` and `token.key` both give the
 * key, but a bare template literal can never be mistaken for one at the upload
 * chokepoint. That is what makes bypass impossible rather than merely discouraged.
 *
 * @param {object}  spec
 * @param {string}  spec.entity     plural entity, e.g. "businesses"
 * @param {string}  spec.entityId   ObjectId (or ULID where the document does not exist yet)
 * @param {string}  spec.purpose    e.g. "logo", "gallery"
 * @param {string} [spec.seq]       named variant, for stable purposes with a fixed set
 */
export const s3Path = ({ entity, entityId, purpose, seq } = {}) => {
  if (!ENTITY_RE.test(entity || "")) {
    throw new Error(`s3Path: invalid entity ${JSON.stringify(entity)}`);
  }
  if (!PURPOSE_RE.test(purpose || "")) {
    throw new Error(`s3Path: invalid purpose ${JSON.stringify(purpose)}`);
  }

  const entry = CATALOGUE.get(`${entity}/${purpose}`);
  if (!entry) {
    throw new Error(
      `s3Path: "${entity}/${purpose}" is not in the scope registry. ` +
        `Add the field to utils/s3ScopeRegistry.js first — the registry is what the ` +
        `migration scans, so a key it does not know about would never be migrated.`,
    );
  }

  if (!isEntityId(entityId)) {
    throw new Error(
      `s3Path: entityId must be a 24-char ObjectId or a ULID, got ${JSON.stringify(entityId)}. ` +
        `Where an upload precedes document creation, mint the _id FIRST ` +
        `(new mongoose.Types.ObjectId()) and pass it to both the upload and create().`,
    );
  }

  if (seq !== undefined && !SEQ_RE.test(String(seq))) {
    throw new Error(`s3Path: invalid seq ${JSON.stringify(seq)}`);
  }

  let key;
  if (entry.stability === "stable") {
    if (entry.variants) {
      // A stable purpose WITH a declared variant set requires one of them, exactly.
      if (seq === undefined) {
        throw new Error(
          `s3Path: "${entity}/${purpose}" requires a seq, one of: ${entry.variants.join(", ")}`,
        );
      }
      if (!entry.variants.includes(String(seq))) {
        throw new Error(
          `s3Path: "${seq}" is not a variant of "${entity}/${purpose}". ` +
            `Expected one of: ${entry.variants.join(", ")}`,
        );
      }
      key = `${entity}/${entityId}/${purpose}/${seq}`;
    } else {
      // A stable SINGLETON takes no trailing segment. Accepting one would let
      // `businesses/<id>/logo/<ulid>` look canonical while orphaning on every
      // regeneration — the exact bug deterministic keys exist to remove.
      if (seq !== undefined) {
        throw new Error(
          `s3Path: "${entity}/${purpose}" is a stable singleton and takes no seq. ` +
            `A trailing segment would make regeneration orphan the previous object.`,
        );
      }
      key = `${entity}/${entityId}/${purpose}`;
    }
  } else {
    // A versioned purpose ignores seq: every upload is a distinct object by design.
    key = `${entity}/${entityId}/${purpose}/${ulid()}`;
  }

  return Object.freeze({
    [S3_PATH_TOKEN]: true,
    key,
    entity,
    entityId: String(entityId),
    purpose,
    stability: entry.stability,
    toString() {
      return key;
    },
  });
};

export const isS3PathToken = (value) =>
  Boolean(value && typeof value === "object" && value[S3_PATH_TOKEN] === true);

/**
 * Decompose a canonical key. Returns null for anything that is not one — including
 * every legacy key, which is the point: `verify` uses this to prove the rewrite landed.
 */
export const parseS3Key = (value) => {
  if (typeof value !== "string" || !value) return null;

  const withoutQuery = value.split("?")[0];
  const extMatch = withoutQuery.match(/\.([A-Za-z0-9]{1,8})$/);
  const ext = extMatch ? extMatch[1].toLowerCase() : null;
  const bare = extMatch ? withoutQuery.slice(0, -(extMatch[0].length)) : withoutQuery;

  const parts = bare.split("/");
  if (parts.length < 3 || parts.length > 4) return null;

  const [entity, entityId, purpose, tail] = parts;
  if (!ENTITY_RE.test(entity) || !PURPOSE_RE.test(purpose) || !isEntityId(entityId)) return null;

  const entry = CATALOGUE.get(`${entity}/${purpose}`);
  if (!entry) return null;

  if (parts.length === 3) {
    // Stable singleton: businesses/<id>/logo — and only a purpose with NO variant set.
    return entry.stability === "stable" && !entry.variants
      ? { entity, entityId, purpose, id: null, seq: null, ext, stability: entry.stability }
      : null;
  }

  if (entry.stability === "stable") {
    // Four segments on a stable purpose is only canonical when that purpose declares
    // variants AND the tail is one of them. Anything else — notably a ULID on a
    // singleton — is a legacy or hand-rolled key and must not pass.
    return entry.variants && entry.variants.includes(tail)
      ? { entity, entityId, purpose, id: null, seq: tail, ext, stability: entry.stability }
      : null;
  }

  return isUlid(tail)
    ? { entity, entityId, purpose, id: tail, seq: null, ext, stability: entry.stability }
    : null;
};

export const isCanonicalKey = (value) => parseS3Key(value) !== null;

/**
 * Prefix owning every object for one entity — the thing 34,000+ legacy objects lack,
 * and what makes `DELETE /business/:id` able to cascade at all.
 */
export const entityPrefix = (entity, entityId) => {
  if (!ENTITY_RE.test(entity || "")) throw new Error(`entityPrefix: invalid entity ${JSON.stringify(entity)}`);
  if (!isEntityId(entityId)) throw new Error(`entityPrefix: invalid entityId ${JSON.stringify(entityId)}`);
  return `${entity}/${entityId}/`;
};

/** Does this key belong to this entity? Used to reject cross-entity key injection. */
export const belongsToEntity = (key, entity, entityId) => {
  const parsed = parseS3Key(key);
  return Boolean(parsed && parsed.entity === entity && parsed.entityId === String(entityId));
};

/** The six responsive variants of a category image, as stored in `categoryImages`. */
export const CATEGORY_VARIANTS = Object.freeze([
  "webHero",
  "webCard",
  "webThumbnail",
  "mobileVertical",
  "mobileCard",
  "mobileThumbnail",
]);

/**
 * Named builders — the form call sites should use. They read better than a spec object
 * and they cannot get the entity/purpose pairing wrong.
 */
export const s3Keys = Object.freeze({
  business: {
    banner: (id) => s3Path({ entity: "businesses", entityId: id, purpose: "banner" }),
    gallery: (id) => s3Path({ entity: "businesses", entityId: id, purpose: "gallery" }),
    logo: (id) => s3Path({ entity: "businesses", entityId: id, purpose: "logo" }),
    kyc: (id) => s3Path({ entity: "businesses", entityId: id, purpose: "kyc" }),
    reviewQr: (id) => s3Path({ entity: "businesses", entityId: id, purpose: "qr-review" }),
    profileQr: (id) => s3Path({ entity: "businesses", entityId: id, purpose: "qr-profile" }),
    reviewPhoto: (id) => s3Path({ entity: "businesses", entityId: id, purpose: "review-photo" }),
    verifiedCertificate: (id) =>
      s3Path({ entity: "businesses", entityId: id, purpose: "certificate-verified" }),
    trustCertificate: (id) =>
      s3Path({ entity: "businesses", entityId: id, purpose: "certificate-trust" }),
  },
  category: {
    variant: (id, variant) => s3Path({ entity: "categories", entityId: id, purpose: "variant", seq: variant }),
    legacyImage: (id) => s3Path({ entity: "categories", entityId: id, purpose: "legacy-image" }),
    legacyLive: (id) => s3Path({ entity: "categories", entityId: id, purpose: "legacy-live" }),
  },
  homeSection: {
    popularSearch: (id) => s3Path({ entity: "home-sections", entityId: id, purpose: "popular-search" }),
    topTourist: (id) => s3Path({ entity: "home-sections", entityId: id, purpose: "top-tourist" }),
  },
  advertisement: {
    web: (id) => s3Path({ entity: "advertisements", entityId: id, purpose: "banner-web" }),
    mobile: (id) => s3Path({ entity: "advertisements", entityId: id, purpose: "banner-mobile" }),
    app: (id) => s3Path({ entity: "advertisements", entityId: id, purpose: "banner-app" }),
  },
  review: {
    photo: (id) => s3Path({ entity: "reviews", entityId: id, purpose: "photo" }),
  },
  admin: { avatar: (id) => s3Path({ entity: "admins", entityId: id, purpose: "avatar" }) },
  customer: { avatar: (id) => s3Path({ entity: "customers", entityId: id, purpose: "avatar" }) },
  author: { avatar: (id) => s3Path({ entity: "authors", entityId: id, purpose: "avatar" }) },
  seoBlog: {
    profile: (id) => s3Path({ entity: "seo-blogs", entityId: id, purpose: "profile" }),
    page: (id) => s3Path({ entity: "seo-blogs", entityId: id, purpose: "page" }),
    og: (id) => s3Path({ entity: "seo-blogs", entityId: id, purpose: "og" }),
  },
  event: {
    image: (id) => s3Path({ entity: "events", entityId: id, purpose: "image" }),
    banner: (id) => s3Path({ entity: "events", entityId: id, purpose: "banner" }),
  },
  massclickEvent: {
    media: (id) => s3Path({ entity: "massclick-events", entityId: id, purpose: "media" }),
    thumbnail: (id) => s3Path({ entity: "massclick-events", entityId: id, purpose: "thumbnail" }),
  },
  feedPost: {
    media: (id) => s3Path({ entity: "feed-posts", entityId: id, purpose: "media" }),
    thumbnail: (id) => s3Path({ entity: "feed-posts", entityId: id, purpose: "thumbnail" }),
  },
  jobApplication: {
    resume: (id) => s3Path({ entity: "job-applications", entityId: id, purpose: "resume" }),
  },
  rewardClaim: {
    evidence: (id) => s3Path({ entity: "reward-claims", entityId: id, purpose: "evidence" }),
  },
  trackedKeyword: {
    screenshot: (id) => s3Path({ entity: "tracked-keywords", entityId: id, purpose: "screenshot" }),
  },
  fcmCampaign: {
    image: (id) => s3Path({ entity: "fcm-campaigns", entityId: id, purpose: "image" }),
  },
  massclickDocument: {
    document: (id) => s3Path({ entity: "massclick-documents", entityId: id, purpose: "document" }),
    media: (id) => s3Path({ entity: "massclick-documents", entityId: id, purpose: "media" }),
  },
});

export default s3Keys;
