import Handlebars from 'handlebars';

// Base email template with consistent styling
const baseTemplate = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>{{subject}}</title>
</head>
<body style="margin:0; padding:0; background-color:#f8f9fa; font-family: Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8f9fa; padding:20px 0;">
    <tr>
      <td align="center">
        <!-- Email Container -->
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px; background:#ffffff; border:1px solid #e9ecef; border-radius:8px;">
          <tr>
            <td style="padding:30px; text-align:left; border-bottom:1px solid #e9ecef;">
              <a href="{{baseUrl}}" style="font-size:24px; font-weight:bold; color:#23ba73; text-decoration:none;">Limetto</a>
            </td>
          </tr>
          <!-- Main Content -->
          <tr>
            <td style="padding:40px;">
              <h1 style="font-size:22px; font-weight:600; color:#1a1a1a; margin-bottom:16px;">{{title}}</h1>
              <p style="font-size:16px; color:#666666; margin-bottom:24px;">
                Hi {{userName}},<br>
                {{message}}
              </p>
              
              {{#if buttonText}}
              <!-- Action Button -->
              <table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:30px 0;">
                <tr>
                  <td align="center" bgcolor="#23ba73" style="border-radius:6px;">
                    <a href="{{buttonUrl}}" target="_blank" style="display:inline-block; padding:14px 28px; font-size:16px; font-weight:600; color:#ffffff; text-decoration:none; border-radius:6px; background-color:#23ba73;">
                      {{buttonText}}
                    </a>
                  </td>
                </tr>
              </table>
              {{/if}}
              
              {{#if additionalInfo}}
              <p style="font-size:14px; color:#666666; line-height:1.5;">
                {{additionalInfo}}
              </p>
              {{/if}}
              
              <p style="font-size:14px; color:#666666; margin-top:30px;">
                Need help? Email us at <a href="mailto:support@limetto.com" style="color:#23ba73; text-decoration:none;">support@limetto.com</a>.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px; background:#f8f9fa; text-align:center; font-size:12px; color:#999999;">
              © 2025 Limetto. All rights reserved.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

// Email template configurations
export const emailTemplates = {
  welcome: {
    subject: 'Welcome to Limetto! 🎉',
    title: 'Welcome to Limetto!',
    message: 'Thank you for joining Limetto! We\'re excited to have you on board. Your account has been successfully created and you\'re ready to start your journey with us.',
    buttonText: 'Get Started',
    buttonUrl: '{{dashboardUrl}}',
    additionalInfo: 'If you have any questions or need assistance getting started, don\'t hesitate to reach out to our support team.'
  },
  
  trialActivated: {
    subject: 'Your Free Trial is Now Active! ✨',
    title: 'Your Free Trial Has Started',
    message: 'Great news! Your free trial is now active and you have full access to all Limetto features. Your trial will end on {{trialEndDate}}.',
    buttonText: 'Explore Features',
    buttonUrl: '{{dashboardUrl}}',
    additionalInfo: 'Make the most of your trial period by exploring all our features. You can upgrade to a paid plan anytime before your trial ends.'
  },
  
  subscriptionStarted: {
    subject: 'Welcome to Limetto Pro! 🚀',
    title: 'Your Subscription is Active',
    message: 'Congratulations! Your Limetto Pro subscription is now active. You now have unlimited access to all premium features.',
    buttonText: 'Access Dashboard',
    buttonUrl: '{{dashboardUrl}}',
    additionalInfo: 'Your next billing date is {{nextBillingDate}}. You can manage your subscription anytime from your account settings.'
  },
  
  paymentReminder: {
    subject: 'Payment Due Tomorrow - Limetto Subscription',
    title: 'Payment Reminder',
    message: 'This is a friendly reminder that your Limetto subscription payment of {{amount}} will be charged tomorrow ({{chargeDate}}).',
    buttonText: 'Update Payment Method',
    buttonUrl: '{{billingUrl}}',
    additionalInfo: 'Please ensure your payment method is up to date to avoid any interruption in service. If you have any questions about your billing, please contact us.'
  },
  
  paymentSuccess: {
    subject: 'Payment Received - Thank You! 💳',
    title: 'Payment Successful',
    message: 'Thank you! We\'ve successfully received your payment of {{amount}} for your Limetto subscription.',
    buttonText: 'View Invoice',
    buttonUrl: '{{invoiceUrl}}',
    additionalInfo: 'Your subscription is active until {{nextBillingDate}}. You can download your invoice and manage your subscription from your account dashboard.'
  },
  
  subscriptionCancelled: {
    subject: 'Subscription Cancelled - We\'ll Miss You',
    title: 'Subscription Cancelled',
    message: 'We\'re sorry to see you go! Your Limetto subscription has been cancelled as requested. You\'ll continue to have access until {{accessEndDate}}.',
    buttonText: 'Reactivate Subscription',
    buttonUrl: '{{reactivateUrl}}',
    additionalInfo: 'If you change your mind, you can reactivate your subscription anytime before {{accessEndDate}}. We\'d love to have you back!'
  }
};

// Compile and render email template
export function renderEmailTemplate(
  templateKey: keyof typeof emailTemplates,
  data: {
    userName: string;
    baseUrl?: string;
    dashboardUrl?: string;
    billingUrl?: string;
    invoiceUrl?: string;
    reactivateUrl?: string;
    // trialEndDate?: string;
    // nextBillingDate?: string;
    chargeDate?: string;
    amount?: string;
    accessEndDate?: string;
  }
): { subject: string; html: string } {
  const template = emailTemplates[templateKey];
  if (!template) {
    throw new Error(`Email template '${templateKey}' not found`);
  }

  // Compile the base template
  const compiledTemplate = Handlebars.compile(baseTemplate);
  
  // Prepare template data
  const templateData = {
    subject: template.subject,
    title: template.title,
    message: template.message,
    buttonText: template.buttonText,
    buttonUrl: template.buttonUrl,
    additionalInfo: template.additionalInfo,
    userName: data.userName,
    baseUrl: data.baseUrl || 'https://limetto.com',
    dashboardUrl: data.dashboardUrl || 'https://app.limetto.com/dashboard',
    billingUrl: data.billingUrl || 'https://app.limetto.com/billing',
    invoiceUrl: data.invoiceUrl,
    reactivateUrl: data.reactivateUrl || 'https://app.limetto.com/subscribe',
    // trialEndDate: data.trialEndDate,
    // nextBillingDate: data.nextBillingDate,
    chargeDate: data.chargeDate,
    amount: data.amount,
    accessEndDate: data.accessEndDate
  };

  // Render the template
  const html = compiledTemplate(templateData);
  
  return {
    subject: template.subject,
    html
  };
}

// Helper function to format dates
export function formatDate(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

// Helper function to format currency
export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency
  }).format(amount);
}
