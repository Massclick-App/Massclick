import express from 'express'

import { addPublicizeAction, viewPublicizeAction, viewAllPublicizeAction, updatePublicizeAction, deletePublicizeAction } from "../controller/publicize/publicizeController.js"
import { oauthAuthentication } from '../helper/oauthHelper.js';


const router = express.Router();

router.post('/api/publicize/create', oauthAuthentication, addPublicizeAction);
router.get('/api/publicize/view/:id',oauthAuthentication, viewPublicizeAction);
router.get('/api/publicize/viewall',oauthAuthentication, viewAllPublicizeAction);
router.put('/api/publicize/update/:id',oauthAuthentication, updatePublicizeAction);
router.delete('/api/publicize/delete/:id', oauthAuthentication, deletePublicizeAction);

export default router; 