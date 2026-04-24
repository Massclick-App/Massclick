import express from 'express'

import { addTermsAndConditionsAction,viewTermsAndConditionsAction,viewAllTermsAndConditionsAction,updateTermsAndConditionsAction,deleteTermsAndConditionsAction } from "../controller/footer/termsAndConditionsController.js"
import { oauthAuthentication } from '../helper/oauthHelper.js';


const router = express.Router();

router.post('/api/terms-and-conditions/create', oauthAuthentication, addTermsAndConditionsAction);
router.get('/api/terms-and-conditions/view/:id', oauthAuthentication, viewTermsAndConditionsAction);
router.get('/api/terms-and-conditions/viewall', oauthAuthentication, viewAllTermsAndConditionsAction);
router.put('/api/terms-and-conditions/update/:id', oauthAuthentication, updateTermsAndConditionsAction);
router.delete('/api/terms-and-conditions/delete/:id', oauthAuthentication, deleteTermsAndConditionsAction);

export default router; 