import express from 'express'

import {addUsersAction, viewUsersAction, viewAllUsersAction,updateUsersAction,deleteUsersAction} from "../controller/userController.js"
import { oauthAuthentication } from '../helper/oauthHelper.js';


const router = express.Router();

router.post('/api/user/create',oauthAuthentication,  addUsersAction);
router.get('/api/user/view/:id', oauthAuthentication, viewUsersAction);
router.get('/api/user/viewall', oauthAuthentication, viewAllUsersAction);
router.put('/api/user/update/:id', oauthAuthentication, updateUsersAction);
router.delete('/api/user/delete/:id', oauthAuthentication, deleteUsersAction);

export default router; 