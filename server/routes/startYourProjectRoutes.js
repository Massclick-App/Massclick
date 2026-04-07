import express from 'express'

import { addStartYourProjectAction, viewStartYourProjectAction, viewAllStartYourProjectAction, updateStartYourProjectAction, deleteStartYourProjectAction } from "../controller/startProject/startProjectController.js"
import { oauthAuthentication } from '../helper/oauthHelper.js';


const router = express.Router();

router.post('/api/startproject/create', oauthAuthentication, addStartYourProjectAction);
router.get('/api/startproject/view/:id', oauthAuthentication, viewStartYourProjectAction);
router.get('/api/startproject/viewall', oauthAuthentication, viewAllStartYourProjectAction);
router.put('/api/startproject/update/:id', oauthAuthentication, updateStartYourProjectAction);
router.delete('/api/startproject/delete/:id', oauthAuthentication, deleteStartYourProjectAction);

export default router; 