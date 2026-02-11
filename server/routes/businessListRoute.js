import express from 'express'

import { addBusinessListAction, viewBusinessListAction,getBusinessBySlugAction, getSuggestionsController, mainSearchController, viewAllBusinessListAction, updateBusinessListAction, deleteBusinessListAction, activeBusinessListAction, viewAllClientBusinessListAction, viewBusinessByCategory, findBusinessByMobileAction, dashboardSummaryAction, dashboardChartsAction, getPendingBusinessAction, trackQrDownload } from "../controller/businessList/businessListController.js"
import { oauthAuthentication } from '../helper/oauthHelper.js';
import { logSearchAction, viewLogSearchAction, viewSearchAction, updateSearchAction, getTrendingSearchesAction } from "../controller/businessList/logSearchController.js"

const router = express.Router();

router.post('/api/businesslist/create', oauthAuthentication, addBusinessListAction);
router.get("/api/business/by-slug", getBusinessBySlugAction);
router.get('/api/businesslist/view/:id', oauthAuthentication, viewBusinessListAction);
router.get('/api/businesslist/viewall', oauthAuthentication, viewAllBusinessListAction);
router.get('/api/businesslist/clientview', oauthAuthentication, viewAllClientBusinessListAction);
router.put('/api/businesslist/update/:id', oauthAuthentication, updateBusinessListAction);
router.delete('/api/businesslist/delete/:id', oauthAuthentication, deleteBusinessListAction);
router.put('/api/businesslist/activate/:id', oauthAuthentication, activeBusinessListAction);
router.post('/api/businesslist/log-search', logSearchAction);
router.put('/api/businesslist/log-search/:id', updateSearchAction);
// router.get('/api/businesslist/trending-searches', getTrendingSearchesAction);
router.get('/api/businesslist/trending-searches/viewall',viewLogSearchAction);
router.post('/api/businesslist/trending-searches/view',viewSearchAction);
router.post('/api/businesslist/trending-searches/trending-category',getTrendingSearchesAction);

router.get('/api/businesslist/search', mainSearchController);
router.get('/api/businesslist/suggestions', getSuggestionsController);
router.get('/api/businesslist/category', viewBusinessByCategory);
router.get("/api/businesslist/findByMobile/:mobile", findBusinessByMobileAction);
router.get('/api/businesslist/dashboard-summary', oauthAuthentication, dashboardSummaryAction);
router.get('/api/businesslist/dashboard-charts', oauthAuthentication, dashboardChartsAction);
router.get('/api/businesslist/pendingbusiness', oauthAuthentication, getPendingBusinessAction);
router.post("/api/businesslist/qr-download/:id", oauthAuthentication, trackQrDownload);

export default router; 