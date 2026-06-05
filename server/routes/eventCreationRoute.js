import express from 'express';
import {
  addEventCreationAction,
  viewEventCreationAction,
  viewAllEventCreationAction,
  updateEventCreationAction,
  deleteEventCreationAction,
  hardDeleteEventCreationAction,
  publishEventCreationAction,
  unpublishEventCreationAction
} from '../controller/event/eventCreationController.js';
import { oauthAuthentication } from '../helper/oauthHelper.js';

const router = express.Router();


router.post('/api/event-creation/create', oauthAuthentication, addEventCreationAction);
router.get('/api/event-creation/view/:id', oauthAuthentication, viewEventCreationAction);
router.get('/api/event-creation/viewall', oauthAuthentication, viewAllEventCreationAction);
router.put('/api/event-creation/update/:id', oauthAuthentication, updateEventCreationAction);
router.delete('/api/event-creation/delete/:id', oauthAuthentication, deleteEventCreationAction);
router.delete('/api/event-creation/hard-delete/:id', oauthAuthentication, hardDeleteEventCreationAction);
router.put('/api/event-creation/publish/:id', oauthAuthentication, publishEventCreationAction);
router.put('/api/event-creation/unpublish/:id', oauthAuthentication, unpublishEventCreationAction);

export default router;
