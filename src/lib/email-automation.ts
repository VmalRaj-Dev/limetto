import { sendEmail } from './email';
import { renderEmailTemplate, formatDate, formatCurrency } from './email-templates';
import { createServerClient } from '@/utils/supabase/serverClient';

export interface EmailData {
  userId: string;
  email: string;
  userName: string;
  amount?: number;
  currency?: string;
  trialEndDate?: string;
  nextBillingDate?: string;
  accessEndDate?: string;
}

export class EmailAutomation {
  private supabase = createServerClient();

  async sendWelcomeEmail(data: EmailData) {
    try {
      const { subject, html } = renderEmailTemplate('welcome', {
        userName: data.userName,
      });

      await sendEmail({
        to: data.email,
        subject,
        html,
      });

      console.log(`Welcome email sent to ${data.email}`);
    } catch (error) {
      console.error('Failed to send welcome email:', error);
      throw error;
    }
  }

  async sendTrialActivatedEmail(data: EmailData) {
    try {
      if (!data.trialEndDate) {
        throw new Error('Trial end date is required for trial activated email');
      }

      const { subject, html } = renderEmailTemplate('trialActivated', {
        userName: data.userName,
        // trialEndDate: formatDate(data.trialEndDate),
      });

      await sendEmail({
        to: data.email,
        subject,
        html,
      });

      console.log(`Trial activated email sent to ${data.email}`);
    } catch (error) {
      console.error('Failed to send trial activated email:', error);
      throw error;
    }
  }

  async sendSubscriptionStartedEmail(data: EmailData) {
    try {
      if (!data.nextBillingDate) {
        throw new Error('Next billing date is required for subscription started email');
      }

      const { subject, html } = renderEmailTemplate('subscriptionStarted', {
        userName: data.userName,
        // nextBillingDate: formatDate(data.nextBillingDate),
      });

      await sendEmail({
        to: data.email,
        subject,
        html,
      });

      console.log(`Subscription started email sent to ${data.email}`);
    } catch (error) {
      console.error('Failed to send subscription started email:', error);
      throw error;
    }
  }

  async sendPaymentReminderEmail(data: EmailData) {
    try {
      if (!data.amount || !data.nextBillingDate) {
        throw new Error('Amount and next billing date are required for payment reminder email');
      }

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const { subject, html } = renderEmailTemplate('paymentReminder', {
        userName: data.userName,
        amount: formatCurrency(data.amount, data.currency),
        chargeDate: formatDate(tomorrow),
      });

      await sendEmail({
        to: data.email,
        subject,
        html,
      });

      console.log(`Payment reminder email sent to ${data.email}`);
    } catch (error) {
      console.error('Failed to send payment reminder email:', error);
      throw error;
    }
  }

  async sendPaymentSuccessEmail(data: EmailData) {
    try {
      if (!data.amount || !data.nextBillingDate) {
        throw new Error('Amount and next billing date are required for payment success email');
      }

      const { subject, html } = renderEmailTemplate('paymentSuccess', {
        userName: data.userName,
        amount: formatCurrency(data.amount, data.currency),
        // nextBillingDate: formatDate(data.nextBillingDate),
      });

      await sendEmail({
        to: data.email,
        subject,
        html,
      });

      console.log(`Payment success email sent to ${data.email}`);
    } catch (error) {
      console.error('Failed to send payment success email:', error);
      throw error;
    }
  }

  async sendSubscriptionCancelledEmail(data: EmailData) {
    console.log(data);
    
    try {
      if (!data.accessEndDate) {
        throw new Error('Access end date is required for subscription cancelled email');
      }

      const { subject, html } = renderEmailTemplate('subscriptionCancelled', {
        userName: data.userName,
        accessEndDate: formatDate(data.accessEndDate),
      });

      await sendEmail({
        to: data.email,
        subject,
        html,
      });

      console.log(`Subscription cancelled email sent to ${data.email}`);
    } catch (error) {
      console.error('Failed to send subscription cancelled email:', error);
      throw error;
    }
  }

  // Helper method to get user data from Supabase
  async getUserData(userId: string): Promise<{
    mail_id: string;
    name: string;
    trial_ends_at?: string;
    next_billing_date?: string;
    subscription_status?: string;
  } | null> {
    try {
      const { data, error } = await this.supabase
        .from('profiles')
        .select('mail_id, name, trial_ends_at, subscription_status')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Failed to fetch user data:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error fetching user data:', error);
      return null;
    }
  }

  // Method to send payment reminders for users with billing tomorrow
  async sendPaymentReminders() {
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      // Get users whose payment is due tomorrow
      const { data: users, error } = await this.supabase
        .from('profiles')
        .select('id, mail_id, name, trial_ends_at, subscription_status')
        .eq('subscription_status', 'active')
        .like('trial_ends_at', `${tomorrowStr}%`);

      if (error) {
        console.error('Failed to fetch users for payment reminders:', error);
        return;
      }

      if (!users || users.length === 0) {
        console.log('No users found for payment reminders');
        return;
      }

      // Send reminder emails
      for (const user of users) {
        try {
          await this.sendPaymentReminderEmail({
            userId: user.id,
            email: user.mail_id,
            userName: user.name || 'there',
            amount: 29.99, // You can fetch this from your pricing config
            currency: 'USD',
            nextBillingDate: user.trial_ends_at,
          });
        } catch (error) {
          console.error(`Failed to send payment reminder to user ${user.id}:`, error);
        }
      }

      console.log(`Sent payment reminders to ${users.length} users`);
    } catch (error) {
      console.error('Error in sendPaymentReminders:', error);
    }
  }
}

// Export a singleton instance
export const emailAutomation = new EmailAutomation();
