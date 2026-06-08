import express from 'express';
import {
  addEventAdvertisementAction,
  viewEventAdvertisementAction,
  viewAllEventAdvertisementAction,
  updateEventAdvertisementAction,
  deleteEventAdvertisementAction,
  hardDeleteEventAdvertisementAction,
  trackAdvertisementClickAction,
  trackAdvertisementImpressionAction,
  viewEventHomePopupAdvertisementAction
} from '../controller/event/eventAdvertisementController.js';
import { oauthAuthentication } from '../helper/oauthHelper.js';

const router = express.Router();

router.post('/api/event-advertisement/create', oauthAuthentication, addEventAdvertisementAction);
router.get('/api/event-advertisement/view/:id', oauthAuthentication, viewEventAdvertisementAction);
router.get('/api/event-advertisement/viewall', oauthAuthentication, viewAllEventAdvertisementAction);
router.put('/api/event-advertisement/update/:id', oauthAuthentication, updateEventAdvertisementAction);
router.delete('/api/event-advertisement/delete/:id', oauthAuthentication, deleteEventAdvertisementAction);
router.delete('/api/event-advertisement/hard-delete/:id', oauthAuthentication, hardDeleteEventAdvertisementAction);
router.put('/api/event-advertisement/track-click/:id', oauthAuthentication, trackAdvertisementClickAction);
router.put('/api/event-advertisement/track-impression/:id', oauthAuthentication, trackAdvertisementImpressionAction);
router.get('/api/event-advertisement/popup', oauthAuthentication, viewEventHomePopupAdvertisementAction);

export default router;
