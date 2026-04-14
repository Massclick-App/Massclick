import express from 'express';
import { requestOtp, verifyOtpAndLogin, updateOtpUser, viewOtpUser, viewAllOtpUsers, deleteOtpUser, logUserSearch  } from '../controller/msg91/msg91Controller.js';
import { sendOtpAction, sendWhatsAppForLead, sendWhatsAppToLeadsBulk, verifyOtpAction,fakesendOtpAction, fakeverifyOtpAction} from '../controller/msg91/smsGatewayController.js';
const router = express.Router();

router.post('/api/otp/send',  requestOtp);
router.post('/api/otp/verify',  verifyOtpAndLogin);
router.post('/api/otp_user/send-otp', sendOtpAction);
router.post('/api/otp_user/verify-otp', verifyOtpAction);
router.post('/api/otp_user/fake-send-otp', fakesendOtpAction);
router.post('/api/otp_user/fake-verify-otp', fakeverifyOtpAction);
router.put('/api/otp_user_update/:mobile', updateOtpUser);
router.get("/api/otp_user/:mobile", viewOtpUser);
router.get('/api/otp_users', viewAllOtpUsers);
router.delete('/api/otp_user/:mobile', deleteOtpUser);
router.post('/api/otp_user/log-search', logUserSearch);
router.post("/api/leadssend/whatsapp", sendWhatsAppForLead);               
router.post("/api/leadssend/whatsappall", sendWhatsAppToLeadsBulk);  

export default router;
