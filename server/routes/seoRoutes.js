import express from "express";
import {
  addSeoAction,
  getSeoAction,
  viewAllSeoAction,
  updateSeoAction,
  deleteSeoAction,
  getSeoMetaAction,
  categorySuggestionAction
} from "../controller/seo/seoController.js";
import { addSeoPageContentAction, viewAllSeoPageContentAction,getSeoPageContentMetaAction,getSeoPageContentAction,deleteSeoPageContentAction,updateSeoPageContentAction } from "../controller/seo/seoPageContentController.js";
import { oauthAuthentication } from "../helper/oauthHelper.js";
import { addSeoPageContentBlogAction, getSeoPageContentBlogAction, getSeoPageContentBlogMetaAction, viewAllSeoPageContentBlogAction, updateSeoPageContentBlogAction, deleteSeoPageContentBlogAction, getSeoBlogBySlugAction, getBusinessSuggestionAction } from "../controller/seo/seoOnPageBlogController.js";

const router = express.Router();

router.post("/api/seo/create", oauthAuthentication, addSeoAction);
router.get("/api/seo/get", getSeoAction); 
router.get("/api/seo/meta", getSeoMetaAction);
router.get("/api/seo/viewall", oauthAuthentication, viewAllSeoAction);
router.put("/api/seo/update/:id", oauthAuthentication, updateSeoAction);
router.delete("/api/seo/delete/:id", oauthAuthentication, deleteSeoAction);
router.get("/api/seo/category-suggestions", oauthAuthentication, categorySuggestionAction);

router.post("/api/seopagecontent/create", oauthAuthentication, addSeoPageContentAction);
router.get("/api/seopagecontent/get", getSeoPageContentAction); 
router.get("/api/seopagecontent/meta", getSeoPageContentMetaAction);
router.get("/api/seopagecontent/viewall", oauthAuthentication, viewAllSeoPageContentAction);
router.put("/api/seopagecontent/update/:id", oauthAuthentication, updateSeoPageContentAction);
router.delete("/api/seopagecontent/delete/:id", oauthAuthentication, deleteSeoPageContentAction);

router.post("/api/seopagecontentblog/create", oauthAuthentication, addSeoPageContentBlogAction);
router.get("/api/seopagecontentblog/get", getSeoPageContentBlogAction);
router.get("/api/seopagecontentblog/meta", getSeoPageContentBlogMetaAction);
router.get("/api/seopagecontentblog/viewall", oauthAuthentication, viewAllSeoPageContentBlogAction);
router.put("/api/seopagecontentblog/update/:id", oauthAuthentication, updateSeoPageContentBlogAction);
router.delete("/api/seopagecontentblog/delete/:id", oauthAuthentication, deleteSeoPageContentBlogAction);
router.get("/api/seopagecontentblog/blog/:slug", getSeoBlogBySlugAction);
router.get("/api/seopagecontentblog/suggestion", getBusinessSuggestionAction);

export default router;
