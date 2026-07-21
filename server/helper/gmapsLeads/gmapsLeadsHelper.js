import { ObjectId } from "mongodb";
import gmapsLeadsModel from "../../model/gmapsLeads/gmapsLeadsModel.js";
import businessListModel from "../../model/businessList/businessListModel.js";
import categoryModel from "../../model/category/categoryModel.js";

/**
 * Paginated + filtered list of gmaps leads.
 * Attaches hasMatch: true/false based on phone match in businesslists.
 */
export const viewAllGmapsLeads = async ({
  pageNo = 1,
  pageSize = 20,
  massclick_location = "",
  search_sector = "",
  massclick_category = "",
  status = "all",
  min_rating = "",
  has_phone = "",
  details_fetched = "",
  search = "",
  business_status = "OPERATIONAL",
}) => {
  try {
    const query = {};

    // Only OPERATIONAL businesses by default (can be overridden by passing empty string)
    if (business_status) {
      query.business_status = business_status;
    }

    if (massclick_location) {
      const normalizedLocation = String(massclick_location).trim().toLowerCase();
      if (["trichy", "tiruchirappalli", "trichy / tiruchirappalli"].includes(normalizedLocation)) {
        query.massclick_location = {
          $in: [
            /^trichy$/i,
            /^tiruchirappalli$/i,
            /^trichy \/ tiruchirappalli$/i,
          ],
        };
      } else {
        query.massclick_location = massclick_location;
      }
    }

    if (search_sector) {
      query.search_sector = search_sector;
    }

    if (massclick_category) {
      query.massclick_category = massclick_category;
    }

    // Status filter
    if (status === "available") {
      query.imported_to_main = false;
      query.skip_import = false;
      query.working = { $ne: true };
    } else if (status === "imported") {
      query.imported_to_main = true;
    } else if (status === "skipped") {
      query.imported_to_main = false;
      query.skip_import = true;
    } else if (status === "working") {
      query.imported_to_main = false;
      query.skip_import = false;
      query.working = true;
    }

    if (min_rating && !isNaN(parseFloat(min_rating))) {
      query.rating = { $gte: parseFloat(min_rating) };
    }

    if (has_phone === "true" || has_phone === true) {
      query.phone = { $ne: null };
    }

    if (details_fetched === "true" || details_fetched === true) {
      query.details_fetched = true;
    }

    if (search) {
      query.name = { $regex: search, $options: "i" };
    }

    const total = await gmapsLeadsModel.countDocuments(query);

    const leads = await gmapsLeadsModel
      .find(query)
      .sort({ rating: -1, _id: 1 })
      .skip((pageNo - 1) * pageSize)
      .limit(pageSize)
      .lean();

    // Phone-match detection: check gmaps phone against businesslists.contact
    const phones = leads.map((l) => l.phone).filter(Boolean);
    let matchedPhoneSet = new Set();

    if (phones.length > 0) {
      const matched = await businessListModel
        .find({ contact: { $in: phones } }, { contact: 1 })
        .lean();
      matchedPhoneSet = new Set(matched.map((b) => b.contact));
    }

    const leadsWithMatch = leads.map((lead) => ({
      ...lead,
      hasMatch: lead.phone ? matchedPhoneSet.has(lead.phone) : false,
    }));

    return { list: leadsWithMatch, total };
  } catch (error) {
    console.error("Error in viewAllGmapsLeads:", error);
    throw error;
  }
};

/**
 * Stats: counts by status + total.
 */
export const getGmapsLeadsStats = async () => {
  try {
    const [total, imported, skipped, working] = await Promise.all([
      gmapsLeadsModel.countDocuments({}),
      gmapsLeadsModel.countDocuments({ imported_to_main: true }),
      gmapsLeadsModel.countDocuments({ imported_to_main: { $ne: true }, skip_import: true }),
      gmapsLeadsModel.countDocuments({
        imported_to_main: { $ne: true },
        skip_import: { $ne: true },
        working: true,
      }),
    ]);

    const available = total - imported - skipped - working;

    return { total, available: available < 0 ? 0 : available, imported, skipped, working };
  } catch (error) {
    console.error("Error in getGmapsLeadsStats:", error);
    throw error;
  }
};

// Maps a single high-level status to the underlying boolean flags.
// Keeps imported_to_main / skip_import / working mutually exclusive.
const STATUS_TO_FLAGS = {
  available: { imported_to_main: false, skip_import: false, working: false },
  imported: { imported_to_main: true, skip_import: false, working: false },
  working: { imported_to_main: false, skip_import: false, working: true },
  skipped: { imported_to_main: false, skip_import: true, working: false },
};

/**
 * Update status by MongoDB _id.
 * Accepts either { status: 'available'|'imported'|'working'|'skipped' }
 * or the raw boolean flags directly (imported_to_main / skip_import / working).
 */
export const updateGmapsLeadStatus = async (id, data) => {
  if (!ObjectId.isValid(id)) throw new Error("Invalid lead ID");

  const updateFields = {};

  if (typeof data.status === "string") {
    const flags = STATUS_TO_FLAGS[data.status];
    if (!flags) throw new Error(`Invalid status: ${data.status}`);
    Object.assign(updateFields, flags);
  }

  if (typeof data.imported_to_main === "boolean") {
    updateFields.imported_to_main = data.imported_to_main;
  }
  if (typeof data.skip_import === "boolean") {
    updateFields.skip_import = data.skip_import;
  }
  if (typeof data.working === "boolean") {
    updateFields.working = data.working;
  }

  const updated = await gmapsLeadsModel.findByIdAndUpdate(
    id,
    { $set: updateFields },
    { new: true }
  );

  if (!updated) throw new Error("GMaps lead not found");
  return updated;
};

/**
 * Get distinct values for filter dropdowns.
 */
export const getGmapsLeadsDistincts = async () => {
  try {
    const [locations, sectors, categorySlugs] = await Promise.all([
      gmapsLeadsModel.distinct("massclick_location"),
      gmapsLeadsModel.distinct("search_sector"),
      gmapsLeadsModel.distinct("massclick_category"),
    ]);

    const slugList = categorySlugs.filter(Boolean).sort();

    // Lookup display names from categories collection
    const catDocs = await categoryModel
      .find({ slug: { $in: slugList }, isActive: true }, { slug: 1, category: 1 })
      .lean();
    const slugToName = Object.fromEntries(catDocs.map((c) => [c.slug, c.category]));

    const categories = slugList.map((slug) => ({
      slug,
      name: slugToName[slug] || slug,
    }));
    const normalizedLocations = [
      ...new Set(
        locations
          .filter(Boolean)
          .map((location) => {
            const normalized = String(location).trim().toLowerCase();
            if (["trichy", "tiruchirappalli"].includes(normalized)) {
              return "Trichy / Tiruchirappalli";
            }
            return location;
          })
      ),
    ].sort();

    return {
      locations: normalizedLocations,
      sectors: sectors.filter(Boolean).sort(),
      categories,
    };
  } catch (error) {
    console.error("Error in getGmapsLeadsDistincts:", error);
    throw error;
  }
};
