/**
 * Paid Category SEO console.
 *
 * Every category with at least one paid business gets a set of "page slots":
 * its district page in each district where it has a paid business, plus the
 * locality page of each paid business. Each slot is checked for a curated
 * seodatas row, sane title/description lengths, a mention of the paid
 * business, and (district pages) curated page content featuring the paid
 * businesses. Other categories' SEO in the same districts is scanned for the
 * paid category's protected search terms ("conflicts").
 *
 * Everything is computed from live data on each request — the console is
 * admin-only and the working set is small (tens of categories).
 */
import businessListModel from "../../model/businessList/businessListModel.js";
import categoryModel from "../../model/category/categoryModel.js";
import seoModel from "../../model/seoModel/seoModel.js";
import seoPageContentModel from "../../model/seoModel/seoPageContentModel.js";
import seoTemplateModel from "../../model/seoModel/seoTemplateModel.js";
import masterLocationModel from "../../model/locationModel/masterLocationModel.js";
import { getAllDistrictDocs } from "../location/locationResolver.js";
import { getDistrictUrlSlug, getDistrictDisplayName } from "../location/locationSlug.js";
import { buildCanonicalLocationCategoryPath, buildLocationCategoryPath } from "../location/locationUrl.js";
import { buildBusinessPath } from "../businessList/businessUrl.js";
import { namesBusiness } from "../businessList/businessSeoMeta.js";
import { slugify } from "../../slugify.js";
import { deleteCachePattern } from "../../utils/redisClient.js";
import { invalidateSeoCache } from "../../utils/cacheInvalidation.js";

export const PAID_BUSINESS_FILTER = {
  isActive: { $ne: false },
  businessesLive: true,
  $or: [
    { amountPaid: true },
    { premiumBusiness: true },
    { "subscription.isActive": true },
    { "subscription.plan": { $in: ["PREMIUM", "DIAMOND", "PLATINUM"] } },
    { "paymentConcept.paymentStatus": { $in: ["paid", "part_paid"] } },
    { "payment.paymentStatus": "SUCCESS" },
  ],
};

export const TITLE_RANGE = [30, 70];
export const DESCRIPTION_RANGE = [70, 170];
const FEATURED_RE = /<h2>Verified [^<]+ on Massclick<\/h2>/;

const clean = (value) => String(value || "").replace(/\s+/g, " ").trim();
const locationKeyOf = (value = "") => String(value).toLowerCase().trim().replace(/[^a-z0-9]/g, "");
const titleCase = (text = "") => clean(text).replace(/\b[a-z]/g, (c) => c.toUpperCase());
const singular = (word) => word.replace(/ies$/, "y").replace(/(ches|shes|sses|xes)$/, (m) => m.slice(0, -2)).replace(/([^s])s$/, "$1");
const normText = (text = "") => ` ${String(text).toLowerCase().replace(/['’]/g, "").replace(/[^a-z0-9]+/g, " ").trim()} `;

const paidSignals = (b = {}) => [
  b.amountPaid && "amountPaid",
  b.premiumBusiness && "premium",
  b.subscription?.isActive && "subscription",
  b.subscription?.plan && b.subscription.plan !== "FREE" && `plan:${b.subscription.plan}`,
  ["paid", "part_paid"].includes(b.paymentConcept?.paymentStatus) && `payment:${b.paymentConcept.paymentStatus}`,
  (b.payment || []).some((p) => p.paymentStatus === "SUCCESS") && "phonepe",
].filter(Boolean);

// ---------- protected terms ----------

// "groceries shop" -> ["groceries shop", "grocery shop"]; "gym" -> ["gym"].
export const autoProtectedTerms = (categoryName = "") => {
  const words = clean(categoryName).toLowerCase().replace(/[^a-z0-9 ]+/g, " ").split(" ").filter(Boolean);
  if (!words.length) return [];
  const variants = new Set([words.join(" "), words.map(singular).join(" ")]);
  return [...variants].filter((t) => t.length >= 3);
};

const normalizeTerms = (terms = []) =>
  [...new Set((Array.isArray(terms) ? terms : []).map((t) => clean(t).toLowerCase()).filter((t) => t.length >= 3))].slice(0, 30);

// A competitor legitimately uses a term that is part of its own name
// ("eye hospitals" may say "hospital"), so those are never conflicts.
const competitorOwnsTerm = (competitorCategory, term) =>
  normText(competitorCategory.replace(/-/g, " ").split(" ").map(singular).join(" ")).includes(normText(term.split(" ").map(singular).join(" ")))
  || normText(competitorCategory.replace(/-/g, " ")).includes(normText(term));

const textHasTerm = (text, term) => {
  const hay = normText(text);
  return hay.includes(normText(term)) || hay.includes(normText(term.split(" ").map(singular).join(" ")));
};

// Words that turn a phrase into a local search without changing what's being
// searched for. "best restaurants in trichy near me" is purely "restaurant".
const QUERY_FILLER = new Set([
  "best", "top", "no", "1", "10", "number", "one", "near", "me", "nearby", "nearest", "in", "at", "the", "a", "and",
  "list", "famous", "good", "great", "popular", "trusted", "verified", "cheap", "affordable", "low", "cost", "price",
  "prices", "online", "local", "city", "tamil", "nadu", "india", "massclick", "around", "my", "location", "for", "of",
]);

// True when `text` (a keyword item or one title segment) is nothing but the
// term plus location/filler words — i.e. it targets exactly the paid
// category's search. "pizza restaurant trichy" is not ("pizza" remains).
const isPureQueryFor = (text, term, locationWords) => {
  if (!textHasTerm(text, term)) return false;
  const termWords = new Set([...term.split(" "), ...term.split(" ").map(singular)]);
  const rest = normText(text).trim().split(" ").filter(Boolean)
    .filter((w) => !termWords.has(w) && !termWords.has(singular(w)) && !QUERY_FILLER.has(w) && !locationWords.has(w));
  return rest.length === 0;
};

const titleSegments = (title = "") => String(title).split(/\s[|\-–—:]\s|\s*\|\s*|,/).map((s) => s.trim()).filter(Boolean);

// ---------- data loading ----------

const loadDistrictIndex = async () => {
  const docs = await getAllDistrictDocs();
  const byName = new Map();
  for (const doc of docs) {
    const entry = { doc, slug: getDistrictUrlSlug(doc), label: getDistrictDisplayName(doc) };
    byName.set(String(doc.district || "").toLowerCase(), entry);
  }
  return byName;
};

const loadPaidBusinesses = async () =>
  businessListModel
    .find(PAID_BUSINESS_FILTER, {
      businessName: 1, category: 1, publicId: 1, masterLocation: 1, location: 1,
      seoTitle: 1, seoDescription: 1, amountPaid: 1, premiumBusiness: 1, paidDate: 1,
      subscription: 1, "paymentConcept.paymentStatus": 1, "payment.paymentStatus": 1,
    })
    .lean();

const buildConsoleData = async () => {
  const [districtIndex, businesses] = await Promise.all([loadDistrictIndex(), loadPaidBusinesses()]);

  const categorySlugs = [...new Set(businesses.map((b) => slugify(b.category)).filter(Boolean))];
  const locationIds = businesses.map((b) => b.masterLocation?.locationId).filter(Boolean);

  const [categoryDocs, locationDocs, seoRows, templates, pageContents] = await Promise.all([
    categoryModel.find({ slug: { $in: categorySlugs } }, { category: 1, slug: 1, seoTitle: 1, seoDescription: 1, seoProtectedTerms: 1 }).lean(),
    masterLocationModel.find({ _id: { $in: locationIds }, isActive: true }).lean(),
    seoModel.find({ pageType: "category", category: { $in: categorySlugs } }).lean(),
    seoTemplateModel.find({ category: { $in: categorySlugs } }, { category: 1, isActive: 1, titleTemplate: 1 }).lean(),
    seoPageContentModel
      .find(
        { category: { $in: categorySlugs.map((s) => new RegExp(`^\\s*${s.replace(/-/g, "[-\\s]+")}\\s*$`, "i")) } },
        { category: 1, location: 1, isActive: 1, pageContent: 1, faq: 1 },
      )
      .lean(),
  ]);

  const categoryBySlug = new Map(categoryDocs.map((c) => [c.slug, c]));
  const locationById = new Map(locationDocs.map((l) => [String(l._id), l]));

  const categories = new Map();
  for (const business of businesses) {
    const categorySlug = slugify(business.category);
    if (!categorySlug) continue;
    const categoryDoc = categoryBySlug.get(categorySlug);
    if (!categories.has(categorySlug)) {
      categories.set(categorySlug, {
        slug: categorySlug,
        name: titleCase(categoryDoc?.category || business.category),
        categoryDoc,
        businesses: [],
        slots: new Map(),
      });
    }
    const category = categories.get(categorySlug);
    const district = districtIndex.get(String(business.masterLocation?.district || "").toLowerCase()) || null;
    const locationDoc = locationById.get(String(business.masterLocation?.locationId || "")) || null;
    const ownName = clean(locationDoc?.locality || locationDoc?.ward || locationDoc?.zone || "");
    const isRealLocality = Boolean(
      district && locationDoc && locationDoc.level !== "district" && locationDoc.publicLocationSlug
      && slugify(ownName) !== slugify(district.doc.district) && slugify(ownName) !== slugify(district.label),
    );

    const entry = {
      id: String(business._id),
      name: clean(business.businessName),
      category: business.category,
      publicId: business.publicId,
      districtSlug: district?.slug || null,
      districtLabel: district?.label || clean(business.masterLocation?.district) || clean(business.location),
      localityName: isRealLocality ? ownName : null,
      localitySlug: isRealLocality ? locationDoc.publicLocationSlug : null,
      url: district ? buildBusinessPath({ districtSlug: district.slug, business }) : null,
      signals: paidSignals(business),
      seoTitle: business.seoTitle || "",
      seoDescription: business.seoDescription || "",
      seoTitleNamesBusiness: namesBusiness(business.seoTitle, business),
      seoDescriptionNamesBusiness: namesBusiness(business.seoDescription, business),
      _raw: business,
    };
    category.businesses.push(entry);

    if (!district) continue;
    const addSlot = (locationSlug, locationName, doc) => {
      const key = `${district.slug}|${locationSlug || ""}`;
      if (!category.slots.has(key)) {
        category.slots.set(key, { key, district, locationSlug, locationName, locationDoc: doc, businesses: [] });
      }
      category.slots.get(key).businesses.push(entry);
    };
    addSlot(null, null, null);
    if (isRealLocality) addSlot(locationDoc.publicLocationSlug, ownName, locationDoc);
  }

  const rowFor = (categorySlug, districtSlug, locationSlug) =>
    seoRows.find((r) => r.category === categorySlug && r.district === locationKeyOf(districtSlug)
      && r.locationKey === locationKeyOf(locationSlug || districtSlug)) || null;

  const pageContentFor = (categorySlug, district) => {
    const aliases = new Set([district.slug, slugify(district.doc.district), slugify(district.label), district.doc.publicLocationSlug].filter(Boolean));
    const matches = pageContents.filter((p) => slugify(p.category) === categorySlug && aliases.has(slugify(p.location || "")));
    // Same precedence as getSeoPageContentMetaService: the URL alias first.
    return matches.find((p) => slugify(p.location) === district.slug && p.isActive !== false)
      || matches.find((p) => p.isActive !== false) || null;
  };

  for (const category of categories.values()) {
    const template = templates.find((t) => t.category === category.slug) || null;
    category.template = template ? { exists: true, active: template.isActive !== false, titleTemplate: template.titleTemplate } : { exists: false, active: false };
    const slots = [];
    for (const slot of category.slots.values()) {
      const row = rowFor(category.slug, slot.district.slug, slot.locationSlug);
      const activeRow = row && row.isActive !== false ? row : null;
      const place = slot.locationName ? `${slot.locationName}, ${slot.district.label}` : slot.district.label;
      const isDistrictPage = !slot.locationSlug;
      const pageUrl = isDistrictPage
        ? buildLocationCategoryPath({ districtSlug: slot.district.slug, categorySlug: category.slug })
        : await buildCanonicalLocationCategoryPath({
          districtDoc: slot.district.doc, districtSlug: slot.district.slug, locationDoc: slot.locationDoc, categorySlug: category.slug,
        });

      const titleLen = activeRow ? clean(activeRow.title).length : 0;
      const descLen = activeRow ? clean(activeRow.description).length : 0;
      const seoText = activeRow ? `${activeRow.title} ${activeRow.description}` : "";
      const mentionsPaid = slot.businesses.some((b) => namesBusiness(seoText, b._raw));

      const pc = isDistrictPage ? pageContentFor(category.slug, slot.district) : null;
      const pcHtml = pc?.pageContent || "";
      const notFeatured = isDistrictPage
        ? slot.businesses.filter((b) => !(b.publicId && pcHtml.includes(b.publicId))).map((b) => b.name)
        : [];

      const checks = {
        hasRow: Boolean(activeRow),
        titleLength: Boolean(activeRow) && titleLen >= TITLE_RANGE[0] && titleLen <= TITLE_RANGE[1],
        descriptionLength: Boolean(activeRow) && descLen >= DESCRIPTION_RANGE[0] && descLen <= DESCRIPTION_RANGE[1],
        mentionsPaidBusiness: mentionsPaid,
        ...(isDistrictPage ? {
          hasPageContent: Boolean(pc),
          featuresPaidBusinesses: Boolean(pc) && FEATURED_RE.test(pcHtml) && notFeatured.length === 0,
        } : {}),
      };
      const issues = [];
      if (!checks.hasRow) issues.push({ code: "missing-row", label: "No dedicated SEO – page uses a template or auto text" });
      if (checks.hasRow && !checks.titleLength) issues.push({ code: "title-length", label: `Title is ${titleLen} characters (aim ${TITLE_RANGE[0]}–${TITLE_RANGE[1]})` });
      if (checks.hasRow && !checks.descriptionLength) issues.push({ code: "description-length", label: `Description is ${descLen} characters (aim ${DESCRIPTION_RANGE[0]}–${DESCRIPTION_RANGE[1]})` });
      if (checks.hasRow && !mentionsPaid) issues.push({ code: "no-paid-mention", label: "Title/description doesn't name a paid business" });
      if (isDistrictPage && !checks.hasPageContent) issues.push({ code: "no-page-content", label: "No curated page content" });
      if (isDistrictPage && checks.hasPageContent && !checks.featuresPaidBusinesses) {
        issues.push({ code: "not-featured", label: `Page content doesn't feature: ${notFeatured.join(", ") || "the Verified box"}` });
      }

      const names = slot.businesses.map((b) => b.name);
      slots.push({
        key: slot.key,
        type: isDistrictPage ? "district" : "locality",
        districtSlug: slot.district.slug,
        districtLabel: slot.district.label,
        locationSlug: slot.locationSlug,
        locationName: slot.locationName,
        place,
        pageUrl,
        businesses: slot.businesses.map((b) => ({ id: b.id, name: b.name, url: b.url })),
        row: row ? {
          id: String(row._id), active: row.isActive !== false,
          title: row.title || "", description: row.description || "", keywords: row.keywords || "",
        } : null,
        pageContent: isDistrictPage ? (pc ? { id: String(pc._id), faqCount: (pc.faq || []).length } : null) : undefined,
        checks,
        issues,
        score: Object.values(checks).filter(Boolean).length / Object.values(checks).length,
        suggested: {
          title: isDistrictPage
            ? `Best ${category.name} in ${slot.district.label} | Verified – Massclick`
            : `${category.name} in ${place} – ${names[0]}`,
          description: `${names.join(", ")} – verified ${category.name.toLowerCase()} in ${place}. Address, timings & contact details on Massclick.`,
          keywords: [`${category.name.toLowerCase()} in ${(slot.locationName || slot.district.label).toLowerCase()}`, `best ${category.name.toLowerCase()} ${slot.district.label.toLowerCase()}`, ...names.map((n) => n.toLowerCase())].join(", "),
        },
      });
    }
    const typeRank = (s) => (s.type === "district" ? 0 : 1);
    slots.sort((a, b) => a.districtLabel.localeCompare(b.districtLabel) || typeRank(a) - typeRank(b) || String(a.place).localeCompare(String(b.place)));
    category.slotList = slots;
    const custom = normalizeTerms(category.categoryDoc?.seoProtectedTerms);
    category.autoTerms = autoProtectedTerms(category.categoryDoc?.category || category.slug.replace(/-/g, " "));
    category.customTerms = custom;
    category.terms = normalizeTerms([...category.autoTerms, ...custom]);
    category.districtSlugs = [...new Set(slots.map((s) => s.districtSlug))];
  }

  return { categories: [...categories.values()], districtIndex };
};

// ---------- conflicts ----------

const findConflicts = async (categories) => {
  const districtSlugs = [...new Set(categories.flatMap((c) => c.districtSlugs))].map(locationKeyOf);
  const [rows, templates] = await Promise.all([
    seoModel.find({ pageType: "category", isActive: { $ne: false }, district: { $in: districtSlugs } }, { category: 1, district: 1, location: 1, title: 1, description: 1, keywords: 1 }).lean(),
    seoTemplateModel.find({ isActive: { $ne: false } }, { category: 1, titleTemplate: 1, descriptionTemplate: 1, keywordsTemplate: 1 }).lean(),
  ]);
  const paidSlugs = new Set(categories.map((c) => c.slug));
  const conflicts = [];

  // District names/aliases, so "restaurants trichy" still reads as a pure query.
  const districtDocs = await getAllDistrictDocs();
  const locationWords = new Set(districtDocs.flatMap((d) => normText([d.district, d.urlAlias, d.publicLocationSlug, getDistrictDisplayName(d)].filter(Boolean).join(" ").replace(/-/g, " ")).trim().split(" ")).filter(Boolean));
  locationWords.add("location");

  // Auto terms (derived from the category name) only flag text that targets
  // the paid category's search outright; terms an admin added by hand flag any
  // occurrence. Descriptions are prose, so auto terms never flag them.
  const scan = ({ owner, source, id, competitor, district, location, fields }) => {
    const seen = new Set();
    for (const term of owner.terms) {
      if (competitorOwnsTerm(competitor, term)) continue;
      const strict = owner.customTerms.includes(term);
      for (const [field, value, kind] of fields) {
        if (!value) continue;
        const key = `${source}:${id}:${field}`;
        if (kind === "keywords") {
          const items = String(value).split(",").map((s) => s.trim()).filter(Boolean)
            .filter((it) => (strict ? textHasTerm(it, term) : isPureQueryFor(it, term, locationWords)));
          if (items.length && !seen.has(`${key}:${items.join("|")}`)) {
            seen.add(`${key}:${items.join("|")}`);
            conflicts.push({ id: `${key}:${term}`, source, docId: String(id), paidCategory: owner.slug, paidCategoryName: owner.name, competitor, district, location, field, term, items });
          }
        } else if (kind === "title" ? (strict ? textHasTerm(value, term) : titleSegments(value).some((seg) => isPureQueryFor(seg, term, locationWords))) : (strict && textHasTerm(value, term))) {
          if (seen.has(key)) continue;
          seen.add(key);
          conflicts.push({ id: `${key}:${term}`, source, docId: String(id), paidCategory: owner.slug, paidCategoryName: owner.name, competitor, district, location, field, term, text: value });
        }
      }
    }
  };

  for (const owner of categories) {
    const ownerDistricts = new Set(owner.districtSlugs.map(locationKeyOf));
    for (const r of rows) {
      if (r.category === owner.slug || paidSlugs.has(r.category) || !ownerDistricts.has(r.district)) continue;
      scan({ owner, source: "seo", id: r._id, competitor: r.category, district: r.district, location: r.location, fields: [["title", r.title, "title"], ["description", r.description, "description"], ["keywords", r.keywords, "keywords"]] });
    }
    for (const t of templates) {
      if (t.category === owner.slug || paidSlugs.has(t.category)) continue;
      scan({ owner, source: "template", id: t._id, competitor: t.category, district: null, location: null, fields: [["titleTemplate", t.titleTemplate, "title"], ["descriptionTemplate", t.descriptionTemplate, "description"], ["keywordsTemplate", t.keywordsTemplate, "keywords"]] });
    }
  }
  return conflicts;
};

// ---------- public API ----------

const summarizeCategory = (c, conflicts) => {
  const slots = c.slotList;
  const passed = slots.reduce((n, s) => n + Object.values(s.checks).filter(Boolean).length, 0);
  const total = slots.reduce((n, s) => n + Object.values(s.checks).length, 0);
  return {
    slug: c.slug,
    name: c.name,
    paidCount: c.businesses.length,
    businesses: c.businesses.map((b) => b.name),
    districts: [...new Set(slots.map((s) => s.districtLabel))],
    slotCount: slots.length,
    // null = no public category page to check (e.g. its district isn't on the site yet)
    coverage: total ? Math.round((passed / total) * 100) : null,
    gapCount: slots.filter((s) => s.issues.length).length,
    businessSeoIssues: c.businesses.filter((b) => !b.seoTitleNamesBusiness || !b.seoDescriptionNamesBusiness).length,
    conflictCount: conflicts.filter((x) => x.paidCategory === c.slug).length,
    templateActive: c.template.active,
  };
};

export const getPaidSeoOverview = async () => {
  const { categories } = await buildConsoleData();
  const conflicts = await findConflicts(categories);
  const rank = (r) => (r.coverage === null ? 101 : r.coverage);
  const rows = categories.map((c) => summarizeCategory(c, conflicts)).sort((a, b) => rank(a) - rank(b) || b.paidCount - a.paidCount);
  const scored = rows.filter((r) => r.coverage !== null);
  const slots = categories.flatMap((c) => c.slotList);
  return {
    summary: {
      categories: categories.length,
      paidBusinesses: categories.reduce((n, c) => n + c.businesses.length, 0),
      pages: slots.length,
      pagesComplete: slots.filter((s) => !s.issues.length).length,
      gaps: slots.filter((s) => s.issues.length).length,
      conflicts: conflicts.length,
      businessSeoIssues: rows.reduce((n, r) => n + r.businessSeoIssues, 0),
      coverage: scored.length ? Math.round(scored.reduce((n, r) => n + r.coverage, 0) / scored.length) : 0,
    },
    categories: rows,
  };
};

export const getPaidSeoCategoryDetail = async (slug) => {
  const { categories } = await buildConsoleData();
  const category = categories.find((c) => c.slug === slugify(slug));
  if (!category) throw new Error("This category has no paid businesses");
  const conflicts = (await findConflicts([category])).filter((x) => x.paidCategory === category.slug);
  return {
    category: {
      slug: category.slug,
      name: category.name,
      seoTitle: category.categoryDoc?.seoTitle || "",
      seoDescription: category.categoryDoc?.seoDescription || "",
      autoTerms: category.autoTerms,
      customTerms: category.customTerms,
      template: category.template,
    },
    summary: summarizeCategory(category, conflicts),
    businesses: category.businesses.map(({ _raw, ...b }) => b),
    slots: category.slotList,
    conflicts,
  };
};

export const getPaidSeoGaps = async () => {
  const { categories } = await buildConsoleData();
  return categories.flatMap((c) => c.slotList
    .filter((s) => s.issues.length)
    .map((s) => ({ ...s, categorySlug: c.slug, categoryName: c.name })));
};

export const getPaidSeoConflicts = async () => {
  const { categories } = await buildConsoleData();
  return findConflicts(categories);
};

// Purges both the SEO lookup caches and the SSR page caches for one category.
// invalidateSeoCache alone leaves `category:district:<d>:<loc>:<cat>:seo` —
// the rendered page's own cache — serving the old title.
export const refreshPaidSeoCache = async (categorySlug = "") => {
  const slug = slugify(categorySlug);
  await invalidateSeoCache();
  if (slug) await deleteCachePattern(`category:*:${slug}:*`);
  return { refreshed: true, category: slug };
};

export const upsertPaidSeoRow = async ({ category, district, locationSlug, title, description, keywords } = {}) => {
  const categorySlug = slugify(category);
  const districtSlug = slugify(district);
  const locSlug = slugify(locationSlug || "") || districtSlug;
  if (!categorySlug || !districtSlug) throw new Error("category and district are required");
  if (!clean(title) || !clean(description)) throw new Error("Title and description are required");

  const categoryDoc = await categoryModel.findOne({ slug: categorySlug }, { _id: 1 }).lean();
  if (!categoryDoc) throw new Error(`Category "${categorySlug}" does not exist`);

  let doc = await seoModel.findOne({ pageType: "category", category: categorySlug, district: locationKeyOf(districtSlug), locationKey: locationKeyOf(locSlug) });
  if (!doc) {
    doc = new seoModel({
      pageType: "category",
      category: categorySlug,
      location: locSlug,
      locationKey: locSlug,
      district: districtSlug,
      canonical: locSlug === districtSlug ? `https://massclick.in/${districtSlug}/${categorySlug}` : `https://massclick.in/${districtSlug}/${categorySlug}-in-${locSlug}`,
    });
  }
  doc.title = clean(title);
  doc.description = clean(description);
  doc.keywords = clean(keywords);
  doc.robots = "index, follow";
  doc.isActive = true;
  await doc.save();
  await refreshPaidSeoCache(categorySlug);
  return doc.toObject();
};

export const updatePaidBusinessSeo = async (businessId, { seoTitle, seoDescription } = {}) => {
  const business = await businessListModel.findOne({ _id: businessId, ...PAID_BUSINESS_FILTER }, { businessName: 1, category: 1 });
  if (!business) throw new Error("Paid business not found");
  const set = {};
  if (seoTitle !== undefined) set.seoTitle = clean(seoTitle);
  if (seoDescription !== undefined) set.seoDescription = clean(seoDescription);
  await businessListModel.updateOne({ _id: business._id }, { $set: set });
  const plain = { businessName: business.businessName, category: business.category, ...set };
  return {
    id: String(business._id),
    ...set,
    seoTitleNamesBusiness: set.seoTitle !== undefined ? namesBusiness(set.seoTitle, plain) : undefined,
    seoDescriptionNamesBusiness: set.seoDescription !== undefined ? namesBusiness(set.seoDescription, plain) : undefined,
  };
};

export const updateProtectedTerms = async (categorySlug, terms = []) => {
  const slug = slugify(categorySlug);
  const normalized = normalizeTerms(terms);
  const result = await categoryModel.findOneAndUpdate({ slug }, { $set: { seoProtectedTerms: normalized } }, { new: true, projection: { slug: 1, seoProtectedTerms: 1 } }).lean();
  if (!result) throw new Error("Category not found");
  return { slug, customTerms: result.seoProtectedTerms || [] };
};

// Removes keyword items or rewrites a title/description on a competitor's
// seodatas row or template. Only the named field is touched.
export const fixPaidSeoConflict = async ({ source, docId, field, removeItems, value } = {}) => {
  const allowed = source === "template"
    ? ["titleTemplate", "descriptionTemplate", "keywordsTemplate"]
    : ["title", "description", "keywords"];
  if (!allowed.includes(field)) throw new Error("Field not editable here");
  const model = source === "template" ? seoTemplateModel : seoModel;
  const doc = await model.findById(docId);
  if (!doc) throw new Error("Record not found");

  if (Array.isArray(removeItems) && removeItems.length) {
    const drop = new Set(removeItems.map((s) => clean(s).toLowerCase()));
    doc[field] = String(doc[field] || "").split(",").map((s) => s.trim()).filter((s) => s && !drop.has(s.toLowerCase())).join(", ");
  } else if (typeof value === "string") {
    if (!clean(value) && field !== "keywords" && field !== "keywordsTemplate") throw new Error("Value cannot be empty");
    doc[field] = clean(value);
  } else {
    throw new Error("Nothing to change");
  }
  if (source === "template") doc.templateVersion = (doc.templateVersion || 1) + 1;
  await doc.save();
  await refreshPaidSeoCache(doc.category);
  return { id: String(doc._id), field, value: doc[field] };
};
