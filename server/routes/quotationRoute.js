import express from "express";
import {
  createQuotationAction,
  deleteQuotationAction,
  nextQuotationNoAction,
  updateQuotationAction,
  viewAllQuotationAction,
  viewQuotationAction,
} from "../controller/quotation/quotationController.js";
import { oauthAuthentication } from '../helper/oauthHelper.js';

const router = express.Router();
  
router.post("/api/quotation/create", oauthAuthentication, createQuotationAction);
router.get("/api/quotation/next-number", oauthAuthentication, nextQuotationNoAction);
router.get("/api/quotation/viewall", oauthAuthentication, viewAllQuotationAction);
router.get("/api/quotation/view/:id", oauthAuthentication, viewQuotationAction);
router.put("/api/quotation/update/:id", oauthAuthentication, updateQuotationAction);
router.delete("/api/quotation/delete/:id", oauthAuthentication, deleteQuotationAction);

export default router;
