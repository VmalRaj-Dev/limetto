# Email Automation Setup for Limetto

## Overview
This email automation system provides comprehensive email notifications for your Limetto subscription service using Resend and Handlebars templating.

## Features
- **Welcome emails** when users sign up
- **Trial activation emails** when trial starts
- **Subscription started emails** when paid subscription begins
- **Payment reminder emails** sent 1 day before billing
- **Payment success emails** after successful charges
- **Subscription cancelled emails** when users cancel

## Installation

1. **Install dependencies:**
```bash
npm install handlebars @types/handlebars
```

2. **Environment Variables:**
Add these to your `.env.local`:
```env
RESEND_API_KEY=your_resend_api_key
CRON_SECRET=your_secure_random_string_for_cron_jobs
```

## Email Templates
All email templates use a consistent design matching your existing Supabase email template. They include:
- Limetto branding
- Responsive design
- Call-to-action buttons
- Professional styling

## Automatic Triggers
Emails are automatically sent via webhook events:

- **Trial Activated**: When `subscription.active` webhook received with trial period
- **Subscription Started**: When `subscription.active` webhook received without trial
- **Subscription Renewed**: When `subscription.renewed` webhook received
- **Payment Success**: When `payment.succeeded` webhook received
- **Subscription Cancelled**: When `subscription.cancelled` or `subscription.failed` webhook received

## Payment Reminders
- Automated daily cron job at 9 AM UTC
- Sends reminders to users whose payment is due tomorrow
- Configured in `vercel.json` for Vercel deployment

## Manual Email Sending
You can manually trigger welcome emails via API:

```javascript
// Send welcome email
await fetch('/api/email/send-welcome', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'user-uuid',
    email: 'user@example.com',
    userName: 'John Doe'
  })
});
```

## Testing
- Test payment reminders: `GET /api/email/payment-reminders`
- Test welcome email: `POST /api/email/send-welcome`

## Customization
- Edit templates in `src/lib/email-templates.ts`
- Modify automation logic in `src/lib/email-automation.ts`
- Adjust webhook triggers in `src/app/api/webhook/route.ts`

## Security
- Cron jobs protected with `CRON_SECRET`
- Email failures don't break webhook processing
- Comprehensive error logging
