import express from 'express'

import { addMRPAction,viewMRPAction,viewAllMRPAction,updateMRPAction,deleteMRPAction,getMniLeadsList, searchMrpBusinessAction, searchMrpCategoryAction,sendMrpLeadsAction, getBusinessProfileByPhoneAction, getGlobalLeadReportAction } from "../controller/MRP/mrpController.js"
import { oauthAuthentication } from '../helper/oauthHelper.js';


const router = express.Router();

router.post('/api/mrpdata/create', oauthAuthentication, addMRPAction);
router.get('/api/mrpdata/view/:id', oauthAuthentication, viewMRPAction);
router.get('/api/mrpdata/viewall', oauthAuthentication, viewAllMRPAction);
router.put('/api/mrpdata/update/:id', oauthAuthentication, updateMRPAction);
router.delete('/api/mrpdata/delete/:id', oauthAuthentication, deleteMRPAction);
router.get('/api/mrpdata/search/business', oauthAuthentication, searchMrpBusinessAction);
router.get('/api/mrpdata/search/category', oauthAuthentication, searchMrpCategoryAction);
router.post("/api/mrpdata/send-leads/:id", oauthAuthentication, sendMrpLeadsAction);
router.get('/api/mrpdata/get-mni-leads', oauthAuthentication, getMniLeadsList);
router.post('/api/mrpdata/get-business-profile', oauthAuthentication, getBusinessProfileByPhoneAction);
router.get('/api/mrpdata/lead-report', oauthAuthentication, getGlobalLeadReportAction);

export default router;