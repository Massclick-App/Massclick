import express from 'express';
import {
  addEventLocationAction,
  viewEventLocationAction,
  viewAllEventLocationAction,
  updateEventLocationAction,
  deleteEventLocationAction,
  hardDeleteEventLocationAction
} from '../controller/event/eventLocationController.js';
import { oauthAuthentication } from '../helper/oauthHelper.js';

const router = express.Router();

router.post('/api/event-location/create', oauthAuthentication, addEventLocationAction);
router.get('/api/event-location/view/:id', oauthAuthentication, viewEventLocationAction);
router.get('/api/event-location/viewall', oauthAuthentication, viewAllEventLocationAction);
router.put('/api/event-location/update/:id', oauthAuthentication, updateEventLocationAction);
router.delete('/api/event-location/delete/:id', oauthAuthentication, deleteEventLocationAction);
router.delete('/api/event-location/hard-delete/:id', oauthAuthentication, hardDeleteEventLocationAction);

export default router;
