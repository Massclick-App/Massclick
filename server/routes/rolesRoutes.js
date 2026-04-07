import express from 'express'

import { addRolesAction, viewRolesAction, viewAllRolesAction, updateRolesAction, deleteRolesAction } from "../controller/roles/rolesController.js"
import { oauthAuthentication } from '../helper/oauthHelper.js';


const router = express.Router();

router.post('/api/roles/create', oauthAuthentication, addRolesAction);
router.get('/api/roles/view/:id', oauthAuthentication, viewRolesAction);
router.get('/api/roles/viewall', oauthAuthentication, viewAllRolesAction);
router.put('/api/roles/update/:id', oauthAuthentication, updateRolesAction);
router.delete('/api/roles/delete/:id', oauthAuthentication, deleteRolesAction);

export default router; 