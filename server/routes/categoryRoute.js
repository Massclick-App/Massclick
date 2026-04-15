import express from 'express'

import { addCategoryAction, viewCategoryAction,businessSearchCategoryAction, viewAllCategoryAction, updateCategoryAction, deleteCategoryAction, getHomeCategoriesAction,getSubCategoriesAction, getPopularCategoriesAction, getServiceCardsAction } from "../controller/category/categoryController.js"
import { oauthAuthentication } from '../helper/oauthHelper.js';
import { cacheMiddleware } from '../helper/utils/redisCache.js';


const router = express.Router();

router.post('/api/category/create', oauthAuthentication, addCategoryAction);
router.get('/api/category/view/:id', oauthAuthentication, viewCategoryAction);
router.get('/api/category/viewall', oauthAuthentication, viewAllCategoryAction);
router.put('/api/category/update/:id', oauthAuthentication, updateCategoryAction);
router.delete('/api/category/delete/:id', oauthAuthentication, deleteCategoryAction);
router.get('/api/category/businesscategorysearch', cacheMiddleware(300), businessSearchCategoryAction);

router.get("/api/category/home", cacheMiddleware(300), getHomeCategoriesAction);
router.get("/api/category/sub/:parentId", cacheMiddleware(300), getSubCategoriesAction);
router.get("/api/category/popular", cacheMiddleware(300), getPopularCategoriesAction);
router.get("/api/category/service-cards", cacheMiddleware(300), getServiceCardsAction);

export default router; 