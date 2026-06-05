import express from 'express';
import {
  addEventCategoryAction,
  viewEventCategoryAction,
  viewAllEventCategoryAction,
  updateEventCategoryAction,
  deleteEventCategoryAction,
  hardDeleteEventCategoryAction
} from '../controller/event/eventCategoryController.js';
import { oauthAuthentication } from '../helper/oauthHelper.js';

const router = express.Router();

router.post('/api/event-category/create', oauthAuthentication, addEventCategoryAction);
router.get('/api/event-category/view/:id', oauthAuthentication, viewEventCategoryAction);
router.get('/api/event-category/viewall', oauthAuthentication, viewAllEventCategoryAction);
router.put('/api/event-category/update/:id', oauthAuthentication, updateEventCategoryAction);
router.delete('/api/event-category/delete/:id', oauthAuthentication, deleteEventCategoryAction);
router.delete('/api/event-category/hard-delete/:id', oauthAuthentication, hardDeleteEventCategoryAction);

export default router;
