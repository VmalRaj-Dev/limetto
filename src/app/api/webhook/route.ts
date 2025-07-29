import { Webhook } from "standardwebhooks";
import { headers } from "next/headers";
import { dodopayments } from "@/lib/dodopayments";
import { createClient } from "@/utils/supabase/client";

const webhook = new Webhook(process.env.DODO_PAYMENTS_WEBHOOK_KEY!);

export async function POST(request: Request) {
  const headersList = await headers();

  try {
    const rawBody = await request.text();
    const webhookHeaders = {
      "webhook-id": headersList.get("webhook-id") || "",
      "webhook-signature": headersList.get("webhook-signature") || "",
      "webhook-timestamp": headersList.get("webhook-timestamp") || "",
    };

    await webhook.verify(rawBody, webhookHeaders);
    const payload = JSON.parse(rawBody);
    const supabase = createClient();

    console.log('checking webhook for payload type', payload.data)

    if (payload.data.payload_type === "Subscription") {
      const subscriptionId = payload.data.subscription_id;

      const subscription = await dodopayments.subscriptions.retrieve(
        subscriptionId
      );
      const {
        metadata,
        status,
        next_billing_date: current_period_end,
      } = subscription;

      const supabaseUserId = metadata?.supabase_user_id;
      const supabaseCategoryId = metadata?.supabase_category_id;
      // Add dodopayments_customer_id from subscription metadata if available
      const dodopaymentsCustomerId = metadata?.dodopayments_customer_id; // Assuming you set this in metadata during subscription creation
      console.log('checking customer Id in webhook', dodopaymentsCustomerId)

      if (!supabaseUserId) {
        console.error("Missing supabase_user_id in metadata");
        return Response.json({ error: "Invalid metadata" }, { status: 400 });
      }

      const { data: existingProfile, error } = await supabase
        .from("profiles")
        .select("subscription_status, dodopayments_subscription_id, dodopayments_customer_id") // Select dodopayments_customer_id here
        .eq("id", supabaseUserId)
        .single();

      if (error) {
        console.error("Failed to fetch profile for webhook:", error.message);
        return Response.json({ error: "User not found" }, { status: 404 });
      }

      // Idempotency guard
      const alreadyHandled =
        existingProfile?.dodopayments_subscription_id === subscriptionId &&
        existingProfile?.subscription_status === status;

      if (alreadyHandled) {
        return Response.json({ message: "Already processed" }, { status: 200 });
      }

      switch (payload.type) {
        case "subscription.active":
        case "subscription.renewed":
          await supabase
            .from("profiles")
            .update({
              subscription_status: status,
              trial_ends_at: new Date(current_period_end).toISOString(),
              chosen_category_id: supabaseCategoryId,
              dodopayments_subscription_id: subscriptionId,
              dodopayments_customer_id: dodopaymentsCustomerId, // Add this line
            })
            .eq("id", supabaseUserId);
          break;

        case "subscription.cancelled":
        case "subscription.on_hold":
        case "subscription.failed":
          await supabase
            .from("profiles")
            .update({ subscription_status: status })
            .eq("id", supabaseUserId);
          break;
      }
    }

    if (payload.data.payload_type === "Payment") {
      const paymentId = payload.data.payment_id;

      if (payload.type === "payment.succeeded") {
        const payment = await dodopayments.payments.retrieve(paymentId);
        console.log('payment', payment)
        const metadata = payment.metadata || {};
        const supabaseUserId = metadata.supabase_user_id;
        // Assuming dodopayments provides a customer_id on the payment object
        // Or if you set it in metadata during payment creation:
        const dodopaymentsCustomerId = payment.customer_id || metadata.dodopayments_customer_id; 
        const dodopaymentsLastPaymentId = paymentId; // The ID of the successful payment

        if (supabaseUserId) {
          const { data: existingProfile, error } = await supabase
            .from("profiles")
            .select("last_payment_at, payment_status, dodopayments_customer_id, dodopayments_last_payment_id") // Select the new columns
            .eq("id", supabaseUserId)
            .single();

          if (error) {
            console.error("Payment Webhook profile fetch failed:", error.message);
            return Response.json({ error: "User not found" }, { status: 404 });
          }

          // Avoid redundant update
          const lastPaymentAt = existingProfile?.last_payment_at;
          const alreadyUpdated =
            existingProfile?.payment_status === "succeeded" &&
            lastPaymentAt === new Date(payment.created_at).toISOString() &&
            existingProfile?.dodopayments_last_payment_id === dodopaymentsLastPaymentId; // Add idempotency for payment ID

          if (!alreadyUpdated) {
            await supabase
              .from("profiles")
              .update({
                last_payment_at: new Date(payment.created_at).toISOString(),
                payment_status: "succeeded",
                dodopayments_customer_id: dodopaymentsCustomerId, // Add this line
                dodopayments_last_payment_id: dodopaymentsLastPaymentId, // Add this line
              })
              .eq("id", supabaseUserId);
          }
        }
      }
    }

    return Response.json({ message: "Webhook processed successfully" }, { status: 200 });
  } catch (error) {
    console.error("Webhook verification failed", error);
    return Response.json({ error: "Webhook failed" }, { status: 400 });
  }
}