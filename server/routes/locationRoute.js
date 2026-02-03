import express from 'express'

import {addLocationAction, viewLocationAction, viewAllLocationAction,updateLocationAction,deleteLocationAction, detectDistrictAction} from "../controller/location/locationController.js"
import { oauthAuthentication } from '../helper/oauthHelper.js';
import { getLocation } from '../controller/location/locationIpController.js';


const router = express.Router();

router.post('/api/location/create',oauthAuthentication,  addLocationAction);
router.get('/api/location/view/:id', oauthAuthentication, viewLocationAction);
router.get('/api/location/viewall', oauthAuthentication, viewAllLocationAction);
router.put('/api/location/update/:id', oauthAuthentication, updateLocationAction);
router.delete('/api/location/delete/:id', oauthAuthentication, deleteLocationAction);
router.get('/api/location/getip', oauthAuthentication, getLocation);
router.post("/api/location/detect-district", detectDistrictAction);

export default router; 