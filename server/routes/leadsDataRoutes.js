import express from 'express'

import { getLeadsByMobileAction } from "../controller/leadsData/leadsDataController.js"
import { oauthAuthentication } from '../helper/oauthHelper.js';


const router = express.Router();

router.get('/api/leadsData/leads/:mobileNumber', getLeadsByMobileAction);


export default router; 