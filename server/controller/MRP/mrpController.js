import { createMRP, viewMRP, viewAllMRP, updateMRP, deleteMRP, searchMrpBusinesses, searchMrpCategories,sendMrpLeads } from "../../helper/MRP/mrpHelper.js";
import { BAD_REQUEST } from "../../errorCodes.js";

export const addMRPAction = async (req, res) => {
  try {
    const reqBody = req.body;
    const result = await createMRP(reqBody);

    res.send({
      data: result
    });

  } catch (error) {
    console.error(error);
    return res.status(BAD_REQUEST.code).send(error.message);
  }
};
export const viewMRPAction = async (req, res) => {
    try {
        const mrpId = req.params.id;
        const mrp = await viewMRP(mrpId);
        res.send(mrp);
    } catch (error) {
        console.error(error);
        return res.status(BAD_REQUEST.code).send({ message: error.message });
    }
};

export const viewAllMRPAction = async (req, res) => {
  try {
    const pageNo = Number(req.query.pageNo) || 1;
    const pageSize = Number(req.query.pageSize) || 10;

    const search = (req.query.search || "").trim();
    const status = req.query.status || "all";
    const sortBy = req.query.sortBy || "createdAt";
    const sortOrder = req.query.sortOrder === "asc" ? 1 : -1;

    const { list, total } = await viewAllMRP({
      pageNo,
      pageSize,
      search,
      status,
      sortBy,
      sortOrder
    });

    res.send({
      data: list,   // 👈 frontend reads this
      total,
      pageNo,
      pageSize
    });

  } catch (error) {
    console.error("viewAllMRP fetch error:", error);
    res.status(BAD_REQUEST.code).send({
      message: error.message
    });
  }
};


export const updateMRPAction = async (req, res) => {
    try {
        const mrpId = req.params.id;
        const mrpData = req.body;
        const mrp = await updateMRP(mrpId, mrpData);
        res.send(mrp);
    } catch (error) {
        console.error(error);
        return res.status(400).send({ message: error.message });
    }
};

export const deleteMRPAction = async (req, res) => {
    try {
        const mrpId = req.params.id;
        const mrp = await deleteMRP(mrpId);
        res.send({ message: "MRP deleted successfully", mrp });
    } catch (error) {
        console.error(error);
        return res.status(400).send({ message: error.message });
    }
};

export const searchMrpBusinessAction = async (req, res) => {
  try {
    const search = req.query.q || "";
    const pageSize = parseInt(req.query.pageSize) || 10;

    const result = await searchMrpBusinesses({ search, pageSize });
    res.send(result);

  } catch (error) {
    console.error("searchBusinessAction error:", error);
    return res.status(BAD_REQUEST.code).send({ message: error.message });
  }
};

export const searchMrpCategoryAction = async (req, res) => {
  try {
    const search = (req.query.q || "").trim();
    const limit = Math.min(parseInt(req.query.limit) || 10, 20);

    if (search.length < 2) {
      return res.send([]);
    }

    const categories = await searchMrpCategories(search, limit);
    res.send(categories);

  } catch (error) {
    console.error("searchMrpCategoryAction:", error);
    res.status(400).send({ message: error.message });
  }
};

export const sendMrpLeadsAction = async (req, res) => {
  try {

    const mrpId = req.params.id;

    const result = await sendMrpLeads(mrpId);

    res.send({
      message: "Leads sent successfully",
      ...result
    });

  } catch (error) {

    console.error("❌ sendMrpLeadsAction error:", error);

    return res.status(BAD_REQUEST.code).send({
      message: error.message
    });
  }
};