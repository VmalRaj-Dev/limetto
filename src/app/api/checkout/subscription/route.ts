import { dodopayments } from "@/lib/dodopayments";
import { NextResponse } from "next/server";
import countries from "i18n-iso-countries";
import enLocale from "i18n-iso-countries/langs/en.json";
import { createServerClient } from "@/utils/supabase/serverClient";

countries.registerLocale(enLocale);

const DODOPAYMENTS_GENERIC_SUBSCRIPTION_PRODUCT_ID =
  process.env.DODOPAYMENTS_GENERIC_SUBSCRIPTION_PRODUCT_ID;

export const POST = async (request: Request) => {
  try {
    // Validate environment variables
    if (!DODOPAYMENTS_GENERIC_SUBSCRIPTION_PRODUCT_ID) {
      throw new Error(
        "Missing DODOPAYMENTS_GENERIC_SUBSCRIPTION_PRODUCT_ID env var"
      );
    }

    const body = await request.json();
    const { supabaseUserId, supabaseCategoryId, email, name, billing } = body;

    // Validate request body
    if (
      !supabaseUserId ||
      !supabaseCategoryId ||
      !email ||
      !name ||
      !billing ||
      !billing.country
    ) {
      return NextResponse.json(
        { error: "Missing required signup or billing fields" },
        { status: 400 }
      );
    }

    // const countryCode = countries.getAlpha2Code(billing.country, "en");
    // if (!countryCode) {
    //   return NextResponse.json(
    //     { error: `Invalid country: ${billing.country}` },
    //     { status: 400 }
    //   );
    // }

    const countryCode = billing.country

    const supabase = createServerClient();

    let dodopaymentsCustomerId: string | undefined;

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("dodopayments_customer_id")
      .eq("id", supabaseUserId)
      .single();

    if (profileError) {
      console.error(
        "Payment Webhook profile fetch failed:",
        profileError.message
      );
      return NextResponse.json(
        { error: "Failed to fetch profile for subscription" },
        { status: 400 }
      );
    }
    if (!profile) {
      console.error(
        "Payment Webhook: No profile found for user",
        supabaseUserId
      );
      return NextResponse.json(
        { error: "No profile found for user" },
        { status: 404 }
      );
    }

    // Handle customer ID logic
    if (profile?.dodopayments_customer_id) {
      dodopaymentsCustomerId = profile.dodopayments_customer_id;
    } else {
      const customerRes = await dodopayments.customers.create({
        email,
        name,
      });
      dodopaymentsCustomerId = customerRes.customer_id;
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          dodopayments_customer_id: dodopaymentsCustomerId,
        })
        .eq("id", supabaseUserId);

      if (updateError) {
        console.error(
          "Failed to update dodopayments_customer_id:",
          updateError
        );
      } else {
        console.log(
          "Successfully updated dodopayments_customer_id for user:",
          supabaseUserId
        );
      }
    }

    if (!dodopaymentsCustomerId) {
      throw new Error("Failed to resolve dodopaymentsCustomerId");
    }

    // Add timeout handling
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Request timeout")), 30000);
    });

    // Create subscription with improved error handling
    const subscriptionResponse = await Promise.race([
      dodopayments.subscriptions.create({
        billing: {
          ...billing,
          country: countryCode,
        },
        customer: {
          email,
          name,
          customer_id: dodopaymentsCustomerId,
        },
        payment_link: true,
        product_id: DODOPAYMENTS_GENERIC_SUBSCRIPTION_PRODUCT_ID,
        // on_demand: { mandate_only: true },
        quantity: 1,
        return_url:
          `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard` ||
          "https://app.limetto.com",
        metadata: {
          supabase_user_id: supabaseUserId,
          supabase_category_id: supabaseCategoryId,
          dodopayments_customer_id: dodopaymentsCustomerId,
        },
      }),
      timeoutPromise,
    ]) as { payment_link?: string };

    if (!subscriptionResponse.payment_link) {
      return NextResponse.json(
        { error: "No payment link received from DodoPayments" },
        { status: 400 }
      );
    }

    return NextResponse.json(subscriptionResponse, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
    });
  } catch (error) {
    console.error("Subscription creation error:", error);

    // More structured error response
    const statusCode = error && typeof error === 'object' && 'status' in error ? 
      (typeof error.status === 'number' ? error.status : 500) : 500;
    const errorMessage = error instanceof Error ? error.message : String(error);

    return NextResponse.json(
      {
        error: "Failed to create subscription",
        details: errorMessage,
        code: statusCode,
      },
      { status: statusCode }
    );
  }
};
