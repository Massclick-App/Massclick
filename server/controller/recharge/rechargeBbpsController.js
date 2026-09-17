import { fetchLiveBillForService } from "../../helper/recharge/rechargeBbpsHelper.js";
import { BAD_REQUEST } from "../../errorCodes.js";

export const fetchLiveBillAction = async (req, res) => {
  try {
    const { serviceSlug, provider, consumerNumber } = req.body;
    const result = await fetchLiveBillForService({ serviceSlug, provider, consumerNumber });
    res.send(result);
  } catch (error) {
    console.error(error);
    const statusCode = error.statusCode || error.response?.status || BAD_REQUEST.code;
    const message = error.response?.data?.message || error.message;
    return res.status(statusCode).send(message);
  }
};
