import express from 'express'

import { addMRPAction,viewMRPAction,viewAllMRPAction,updateMRPAction,deleteMRPAction, searchMrpBusinessAction, searchMrpCategoryAction,sendMrpLeadsAction } from "../controller/MRP/mrpController.js"
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

export default router;