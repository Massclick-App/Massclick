import {
    createMasterLocation,
    viewMasterLocation,
    viewAllMasterLocation,
    searchMasterLocation,
    listDistinctMasterLocationValues,
    updateMasterLocation,
    deleteMasterLocation
} from "../../helper/location/masterLocationHelper.js";
import {
    resolveDistrictBySlug,
    ownNameOf,
} from "../../helper/location/locationResolver.js";
import { classifyMiddleSegment } from "../../helper/location/urlSegmentClassifier.js";
import { getDistrictUrlSlug, getDistrictDisplayName } from "../../helper/location/locationSlug.js";
import { BAD_REQUEST, NOT_FOUND } from "../../errorCodes.js";

export const addMasterLocationAction = async (req, res) => {
    try {
        const result = await createMasterLocation(req.body);
        res.send(result);
    } catch (error) {
        console.error(error);
        return res.status(BAD_REQUEST.code).send({ message: error.message });
    }
};

export const viewMasterLocationAction = async (req, res) => {
    try {
        const location = await viewMasterLocation(req.params.id);
        res.send(location);
    } catch (error) {
        console.error(error);
        return res.status(BAD_REQUEST.code).send({ message: error.message });
    }
};

export const viewAllMasterLocationAction = async (req, res) => {
    try {
        const pageNo = parseInt(req.query.pageNo) || 1;
        const pageSize = parseInt(req.query.pageSize) || 10;

        const search = req.query.search || "";
        const status = req.query.status || "all";
        const level = req.query.level || "all";
        const district = req.query.district || "";
        const pincode = req.query.pincode || "";
        const sortBy = req.query.sortBy || null;
        const sortOrder = req.query.sortOrder === "desc" ? -1 : 1;

        const { list, total } = await viewAllMasterLocation({
            pageNo,
            pageSize,
            search,
            status,
            level,
            district,
            pincode,
            sortBy,
            sortOrder
        });

        res.send({
            data: list,
            total,
            pageNo,
            pageSize,
        });
    } catch (error) {
        console.error("Master location fetch error:", error);
        return res.status(BAD_REQUEST.code).send({ message: error.message });
    }
};

// Public search: resolves free text to location docs (with slugs) so business
// search can prefix-match at any hierarchy level.
export const searchMasterLocationAction = async (req, res) => {
    try {
        const text = req.query.q || "";
        const limit = parseInt(req.query.limit) || 10;
        const results = await searchMasterLocation(text, limit);
        res.send({ data: results });
    } catch (error) {
        console.error("Master location search error:", error);
        return res.status(BAD_REQUEST.code).send({ message: error.message });
    }
};

// Admin form helper: existing Zone/Ward/Locality values for the district
// (and zone/ward) picked so far, for a cascading autocomplete.
export const listDistinctMasterLocationValuesAction = async (req, res) => {
    try {
        const { field, district, zone, ward } = req.query;
        const values = await listDistinctMasterLocationValues({ field, district, zone, ward });
        res.send({ data: values });
    } catch (error) {
        console.error(error);
        return res.status(BAD_REQUEST.code).send({ message: error.message });
    }
};

export const updateMasterLocationAction = async (req, res) => {
    try {
        const location = await updateMasterLocation(req.params.id, req.body);
        res.send(location);
    } catch (error) {
        console.error(error);
        return res.status(BAD_REQUEST.code).send({ message: error.message });
    }
};

export const deleteMasterLocationAction = async (req, res) => {
    try {
        const location = await deleteMasterLocation(req.params.id);
        res.send({ message: "Location deleted successfully", location });
    } catch (error) {
        console.error(error);
        return res.status(BAD_REQUEST.code).send({ message: error.message });
    }
};

// Public: resolves the district-prefixed URL scheme's one genuinely ambiguous
// segment. /:district/:p2/:p3 is syntactically identical whether it means
// "district-wide category + subcategory" or "locality-specific category" —
// GET ?district=<slug>&p2=<segment>&p3=<segment> classifies which, via
// helper/location/urlSegmentClassifier.js (must be the SAME classification
// this endpoint returns as the server's own SSR renders, or a hard-refreshed
// page and its client-side navigation would disagree on what a URL means).
// Used by the client's DistrictRouteResolver component.
//
// `district` alone (no p2) resolves just the district — for the bare
// /:district landing page confirming the district exists and getting its
// display name.
export const resolveRouteLocationAction = async (req, res) => {
    try {
        const { district, p2, p3 } = req.query;

        if (!district) {
            return res.status(BAD_REQUEST.code).send({ message: "district is required" });
        }

        const districtDoc = await resolveDistrictBySlug(district);
        if (!districtDoc) {
            return res.status(NOT_FOUND.code).send({ message: "District not found" });
        }

        const districtSummary = {
            slug: getDistrictUrlSlug(districtDoc),
            name: getDistrictDisplayName(districtDoc),
        };

        if (!p2) {
            return res.send({ district: districtSummary, classification: { type: "district" } });
        }

        const classification = await classifyMiddleSegment({ districtDoc, p2, p3 });

        if (classification.type === "location") {
            // Reshaped rather than passed through as-is: classifyMiddleSegment
            // returns the raw masterlocation doc (locationDoc) with every DB
            // field (coordinates, keywords, pincodes, timestamps, ...) — the
            // client only ever needs the same flat {slug, name, level} shape
            // its own breadcrumb/URL builders already work with (see
            // client/ui-app/src/utils/breadcrumbs.js).
            return res.send({
                district: districtSummary,
                classification: {
                    type: "location",
                    location: {
                        slug: classification.locationDoc.publicLocationSlug,
                        name: ownNameOf(classification.locationDoc),
                        level: classification.locationDoc.level,
                    },
                    categorySlug: classification.categorySlug,
                },
            });
        }

        // "districtCategory", "unresolvedLocation", and "unknown" are already
        // client-shaped (flat strings, no raw Mongoose doc to reshape).
        return res.send({ district: districtSummary, classification });
    } catch (error) {
        console.error("resolveRouteLocationAction error:", error);
        return res.status(BAD_REQUEST.code).send({ message: error.message });
    }
};
