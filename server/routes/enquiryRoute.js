import express from 'express'

import { addEnquiryAction, viewEnquiryAction, viewAllEnquiryAction, updateEnquiryAction, deleteEnquiryAction } from "../controller/enquiry/enquiryController.js"
import { oauthAuthentication } from '../helper/oauthHelper.js';
import { adminRateLimit } from '../middleware/rateLimitMiddleware.js';


const router = express.Router();

router.use('/api/enquiry', adminRateLimit);

router.post('/api/enquiry/create', oauthAuthentication, addEnquiryAction);
router.get('/api/enquiry/view/:id', oauthAuthentication, viewEnquiryAction);
router.get('/api/enquiry/viewall', oauthAuthentication, viewAllEnquiryAction);
router.put('/api/enquiry/update/:id', oauthAuthentication, updateEnquiryAction);
router.delete('/api/enquiry/delete/:id', oauthAuthentication, deleteEnquiryAction);

export default router; 
