import express from 'express'

import { addAdvertiseAction, viewAdvertiseAction, viewAllAdvertiseAction, updateAdvertiseAction, deleteAdvertiseAction } from "../controller/advertise/advertiseController.js"
import { oauthAuthentication } from '../helper/oauthHelper.js';


const router = express.Router();

router.post('/api/advertise/create', oauthAuthentication, addAdvertiseAction);
router.get('/api/advertise/view/:id',oauthAuthentication, viewAdvertiseAction);
router.get('/api/advertise/viewall',oauthAuthentication, viewAllAdvertiseAction);
router.put('/api/advertise/update/:id',oauthAuthentication, updateAdvertiseAction);
router.delete('/api/advertise/delete/:id', oauthAuthentication, deleteAdvertiseAction);

export default router; 