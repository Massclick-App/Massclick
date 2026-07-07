import { BAD_REQUEST } from "../../errorCodes.js";
import {
  createMassclickDocument,
  deleteMassclickDocument,
  updateMassclickDocument,
  viewAllMassclickDocuments,
  viewMassclickDocument,
} from "../../helper/massclickDocuments/massclickDocumentsHelper.js";

export const addMassclickDocumentAction = async (req, res) => {
  try {
    const result = await createMassclickDocument(req.body, req.user);
    res.send(result);
  } catch (error) {
    console.error("addMassclickDocumentAction error:", error);
    res.status(BAD_REQUEST.code).send({ message: error.message });
  }
};

export const viewMassclickDocumentAction = async (req, res) => {
  try {
    const document = await viewMassclickDocument(req.params.id);
    res.send(document);
  } catch (error) {
    console.error("viewMassclickDocumentAction error:", error);
    res.status(BAD_REQUEST.code).send({ message: error.message });
  }
};

export const viewAllMassclickDocumentsAction = async (req, res) => {
  try {
    const pageNo = parseInt(req.query.pageNo) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const sortBy = req.query.sortBy || "createdAt";
    const sortOrder = req.query.sortOrder === "asc" ? 1 : -1;

    const { list, total } = await viewAllMassclickDocuments({
      pageNo,
      pageSize,
      search: req.query.search || "",
      status: req.query.status || "all",
      section: req.query.section || "",
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
    console.error("viewAllMassclickDocumentsAction error:", error);
    res.status(BAD_REQUEST.code).send({ message: error.message });
  }
};

export const updateMassclickDocumentAction = async (req, res) => {
  try {
    const document = await updateMassclickDocument(req.params.id, req.body);
    res.send(document);
  } catch (error) {
    console.error("updateMassclickDocumentAction error:", error);
    res.status(BAD_REQUEST.code).send({ message: error.message });
  }
};

export const deleteMassclickDocumentAction = async (req, res) => {
  try {
    const result = await deleteMassclickDocument(req.params.id);
    res.send({ message: "Document deleted successfully", result });
  } catch (error) {
    console.error("deleteMassclickDocumentAction error:", error);
    res.status(BAD_REQUEST.code).send({ message: error.message });
  }
};
