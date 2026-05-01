import { BAD_REQUEST } from "../../errorCodes.js";
import {
  getCategoryBasedLeads,
  getLeadsAnalyticsSummary,
  getLeadsTrends,
  getTopSearches,
} from "../../helper/leadsData/leadsDataHelper.js";

export const getLeadsByMobileAction = async (req, res) => {
  try {
    const { mobileNumber } = req.params;
    const data = await getCategoryBasedLeads(mobileNumber);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error(error);
    return res.status(400).json({ success: false, message: error.message });
  }
};

export const getLeadsAnalyticsSummaryAction = async (req, res) => {
  try {
    const { mobileNumber } = req.params;
    const data = await getLeadsAnalyticsSummary(mobileNumber);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error(error);
    return res.status(400).json({ success: false, message: error.message });
  }
};

export const getLeadsTrendsAction = async (req, res) => {
  try {
    const { mobileNumber } = req.params;
    const days = Math.min(parseInt(req.query.days) || 30, 90);
    const data = await getLeadsTrends(mobileNumber, days);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error(error);
    return res.status(400).json({ success: false, message: error.message });
  }
};

export const getTopSearchesAction = async (req, res) => {
  try {
    const { mobileNumber } = req.params;
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    const data = await getTopSearches(mobileNumber, limit);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error(error);
    return res.status(400).json({ success: false, message: error.message });
  }
};

