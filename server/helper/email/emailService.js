import nodemailer from 'nodemailer';

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

const invoiceHTMLTemplate = (invoiceData) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
    }
    .container {
      background-color: #ffffff;
      padding: 30px;
      border-radius: 5px;
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
      border-bottom: 2px solid #FF8C00;
      padding-bottom: 20px;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
      color: #FF8C00;
    }
    .content {
      margin: 20px 0;
      line-height: 1.8;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
      font-size: 14px;
    }
    table td {
      padding: 10px;
      border: 1px solid #ddd;
    }
    table tr:nth-child(even) {
      background-color: #f9f9f9;
    }
    .section-title {
      font-weight: bold;
      color: #FF8C00;
      margin-top: 20px;
      margin-bottom: 10px;
      font-size: 16px;
    }
    .benefits-list {
      margin-left: 20px;
    }
    .benefits-list li {
      margin: 8px 0;
    }
    .footer {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #ddd;
      text-align: center;
      font-size: 12px;
      color: #666;
    }
    .footer-link {
      color: #FF8C00;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 Welcome to MassClick Premium Business Membership!</h1>
    </div>

    <div class="content">
      <p>Dear ${invoiceData.businessName},</p>

      <p>Thank you for choosing MassClick Premium Business Membership.</p>

      <p>We are pleased to inform you that your business listing has been successfully activated and is now part of the MassClick Premium Business Network. Your membership provides enhanced visibility, priority exposure, customer engagement opportunities, and access to powerful business growth tools designed to help you reach more customers and expand your local presence.</p>

      <div class="section-title">📋 Membership Details</div>
      <table>
        <tr>
          <td><strong>Business Name</strong></td>
          <td>${invoiceData.businessName || 'N/A'}</td>
        </tr>
        <tr>
          <td><strong>Category</strong></td>
          <td>${invoiceData.category || 'N/A'}</td>
        </tr>
        <tr>
          <td><strong>Location</strong></td>
          <td>${invoiceData.location || 'N/A'}</td>
        </tr>
        <tr>
          <td><strong>Membership Plan</strong></td>
          <td>Premium Business Membership</td>
        </tr>
        <tr>
          <td><strong>Base Amount</strong></td>
          <td>₹${(invoiceData.amount || 0).toFixed(2)}</td>
        </tr>
        <tr>
          <td><strong>GST (18%)</strong></td>
          <td>₹${(invoiceData.gstAmount || 0).toFixed(2)}</td>
        </tr>
        <tr>
          <td><strong>Total Amount Paid</strong></td>
          <td><strong>₹${(invoiceData.totalAmount || 0).toFixed(2)}</strong></td>
        </tr>
        <tr>
          <td><strong>Payment Status</strong></td>
          <td>✅ Success</td>
        </tr>
        <tr>
          <td><strong>Transaction ID</strong></td>
          <td>${invoiceData.transactionId || 'N/A'}</td>
        </tr>
        <tr>
          <td><strong>Payment Method</strong></td>
          <td>PhonePe</td>
        </tr>
        <tr>
          <td><strong>Activation Date</strong></td>
          <td>${invoiceData.paymentDate || new Date().toLocaleDateString('en-IN')}</td>
        </tr>
        <tr>
          <td><strong>Membership Status</strong></td>
          <td>🟢 Active</td>
        </tr>
      </table>

      <div class="section-title">✨ Premium Benefits Activated</div>
      <ul class="benefits-list">
        <li>✓ Priority Placement in Search Results</li>
        <li>✓ Enhanced Business Visibility</li>
        <li>✓ Premium Business Profile</li>
        <li>✓ WhatsApp Lead Notifications</li>
        <li>✓ Customer Reviews & Reputation Building</li>
        <li>✓ Business Analytics & Performance Insights</li>
        <li>✓ Increased Customer Reach</li>
        <li>✓ Priority Support Assistance</li>
      </ul>

      <div class="section-title">📱 Stay Connected</div>
      <p>Keep your registered WhatsApp number active to receive customer enquiries, lead notifications, business opportunities, and important account updates from MassClick.</p>

      <div class="section-title">🤝 Grow Through MNI Business Network</div>
      <p>As a Premium Member, you have access to MNI (MassClick Network Intelligence), our exclusive business networking platform that helps businesses connect, collaborate, and discover new opportunities.</p>
      <p><strong>With MNI you can:</strong></p>
      <ul class="benefits-list">
        <li>Connect with businesses across relevant categories</li>
        <li>Receive referral-based business opportunities</li>
        <li>Expand your professional network</li>
        <li>Discover partnership and collaboration opportunities</li>
        <li>Increase local business visibility</li>
      </ul>

      <div class="section-title">🚀 Maximize Your Business Growth</div>
      <p><strong>To get the best results from your membership, we recommend:</strong></p>
      <ul class="benefits-list">
        <li>Completing your business profile</li>
        <li>Uploading high-quality business photos and videos</li>
        <li>Keeping contact details up to date</li>
        <li>Responding promptly to customer enquiries</li>
        <li>Encouraging customers to leave reviews and ratings</li>
      </ul>

      <p>Thank you for being a valued Premium Business Member. We look forward to supporting your business growth and helping you connect with more customers through the MassClick platform.</p>

      <p><strong>Best Regards,</strong></p>
      <p><strong>MassClick Business Success Team</strong></p>
    </div>

    <div class="footer">
      <p>MassClick – India's Leading Local Search Engine</p>
      <p>Website: <a href="https://massclick.in" class="footer-link">https://massclick.in</a></p>
      <p>Email: <a href="mailto:support@massclick.in" class="footer-link">support@massclick.in</a></p>
      <p>&copy; 2024 MassClick. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
`;

export const sendInvoiceEmail = async (businessData, paymentData) => {
  try {
    console.log(`📧 [Invoice Email] Starting email send process for business: ${businessData?.businessName}`);
    const businessEmail = businessData?.email;

    if (!businessEmail) {
      console.warn(`⚠️ [Invoice Email] No email found for business: ${businessData?.businessName || businessData?._id}`);
      return {
        success: false,
        message: 'No email address found for business',
      };
    }

    console.log(`📧 [Invoice Email] Preparing invoice for: ${businessEmail}`);
    console.log(`📊 [Invoice Email] Payment Details - TxnID: ${paymentData.transactionId}, Amount: ₹${paymentData.totalAmount}`);


    const invoiceData = {
      businessName: businessData.businessName,
      category: businessData.category,
      location: businessData.location,
      email: businessData.email,
      contact: businessData.contact,
      website: businessData.website,
      transactionId: paymentData.transactionId,
      amount: paymentData.amount,
      gstAmount: paymentData.gstAmount,
      totalAmount: paymentData.totalAmount,
      paymentDate: new Date(paymentData.paymentDate).toLocaleDateString('en-IN'),
    };

    const mailOptions = {
      from: `MassClick <${INVOICE_EMAIL_FROM}>`,
      to: businessEmail,
      subject: `Invoice - Payment Successful for ${businessData.businessName}`,
      html: invoiceHTMLTemplate(invoiceData),
    };

    console.log(`📧 [Invoice Email] Sending email via SMTP - From: ${INVOICE_EMAIL_FROM}, To: ${businessEmail}`);
    const info = await transporter.sendMail(mailOptions);

    console.log(`✅ [Invoice Email] SUCCESS - Email sent to ${businessEmail}`);
    console.log(`📬 [Invoice Email] Message ID: ${info.messageId}`);
    console.log(`📝 [Invoice Email] SMTP Response: ${info.response}`);

    return {
      success: true,
      message: 'Invoice email sent successfully',
      messageId: info.messageId,
    };
  } catch (error) {
    console.error(`❌ [Invoice Email] FAILED - Error sending invoice email to ${businessData?.businessName}`);
    console.error(`❌ [Invoice Email] Error Details:`, {
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

export default transporter;
