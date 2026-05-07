import express from 'express'

import { addAdvertisementAction,viewAdvertisementAction,viewAllAdvertisementAction,updateAdvertisementAction,deleteAdvertisementAction, viewAdvertisementByCategory } from "../controller/advertistment/advertismentController.js"
import { oauthAuthentication } from '../helper/oauthHelper.js';
import { cacheMiddleware } from '../middleware/cacheMiddleware.js';

const router = express.Router();

const advertisementCache = cacheMiddleware({ expirySeconds: 3600, keyPrefix: 'advertisment' });

router.post('/api/advertisment/create', oauthAuthentication, addAdvertisementAction);
router.get('/api/advertisment/view/:id', advertisementCache, viewAdvertisementAction);
router.get('/api/advertisment/viewall', advertisementCache, viewAllAdvertisementAction);
router.put('/api/advertisment/update/:id', oauthAuthentication, updateAdvertisementAction);
router.delete('/api/advertisment/delete/:id', oauthAuthentication, deleteAdvertisementAction);
router.get('/api/advertisment/category', advertisementCache, viewAdvertisementByCategory);

export default router; 