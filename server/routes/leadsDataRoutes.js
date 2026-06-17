import express from 'express'

import {
  getLeadsByMobileAction,
  getLeadsAnalyticsSummaryAction,
  getLeadsTrendsAction,
  getTopSearchesAction,
} from "../controller/leadsData/leadsDataController.js"
import { requireAuthPolicy } from '../auth/authMiddleware.js';


const router = express.Router();

router.get('/api/leadsData/leads/:mobileNumber', requireAuthPolicy('leads.customer.list'), getLeadsByMobileAction);

// Analytics
router.get('/api/leadsData/analytics/summary/:mobileNumber', requireAuthPolicy('leads.customer.summary'), getLeadsAnalyticsSummaryAction);
router.get('/api/leadsData/analytics/trends/:mobileNumber', requireAuthPolicy('leads.customer.trends'), getLeadsTrendsAction);
router.get('/api/leadsData/analytics/top-searches/:mobileNumber', requireAuthPolicy('leads.customer.top-searches'), getTopSearchesAction);


export default router;
