import {
    createMasterLocation,
    viewMasterLocation,
    viewAllMasterLocation,
    viewMasterLocationsWithBusinessStats,
    searchMasterLocation,
    listDistinctMasterLocationValues,
    updateMasterLocation,
    deleteMasterLocation,
    setMasterLocationActive,
    setManyMasterLocationsActive
} from "../../helper/location/masterLocationHelper.js";
import {
    resolveDistrictBySlug,
} from "../../helper/location/locationResolver.js";
import { classifyMiddleSegment } from "../../helper/location/urlSegmentClassifier.js";
import { buildCanonicalLocationCategoryPath } from "../../helper/location/locationUrl.js";
import {
    getDistrictUrlSlug,
    getDistrictDisplayName,
    getLocationDisplayName,
    getLocationUrlPath,
    getLocationUrlSegment,
} from "../../helper/location/locationSlug.js";
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
        const reviewStatus = req.query.reviewStatus || "all";
        const importSource = req.query.importSource || "all";
        const origin = req.query.origin || "all";
        const level = req.query.level || "all";
        const district = req.query.district || "";
        const zone = req.query.zone || "";
        const ward = req.query.ward || "";
        const locality = req.query.locality || "";
        const pincode = req.query.pincode || "";
        const pincodeStatus = req.query.pincodeStatus || "all";
        const sortBy = req.query.sortBy || null;
        const sortOrder = req.query.sortOrder === "desc" ? -1 : 1;

        const { list, total } = await viewAllMasterLocation({
            pageNo,
            pageSize,
            search,
            status,
            reviewStatus,
            importSource,
            origin,
            level,
            district,
            zone,
            ward,
            locality,
            pincode,
            pincodeStatus,
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

// Powers the "Location Coverage" admin console: same filters as
// viewAllMasterLocationAction, plus each row's linked-business count/preview
// and a businessCoverage filter ("has" / "needs") to isolate either side.
export const viewMasterLocationsWithBusinessStatsAction = async (req, res) => {
    try {
        const pageNo = parseInt(req.query.pageNo) || 1;
        const pageSize = parseInt(req.query.pageSize) || 10;

        const search = req.query.search || "";
        const status = req.query.status || "all";
        const reviewStatus = req.query.reviewStatus || "all";
        const importSource = req.query.importSource || "all";
        const origin = req.query.origin || "all";
        const level = req.query.level || "all";
        const district = req.query.district || "";
        const zone = req.query.zone || "";
        const ward = req.query.ward || "";
        const locality = req.query.locality || "";
        const pincode = req.query.pincode || "";
        const pincodeStatus = req.query.pincodeStatus || "all";
        const category = req.query.category || "";
        const businessCoverage = req.query.businessCoverage || "all";
        const sortBy = req.query.sortBy || null;
        const sortOrder = req.query.sortOrder === "desc" ? -1 : 1;

        const { list, total, businessPreviewLimit } = await viewMasterLocationsWithBusinessStats({
            pageNo,
            pageSize,
            search,
            status,
            reviewStatus,
            importSource,
            origin,
            level,
            district,
            zone,
            ward,
            locality,
            pincode,
            pincodeStatus,
            category,
            businessCoverage,
            sortBy,
            sortOrder
        });

        res.send({
            data: list,
            total,
            pageNo,
            pageSize,
            businessPreviewLimit,
        });
    } catch (error) {
        console.error("Location coverage fetch error:", error);
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
        res.send({
            data: results.map((location) => ({
                ...location,
                publicLocationPath: getLocationUrlPath(location),
            })),
        });
    } catch (error) {
        console.error("Master location search error:", error);
        return res.status(BAD_REQUEST.code).send({ message: error.message });
    }
};

// Admin form helper: existing Zone/Ward/Locality values for the district
// (and zone/ward) picked so far, for a cascading autocomplete.
export const listDistinctMasterLocationValuesAction = async (req, res) => {
    try {
        const { field, district, zone, ward, status, reviewStatus, importSource, origin } = req.query;
        const values = await listDistinctMasterLocationValues({
            field,
            district,
            zone,
            ward,
            status,
            reviewStatus,
            importSource,
            origin
        });
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

// Enable/disable one location. isActive is what every public read path
// filters on, so this is what puts a location into or out of search.
export const toggleMasterLocationAction = async (req, res) => {
    try {
        const { isActive } = req.body;
        if (typeof isActive !== "boolean") {
            return res.status(BAD_REQUEST.code).send({ message: "isActive must be true or false" });
        }
        const { location, slugsUpdated } = await setMasterLocationActive(req.params.id, isActive);
        res.send({
            message: `Location ${isActive ? "enabled" : "disabled"} successfully`,
            location,
            slugsUpdated
        });
    } catch (error) {
        console.error(error);
        return res.status(BAD_REQUEST.code).send({ message: error.message });
    }
};

// Bulk enable/disable, for working through the imported review queue.
export const bulkToggleMasterLocationAction = async (req, res) => {
    try {
        const { ids, isActive } = req.body;
        if (!Array.isArray(ids) || !ids.length) {
            return res.status(BAD_REQUEST.code).send({ message: "ids must be a non-empty array" });
        }
        if (typeof isActive !== "boolean") {
            return res.status(BAD_REQUEST.code).send({ message: "isActive must be true or false" });
        }
        const result = await setManyMasterLocationsActive(ids, isActive);
        res.send({
            message: `${result.modified} location(s) ${isActive ? "enabled" : "disabled"}`,
            ...result
        });
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
        const { district, p2, p3, p4 } = req.query;

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

        const classification = await classifyMiddleSegment({ districtDoc, p2, p3, p4 });

        if (classification.type === "location" || classification.type === "locationLanding") {
            // Reshaped rather than passed through as-is: classifyMiddleSegment
            // returns the raw masterlocation doc (locationDoc) with every DB
            // field (coordinates, keywords, pincodes, timestamps, ...) — the
            // client only ever needs the same flat {slug, name, level} shape
            // its own breadcrumb/URL builders already work with (see
            // client/ui-app/src/utils/breadcrumbs.js).
            const locationDoc = classification.locationDoc;
            const canonicalPath = classification.type === "location"
                ? await buildCanonicalLocationCategoryPath({
                    districtDoc,
                    districtSlug: districtSummary.slug,
                    locationDoc,
                    categorySlug: classification.categorySlug,
                })
                : "";
            return res.send({
                district: districtSummary,
                classification: {
                    type: classification.type,
                    location: {
                        slug: locationDoc.publicLocationSlug,
                        path: getLocationUrlPath(locationDoc),
                        targetSlug: getLocationUrlSegment(locationDoc),
                        name: getLocationDisplayName(locationDoc, districtSummary.name),
                        level: locationDoc.level,
                    },
                    categorySlug: classification.categorySlug,
                    ...(canonicalPath ? { canonicalPath } : {}),
                    canonicalize: Boolean(classification.canonicalize),
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
