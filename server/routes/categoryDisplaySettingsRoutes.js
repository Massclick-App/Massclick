import express from "express";
import {
  getCategoryDisplaySettingsAction,
  updateCategoryDisplaySettingsAction,
  getV2HomeCategoriesAction,
  getV2MobileHomeCategoriesAction,
  getV2PopularCategoriesAction,
  getV2ServiceCardsAction,
  getV2MobileServiceCardsAction,
  getV2SubCategoriesAction,
} from "../controller/categoryDisplaySettings/categoryDisplaySettingsController.js";
import { oauthAuthentication } from "../helper/oauthHelper.js";
import { cacheMiddleware } from "../middleware/cacheMiddleware.js";

const router = express.Router();

const categoryCache         = cacheMiddleware({ expirySeconds: 3600,  keyPrefix: "category-v2" });
const homeCategoryCache     = cacheMiddleware({ expirySeconds: 7200,  keyPrefix: "home-category-v2" });
const homeMobileCategoryCache = cacheMiddleware({ expirySeconds: 7200, keyPrefix: "home-mobile-category-v2" });

// Admin CRUD
router.get("/api/admin/category-display-settings", oauthAuthentication, getCategoryDisplaySettingsAction);
router.put("/api/admin/category-display-settings", oauthAuthentication, updateCategoryDisplaySettingsAction);

// V2 public endpoints
router.get("/api/v2/category/home",                 homeCategoryCache,       getV2HomeCategoriesAction);
router.get("/api/v2/category/home-mobile",          homeMobileCategoryCache, getV2MobileHomeCategoriesAction);
router.get("/api/v2/category/popular",              homeCategoryCache,       getV2PopularCategoriesAction);
router.get("/api/v2/category/service-cards",        homeCategoryCache,       getV2ServiceCardsAction);
router.get("/api/v2/category/mobile-service-cards", homeMobileCategoryCache, getV2MobileServiceCardsAction);
router.get("/api/v2/category/sub/:parentSlug",      categoryCache,           getV2SubCategoriesAction);

export default router;
