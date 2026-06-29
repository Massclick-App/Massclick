# Email Service Setup Guide

## Overview
The email service sends invoice emails to business owners when their payment is successfully processed through PhonePe.

## Configuration

The email service uses dedicated Invoice Email environment variables in `.env`:

```env
INVOICE_EMAIL_HOST=smtp.gmail.com:587
INVOICE_EMAIL_USER=admin@massclick.in
INVOICE_EMAIL_PASSWORD=nhux ogbt etva usua
INVOICE_EMAIL_FROM=admin@massclick.in
```

These credentials are already configured in `.env` with the same Gmail account as the rate limit alerts.

## Files

- **emailService.js** - Main email service with nodemailer configuration and invoice template
- **phonePayHelper.js** - Modified to send invoice on successful payment

## Invoice Email Flow

1. User initiates payment via PhonePe
2. Payment is processed
3. `checkPhonePeStatus()` is called to verify payment status
4. If payment status is "SUCCESS":
   - Business record is updated
   - `sendInvoiceEmail()` is triggered
   - Invoice email is sent to business email address with:
     - Business name
     - Category & Location
     - Transaction ID
     - Amount breakdown (base + GST)
     - Total amount paid
     - Business contact details

## Email Template

The invoice email includes:
- Professional header with MassClick branding
- Business and payment details
- Amount breakdown with GST calculation
- Success status badge
- Business information (email, contact, website)
- Footer with contact information

## Error Handling

- If business has no email address, email sending is skipped with a warning log
- Email failures don't block the payment completion process
- Errors are logged for troubleshooting

## Testing

To test the email service locally:

```javascript
import { sendInvoiceEmail } from './helper/email/emailService.js';

const testData = {
  businessName: 'Test Business',
  email: 'your-test-email@example.com', // Change this to your email
  category: 'Restaurants',
  location: 'Mumbai',
  contact: '9876543210',
  website: 'www.example.com'
};

const paymentData = {
  transactionId: 'txn_123456',
  amount: 1000,
  gstAmount: 180,
  totalAmount: 1180,
  paymentDate: new Date()
};

const result = await sendInvoiceEmail(testData, paymentData);
console.log(result);
```

The email will be sent from `admin@massclick.in` with an HTML invoice template.

## Future Enhancements

- [ ] PDF invoice generation
- [ ] Customizable email templates
- [ ] Email templates in multiple languages
- [ ] CC/BCC configurations
- [ ] Email retry logic
- [ ] Email delivery tracking
- [ ] Automated receipt emails
- [ ] Subscription renewal notifications
