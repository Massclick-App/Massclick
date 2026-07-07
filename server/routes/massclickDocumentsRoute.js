import express from "express";
import {
  addMassclickDocumentAction,
  deleteMassclickDocumentAction,
  updateMassclickDocumentAction,
  viewAllMassclickDocumentsAction,
  viewMassclickDocumentAction,
} from "../controller/massclickDocuments/massclickDocumentsController.js";
import { oauthAuthentication } from "../helper/oauthHelper.js";

const router = express.Router();

router.post("/api/massclick-documents/create", oauthAuthentication, addMassclickDocumentAction);
router.get("/api/massclick-documents/view/:id", oauthAuthentication, viewMassclickDocumentAction);
router.get("/api/massclick-documents/viewall", oauthAuthentication, viewAllMassclickDocumentsAction);
router.put("/api/massclick-documents/update/:id", oauthAuthentication, updateMassclickDocumentAction);
router.delete("/api/massclick-documents/delete/:id", oauthAuthentication, deleteMassclickDocumentAction);

export default router;
