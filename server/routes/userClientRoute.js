import express from 'express'

import { addUsersClientAction, viewUsersClientAction, viewAllUsersClientAction, updateUsersClientAction, deleteUsersClientAction, searchUsersClientAction } from "../controller/userClient/userClientController.js"
import { oauthAuthentication } from '../helper/oauthHelper.js';
import { validateClient } from '../middleware/validationMiddleware.js';


const router = express.Router();

router.post('/api/userclient/create', oauthAuthentication, validateClient, addUsersClientAction);
router.get('/api/userclient/view/:id', oauthAuthentication, viewUsersClientAction);
router.get('/api/userclient/viewall', oauthAuthentication, viewAllUsersClientAction);
router.put('/api/userclient/update/:id', oauthAuthentication, validateClient, updateUsersClientAction);
router.delete('/api/userclient/delete/:id', oauthAuthentication, deleteUsersClientAction);
router.get('/api/userClient/search', oauthAuthentication, searchUsersClientAction);

export default router; 