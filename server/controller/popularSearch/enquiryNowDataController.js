import {
  createEnquiryNowData,
  viewAllEnquiryNowData,
} from "../../helper/popularSearch/enquiryNowDataHelper.js";

import { BAD_REQUEST } from "../../errorCodes.js";

const getActor = (req) => req.authActor || req.authUser || req.user || {};

export const addEnquiryNowDataAction = async (req, res) => {
  try {
    const {
      category,
      categorySlug,
      enquirySource = "Popular Searches",

      mobileNumber2 = "",
      businessName = "",
    } = req.body;

    const actor = getActor(req);
    const userId = actor.subjectId || actor.userId;
    const userName = actor.userName || actor.name || "";
    const mobileNumber1 = actor.mobile || actor.mobileNumber1 || "";
    const email = actor.emailId || actor.email || "";

    if (!category || !userId || !mobileNumber1) {
      return res.status(400).send({ message: "Missing required fields" });
    }

    const payload = {
      category,
      categorySlug,
      enquirySource,

      userId,
      userName,
      mobileNumber1,
      mobileNumber2,
      email,
      businessName,
    };

    const result = await createEnquiryNowData(payload);

    res.send({
      success: true,
      message: "Enquiry submitted successfully",
      data: result,
    });

  } catch (error) {
    console.error("Enquiry error:", error);
    res.status(400).send({ message: error.message });
  }
};


export const viewAllEnquiryNowDataAction = async (req, res) => {
  try {
    const pageNo = parseInt(req.query.pageNo) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;

    const { list, total } = await viewAllEnquiryNowData({
      pageNo,
      pageSize,
    });

    res.send({
      data: list,
      total,
      pageNo,
      pageSize,
    });
  } catch (error) {
    console.error(error);
    return res.status(BAD_REQUEST.code).send({ message: error.message });
  }
};
