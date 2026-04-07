import express from 'express';
import { oauthAction, logoutAction, oauthReAction, oauthClientAction } from '../controller/oauthController.js';

const router = express.Router();

router.post('/api/oauth/login', oauthAction);
router.post('/api/oauth/relogin', oauthReAction )
router.delete('/api/oauth/logout', logoutAction)
router.post('/api/oauth/client', oauthClientAction)

export default router; 