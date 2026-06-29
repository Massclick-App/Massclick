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
      max-width: 600px;
      margin: 0 auto;
    }
    .container {
      background-color: #f9f9f9;
      padding: 20px;
      border-radius: 5px;
    }
    .header {
      background-color: #FF8C00;
      color: white;
      padding: 20px;
      text-align: center;
      border-radius: 5px 5px 0 0;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
    }
    .invoice-details {
      background-color: white;
      padding: 20px;
      margin: 20px 0;
      border-left: 4px solid #FF8C00;
    }
    .invoice-details h2 {
      margin-top: 0;
      color: #FF8C00;
      font-size: 20px;
    }
    .detail-row {
      display: flex;
      justify-content: space-between;
      padding: 10px 0;
      border-bottom: 1px solid #eee;
    }
    .detail-row:last-child {
      border-bottom: none;
    }
    .detail-label {
      font-weight: bold;
      color: #555;
    }
    .detail-value {
      color: #333;
    }
    .amount-section {
      background-color: #f5f5f5;
      padding: 15px;
      border-radius: 5px;
      margin: 15px 0;
    }
    .amount-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      font-size: 16px;
    }
    .amount-row.total {
      font-weight: bold;
      font-size: 18px;
      color: #FF8C00;
      border-top: 2px solid #FF8C00;
      padding-top: 10px;
    }
    .business-info {
      background-color: white;
      padding: 20px;
      margin: 20px 0;
      border-radius: 5px;
    }
    .business-info h3 {
      margin-top: 0;
      color: #333;
      font-size: 16px;
    }
    .footer {
      text-align: center;
      padding: 20px;
      color: #777;
      font-size: 12px;
      background-color: #f9f9f9;
    }
    .status {
      display: inline-block;
      background-color: #4CAF50;
      color: white;
      padding: 5px 15px;
      border-radius: 20px;
      font-weight: bold;
      margin: 10px 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Invoice</h1>
      <p style="margin: 5px 0;">Payment Successful</p>
    </div>

    <div class="invoice-details">
      <h2>Invoice Details</h2>

      <div class="detail-row">
        <span class="detail-label">Business Name:</span>
        <span class="detail-value">${invoiceData.businessName || 'N/A'}</span>
      </div>

      <div class="detail-row">
        <span class="detail-label">Category:</span>
        <span class="detail-value">${invoiceData.category || 'N/A'}</span>
      </div>

      <div class="detail-row">
        <span class="detail-label">Location:</span>
        <span class="detail-value">${invoiceData.location || 'N/A'}</span>
      </div>

      <div class="detail-row">
        <span class="detail-label">Transaction ID:</span>
        <span class="detail-value">${invoiceData.transactionId || 'N/A'}</span>
      </div>

      <div class="detail-row">
        <span class="detail-label">Invoice Date:</span>
        <span class="detail-value">${invoiceData.paymentDate || new Date().toLocaleDateString('en-IN')}</span>
      </div>

      <div class="detail-row">
        <span class="detail-label">Payment Gateway:</span>
        <span class="detail-value">PhonePe</span>
      </div>
    </div>

    <div class="amount-section">
      <div class="amount-row">
        <span>Base Amount:</span>
        <span>₹${(invoiceData.amount || 0).toFixed(2)}</span>
      </div>
      <div class="amount-row">
        <span>GST (18%):</span>
        <span>₹${(invoiceData.gstAmount || 0).toFixed(2)}</span>
      </div>
      <div class="amount-row total">
        <span>Total Amount Paid:</span>
        <span>₹${(invoiceData.totalAmount || 0).toFixed(2)}</span>
      </div>
    </div>

    <div class="status" style="text-align: center;">
      ✓ PAYMENT SUCCESSFUL
    </div>

    <div class="business-info">
      <h3>Business Information</h3>
      ${invoiceData.email ? `<p><strong>Email:</strong> ${invoiceData.email}</p>` : ''}
      ${invoiceData.contact ? `<p><strong>Contact:</strong> ${invoiceData.contact}</p>` : ''}
      ${invoiceData.website ? `<p><strong>Website:</strong> ${invoiceData.website}</p>` : ''}
    </div>

    <div class="footer">
      <p>Your business listing is now live on MassClick!</p>
      <p>For any queries, please contact us at business@massclick.in</p>
      <p>&copy; 2024 MassClick. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
`;

export const sendInvoiceEmail = async (businessData, paymentData) => {
  try {
    const businessEmail = businessData?.email;

    if (!businessEmail) {
      console.warn(`No email found for business: ${businessData?.businessName || businessData?._id}`);
      return {
        success: false,
        message: 'No email address found for business',
      };
    }

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

    const info = await transporter.sendMail(mailOptions);

    console.log(`Invoice email sent to ${businessEmail}:`, info.response);

    return {
      success: true,
      message: 'Invoice email sent successfully',
      messageId: info.messageId,
    };
  } catch (error) {
    console.error('Error sending invoice email:', error);
    return {
      success: false,
      message: 'Failed to send invoice email',
      error: error.message,
    };
  }
};

export default transporter;
