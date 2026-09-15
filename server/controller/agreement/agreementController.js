import { BAD_REQUEST } from "../../errorCodes.js";
import {
  uploadAgreementPdf,
  viewAgreementPdf,
} from "../../helper/agreement/agreementPdfHelper.js";

export const uploadAgreementPdfAction = async (req, res) => {
  try {
    const agreement = await uploadAgreementPdf(req.params.id, req.body);
    res.send(agreement);
  } catch (error) {
    console.error("uploadAgreementPdfAction error:", error);
    res.status(BAD_REQUEST.code).send({ message: error.message });
  }
};

export const viewAgreementPdfAction = async (req, res) => {
  try {
    res.send(await viewAgreementPdf(req.params.id));
  } catch (error) {
    console.error("viewAgreementPdfAction error:", error);
    res.status(BAD_REQUEST.code).send({ message: error.message });
  }
};
import {
  createAgreement,
  deleteAgreement,
  updateAgreement,
  viewAllAgreements,
  viewAgreement,
  nextAgreementNo,
} from "../../helper/agreement/agreementHelper.js";

export const nextAgreementNoAction = async (req, res) => {
  try {
    const result = await nextAgreementNo(req.query.issueDate);
    res.send(result);
  } catch (error) {
    console.error("nextAgreementNoAction error:", error);
    res.status(BAD_REQUEST.code).send({ message: error.message });
  }
};

export const addAgreementAction = async (req, res) => {
  try {
    const result = await createAgreement(req.body, req.authActor);
    res.send(result);
  } catch (error) {
    console.error("addAgreementAction error:", error);
    res.status(BAD_REQUEST.code).send({ message: error.message });
  }
};

export const viewAgreementAction = async (req, res) => {
  try {
    const agreement = await viewAgreement(req.params.id);
    res.send(agreement);
  } catch (error) {
    console.error("viewAgreementAction error:", error);
    res.status(BAD_REQUEST.code).send({ message: error.message });
  }
};

export const viewAllAgreementsAction = async (req, res) => {
  try {
    const pageNo = Math.max(1, parseInt(req.query.pageNo, 10) || 1);
    const pageSize = Math.min(
      100,
      Math.max(1, parseInt(req.query.pageSize, 10) || 10),
    );
    const sortBy = req.query.sortBy || "createdAt";
    const sortOrder = req.query.sortOrder === "asc" ? 1 : -1;

    const { list, total } = await viewAllAgreements({
      pageNo,
      pageSize,
      search: req.query.search || "",
      status: req.query.status || "all",
      sortBy,
      sortOrder,
    });

    res.send({
      data: list,
      total,
      pageNo,
      pageSize,
    });
  } catch (error) {
    console.error("viewAllAgreementsAction error:", error);
    res.status(BAD_REQUEST.code).send({ message: error.message });
  }
};

export const updateAgreementAction = async (req, res) => {
  try {
    const agreement = await updateAgreement(req.params.id, req.body);
    res.send(agreement);
  } catch (error) {
    console.error("updateAgreementAction error:", error);
    res.status(BAD_REQUEST.code).send({ message: error.message });
  }
};

export const deleteAgreementAction = async (req, res) => {
  try {
    const result = await deleteAgreement(req.params.id);
    res.send({ message: "Agreement deleted successfully", result });
  } catch (error) {
    console.error("deleteAgreementAction error:", error);
    res.status(BAD_REQUEST.code).send({ message: error.message });
  }
};
