import express from 'express'

import { addAdvertisementAction,viewAdvertisementAction,viewAllAdvertisementAction,updateAdvertisementAction,deleteAdvertisementAction, viewAdvertisementByCategory } from "../controller/advertistment/advertismentController.js"
import { oauthAuthentication } from '../helper/oauthHelper.js';


const router = express.Router();

router.post('/api/advertisment/create', oauthAuthentication, addAdvertisementAction);
router.get('/api/advertisment/view/:id', viewAdvertisementAction);
router.get('/api/advertisment/viewall', viewAllAdvertisementAction);
router.put('/api/advertisment/update/:id', oauthAuthentication, updateAdvertisementAction);
router.delete('/api/advertisment/delete/:id', oauthAuthentication, deleteAdvertisementAction);
router.get('/api/advertisment/category',  viewAdvertisementByCategory);

export default router; 