import express from 'express'

import { getMobileHomeCategoriesAction, addCategoryAction, viewCategoryAction,businessSearchCategoryAction, viewAllCategoryAction, updateCategoryAction, deleteCategoryAction, hardDeleteCategoryAction, categoryBusinessUsageAction, getHomeCategoriesAction,getSubCategoriesAction, getPopularCategoriesAction, getServiceCardsAction, getAllUniqueCategoriesAction } from "../controller/category/categoryController.js"
import { uploadCategoryImagesAction } from "../controller/category/categoryImageController.js"
import { oauthAuthentication } from '../helper/oauthHelper.js';
import { cacheMiddleware } from '../middleware/cacheMiddleware.js';

const router = express.Router();

const categoryCache = cacheMiddleware({ expirySeconds: 3600, keyPrefix: 'category' });
const homeCategoryCache = cacheMiddleware({ expirySeconds: 7200, keyPrefix: 'home-category' });

router.post('/api/category/create', oauthAuthentication, addCategoryAction);
router.post('/api/category/upload-images', oauthAuthentication, uploadCategoryImagesAction);
router.get('/api/category/view/:id', oauthAuthentication, viewCategoryAction);
router.get('/api/category/viewall', oauthAuthentication, viewAllCategoryAction);
router.put('/api/category/update/:id', oauthAuthentication, updateCategoryAction);
router.delete('/api/category/delete/:id', oauthAuthentication, deleteCategoryAction);
router.delete('/api/category/hard-delete/:id', oauthAuthentication, hardDeleteCategoryAction);
router.get('/api/category/businesscategorysearch', businessSearchCategoryAction);
router.get('/api/category/business-usage', oauthAuthentication, categoryBusinessUsageAction);

router.get("/api/category/all", categoryCache, getAllUniqueCategoriesAction);
router.get("/api/category/home", homeCategoryCache, getHomeCategoriesAction);
router.get("/api/category/home-mobile", homeCategoryCache, getMobileHomeCategoriesAction);
router.get("/api/category/sub/:parentId", categoryCache, getSubCategoriesAction);
router.get("/api/category/popular", homeCategoryCache, getPopularCategoriesAction);
router.get("/api/category/service-cards", homeCategoryCache, getServiceCardsAction);

export default router; 