import { ObjectId } from "mongodb";
import gmapsLeadsModel from "../../model/gmapsLeads/gmapsLeadsModel.js";
import businessListModel from "../../model/businessList/businessListModel.js";

/**
 * Paginated + filtered list of gmaps leads.
 * Attaches hasMatch: true/false based on phone match in businesslists.
 */
export const viewAllGmapsLeads = async ({
  pageNo = 1,
  pageSize = 20,
  massclick_location = "",
  search_sector = "",
  status = "all",
  min_rating = "",
  has_phone = "",
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
      query.massclick_location = massclick_location;
    }

    if (search_sector) {
      query.search_sector = search_sector;
    }

    // Status filter
    if (status === "available") {
      query.imported_to_main = false;
      query.skip_import = false;
    } else if (status === "imported") {
      query.imported_to_main = true;
    } else if (status === "skipped") {
      query.skip_import = true;
    }

    if (min_rating && !isNaN(parseFloat(min_rating))) {
      query.rating = { $gte: parseFloat(min_rating) };
    }

    if (has_phone === "true" || has_phone === true) {
      query.phone = { $ne: null };
    }

    if (search) {
      query.name = { $regex: search, $options: "i" };
    }

    const total = await gmapsLeadsModel.countDocuments(query);

    const leads = await gmapsLeadsModel
      .find(query)
      .sort({ rating: -1 })
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
    const [total, imported, skipped] = await Promise.all([
      gmapsLeadsModel.countDocuments({}),
      gmapsLeadsModel.countDocuments({ imported_to_main: true }),
      gmapsLeadsModel.countDocuments({ skip_import: true }),
    ]);

    const available = total - imported - skipped;

    return { total, available: available < 0 ? 0 : available, imported, skipped };
  } catch (error) {
    console.error("Error in getGmapsLeadsStats:", error);
    throw error;
  }
};

/**
 * Update status fields (imported_to_main / skip_import) by MongoDB _id.
 */
export const updateGmapsLeadStatus = async (id, data) => {
  if (!ObjectId.isValid(id)) throw new Error("Invalid lead ID");

  const updateFields = {};
  if (typeof data.imported_to_main === "boolean") {
    updateFields.imported_to_main = data.imported_to_main;
  }
  if (typeof data.skip_import === "boolean") {
    updateFields.skip_import = data.skip_import;
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
    const [locations, sectors] = await Promise.all([
      gmapsLeadsModel.distinct("massclick_location"),
      gmapsLeadsModel.distinct("search_sector"),
    ]);
    return {
      locations: locations.filter(Boolean).sort(),
      sectors: sectors.filter(Boolean).sort(),
    };
  } catch (error) {
    console.error("Error in getGmapsLeadsDistincts:", error);
    throw error;
  }
};
