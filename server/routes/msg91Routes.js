import express from 'express';
import { requestOtp, verifyOtpAndLogin, updateOtpUser, viewOtpUser, viewAllOtpUsers, deleteOtpUser, logUserSearch  } from '../controller/msg91/msg91Controller.js';
import { sendOtpAction, sendWhatsAppForLead, sendWhatsAppToLeadsBulk, verifyOtpAction,fakesendOtpAction, fakeverifyOtpAction} from '../controller/msg91/smsGatewayController.js';
import { leadRateLimit, otpRateLimit } from '../middleware/rateLimitMiddleware.js';
import { requireAdminAuth, requireAuthPolicy } from '../auth/authMiddleware.js';
const router = express.Router();

router.use('/api/otp', otpRateLimit);
// router.use('/api/otp_user', otpRateLimit);
// router.use('/api/leadssend', leadRateLimit);

router.post('/api/otp/send',  requestOtp);
router.post('/api/otp/verify',  verifyOtpAndLogin);
router.post('/api/otp_user/send-otp', sendOtpAction);
router.post('/api/otp_user/verify-otp', verifyOtpAction);
router.post('/api/otp_user/fake-send-otp', fakesendOtpAction);
router.post('/api/otp_user/fake-verify-otp', fakeverifyOtpAction);
router.put('/api/otp_user_update/:mobile', requireAuthPolicy('otp.profile.update'), updateOtpUser);
router.get("/api/otp_user/:mobile", requireAuthPolicy('otp.profile.view'), viewOtpUser);
router.get('/api/otp_users', requireAdminAuth('otp.profile.list'), viewAllOtpUsers);
router.delete('/api/otp_user/:mobile', requireAdminAuth('otp.profile.delete'), deleteOtpUser);
router.post('/api/otp_user/log-search', requireAuthPolicy('otp.profile.search-history'), logUserSearch);
router.post("/api/leadssend/whatsapp", sendWhatsAppForLead);               
router.post("/api/leadssend/whatsappall", sendWhatsAppToLeadsBulk);  

export default router;
