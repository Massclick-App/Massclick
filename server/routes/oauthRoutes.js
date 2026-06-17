import express from 'express';
import { oauthAction, logoutAction, oauthReAction, oauthClientAction } from '../controller/oauthController.js';
import { authRateLimit } from '../middleware/rateLimitMiddleware.js';

const router = express.Router();

// router.use('/api/oauth', authRateLimit);

router.post('/api/oauth/login', oauthAction);
router.post('/api/oauth/relogin', oauthReAction )
router.delete('/api/oauth/logout', logoutAction)
router.post('/api/oauth/client', oauthClientAction)

export default router; 
