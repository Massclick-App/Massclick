import {
  viewAllGmapsLeads,
  getGmapsLeadsStats,
  updateGmapsLeadStatus,
  getGmapsLeadsDistincts,
} from "../../helper/gmapsLeads/gmapsLeadsHelper.js";
import { BAD_REQUEST } from "../../errorCodes.js";

export const viewAllGmapsLeadsAction = async (req, res) => {
  try {
    const pageNo = parseInt(req.query.pageNo) || 1;
    const pageSize = parseInt(req.query.pageSize) || 20;

    const {
      massclick_location = "",
      search_sector = "",
      massclick_category = "",
      status = "all",
      min_rating = "",
      has_phone = "",
      search = "",
      business_status = "OPERATIONAL",
    } = req.query;

    const { list, total } = await viewAllGmapsLeads({
      pageNo,
      pageSize,
      massclick_location: massclick_location.trim(),
      search_sector: search_sector.trim(),
      massclick_category: massclick_category.trim(),
      status: status.trim(),
      min_rating,
      has_phone,
      search: search.trim(),
      business_status: business_status.trim(),
    });

    return res.send({ data: list, total, pageNo, pageSize });
  } catch (error) {
    console.error("Error in viewAllGmapsLeadsAction:", error);
    return res.status(BAD_REQUEST.code).send({ message: error.message });
  }
};

export const getGmapsLeadsStatsAction = async (req, res) => {
  try {
    const stats = await getGmapsLeadsStats();
    return res.send(stats);
  } catch (error) {
    console.error("Error in getGmapsLeadsStatsAction:", error);
    return res.status(BAD_REQUEST.code).send({ message: error.message });
  }
};

export const updateGmapsLeadStatusAction = async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;
    const updated = await updateGmapsLeadStatus(id, data);
    return res.send(updated);
  } catch (error) {
    console.error("Error in updateGmapsLeadStatusAction:", error);
    return res.status(BAD_REQUEST.code).send({ message: error.message });
  }
};

export const getGmapsLeadsDistinctsAction = async (req, res) => {
  try {
    const result = await getGmapsLeadsDistincts();
    return res.send(result);
  } catch (error) {
    console.error("Error in getGmapsLeadsDistinctsAction:", error);
    return res.status(BAD_REQUEST.code).send({ message: error.message });
  }
};
