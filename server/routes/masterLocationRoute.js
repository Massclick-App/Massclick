import express from 'express'

import {
    addMasterLocationAction,
    viewMasterLocationAction,
    viewAllMasterLocationAction,
    searchMasterLocationAction,
    listDistinctMasterLocationValuesAction,
    updateMasterLocationAction,
    deleteMasterLocationAction
} from "../controller/location/masterLocationController.js"
import { oauthAuthentication } from '../helper/oauthHelper.js';

const router = express.Router();

router.post('/api/masterlocation/create', oauthAuthentication, addMasterLocationAction);
router.get('/api/masterlocation/view/:id', oauthAuthentication, viewMasterLocationAction);
router.get('/api/masterlocation/viewall', oauthAuthentication, viewAllMasterLocationAction);
router.get('/api/masterlocation/distinct-values', oauthAuthentication, listDistinctMasterLocationValuesAction);
router.put('/api/masterlocation/update/:id', oauthAuthentication, updateMasterLocationAction);
router.delete('/api/masterlocation/delete/:id', oauthAuthentication, deleteMasterLocationAction);
// Public: resolve search text ("kk nagar", "manaparai") to location docs/slugs
router.get('/api/masterlocation/search', searchMasterLocationAction);

export default router;
