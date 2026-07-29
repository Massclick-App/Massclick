// controller/legal/legalDocumentController.js

import {
  createDraftFromLegalDocument,
  createLegalDocument,
  deleteLegalDocument,
  getAllPublishedLegalDocuments,
  getLegalDocumentById,
  getPublishedLegalDocument,
  listLegalDocuments,
  publishLegalDocument,
  updateLegalDocument,
} from "../../helper/legal/legalDocumentHelper.js";

import { BAD_REQUEST } from "../../errorCodes.js";

// The helper tags genuine misses with statusCode 404; everything else — invalid
// type, validation failure, editing a published document — is a 400.
const sendError = (res, error, fallbackCode = BAD_REQUEST.code) => {
  console.error(error);
  return res
    .status(error.statusCode || fallbackCode)
    .send({ message: error.message });
};

// ── Public ────────────────────────────────────────────────────────────────────

export const viewPublishedLegalDocumentAction = async (req, res) => {
  try {
    const result = await getPublishedLegalDocument(
      req.params.type,
      req.query.locale
    );

    // Legal copy changes rarely and is read on almost every app cold start, so
    // let shared caches serve it while revalidating in the background.
    res.set("Cache-Control", "public, max-age=300, stale-while-revalidate=86400");
    res.send({ data: result });
  } catch (error) {
    return sendError(res, error);
  }
};

export const viewAllPublishedLegalDocumentsAction = async (req, res) => {
  try {
    const result = await getAllPublishedLegalDocuments(req.query.locale);

    res.set("Cache-Control", "public, max-age=300, stale-while-revalidate=86400");
    res.send({ data: result, total: result.length });
  } catch (error) {
    return sendError(res, error);
  }
};

// ── Admin ─────────────────────────────────────────────────────────────────────

export const viewAllLegalDocumentsAction = async (req, res) => {
  try {
    const pageNo = parseInt(req.query.pageNo) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;

    const { list, total } = await listLegalDocuments({
      pageNo,
      pageSize,
      type: req.query.type || null,
      status: req.query.status || null,
      locale: req.query.locale || null,
      search: req.query.search || "",
      sortBy: req.query.sortBy || null,
      sortOrder: req.query.sortOrder === "asc" ? 1 : -1,
    });

    res.send({ data: list, total, pageNo, pageSize });
  } catch (error) {
    return sendError(res, error);
  }
};

export const viewLegalDocumentAction = async (req, res) => {
  try {
    const result = await getLegalDocumentById(req.params.id);
    res.send({ data: result });
  } catch (error) {
    return sendError(res, error);
  }
};

export const addLegalDocumentAction = async (req, res) => {
  try {
    const result = await createLegalDocument(req.body, req.authActor);
    res.send({ message: "Draft created successfully", data: result });
  } catch (error) {
    return sendError(res, error);
  }
};

export const updateLegalDocumentAction = async (req, res) => {
  try {
    const result = await updateLegalDocument(
      req.params.id,
      req.body,
      req.authActor
    );
    res.send({ message: "Draft updated successfully", data: result });
  } catch (error) {
    return sendError(res, error);
  }
};

export const createLegalDocumentVersionAction = async (req, res) => {
  try {
    const result = await createDraftFromLegalDocument(
      req.params.id,
      req.authActor
    );
    res.send({
      message: `Draft v${result.version} created from v${req.body?.fromVersion ?? "previous"}`,
      data: result,
    });
  } catch (error) {
    return sendError(res, error);
  }
};

export const publishLegalDocumentAction = async (req, res) => {
  try {
    const result = await publishLegalDocument(req.params.id, req.authActor);
    res.send({
      message: `${result.title} v${result.version} is now live`,
      data: result,
    });
  } catch (error) {
    return sendError(res, error);
  }
};

export const deleteLegalDocumentAction = async (req, res) => {
  try {
    const result = await deleteLegalDocument(req.params.id);
    res.send({ message: "Draft deleted successfully", data: result });
  } catch (error) {
    return sendError(res, error);
  }
};
