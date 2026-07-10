import {
    createMasterLocation,
    viewMasterLocation,
    viewAllMasterLocation,
    searchMasterLocation,
    updateMasterLocation,
    deleteMasterLocation
} from "../../helper/location/masterLocationHelper.js";
import { BAD_REQUEST } from "../../errorCodes.js";

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
        const sortBy = req.query.sortBy || null;
        const sortOrder = req.query.sortOrder === "desc" ? -1 : 1;

        const { list, total } = await viewAllMasterLocation({
            pageNo,
            pageSize,
            search,
            status,
            level,
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
