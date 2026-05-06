import express from 'express'

import {
  getLeadsByMobileAction,
  getLeadsAnalyticsSummaryAction,
  getLeadsTrendsAction,
  getTopSearchesAction,
} from "../controller/leadsData/leadsDataController.js"
import { oauthAuthentication } from '../helper/oauthHelper.js';


const router = express.Router();

router.get('/api/leadsData/leads/:mobileNumber', getLeadsByMobileAction);

// Analytics
router.get('/api/leadsData/analytics/summary/:mobileNumber', getLeadsAnalyticsSummaryAction);
router.get('/api/leadsData/analytics/trends/:mobileNumber', getLeadsTrendsAction);
router.get('/api/leadsData/analytics/top-searches/:mobileNumber', getTopSearchesAction);


export default router;