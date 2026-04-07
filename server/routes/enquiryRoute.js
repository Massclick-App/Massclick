import express from 'express'

import { addEnquiryAction, viewEnquiryAction, viewAllEnquiryAction, updateEnquiryAction, deleteEnquiryAction } from "../controller/enquiry/enquiryController.js"
import { oauthAuthentication } from '../helper/oauthHelper.js';


const router = express.Router();

router.post('/api/enquiry/create', oauthAuthentication, addEnquiryAction);
router.get('/api/enquiry/view/:id', oauthAuthentication, viewEnquiryAction);
router.get('/api/enquiry/viewall', oauthAuthentication, viewAllEnquiryAction);
router.put('/api/enquiry/update/:id', oauthAuthentication, updateEnquiryAction);
router.delete('/api/enquiry/delete/:id', oauthAuthentication, deleteEnquiryAction);

export default router; 