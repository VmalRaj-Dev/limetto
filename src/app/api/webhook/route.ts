import { Webhook } from "standardwebhooks";
import { headers } from "next/headers";
import { dodopayments } from "@/lib/dodopayments";
import { createServerClient } from "@/utils/supabase/serverClient";
import { emailAutomation } from "@/lib/email-automation";
import { z } from "zod";

const webhook = new Webhook(process.env.DODO_PAYMENTS_WEBHOOK_KEY!);

const SubscriptionMetadataSchema = z.object({
  supabase_user_id: z.string().uuid(),
  supabase_category_id: z.string().uuid(),
  dodopayments_customer_id: z.string().optional(),
});

// const PaymentMetadataSchema = z.object({
//   supabase_user_id: z.string().uuid(),
// });

type PaymentWithMetadata = {
  amount?: number;
  currency?: string;
  created_at: string;
  customer: string | { customer_id: string };
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
};

export async function POST(request: Request) {
  const headersList = await headers();
  const rawBody = await request.text();

  const webhookHeaders = {
    "webhook-id": headersList.get("webhook-id") || "",
    "webhook-signature": headersList.get("webhook-signature") || "",
    "webhook-timestamp": headersList.get("webhook-timestamp") || "",
  };

  try {
    await webhook.verify(rawBody, webhookHeaders);
    const { type, data } = JSON.parse(rawBody);
    const supabase = createServerClient();

    if (data.payload_type === "Subscription") {
      await handleSubscriptionEvent(type, data, supabase);
    } else if (data.payload_type === "Payment") {
      await handlePaymentEvent(type, data, supabase);
    }

    return Response.json(
      { message: "Webhook processed successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Webhook processing error:", error);
    return Response.json({ error: "Webhook failed" }, { status: 400 });
  }
}

async function handleSubscriptionEvent(
  type: string,
  data: { subscription_id: string; payload_type: string },
  supabase: ReturnType<typeof createServerClient>
) {
  const subscription = await dodopayments.subscriptions.retrieve(
    data.subscription_id
  );

  const metadata = SubscriptionMetadataSchema.safeParse(subscription.metadata);

  if (!metadata.success) {
    throw new Error("Invalid or missing subscription metadata");
  }

  const {
    // metadata,
    status,
    next_billing_date,
    created_at,
    trial_period_days = 0,
  } = subscription;

  const supabaseUserId = metadata.data.supabase_user_id;
  const supabaseCategoryId = metadata.data.supabase_category_id;
  const dodopaymentsCustomerId = metadata.data.dodopayments_customer_id;

  if (!supabaseUserId) {
    throw new Error("Missing supabase_user_id in metadata");
  }

  const nextBillingDate = new Date(next_billing_date);
  const createdDate = new Date(created_at);
  const isTrialing = trial_period_days > 0 && nextBillingDate > createdDate;

  switch (type) {
    case "subscription.active":
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          subscription_status: isTrialing ? "trialing" : "active",
          is_trialing: isTrialing,
          trial_ends_at: isTrialing ? nextBillingDate.toISOString() : null,
          has_ever_trialed: true,
          chosen_category_id: supabaseCategoryId,
          dodopayments_subscription_id: data.subscription_id,
          dodopayments_customer_id: dodopaymentsCustomerId,
          subscribed_at: new Date().toISOString(),
        })
        .eq("id", supabaseUserId);
      if (updateError) {
        console.error("Failed to update profile after payment:", updateError);
        throw new Error("Failed to update profile after payment");
      }

      // Send appropriate email based on subscription type
      try {
        const userData = await emailAutomation.getUserData(supabaseUserId);
        if (userData) {
          if (isTrialing) {
            await emailAutomation.sendTrialActivatedEmail({
              userId: supabaseUserId,
              email: userData.mail_id,
              userName: userData.name || 'there',
              trialEndDate: nextBillingDate.toISOString(),
            });
          } else {
            await emailAutomation.sendSubscriptionStartedEmail({
              userId: supabaseUserId,
              email: userData.mail_id,
              userName: userData.name || 'there',
              nextBillingDate: nextBillingDate.toISOString(),
            });
          }
        }
      } catch (emailError) {
        console.error("Failed to send subscription email:", emailError);
        // Don't throw error for email failures to avoid breaking webhook
      }
      break;

    case "subscription.renewed":
      await supabase
        .from("profiles")
        .update({
          is_trialing: false,
          subscription_status: status,
          trial_ends_at: null,
          chosen_category_id: supabaseCategoryId,
          subscribed_at: new Date().toISOString(),
          dodopayments_subscription_id: data.subscription_id,
          dodopayments_customer_id: dodopaymentsCustomerId,
        })
        .eq("id", supabaseUserId);

      // Send subscription renewal email
      try {
        const userData = await emailAutomation.getUserData(supabaseUserId);
        if (userData) {
          await emailAutomation.sendSubscriptionStartedEmail({
            userId: supabaseUserId,
            email: userData.mail_id,
            userName: userData.name || 'there',
            nextBillingDate: nextBillingDate.toISOString(),
          });
        }
      } catch (emailError) {
        console.error("Failed to send renewal email:", emailError);
      }
      break;

    case "subscription.on_hold":
      await supabase
        .from("profiles")
        .update({ subscription_status: "on_hold" })
        .eq("id", supabaseUserId);
      break;

    case "subscription.cancelled":
    case "subscription.failed":
      await supabase
        .from("profiles")
        .update({
          subscription_status: "cancelled",
        })
        .eq("id", supabaseUserId);

      // Send subscription cancelled email
      try {
        const userData = await emailAutomation.getUserData(supabaseUserId);
        if (userData) {
          // Calculate access end date (usually end of current billing period)
          const accessEndDate = userData.trial_ends_at || new Date().toISOString();
          await emailAutomation.sendSubscriptionCancelledEmail({
            userId: supabaseUserId,
            email: userData.mail_id,
            userName: userData.name || 'there',
            accessEndDate: accessEndDate,
          });
        }
      } catch (emailError) {
        console.error("Failed to send cancellation email:", emailError);
      }
      break;

    case "subscription.trial_end":
      await supabase
        .from("profiles")
        .update({
          subscription_status: "trial_ended",
        })
        .eq("id", supabaseUserId);
      break;
  }
}

type PaymentEventData = {
  payment_id: string;
  payload_type: string;
  [key: string]: unknown;
};

async function handlePaymentEvent(
  type: string,
  data: PaymentEventData,
  supabase: ReturnType<typeof createServerClient>
) {
  const payment = await dodopayments.payments.retrieve(data.payment_id) as unknown as PaymentWithMetadata;
  const metadata = payment.metadata || {};
  const supabaseUserId = metadata.supabase_user_id as string;
  const dodopaymentsCustomerId =
    typeof payment.customer === "object" && payment.customer.customer_id
      ? payment.customer.customer_id
      : payment.customer || (metadata.dodopayments_customer_id as string);

  if (!supabaseUserId) {
    throw new Error("Missing supabaseUserId in payment metadata");
  }

  // const now = new Date();
  const paymentDate = new Date(payment.created_at);
  const lastPaymentId = data.payment_id;

  if (type === "payment.succeeded") {
    const { data: profile, error } = await supabase
      .from("profiles")
      .select(
        "trial_ends_at, last_payment_at, payment_status, dodopayments_last_payment_id"
      )
      .eq("id", supabaseUserId)
      .single();

    if (error) throw new Error("User not found");

    const alreadyUpdated =
      profile.payment_status === "succeeded" &&
      profile.last_payment_at === paymentDate.toISOString() &&
      profile.dodopayments_last_payment_id === lastPaymentId;

    // const trialEnded =
    //   profile.trial_ends_at && new Date(profile.trial_ends_at) < now;

    if (!alreadyUpdated) {
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          last_payment_at: paymentDate.toISOString(),
          payment_status: "succeeded",
          dodopayments_customer_id: dodopaymentsCustomerId,
          dodopayments_last_payment_id: lastPaymentId,
          // subscription_status: "active",
          // is_trialing: true,
          // trial_ends_at: trialEnded ? null : profile.trial_ends_at,
          // has_ever_trialed: true,
        })
        .eq("id", supabaseUserId);

      if (updateError) {
        console.error("Failed to update profile after payment:", updateError);
        throw new Error("Failed to update profile after payment");
      }

      // Send payment success email
      try {
        const userData = await emailAutomation.getUserData(supabaseUserId);
        if (userData) {
          // Get amount from payment object (adjust property name based on your payment provider)
          const paymentAmount = payment.amount || 2999; // Default to $29.99 if not available
          await emailAutomation.sendPaymentSuccessEmail({
            userId: supabaseUserId,
            email: userData.mail_id,
            userName: userData.name || 'there',
            amount: paymentAmount / 100, // Convert from cents
            currency: payment.currency || 'USD',
            nextBillingDate: profile.trial_ends_at || new Date().toISOString(),
          });
        }
      } catch (emailError) {
        console.error("Failed to send payment success email:", emailError);
      }
    }
  }

  if (type === "payment.failed") {
    await supabase
      .from("profiles")
      .update({
        // subscription_status: "cancelled",
        payment_status: "failed",
      })
      .eq("id", supabaseUserId);
  }
}
