import express from 'express';
import { getAppVersionAction } from '../controller/versionController.js';

const router = express.Router();

router.get('/api/app/version', getAppVersionAction);

export default router;
