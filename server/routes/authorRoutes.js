import express from "express";
import {
  createAuthorAction,
  getAllAuthorsAction,
  getAuthorAction,
  updateAuthorAction,
  deleteAuthorAction,
  searchAuthorsAction,
} from "../controller/seo/authorMasterController.js";
import { oauthAuthentication } from "../helper/oauthHelper.js";

const router = express.Router();

router.post("/api/author/create", oauthAuthentication, createAuthorAction);
router.get("/api/author/all", getAllAuthorsAction);
router.get("/api/author/search", searchAuthorsAction);
router.get("/api/author/:id", getAuthorAction);
router.put("/api/author/:id", oauthAuthentication, updateAuthorAction);
router.delete("/api/author/:id", oauthAuthentication, deleteAuthorAction);

export default router;
