import nodemailer from 'nodemailer';
import { getObjectBufferByKey } from '../../s3Uploder.js';
import { ensureBusinessCertificates } from '../businessList/businessCertificateHelper.js';

const {
  INVOICE_EMAIL_HOST,
  INVOICE_EMAIL_USER,
  INVOICE_EMAIL_PASSWORD,
  INVOICE_EMAIL_FROM,
} = process.env;

const transporter = nodemailer.createTransport({
  host: INVOICE_EMAIL_HOST?.split(':')[0] || 'smtp.gmail.com',
  port: parseInt(INVOICE_EMAIL_HOST?.split(':')[1] || '587'),
  secure: false,
  auth: {
    user: INVOICE_EMAIL_USER,
    pass: INVOICE_EMAIL_PASSWORD,
  },
});

const PREMIUM_MEMBERSHIP_BASE_AMOUNT = 24000;
const GST_RATE_PERCENT = 18;

const calculateInvoiceAmounts = (paymentData = {}) => {
  const storedTotalAmount = Number(paymentData.totalAmount || 0);
  const amount = PREMIUM_MEMBERSHIP_BASE_AMOUNT;
  const gstAmount = parseFloat((amount * (GST_RATE_PERCENT / 100)).toFixed(2));
  const expectedTotalAmount = parseFloat((amount + gstAmount).toFixed(2));
  const totalAmount = storedTotalAmount === expectedTotalAmount
    ? storedTotalAmount
    : expectedTotalAmount;

  return { amount, gstAmount, totalAmount };
};

const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const formatAmount = (value) => {
  const amount = Number(value || 0);
  return amount.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const formatPaymentDate = (value) => {
  const date = value ? new Date(value) : new Date();

  if (Number.isNaN(date.getTime())) {
    return new Date().toLocaleDateString('en-IN');
  }

  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const slugifyEmailValue = (value = '') =>
  String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'business';

const getPublicBaseUrl = () =>
  String(process.env.PUBLIC_BASE_URL || 'https://massclick.in').replace(/\/+$/, '');

const buildBusinessProfileUrl = (businessData = {}) => {
  const businessId = businessData?._id?.toString?.() || businessData?._id || businessData?.id || '';
  const locationSlug = slugifyEmailValue(businessData.location || 'business');
  const businessSlug = slugifyEmailValue(
    businessData.slug || businessData.businessName || businessData.name || 'profile',
  );

  return `${getPublicBaseUrl()}/business/${locationSlug}/${businessSlug}/${businessId}`;
};

const detailRow = (label, value, isStrong = false) => `
  <tr>
    <td style="padding: 13px 16px; border-bottom: 1px solid #edf0f5; color: #667085; font-size: 14px; line-height: 20px;">${label}</td>
    <td style="padding: 13px 16px; border-bottom: 1px solid #edf0f5; color: #101828; font-size: 14px; line-height: 20px; font-weight: ${isStrong ? '700' : '600'}; text-align: right;">${value || 'N/A'}</td>
  </tr>
`;

const benefitItem = (title, description) => `
  <tr>
    <td width="28" valign="top" style="padding: 0 12px 18px 0;">
      <span style="display: inline-block; width: 22px; height: 22px; border-radius: 50%; background: #fff3e0; color: #f58220; font-size: 14px; line-height: 22px; text-align: center; font-weight: 700;">&#10003;</span>
    </td>
    <td valign="top" style="padding: 0 0 18px 0;">
      <div style="color: #101828; font-size: 15px; line-height: 22px; font-weight: 700;">${title}</div>
      <div style="color: #667085; font-size: 13px; line-height: 20px;">${description}</div>
    </td>
  </tr>
`;

const certificateEmailTemplate = (businessData, certificateTypes = []) => {
  const businessName = escapeHtml(businessData.businessName || businessData.name || 'Valued Business Partner');
  const category = escapeHtml(businessData.category || 'N/A');
  const location = escapeHtml(businessData.location || 'N/A');
  const profileUrl = escapeHtml(buildBusinessProfileUrl(businessData));
  const hasTrust = certificateTypes.includes('trust');
  const hasVerified = certificateTypes.includes('verified');
  const certificateLabel = hasVerified && hasTrust
    ? 'Verified and Trust Certificates'
    : hasTrust
      ? 'Trust Certificate'
      : 'Verified Certificate';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MassClick ${certificateLabel}</title>
</head>
<body style="margin:0; padding:0; background:#f4f6fb; font-family:Arial, Helvetica, sans-serif; color:#101828;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6fb; padding:32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:680px; background:#ffffff; border-radius:18px; overflow:hidden; box-shadow:0 16px 42px rgba(16,24,40,0.10);">
          <tr>
            <td style="background:#111827; background-image:linear-gradient(135deg,#111827 0%,#1f2937 52%,#f58220 100%); padding:36px; color:#ffffff;">
              <div style="font-size:15px; line-height:20px; font-weight:700;">MassClick</div>
              <div style="display:inline-block; margin-top:26px; padding:7px 12px; border-radius:999px; background:rgba(255,255,255,0.14); font-size:12px; line-height:16px; font-weight:800; text-transform:uppercase; letter-spacing:0.5px;">${certificateLabel} Issued</div>
              <h1 style="margin:16px 0 0; font-size:30px; line-height:38px; font-weight:800;">Your MassClick certificate status is active.</h1>
              <p style="margin:14px 0 0; color:#f3f4f6; font-size:15px; line-height:24px;">Dear ${businessName}, your business profile has received the approved MassClick certificate status. This status is now reflected as a trust signal on your MassClick profile.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:34px 36px 30px;">
              <p style="color:#475467; font-size:15px; line-height:24px; margin:0 0 22px;">
                Congratulations. This certificate helps customers identify your business as reviewed by MassClick and supports stronger trust on your public profile.
              </p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #edf0f5; border-radius:12px; overflow:hidden; margin-bottom:28px;">
                ${detailRow('Business Name', businessName)}
                ${detailRow('Category', category)}
                ${detailRow('Location', location)}
                ${detailRow('Certificate Status', escapeHtml(certificateLabel), true)}
              </table>
              <a href="${profileUrl}" style="display:inline-block; background:#f58220; border-radius:999px; color:#ffffff; font-size:14px; font-weight:800; padding:13px 20px; text-decoration:none;">View Business Profile</a>
              <p style="color:#475467; font-size:15px; line-height:24px; margin:28px 0 0;">
                Regards,<br>
                <strong>MassClick Business Success Team</strong>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:26px 36px 34px; background:#f9fafb; border-top:1px solid #edf0f5; text-align:center; color:#667085; font-size:12px; line-height:20px;">
              <strong style="color:#101828;">MassClick</strong><br>
              India's local business discovery platform<br>
              <a href="https://massclick.in" style="color:#f58220; text-decoration:none;">massclick.in</a> &nbsp;|&nbsp; <a href="mailto:support@massclick.in" style="color:#f58220; text-decoration:none;">support@massclick.in</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

const certificateTextTemplate = (businessData, certificateTypes = []) => {
  const businessName = businessData.businessName || businessData.name || 'Valued Business Partner';
  const profileUrl = buildBusinessProfileUrl(businessData);
  const certificateLabel = certificateTypes.includes('verified') && certificateTypes.includes('trust')
    ? 'Verified and Trust Certificates'
    : certificateTypes.includes('trust')
      ? 'Trust Certificate'
      : 'Verified Certificate';

  return `
MassClick ${certificateLabel} Issued

Dear ${businessName},

Your business profile has received the approved MassClick certificate status.

Business Name: ${businessName}
Category: ${businessData.category || 'N/A'}
Location: ${businessData.location || 'N/A'}
Certificate Status: ${certificateLabel}

Business Profile:
${profileUrl}

Regards,
MassClick Business Success Team
`;
};

const invoiceHTMLTemplate = (invoiceData) => {
  const businessName = escapeHtml(invoiceData.businessName || 'Valued Business Partner');
  const category = escapeHtml(invoiceData.category || 'N/A');
  const location = escapeHtml(invoiceData.location || 'N/A');
  const paymentDate = escapeHtml(invoiceData.paymentDate || formatPaymentDate());
  const baseAmount = formatAmount(invoiceData.amount);
  const gstAmount = formatAmount(invoiceData.gstAmount);
  const totalAmount = formatAmount(invoiceData.totalAmount);
  const certificatesAttached = Number(invoiceData.certificateAttachmentCount || 0) > 0;
  const certificateSection = certificatesAttached
    ? `
              <h2 class="section-title">Certificates Attached</h2>
              <p class="intro">
                Your active MassClick certificate file${Number(invoiceData.certificateAttachmentCount) > 1 ? 's are' : ' is'} attached with this invoice email for your records.
              </p>
`
    : '';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>MassClick Premium Membership Activated</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #f4f6fb;
      font-family: Arial, Helvetica, sans-serif;
      color: #101828;
      -webkit-text-size-adjust: 100%;
    }
    table {
      border-collapse: collapse;
    }
    a {
      color: #f58220;
      text-decoration: none;
    }
    .email-shell {
      width: 100%;
      background-color: #f4f6fb;
      padding: 32px 12px;
    }
    .email-card {
      width: 100%;
      max-width: 680px;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 18px;
      overflow: hidden;
      box-shadow: 0 16px 42px rgba(16, 24, 40, 0.10);
    }
    .hero {
      background: #111827;
      background-image: linear-gradient(135deg, #111827 0%, #1f2937 52%, #f58220 100%);
      padding: 36px 36px 34px;
      color: #ffffff;
    }
    .brand {
      font-size: 15px;
      line-height: 20px;
      font-weight: 700;
      letter-spacing: 0.2px;
    }
    .badge {
      display: inline-block;
      margin-top: 26px;
      padding: 7px 12px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.14);
      color: #ffffff;
      font-size: 12px;
      line-height: 16px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .hero-title {
      margin: 16px 0 0;
      font-size: 30px;
      line-height: 38px;
      font-weight: 800;
    }
    .hero-copy {
      margin: 14px 0 0;
      color: #f3f4f6;
      font-size: 15px;
      line-height: 24px;
      max-width: 560px;
    }
    .content {
      padding: 34px 36px 26px;
    }
    .intro {
      color: #475467;
      font-size: 15px;
      line-height: 24px;
      margin: 0 0 22px;
    }
    .section-title {
      margin: 0 0 14px;
      color: #101828;
      font-size: 18px;
      line-height: 26px;
      font-weight: 800;
    }
    .details-table {
      width: 100%;
      border-collapse: collapse;
      border: 1px solid #edf0f5;
      border-radius: 12px;
      overflow: hidden;
      margin-bottom: 30px;
    }
    .summary-card {
      background: #fff8ef;
      border: 1px solid #ffe1b8;
      border-radius: 14px;
      padding: 20px;
      margin: 6px 0 30px;
    }
    .summary-label {
      color: #8a4b0f;
      font-size: 12px;
      line-height: 16px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-weight: 800;
    }
    .summary-amount {
      color: #101828;
      font-size: 30px;
      line-height: 38px;
      font-weight: 800;
      margin-top: 6px;
    }
    .summary-meta {
      color: #667085;
      font-size: 13px;
      line-height: 20px;
      margin-top: 8px;
    }
    .next-steps {
      background: #f9fafb;
      border-radius: 14px;
      padding: 22px;
      margin-top: 8px;
    }
    .next-steps ol {
      margin: 0;
      padding-left: 20px;
      color: #475467;
      font-size: 14px;
      line-height: 24px;
    }
    .signature {
      margin: 28px 0 0;
      color: #475467;
      font-size: 15px;
      line-height: 24px;
    }
    .footer {
      padding: 26px 36px 34px;
      background: #f9fafb;
      border-top: 1px solid #edf0f5;
      text-align: center;
      color: #667085;
      font-size: 12px;
      line-height: 20px;
    }
    @media only screen and (max-width: 600px) {
      .email-shell {
        padding: 0;
      }
      .email-card {
        border-radius: 0;
      }
      .hero,
      .content,
      .footer {
        padding-left: 22px;
        padding-right: 22px;
      }
      .hero-title {
        font-size: 25px;
        line-height: 32px;
      }
      .summary-amount {
        font-size: 26px;
        line-height: 34px;
      }
    }
  </style>
</head>
<body>
  <table role="presentation" class="email-shell" width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center">
        <table role="presentation" class="email-card" cellpadding="0" cellspacing="0">
          <tr>
            <td class="hero">
              <div class="brand">MassClick</div>
              <div class="badge">Premium Membership Activated</div>
              <h1 class="hero-title">Your business is now live with Premium visibility.</h1>
              <p class="hero-copy">
                Dear ${businessName}, your MassClick Premium Business Membership has been activated successfully. Your listing is now set up for stronger discovery, lead engagement, and customer trust across the MassClick network.
              </p>
            </td>
          </tr>

          <tr>
            <td class="content">
              <p class="intro">
                Thank you for choosing MassClick. This email confirms your successful payment and activation. Please keep this message as your official payment acknowledgement and membership reference.
              </p>

              <div class="summary-card">
                <div class="summary-label">Total Amount Paid</div>
                <div class="summary-amount">&#8377;${totalAmount}</div>
                <div class="summary-meta">Payment recorded successfully for your Premium membership.</div>
              </div>

              <h2 class="section-title">Membership Details</h2>
              <table role="presentation" class="details-table" cellpadding="0" cellspacing="0">
                ${detailRow('Business Name', businessName)}
                ${detailRow('Category', category)}
                ${detailRow('Location', location)}
                ${detailRow('Membership Plan', 'Premium Business Membership')}
                ${detailRow('Membership Status', '<span style="color: #027a48;">Active</span>')}
                ${detailRow('Activation Date', paymentDate)}
              </table>

              <h2 class="section-title">Payment Summary</h2>
              <table role="presentation" class="details-table" cellpadding="0" cellspacing="0">
                ${detailRow('Base Amount', `&#8377;${baseAmount}`)}
                ${detailRow('GST (18%)', `&#8377;${gstAmount}`)}
                ${detailRow('Total Paid', `&#8377;${totalAmount}`, true)}
                ${detailRow('Payment Status', '<span style="color: #027a48;">Successful</span>')}
              </table>

              ${certificateSection}

              <h2 class="section-title">Premium Benefits Now Active</h2>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 14px;">
                ${benefitItem('Priority discovery', 'Improved placement opportunities that help customers find your business faster.')}
                ${benefitItem('Enhanced business profile', 'A stronger profile presence designed to improve trust, enquiries, and conversions.')}
                ${benefitItem('Lead and enquiry support', 'Customer enquiries and important business updates can reach you through your registered contact channels.')}
                ${benefitItem('Reviews and reputation growth', 'Build credibility by encouraging customers to share ratings, reviews, and feedback.')}
                ${benefitItem('MNI business network access', 'Connect with relevant businesses, referral opportunities, and collaboration possibilities through MassClick Network Intelligence.')}
              </table>

              <div class="next-steps">
                <h2 class="section-title" style="font-size: 16px; line-height: 24px; margin-bottom: 10px;">Recommended Next Steps</h2>
                <ol>
                  <li>Complete every important profile field, including contact details, service areas, and working hours.</li>
                  <li>Upload clear business photos, videos, product images, or service visuals to improve customer confidence.</li>
                  <li>Keep your registered WhatsApp number active so enquiries and updates are not missed.</li>
                  <li>Respond quickly to customer enquiries and request reviews from satisfied customers.</li>
                </ol>
              </div>

              <p class="signature">
                We are glad to support your growth on MassClick and help your business reach more customers with a polished, trusted presence.
                <br><br>
                Regards,<br>
                <strong>MassClick Business Success Team</strong>
              </p>
            </td>
          </tr>

          <tr>
            <td class="footer">
              <strong style="color: #101828;">MassClick</strong><br>
              India's local business discovery platform<br>
              <a href="https://massclick.in">massclick.in</a> &nbsp;|&nbsp; <a href="mailto:support@massclick.in">support@massclick.in</a><br>
              &copy; ${new Date().getFullYear()} MassClick. All rights reserved.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
};

const invoiceTextTemplate = (invoiceData) => {
  const businessName = invoiceData.businessName || 'Valued Business Partner';
  const paymentDate = invoiceData.paymentDate || formatPaymentDate();
  const certificatesAttached = Number(invoiceData.certificateAttachmentCount || 0) > 0
    ? `\nCertificates Attached: ${invoiceData.certificateAttachmentCount}\n`
    : '';

  return `
MassClick Premium Business Membership Activated

Dear ${businessName},

Your MassClick Premium Business Membership has been activated successfully.

Membership Details:
Business Name: ${businessName}
Category: ${invoiceData.category || 'N/A'}
Location: ${invoiceData.location || 'N/A'}
Plan: Premium Business Membership
Status: Active
Activation Date: ${paymentDate}

Payment Summary:
Base Amount: INR ${formatAmount(invoiceData.amount)}
GST (18%): INR ${formatAmount(invoiceData.gstAmount)}
Total Paid: INR ${formatAmount(invoiceData.totalAmount)}
${certificatesAttached}

Premium benefits now active:
- Priority discovery
- Enhanced business profile
- Lead and enquiry support
- Reviews and reputation growth
- MNI business network access

Regards,
MassClick Business Success Team
https://massclick.in
support@massclick.in
`;
};

const buildCertificateAttachments = async (businessData = {}, certificateTypes = []) => {
  const businessWithCertificates = await ensureBusinessCertificates(businessData);
  const certificateBusiness = businessWithCertificates || businessData;
  const certificates = certificateBusiness.certificates || {};
  const requestedTypes = Array.isArray(certificateTypes) && certificateTypes.length > 0
    ? certificateTypes
    : ['verified', 'trust'];
  const businessSlug = slugifyEmailValue(
    certificateBusiness.businessName || certificateBusiness.name || 'business',
  );

  const certificateExtension = (key = '') =>
    (String(key).match(/\.(\w+)$/) || [])[1] || 'svg';
  const certificateFiles = [
    requestedTypes.includes('verified') && certificateBusiness.verification?.isVerified && certificates.verifiedCertificateKey && {
      key: certificates.verifiedCertificateKey,
      filename: `massclick-verified-certificate-${businessSlug}.${certificateExtension(certificates.verifiedCertificateKey)}`,
    },
    requestedTypes.includes('trust') && certificateBusiness.badges?.isTrust && certificates.trustCertificateKey && {
      key: certificates.trustCertificateKey,
      filename: `massclick-trust-certificate-${businessSlug}.${certificateExtension(certificates.trustCertificateKey)}`,
    },
  ].filter(Boolean);

  const attachments = [];

  for (const certificateFile of certificateFiles) {
    try {
      const file = await getObjectBufferByKey(certificateFile.key);

      if (file?.content?.length) {
        attachments.push({
          filename: certificateFile.filename,
          content: file.content,
          contentType: file.contentType || 'image/svg+xml',
        });
      }
    } catch (error) {
      console.warn(`[Invoice Email] Certificate attachment skipped for ${certificateFile.key}: ${error.message}`);
    }
  }

  return attachments;
};

export const sendInvoiceEmail = async (businessData, paymentData) => {
  try {
    console.log(`[Invoice Email] Starting email send process for business: ${businessData?.businessName}`);
    const businessEmail = businessData?.email;

    if (!businessEmail) {
      console.warn(`[Invoice Email] No email found for business: ${businessData?.businessName || businessData?._id}`);
      return {
        success: false,
        message: 'No email address found for business',
      };
    }

    const invoiceAmounts = calculateInvoiceAmounts(paymentData);

    console.log(`[Invoice Email] Preparing invoice for: ${businessEmail}`);
    console.log(`[Invoice Email] Payment details - TxnID: ${paymentData.transactionId}, Amount: INR ${invoiceAmounts.totalAmount}`);

    const invoiceData = {
      _id: businessData._id,
      businessName: businessData.businessName,
      name: businessData.name,
      category: businessData.category,
      location: businessData.location,
      slug: businessData.slug,
      plotNumber: businessData.plotNumber,
      street: businessData.street,
      pincode: businessData.pincode,
      email: businessData.email,
      contact: businessData.contact,
      website: businessData.website,
      verification: businessData.verification || {},
      badges: businessData.badges || {},
      transactionId: paymentData.transactionId,
      amount: invoiceAmounts.amount,
      gstAmount: invoiceAmounts.gstAmount,
      totalAmount: invoiceAmounts.totalAmount,
      paymentDate: formatPaymentDate(paymentData.paymentDate),
    };
    
    const certificateAttachments = await buildCertificateAttachments(businessData);
    invoiceData.certificateAttachmentCount = certificateAttachments.length;

    const mailOptions = {
      from: `MassClick <${INVOICE_EMAIL_FROM}>`,
      to: businessEmail,
      subject: `MassClick Premium Activated - Payment Successful for ${businessData.businessName}`,
      html: invoiceHTMLTemplate(invoiceData),
      text: invoiceTextTemplate(invoiceData),
      attachments: certificateAttachments,
    };

    console.log(`[Invoice Email] Sending email via SMTP - From: ${INVOICE_EMAIL_FROM}, To: ${businessEmail}, Attachments: ${certificateAttachments.length}`);
    const info = await transporter.sendMail(mailOptions);

    console.log(`[Invoice Email] SUCCESS - Email sent to ${businessEmail}`);
    console.log(`[Invoice Email] Message ID: ${info.messageId}`);
    console.log(`[Invoice Email] SMTP Response: ${info.response}`);

    return {
      success: true,
      message: 'Invoice email sent successfully',
      messageId: info.messageId,
    };
  } catch (error) {
    console.error(`[Invoice Email] FAILED - Error sending invoice email to ${businessData?.businessName}`);
    console.error('[Invoice Email] Error details:', {
      businessName: businessData?.businessName,
      businessEmail: businessData?.email,
      transactionId: paymentData?.transactionId,
      errorMessage: error.message,
      errorCode: error.code,
      errorStack: error.stack,
    });
    return {
      success: false,
      message: 'Failed to send invoice email',
      error: error.message,
    };
  }
};

export const sendBusinessCertificateEmail = async (businessData, options = {}) => {
  try {
    console.log(`[Certificate Email] Starting email send process for business: ${businessData?.businessName}`);
    const businessEmail = businessData?.email;

    if (!businessEmail) {
      console.warn(`[Certificate Email] No email found for business: ${businessData?.businessName || businessData?._id}`);
      return {
        success: false,
        message: 'No email address found for business',
      };
    }

    const certificateTypes = [
      options.includeVerified && 'verified',
      options.includeTrust && 'trust',
    ].filter(Boolean);

    if (certificateTypes.length === 0) {
      return {
        success: false,
        message: 'No active certificate type provided',
      };
    }

    const certificateLabel = certificateTypes.includes('verified') && certificateTypes.includes('trust')
      ? 'Verified and Trust Certificates'
      : certificateTypes.includes('trust')
        ? 'Trust Certificate'
        : 'Verified Certificate';
    const certificateAttachments = await buildCertificateAttachments(businessData, certificateTypes);

    const mailOptions = {
      from: `MassClick <${INVOICE_EMAIL_FROM}>`,
      to: businessEmail,
      subject: `MassClick ${certificateLabel} Ready - ${businessData.businessName || businessData.name}`,
      html: certificateEmailTemplate(businessData, certificateTypes),
      text: certificateTextTemplate(businessData, certificateTypes),
      attachments: certificateAttachments,
    };

    console.log(`[Certificate Email] Sending email via SMTP - From: ${INVOICE_EMAIL_FROM}, To: ${businessEmail}, Attachments: ${certificateAttachments.length}`);
    const info = await transporter.sendMail(mailOptions);

    console.log(`[Certificate Email] SUCCESS - Email sent to ${businessEmail}`);
    console.log(`[Certificate Email] Message ID: ${info.messageId}`);
    console.log(`[Certificate Email] SMTP Response: ${info.response}`);

    return {
      success: true,
      message: 'Certificate email sent successfully',
      messageId: info.messageId,
    };
  } catch (error) {
    console.error(`[Certificate Email] FAILED - Error sending certificate email to ${businessData?.businessName}`);
    console.error('[Certificate Email] Error details:', {
      businessName: businessData?.businessName,
      businessEmail: businessData?.email,
      errorMessage: error.message,
      errorCode: error.code,
      errorStack: error.stack,
    });
    return {
      success: false,
      message: 'Failed to send certificate email',
      error: error.message,
    };
  }
};

const escapeEnquiryText = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

export const sendBusinessEnquiryEmail = async (businessData, lead = {}) => {
  const businessEmail = String(businessData?.email || "").trim();
  if (!businessEmail) return { success: false, message: "Business email is not available" };

  const safe = {
    businessName: escapeEnquiryText(businessData?.businessName || "Business"),
    customerName: escapeEnquiryText(lead.customerName || "Customer"),
    customerMobile: escapeEnquiryText(lead.customerMobile || "Not provided"),
    customerEmail: escapeEnquiryText(lead.customerEmail || "Not provided"),
    message: escapeEnquiryText(lead.message || "General enquiry"),
    category: escapeEnquiryText(lead.category || businessData?.category || "General"),
    location: escapeEnquiryText(lead.location || businessData?.location || "Not provided"),
  };

  const info = await transporter.sendMail({
    from: `MassClick <${INVOICE_EMAIL_FROM}>`,
    to: businessEmail,
    replyTo: String(lead.customerEmail || "").trim() || undefined,
    subject: `New MassClick enquiry for ${businessData.businessName || "your business"}`,
    text: `New customer enquiry\n\nName: ${lead.customerName || "Customer"}\nMobile: ${lead.customerMobile || "Not provided"}\nEmail: ${lead.customerEmail || "Not provided"}\nCategory: ${lead.category || businessData.category || "General"}\nLocation: ${lead.location || businessData.location || "Not provided"}\nEnquiry: ${lead.message || "General enquiry"}`,
    html: `<h2>New customer enquiry</h2>
      <p>Hello ${safe.businessName},</p>
      <p>You received a new customer enquiry through MassClick.</p>
      <table cellpadding="6" cellspacing="0">
        <tr><td><strong>Name</strong></td><td>${safe.customerName}</td></tr>
        <tr><td><strong>Mobile</strong></td><td>${safe.customerMobile}</td></tr>
        <tr><td><strong>Email</strong></td><td>${safe.customerEmail}</td></tr>
        <tr><td><strong>Category</strong></td><td>${safe.category}</td></tr>
        <tr><td><strong>Location</strong></td><td>${safe.location}</td></tr>
      </table>
      <h3>Enquiry</h3><p>${safe.message.replace(/\r?\n/g, "<br>")}</p>`,
  });

  return { success: true, messageId: info.messageId };
};

export const sendCustomerBusinessInfoEmail = async (businessData, customer = {}) => {
  const customerEmail = String(customer.email || "").trim();
  if (!customerEmail) return { success: false, message: "Customer email is not available" };

  const safe = {
    customerName: escapeEnquiryText(customer.name || "Customer"),
    businessName: escapeEnquiryText(businessData.businessName || "Business"),
    category: escapeEnquiryText(businessData.category || "Local business"),
    contact: escapeEnquiryText(businessData.contactList || businessData.contact || "Not provided"),
    email: escapeEnquiryText(businessData.email || "Not provided"),
    address: escapeEnquiryText([
      businessData.plotNumber,
      businessData.street,
      businessData.location,
      businessData.pincode,
    ].filter(Boolean).join(", ") || "Not provided"),
    website: escapeEnquiryText(businessData.website || "Not provided"),
  };

  const info = await transporter.sendMail({
    from: `MassClick <${INVOICE_EMAIL_FROM}>`,
    to: customerEmail,
    subject: `${businessData.businessName || "Business"} contact information from MassClick`,
    text: `Hello ${customer.name || "Customer"},\n\nBusiness: ${businessData.businessName || "Business"}\nCategory: ${businessData.category || "Local business"}\nContact: ${businessData.contactList || businessData.contact || "Not provided"}\nEmail: ${businessData.email || "Not provided"}\nAddress: ${[businessData.plotNumber, businessData.street, businessData.location, businessData.pincode].filter(Boolean).join(", ") || "Not provided"}\nWebsite: ${businessData.website || "Not provided"}`,
    html: `<h2>${safe.businessName}</h2>
      <p>Hello ${safe.customerName}, here is the business information you requested from MassClick.</p>
      <table cellpadding="6" cellspacing="0">
        <tr><td><strong>Category</strong></td><td>${safe.category}</td></tr>
        <tr><td><strong>Contact</strong></td><td>${safe.contact}</td></tr>
        <tr><td><strong>Email</strong></td><td>${safe.email}</td></tr>
        <tr><td><strong>Address</strong></td><td>${safe.address}</td></tr>
        <tr><td><strong>Website</strong></td><td>${safe.website}</td></tr>
      </table>`,
  });

  return { success: true, messageId: info.messageId };
};

export default transporter;
