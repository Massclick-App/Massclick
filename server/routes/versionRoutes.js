import express from 'express';
import { getAppVersionAction } from '../controller/versionController.js';
import { cacheMiddleware } from '../helper/utils/redisCache.js';

const router = express.Router();

router.get('/api/app/version', cacheMiddleware(3600), getAppVersionAction);

export default router;
