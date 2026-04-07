import { BAD_REQUEST } from "../../errorCodes.js";
import { getCategoryBasedLeads } from "../../helper/leadsData/leadsDataHelper.js";

export const getLeadsByMobileAction = async (req, res) => {
  try {

    const { mobileNumber } = req.params;

    const data = await getCategoryBasedLeads(mobileNumber);

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error(error);
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

