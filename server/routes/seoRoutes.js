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
import {
  addSeoTemplateAction,
  getSeoTemplateAction,
  viewAllSeoTemplateAction,
  updateSeoTemplateAction,
  deleteSeoTemplateAction,
} from "../controller/seo/seoTemplateController.js";
import { oauthAuthentication } from "../helper/oauthHelper.js";
import { addSeoPageContentBlogAction, getSeoPageContentBlogAction, getSeoPageContentBlogMetaAction, viewAllSeoPageContentBlogAction, updateSeoPageContentBlogAction, deleteSeoPageContentBlogAction, getSeoBlogBySlugAction, getBusinessSuggestionAction } from "../controller/seo/seoOnPageBlogController.js";
import { cacheMiddleware } from "../middleware/cacheMiddleware.js";

const router = express.Router();

const seoMetaCache = cacheMiddleware({ expirySeconds: 3600, keyPrefix: 'seo-meta' });
const seoPageContentCache = cacheMiddleware({ expirySeconds: 3600, keyPrefix: 'seo-page-content' });
const seoBlogCache = cacheMiddleware({ expirySeconds: 7200, keyPrefix: 'seo-blog' });

router.post("/api/seo/create", oauthAuthentication, addSeoAction);
router.get("/api/seo/get", seoMetaCache, getSeoAction);
router.get("/api/seo/meta", seoMetaCache, getSeoMetaAction);
router.get("/api/seo/viewall", oauthAuthentication, viewAllSeoAction);
router.put("/api/seo/update/:id", oauthAuthentication, updateSeoAction);
router.delete("/api/seo/delete/:id", oauthAuthentication, deleteSeoAction);
router.get("/api/seo/category-suggestions", oauthAuthentication, categorySuggestionAction);

router.post("/api/seopagecontent/create", oauthAuthentication, addSeoPageContentAction);
router.get("/api/seopagecontent/get", seoPageContentCache, getSeoPageContentAction);
router.get("/api/seopagecontent/meta", seoPageContentCache, getSeoPageContentMetaAction);
router.get("/api/seopagecontent/viewall", oauthAuthentication, viewAllSeoPageContentAction);
router.put("/api/seopagecontent/update/:id", oauthAuthentication, updateSeoPageContentAction);
router.delete("/api/seopagecontent/delete/:id", oauthAuthentication, deleteSeoPageContentAction);

router.post("/api/seotemplate/create", oauthAuthentication, addSeoTemplateAction);
router.get("/api/seotemplate/get", oauthAuthentication, getSeoTemplateAction);
router.get("/api/seotemplate/viewall", oauthAuthentication, viewAllSeoTemplateAction);
router.put("/api/seotemplate/update/:id", oauthAuthentication, updateSeoTemplateAction);
router.delete("/api/seotemplate/delete/:id", oauthAuthentication, deleteSeoTemplateAction);

router.post("/api/seopagecontentblog/create", oauthAuthentication, addSeoPageContentBlogAction);
router.get("/api/seopagecontentblog/get", seoBlogCache, getSeoPageContentBlogAction);
router.get("/api/seopagecontentblog/meta", seoBlogCache, getSeoPageContentBlogMetaAction);
router.get("/api/seopagecontentblog/viewall", seoBlogCache, viewAllSeoPageContentBlogAction);
router.put("/api/seopagecontentblog/update/:id", oauthAuthentication, updateSeoPageContentBlogAction);
router.delete("/api/seopagecontentblog/delete/:id", oauthAuthentication, deleteSeoPageContentBlogAction);
router.get("/api/seopagecontentblog/blog/:slug", seoBlogCache, getSeoBlogBySlugAction);
router.get("/api/seopagecontentblog/suggestion", seoBlogCache, getBusinessSuggestionAction);

export default router;
