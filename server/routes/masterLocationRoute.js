import express from 'express'

import {
    addMasterLocationAction,
    viewMasterLocationAction,
    viewAllMasterLocationAction,
    searchMasterLocationAction,
    listDistinctMasterLocationValuesAction,
    updateMasterLocationAction,
    deleteMasterLocationAction,
    toggleMasterLocationAction,
    bulkToggleMasterLocationAction,
    resolveRouteLocationAction
} from "../controller/location/masterLocationController.js"
import { oauthAuthentication } from '../helper/oauthHelper.js';

const router = express.Router();

router.post('/api/masterlocation/create', oauthAuthentication, addMasterLocationAction);
router.get('/api/masterlocation/view/:id', oauthAuthentication, viewMasterLocationAction);
router.get('/api/masterlocation/viewall', oauthAuthentication, viewAllMasterLocationAction);
router.get('/api/masterlocation/distinct-values', oauthAuthentication, listDistinctMasterLocationValuesAction);
router.put('/api/masterlocation/update/:id', oauthAuthentication, updateMasterLocationAction);
router.delete('/api/masterlocation/delete/:id', oauthAuthentication, deleteMasterLocationAction);
// Enable/disable a location without deleting it. Bulk variant is for working
// through the backlog of imported locations awaiting review.
router.patch('/api/masterlocation/toggle/:id', oauthAuthentication, toggleMasterLocationAction);
router.patch('/api/masterlocation/bulk-toggle', oauthAuthentication, bulkToggleMasterLocationAction);
// Public: resolve search text ("kk nagar", "manaparai") to location docs/slugs
router.get('/api/masterlocation/search', searchMasterLocationAction);
// Public: district-prefixed URL scheme's ambiguous-segment classifier —
// see resolveRouteLocationAction. Matches the /api/v2/category/... prefix
// convention used by categoryDisplaySettingsRoutes.js for other new-scheme
// endpoints, kept in this file rather than a new one since it's still
// fundamentally a masterlocation lookup.
router.get('/api/v2/location/resolve', resolveRouteLocationAction);

export default router;
