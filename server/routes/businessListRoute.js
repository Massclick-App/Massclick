import express from 'express'

import { addBusinessListAction, viewBusinessListAction,getBusinessBySlugAction, getSuggestionsController, getEnhancedSuggestionsController, mainSearchController, nearbyBusinessesController, viewAllBusinessListAction,viewAllBusinessAction, updateBusinessListAction, deleteBusinessListAction, activeBusinessListAction, viewAllClientBusinessListAction, viewBusinessByCategory, findBusinessByMobileAction, dashboardSummaryAction, dashboardChartsAction, getPendingBusinessAction, trackQrDownload } from "../controller/businessList/businessListController.js"
import { oauthAuthentication } from '../helper/oauthHelper.js';
import { logSearchAction, viewLogSearchAction, viewSearchAction, updateSearchAction, getTrendingSearchesAction, sendEnquiryLead } from "../controller/businessList/logSearchController.js"
import { cacheMiddleware } from '../middleware/cacheMiddleware.js';
import { validateBusiness } from '../middleware/validationMiddleware.js';

const router = express.Router();

const searchCache = cacheMiddleware({ expirySeconds: 1800 }); // 30 min cache
const suggestionsCache = cacheMiddleware({ expirySeconds: 3600, keyPrefix: 'suggestions' }); // 1 hour cache
const trendsCache = cacheMiddleware({ expirySeconds: 7200, keyPrefix: 'trends' }); // 2 hours cache

router.post('/api/businesslist/create', oauthAuthentication, validateBusiness, addBusinessListAction);
router.get("/api/business/by-slug", getBusinessBySlugAction);
router.get('/api/businesslist/view/:id', viewBusinessListAction);
router.get('/api/businesslist/viewall', oauthAuthentication, viewAllBusinessListAction);
router.get('/api/businesslist/viewallbusiness', viewAllBusinessAction);
router.get('/api/businesslist/clientview', oauthAuthentication, viewAllClientBusinessListAction);
router.put('/api/businesslist/update/:id', oauthAuthentication, validateBusiness, updateBusinessListAction);
router.delete('/api/businesslist/delete/:id', oauthAuthentication, deleteBusinessListAction);
router.put('/api/businesslist/activate/:id', oauthAuthentication, activeBusinessListAction);
router.post('/api/businesslist/log-search', logSearchAction);
router.post('/api/businesslist/send-enquiry', sendEnquiryLead);
router.put('/api/businesslist/log-search/:id', updateSearchAction);
// router.get('/api/businesslist/trending-searches', getTrendingSearchesAction);
router.get('/api/businesslist/trending-searches/viewall',viewLogSearchAction);
router.post('/api/businesslist/trending-searches/view',viewSearchAction);
router.post('/api/businesslist/trending-searches/trending-category',getTrendingSearchesAction);

router.get('/api/businesslist/search', searchCache, mainSearchController);
router.get('/api/businesslist/nearby', nearbyBusinessesController);
router.get('/api/businesslist/suggestions', suggestionsCache, getSuggestionsController);
router.get('/api/businesslist/suggestions-enhanced', suggestionsCache, getEnhancedSuggestionsController);
router.get('/api/businesslist/category', cacheMiddleware({ expirySeconds: 3600, keyPrefix: 'category' }), viewBusinessByCategory);
router.get("/api/businesslist/findByMobile/:mobile", cacheMiddleware({ expirySeconds: 1800, keyPrefix: 'mobile' }), findBusinessByMobileAction);
router.get('/api/businesslist/dashboard-summary', oauthAuthentication, cacheMiddleware({ expirySeconds: 600, keyPrefix: 'dashboard-summary' }), dashboardSummaryAction);
router.get('/api/businesslist/dashboard-charts', oauthAuthentication, cacheMiddleware({ expirySeconds: 600, keyPrefix: 'dashboard-charts' }), dashboardChartsAction);
router.get(
  '/api/businesslist/pendingbusiness',
  oauthAuthentication,
  getPendingBusinessAction
);
router.post("/api/businesslist/qr-download/:id", oauthAuthentication, trackQrDownload);
router.get('/api/businesslist/trending-searches/viewall', trendsCache, viewLogSearchAction);

export default router; 